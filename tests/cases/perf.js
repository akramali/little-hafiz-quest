// Performance: each screen's draw time, its frames while it sits there (idle animations), page weight, memory,
// and main-thread blocks (long tasks). Headless and without a GPU the numbers are slower than a phone's, but they
// compare screens with each other, and a build with the one before. (?only=<screen>: just that one)
(async () => {
  fixture({ items: ['ladybug-buddy', 'toy-car', 'kitten-buddy', 'elephant-buddy', 'turtle-buddy', 'bee-buddy'], outfit: { pet: 'ladybug-buddy', hat: 'explorer-cap' } });
  const { w, d, L, idx } = await openGame();
  const prof = L.store().profiles[0];
  prof.strangers = [0, 1, 2, 3, 4, 5, 6, 7];
  const longs = [];
  try { new w.PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push(e.duration))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
  const raf = () => new Promise((r) => w.requestAnimationFrame(() => w.requestAnimationFrame(r)));
  const frames = async (ms, during) => {
    const ts = [];
    let t0 = w.performance.now(), last = t0, go = true;
    const tick = (t) => { ts.push(t - last); last = t; if (go) w.requestAnimationFrame(tick); };
    w.requestAnimationFrame(tick);
    if (during) await during(); else await wait(ms);
    go = false;
    await wait(50);
    ts.shift();
    const s = ts.slice().sort((a, b) => a - b), avg = ts.reduce((a, b) => a + b, 0) / Math.max(1, ts.length);
    return { fps: Math.round(1000 / avg), p95: Math.round(s[Math.floor(s.length * 0.95)] || 0), drop: ts.filter((x) => x > 34).length, n: ts.length };
  };
  const screens = [
    ['splash', () => L.go('splash')],
    ['map', () => L.go('map'), async () => { const sc = d.scrollingElement; for (let i = 0; i < 30; i++) { sc.scrollTop += 60; await wait(60); } for (let i = 0; i < 30; i++) { sc.scrollTop -= 60; await wait(60); } }],
    ['surah', () => L.go('surah', { i: idx(113), p: 0 })],
    ['learn', () => L.go('learn', { i: idx(113), p: 0, a: 1, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] })],
    ['words', () => L.go('words', { i: idx(112), p: 0, a: 0, w: 3, phase: 'build', shown: [], doneA: [], savedA: [] })],
    ['path', () => L.go('path', { i: idx(78), p: 'all', L: 2, k: 4, hint: 0, hints: 0, hearts: 3, maxH: 3 })],
    ['order', () => L.go('order', { i: idx(78), p: 1, deck: [3, 0, 4, 1, 5, 2], placed: { 0: true }, say: 1, sel: null, hearts: 3, maxH: 3 })],
    ['mushaf', () => L.go('mushaf', { i: idx(78), p: 0, sel: null, focus: false })],
    ['bag', () => L.go('bag', { tab: 'hat' })],
    ['show', () => L.go('show')],
    ['journal', () => L.go('journal', { w: 1 })],
    ['tree 30%', () => { w.__treeSize = 0.3; L.go('map'); d.querySelector('[data-act=tree]').click(); }],
    ['tree 100%', () => { w.__treeSize = 1; L.go('map'); d.querySelector('[data-act=tree]').click(); }],
    ['settings', () => L.go('settings')],
    ['done', () => L.go('done', { i: idx(113), p: 0, msg: 'Well done!', stars: 1, gained: 1 })],
  ].filter((x) => !Q.get('only') || x[0] === Q.get('only'));
  const rows = [];
  for (const [name, open, during] of screens) {
    if (name.startsWith('tree')) { L.go('map'); await wait(1200); }
    longs.length = 0;
    const t0 = w.performance.now();
    open();
    await raf();
    const draw = Math.round(w.performance.now() - t0);
    await wait(400);
    const f = await frames(3000, during);
    const nodes = d.getElementsByTagName('*').length, svgEls = d.querySelectorAll('svg *').length;
    const heap = w.performance.memory ? Math.round(w.performance.memory.usedJSHeapSize / 1e6) : 0;
    const anim = d.getAnimations ? d.getAnimations().length : 0;
    rows.push({ name, draw, ...f, nodes, svgEls, anim, heap, longs: longs.length, longMax: Math.round(Math.max(0, ...longs)) });
    log(`${name.padEnd(10)} draw ${String(draw).padStart(5)} ms | fps ${String(f.fps).padStart(3)} p95 ${String(f.p95).padStart(4)} ms drops ${String(f.drop).padStart(3)}/${f.n} | nodes ${String(nodes).padStart(5)} svg ${String(svgEls).padStart(5)} anims ${String(anim).padStart(4)} | heap ${heap} MB | long tasks ${longs.length} (max ${Math.round(Math.max(0, ...longs))} ms)`);
  }
  log('JSON ' + JSON.stringify(rows));
  done();
})();
