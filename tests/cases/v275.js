// v2.7.5: Listen in the Teacher's test plays only the question; a miss burns the campfire down; the campfire on
// the sūrah page; swipe between āyāt in Look & Repeat; lost things stay on the screen
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const X = w.__lhq, p = L.store().profiles[0];
  const ask = (qs) => L.go('elder', { i: idx(113), p: 0, qs, q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: false, rematch: false, result: null, ack: '' });
  // 1. Listen: the start of the āyah to finish, or the āyah given
  ask([{ k: 1, kind: 'finish', cut: 2, throw: 'rock' }, { k: 0, kind: 'next', cut: 0, throw: 'rock' }, { k: 2, kind: 'next', cut: 0, throw: 'rock' }]); await wait(300);
  ok('finish the āyah: Listen plays only the words shown', !!d.querySelector('.eldtop .listen.show') && JSON.stringify(X.fabTarget().items) === JSON.stringify([[113, 2, 0, 1]]), JSON.stringify(X.fabTarget()));
  ask([{ k: 0, kind: 'next', cut: 0, throw: 'rock' }, { k: 1, kind: 'next', cut: 0, throw: 'rock' }, { k: 2, kind: 'next', cut: 0, throw: 'rock' }]); await wait(300);
  ok('what comes after: Listen plays only the āyah shown', JSON.stringify(X.fabTarget().items) === JSON.stringify([[113, 1]]), JSON.stringify(X.fabTarget()));
  // 2. a miss burns the fire down a step
  p.fire[113] = [Date.now(), 2];
  p.items = ['explorer-cap']; p.outfit = { hat: 'explorer-cap' }; p.lost = [];
  d.querySelector('[data-act=eldans][data-ok="0"]').click(); await wait(2600);
  const f = p.fire[113], r = (Date.now() - f[0]) / 864e5;
  ok('a wrong answer: the campfire burns down a step (roaring → strong, 3 days)', r >= 3 && r < 7, r.toFixed(2));
  // 3. the campfire on the sūrah page
  L.go('surah', { i: idx(113), p: 0 }); await wait(300);
  ok('the sūrah page shows its campfire', /Strong/.test((d.querySelector('.herofire') || {}).textContent || ''));
  d.querySelector('.herofire').click(); await wait(300);
  ok('tap it: how fresh the sūrah is', /strong/.test(d.querySelector('#modal.show .firecard h3').textContent) && /fresh in your heart/.test(d.querySelector('#modal.show .firecard').textContent));
  d.querySelector('#modal [data-act=cno]').click(); await wait(200);
  p.fire[112] = [Date.now() - 3 * 7 * 864e5, 2];
  L.go('map'); await wait(1500);
  d.querySelector(`.node[data-i="${idx(112)}"] .nfire`).click(); await wait(300);
  ok('on the map too: out, practise now', /out/.test(d.querySelector('#modal.show .firecard h3').textContent) && !!d.querySelector('#modal [data-act=firego]'));
  d.querySelector('#modal [data-act=firego]').click();
  for (let t = 0; t < 80 && L.st().view !== 'surah'; t++) await wait(100);
  await wait(300);
  ok('Practise now goes to that sūrah', L.st().view === 'surah' && L.st().i === idx(112), L.st().view);
  L.go('surah', { i: idx(78), p: 0 }); await wait(300);
  ok('not memorized: no campfire', !d.querySelector('.herofire'));
  // 4. swipe between āyāt
  L.go('learn', { i: idx(99), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(300);
  const card = d.querySelector('.lcard'), cr = card.getBoundingClientRect();
  const sw = (x0, x1) => {
    card.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: x0, clientY: cr.top + 40, pointerId: 3 }));
    card.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: x1, clientY: cr.top + 44, pointerId: 3 }));
  };
  sw(cr.left + 250, cr.left + 120); await wait(300);
  ok('swipe left: the next āyah', L.st().a === 1, L.st().a);
  sw(cr.left + 120, cr.left + 260); await wait(300);
  ok('swipe right: back again', L.st().a === 0, L.st().a);
  // 5. lost things stay on the screen, even beside a stop near the edge
  const three = ['explorer-cap', 'trail-boots', 'leaf-cape'];
  three.forEach((id) => p.items.includes(id) || p.items.push(id));
  p.lost = [...three.map((id) => ({ id, n: 113 })), { id: 'sunrise-shades', n: 112 }];
  if (!p.items.includes('sunrise-shades')) p.items.push('sunrise-shades');
  L.go('map'); await wait(1500);
  const boxes = [...d.querySelectorAll('.mlost')].map((b) => b.getBoundingClientRect());
  const off = boxes.filter((q) => q.left < 0 || q.right > w.innerWidth);
  // (a sūrah's lost things make a little heap: a bit over each other, but each still showing)
  const lap = boxes.some((a, i) => boxes.some((b, j) => j > i && Math.abs(a.left - b.left) < 20 && Math.abs(a.top - b.top) < 20));
  const heap = boxes.slice(0, 3), spread = Math.max(...heap.map((q) => q.right)) - Math.min(...heap.map((q) => q.left));
  ok('lost things are on the screen, in a tight heap, each still showing', boxes.length === 4 && !off.length && !lap && spread < 140, `${boxes.length} · off ${off.length} · hidden ${lap} · heap ${Math.round(spread)} px`);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
