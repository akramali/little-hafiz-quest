// v2.9.0/v2.9.1: the Teacher's riddles (seven a day, opened from the journal), my tree with the buddies around it,
// the campfire going low (or out) on a mistake, and special days (a garland, a greeting and a sticker)
(async () => {
  fixture({ items: ['ladybug-buddy', 'toy-car'], outfit: { pet: 'ladybug-buddy' } });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0],
    m = d.getElementById('modal'),
    today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  w.__occasion = '';
  // 1. riddles (v2.9.1): opened from the journal, looked for on the map; seven a day, a minute apart
  L.go('map'); await wait(1500);
  ok('the journal button has a dot while a riddle waits', !!d.querySelector('.jbtn .newdot'));
  const k = L.riddleNow(prof)[0];
  // tapping the answer on the map without opening the riddle solves nothing
  const el0 = d.querySelector(`.mprop[data-k="${k}"]`);
  if (el0) { el0.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(400); }
  ok('a tap on the answer before opening the riddle solves nothing', prof.riddle[1] === 0);
  L.go('journal', { w: 0 }); await wait(300);
  const strip = d.querySelector('.jriddle.on');
  log('riddle:', strip && strip.textContent.replace(/\s+/g, ' '));
  ok('the riddle at the top of the journal (1 of 7)', !!strip && /Riddle 1 of 7/.test(strip.textContent));
  strip.click(); await wait(1600);
  ok('tapping it goes to the map, the clue at the bottom', L.st().view === 'map' && !!d.querySelector('.mriddle'));
  // a wrong thing: nothing lost, the riddle stays open
  const other = [...d.querySelectorAll('.mprop')].find((e) => e.dataset.k !== k);
  if (other) { other.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300); }
  ok('a wrong tap: nothing lost, still looking', !!d.querySelector('.mriddle') && prof.riddle[1] === 0);
  const el = d.querySelector(`.mprop[data-k="${k}"]`);
  log('answer', k, '| on the map', !!el);
  el.scrollIntoView({ block: 'center' }); await wait(300);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
  log('after: riddle', JSON.stringify(prof.riddle), '| card', m.textContent.trim().slice(0, 90));
  ok('found: a stamp, the next in a minute', prof.riddle[0] === today && prof.riddle[1] === 1 && prof.riddle[2] === 1 && prof.riddle[3] > Date.now() + 50000 && /you found it/.test(m.textContent));
  m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  L.go('journal', { w: 0 }); await wait(300);
  ok('the next waits a minute', !!d.querySelector('.jriddle.done') && /in a minute/.test(d.querySelector('.jriddle').textContent));
  // seven a day, all different; a gift with the 7th stamp, one a day at most
  const day7 = [0, 1, 2, 3, 4, 5, 6].map((j) => { prof.riddle = [today, 0, j, 0, 0]; return L.riddleNow(prof)[0]; });
  log('today\'s seven:', day7.join(' '));
  ok('seven different riddles today', new Set(day7).size === 7);
  prof.riddle = [today, 13, 6, 0, 0];
  const before = prof.pending.length;
  L.go('journal', { w: 0 }); await wait(200);
  d.querySelector('.jriddle.on').click(); await wait(1600);
  const k7 = L.riddleNow(prof) ? L.riddleNow(prof)[0] : day7[6];
  const el7 = d.querySelector(`.mprop[data-k="${k7}"]`);
  el7 && el7.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
  ok('the 7th riddle (14th stamp) brings a gift', prof.riddle[1] === 14 && prof.pending.length > before && prof.riddle[4] === 1);
  m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  L.go('journal', { w: 0 }); await wait(200);
  ok('all seven done: come back tomorrow', /Come back tomorrow/.test(d.querySelector('.jriddle').textContent) && !L.riddleNow(prof));
  // 2. my tree: its button under the journal's, a screen of its own
  L.go('map'); await wait(1500);
  ok('the My Tree button on the map', !!d.querySelector('.tbtn[data-act=tree]'));
  ok('no plants at the stops any more (one tree instead)', !d.querySelector('.node .ngarden'));
  // (no fruit yet on a young tree: no one's hungry)
  prof.grow = [0, '', []];
  prof.buddy = ['2000-01-01', 0, 0];
  L.treeReset();
  d.querySelector('[data-act=tree]').click(); await wait(800);
  log('young tree', JSON.stringify({ size: L.treeInfo(prof).size.toFixed(3), fruits: L.treeInfo(prof).fruits.length }), '| hungry', JSON.stringify(L.hungry()));
  ok('a young tree with no fruit: no buddy hungry yet', L.treeInfo(prof).fruits.length === 0 && !L.hungry() && !d.querySelector('.tsvg .tbud.m-hungry'));
  L.go('map'); await wait(1200);
  // (a tree with fruit: fifteen sūrahs golden, and plenty of practice)
  w.LHQ_DATA.surahs.slice().sort((x, y) => y.n - x.n).slice(0, 15).forEach((x) => (prof.prog[x.n] = { parts: x.P.map(() => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 })), all: x.P.length > 1 ? 3 : 0 }));
  prof.grow = [200, '', []];
  d.querySelector('[data-act=tree]').click(); await wait(800);
  const info = L.treeInfo(prof), hg = L.hungry();
  log('tree', JSON.stringify({ size: info.size.toFixed(2), leaves: info.leaves, blossoms: info.blossoms.length, fruits: info.fruits.length }), '| hungry', JSON.stringify(hg));
  ok('my tree: fruit drawn, and a flower in the grass for every sūrah memorized', L.st().view === 'tree' && d.querySelectorAll('.tsvg .tfruit').length === info.fruits.length && info.fruits.length >= 2 && d.querySelectorAll('.tsvg [data-act=tflower]').length === info.flowers.length && info.flowers.length === info.memorized);
  ok('the buddies live around it, one hungry', d.querySelectorAll('.tsvg .tbud').length === 2 && d.querySelectorAll('.tsvg .tbud.m-hungry').length === 1);
  { // two flowers tapped one after the other: one name showing, not a pile; the bar sits in the flow (no extra offset)
    const fl = d.querySelectorAll('.tsvg [data-act=tflower]');
    fl[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(150);
    fl[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(150);
    ok('my tree: one flower name at a time', d.querySelectorAll('.tftag').length === 1, d.querySelectorAll('.tftag').length);
    ok('my tree: the note sits below the title bar', d.querySelector('.tnote').getBoundingClientRect().top >= d.querySelector('.treescr > .bar').getBoundingClientRect().bottom - 6 && w.getComputedStyle(d.querySelector('.treescr > .bar')).top === '0px');
    const bud = d.querySelector('.tsvg .tbud');
    if (bud) {
      bud.classList.remove('m-asleep', 'hid'); // (awake and out in the open for this check)
      bud.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(120);
      const cs = w.getComputedStyle(bud.querySelector('.tbud-w'));
      ok('my tree: a tapped buddy does a move, starting at once', /bm-/.test(bud.getAttribute('class')) && /^tb/.test(cs.animationName) && cs.animationDelay === '0s', cs.animationName + ' ' + cs.animationDelay);
    }
  }
  const want = hg.want, fr = [...d.querySelectorAll('.tsvg .tfruit')].find((f) => f.dataset.t === want);
  fr.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(4800);
  log('fed: buddy', JSON.stringify(prof.buddy), '| hungry now', JSON.stringify(L.hungry()));
  ok('tapping the fruit it wants: it falls, the buddy eats, fed for the day', prof.buddy[0] === today && prof.buddy[1] === 1 && !L.hungry());
  await wait(1200);
  ok('no other buddy hungry for 30 seconds', !d.querySelector('.tsvg .tbud.m-hungry'));
  { // a fruit no one wanted falls and is nibbled away; drawn again, it stays off the tree (no jump back up)
    const f2 = [...d.querySelectorAll('.tsvg .tfruit:not(.fall):not(.ground)')][0];
    f2.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1200);
    L.go('tree', Object.assign({}, L.st())); await wait(300);
    const again = d.querySelector('.tsvg .tfruit[data-j="' + f2.dataset.j + '"]');
    ok('my tree: a fallen fruit no one wanted lies on the ground, also when the screen is drawn again (no jump back up)', again && again.classList.contains('fall') && !again.classList.contains('gone') && d.querySelector('.tsvg .tfruit[data-j="' + fr.dataset.j + '"]').classList.contains('gone'));
    d.querySelectorAll('.tsvg .tcrit').forEach((c) => c.remove());
    L.critterFor(again); await wait(200);
    ok('…a squirrel or a rabbit comes for it', !!d.querySelector('.tsvg .tcrit'));
    await wait(4800);
    ok('…picks it up and runs off', again.classList.contains('gone'));
  }
  // growing: a sūrah practised grows it once a day
  const g0 = prof.grow[0];
  const finishWords = async () => {
    const S112 = w.LHQ_DATA.surahs[idx(112)], last = S112.ayat.length - 1;
    L.go('words', { i: idx(112), p: 0, a: last, w: 1, phase: 'recall', shown: [], doneA: [...Array(last).keys()], savedA: [] }); await wait(300);
    const nW = d.querySelectorAll('.wflow > .wbox').length;
    L.go('words', Object.assign({}, L.st(), { shown: [...Array(nW).keys()] })); await wait(300);
    const wd = d.querySelector('[data-act=wdone]');
    if (wd) { wd.click(); await wait(1200); }
  };
  await finishWords();
  await finishWords();
  log('grow', g0, '→', JSON.stringify(prof.grow));
  ok('practising a sūrah grows the tree, once a day', prof.grow[0] === g0 + 1 && prof.grow[2].includes(112));
  // the Teacher's test with a miss: at the end, the campfire burns down from where it was
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('elder', { i: idx(113), p: 0, fire0: 5, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: true, rematch: false, result: null, ack: '' }); await wait(300);
  d.querySelector('[data-act=eldans][data-ok="0"]').click();
  for (let t = 0; t < 100 && L.st().phase !== 'end'; t++) await wait(100);
  const steps = d.querySelectorAll('.eldend .firerise .fr-st').length;
  log('after a miss: fire steps shown', steps, '| now', JSON.stringify(prof.fire[113]));
  ok('a test with a miss ends with the campfire going down to Low (roaring → low)', steps === 4);
  // out of hearts in a review game: the campfire goes down to Low, shown on the card
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
  d.querySelector('[data-act=oops]') && d.querySelector('[data-act=oops]').click();
  for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  log('out of hearts: fire', JSON.stringify(prof.fire[113]), '| steps', d.querySelectorAll('#modal .dropfire .fr-st').length);
  ok('out of hearts: the campfire goes down to Low (roaring → low), shown on the card', d.querySelectorAll('#modal .dropfire .fr-st').length === 4);
  d.querySelector('#modal [data-act=dropnext]') && d.querySelector('#modal [data-act=dropnext]').click(); await wait(300);
  // already low (or embers): it burns out
  prof.fire[113] = [Date.now() - 11 * 864e5, 3];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
  d.querySelector('[data-act=oops]') && d.querySelector('[data-act=oops]').click();
  for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  const daysNow = (Date.now() - prof.fire[113][0]) / 864e5;
  log('already low, out of hearts: days', daysNow.toFixed(1), '| steps', d.querySelectorAll('#modal .dropfire .fr-st').length);
  ok('already low: a mistake burns it out', daysNow >= 21 && d.querySelectorAll('#modal .dropfire .fr-st').length === 3);
  d.querySelector('#modal [data-act=dropnext]') && d.querySelector('#modal [data-act=dropnext]').click(); await wait(300);
  // the map keeps scenery clear of every stop's campfire (v2.9.1)
  w.LHQ_DATA.surahs.forEach((x) => { prof.prog[x.n] = { parts: x.P.map(() => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 })), all: x.P.length > 1 ? 3 : 0 }; prof.fire[x.n] = [Date.now() - 864e5, 1]; });
  prof.strangers = [0, 1, 2, 3, 4, 5, 6, 7]; // (every sūrah memorized: the Stranger has said his farewell already)
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(1500);
  const fires = [...d.querySelectorAll('.nfire')].map((f) => f.getBoundingClientRect()),
    scen = [...d.querySelectorAll('.mprop')].map((m) => ({ k: m.dataset.k, r: m.getBoundingClientRect() })),
    over = [];
  fires.forEach((f, i) => scen.forEach((q) => { const r = q.r, ix = Math.min(f.right, r.right - r.width * 0.15) - Math.max(f.left, r.left + r.width * 0.15), iy = Math.min(f.bottom, r.bottom) - Math.max(f.top, r.top + r.height * 0.1); if (ix > 6 && iy > 6) over.push(i + ':' + q.k); }));
  log('campfires', fires.length, '| covered by scenery:', over.join(' ') || 'none');
  ok('no campfire is covered by trees or other scenery', fires.length === 37 && !over.length);
  // 4. special days: a garland, a greeting and the sticker (once)
  w.__occasion = 'ramadan';
  try { w.localStorage.removeItem('lhq_greet'); } catch (e) {}
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(2400);
  log('garland', !!d.querySelector('.festive.f-ramadan'), '| pending', prof.pending.map((g) => g.id).slice(-2).join(','));
  ok('Ramadan: a garland over the map', !!d.querySelector('.festive.f-ramadan svg'));
  ok("…and this Hijri year's Ramadan sticker in the gift box", prof.pending.some((g) => g.k === 's' && /^ramadan-14\d\d$/.test(g.id)), prof.pending.map((g) => g.id).join(','));
  const n0 = prof.pending.length;
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(2400);
  ok('only once', prof.pending.length === n0);
  ok('a normal day: no garland', (w.__occasion = '', L.go('map'), await wait(400), !d.querySelector('.festive')));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
