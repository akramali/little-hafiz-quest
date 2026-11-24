// Transitions (v2.12.2): frame times while going through the Garden's gate, opening My Tree, zooming into a stop and
// scrolling past the summit. GPU=1 for a phone-like picture. Each line: frames, average fps, worst frame, frames > 34 ms
(async () => {
  fixture({ items: ['ladybug-buddy', 'toy-car', 'kitten-buddy', 'elephant-buddy', 'turtle-buddy', 'bee-buddy'], outfit: { pet: 'ladybug-buddy' } });
  const { w, d, L, idx } = await openGame();
  w.__occasion = Q.get('occ') || '';
  w.__treeSize = 0.9; // (set before the map: in real use the tree's size doesn't change on the way to it)
  d.documentElement.style.scrollBehavior = 'auto';
  const longs = [];
  try { new w.PerformanceObserver((l) => l.getEntries().forEach((e) => longs.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: false }); } catch (e) {}
  const rec = async (name, run, ms) => {
    longs.length = 0; const t0 = w.performance.now();
    const ts = []; let last = w.performance.now(), go = true;
    const tick = (t) => { ts.push(t - last); last = t; if (go) w.requestAnimationFrame(tick); };
    w.requestAnimationFrame(tick);
    await run(); await wait(ms);
    go = false; await wait(50); ts.shift();
    const s = ts.slice().sort((a, b) => a - b), avg = ts.reduce((a, b) => a + b, 0) / Math.max(1, ts.length);
    log(name.padEnd(14), 'long tasks', longs.map(([a, b]) => '@' + (a - Math.round(t0)) + ':' + b).join(' ') || '-', '|', 'frames', ts.length, '| fps', Math.round(1000 / avg), '| worst', Math.round(s[s.length - 1] || 0), 'ms | >34ms', ts.filter((x) => x > 34).length);
  };
  for (let round = 0; round < 2; round++) {
    L.garden(false); L.go('map'); await wait(2500); w.scrollTo(0, 0); await wait(800);
    await rec('summit idle', async () => {}, 2000);
    await rec('gate trip in', async () => d.querySelector('.mgate8').click(), 2600);
    await wait(800);
    await rec('garden idle', async () => {}, 2000);
    await rec('gate trip out', async () => d.querySelector('.mgate8.back').click(), 2600);
    await wait(1000);
    await rec('open tree', async () => d.querySelector('[data-act=tree]').click(), 2000);
    await rec('tree idle', async () => {}, 2000);
    L.go('map'); await wait(2500);
    const nd = d.querySelector('#map .node.st-cur') || d.querySelector('#map .node');
    nd.scrollIntoView({ block: 'center' }); await wait(600);
    await rec('zoom to stop', async () => nd.click(), 2200);
    L.go('map'); await wait(2500);
    await rec('scroll map', async () => { const sc = d.scrollingElement; for (let i = 0; i < 25; i++) { sc.scrollTop -= 80; await wait(32); } }, 300);
  }
  done();
})();
