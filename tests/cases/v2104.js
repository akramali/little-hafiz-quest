// v2.10.4: a special day's sticker for every explorer on the phone (it hid behind the phone's once-a-day greeting),
// and sleeping buddies at My Tree with their eyes shut (‿), not squashed into dots
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  s0.profiles.push(Object.assign(JSON.parse(JSON.stringify(s0.profiles[0])), { id: 'ptest2', name: 'Yusuf' }));
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  const S = L.store(),
    [a, b] = S.profiles,
    has = (p) => p.pending.some((g) => g.k === 's' && g.id === 'jumuah'),
    toastTxt = () => d.getElementById('toast').textContent;
  // 1. Jumuʿah: the first explorer opens the map, then the second
  w.__occasion = 'jumuah';
  try { w.localStorage.removeItem('lhq_greet'); } catch (e) {}
  L.go('map'); await wait(2200);
  ok('the first explorer gets the Jumuʿah sticker', has(a) && !has(b));
  ok('…with the greeting', /Jumuʿah Mubārak/.test(toastTxt()) && /sticker/.test(toastTxt()), toastTxt());
  S.cur = b.id;
  d.getElementById('toast').textContent = '';
  L.go('explorers'); await wait(100);
  L.go('map'); await wait(2200);
  ok('switching explorer: the second gets it too', has(b), b.pending.map((g) => g.id).join(','));
  ok('…told so', /sticker/.test(toastTxt()), toastTxt());
  d.getElementById('toast').textContent = '';
  L.go('explorers'); await wait(100);
  L.go('map'); await wait(2200);
  ok('only once each, and no second greeting that day', b.pending.filter((g) => g.id === 'jumuah').length === 1 && a.pending.filter((g) => g.id === 'jumuah').length === 1 && toastTxt() === '', toastTxt());
  w.__occasion = '';
  // 2. every animal buddy has shut eyes, shown only while it sleeps
  const A = w.LHQ_ART,
    animals = A.ITEMS.filter((it) => it.slot === 'pet' && !it.wgold && !/rocket|car|plane|train|boat|truck|helicopter/.test(it.id)).map((it) => it.id),
    noShut = animals.filter((id) => !/lhq-shut/.test(A.item(id)) || !/lhq-blink/.test(A.item(id)));
  log('animal buddies', animals.length, '| without shut eyes:', noShut.join(' ') || 'none');
  ok('every animal buddy can shut its eyes', animals.length >= 10 && !noShut.length, noShut.join(' '));
  const box = d.createElement('div');
  box.innerHTML = ['asleep', 'awake'].map((m) => `<svg class="tsvg" style="position:static;width:100px;height:100px"><g class="tbud m-${m}">${A.item('kitten-buddy')}</g></svg>`).join('');
  d.body.appendChild(box); await wait(100);
  const [sl, aw] = box.querySelectorAll('.tbud'),
    vis = (g, sel) => { const e = g.querySelector(sel); return w.getComputedStyle(e).display !== 'none' && w.getComputedStyle(e).opacity !== '0'; };
  ok('asleep: eyes shut, the open ones hidden', vis(sl, '.lhq-shut') && !vis(sl, '.lhq-blink'));
  ok('awake: eyes open', !vis(aw, '.lhq-shut') && vis(aw, '.lhq-blink'));
  box.insertAdjacentHTML('beforeend', `<div>${A.item('kitten-buddy')}</div>`);
  ok('anywhere else (My Explorer, a gift) the shut eyes stay hidden', w.getComputedStyle(box.lastElementChild.querySelector('.lhq-shut')).display === 'none');
  box.remove();
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
