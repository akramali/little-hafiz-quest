// tap a fruit tree on the map: a fruit falls, the nearest animal runs over, eats it, and goes home
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('map'); await wait(1200);
  const want = Q.get('k') || 'meadow-tree';
  const trees = [...d.querySelectorAll(`.mprop[data-k="${want}"]`)];
  const eater = /sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat/;
  const animals = [...d.querySelectorAll('.mprop')].filter((a) => eater.test(a.dataset.k));
  // the tree with an animal closest to it
  let best = null;
  trees.forEach((t) => animals.forEach((a) => { const dd = Math.hypot(a.dataset.x - t.dataset.x, a.dataset.y - t.dataset.y); if (!best || dd < best.dd) best = { t, a, dd }; }));
  log('trees', trees.length, 'animals', animals.length, 'closest pair', best && best.a.dataset.k, Math.round(best && best.dd));
  const t = best.t;
  w.scrollTo(0, t.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(600);
  const r0 = best.a.getBoundingClientRect();
  t.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(100);
  const fruit = d.querySelector('.mfruit');
  log('fruit dropped:', !!fruit, '| busy animal:', [...d.querySelectorAll('.mprop')].filter((a) => a._busy).map((a) => a.dataset.k).join());
  const cx = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
  const inner = (el) => { const r = el.firstElementChild.getBoundingClientRect(); return Math.round(r.left + r.width / 2); };
  const track = [];
  for (let i = 0; i < 24; i++) { await wait(300); track.push(`${inner(best.a)}${d.querySelector('.mfruit') ? '' : '·'}`); if (Q.get('shotat') && i === +Q.get('shotat')) { d.getAnimations().forEach((x) => x.pause()); await wait(5000); } }
  log('fruit at x', fruit && cx(fruit), '| animal home x', Math.round(r0.left + r0.width / 2), '| animal x over time:', track.join(' '));
  log('after: fruit left', d.querySelectorAll('.mfruit').length, '| still busy', !!best.a._busy, '| stroll running', best.a.firstElementChild.getAnimations().filter((x) => x.playState === 'running').length);
  ok('the animal ate the fruit and went back to strolling', !d.querySelectorAll('.mfruit').length && !best.a._busy);
  // tap again 5 times quickly: at most 4 fruits at once, no errors
  for (let i = 0; i < 6; i++) t.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(200);
  log('rapid taps: fruits', d.querySelectorAll('.mfruit').length);
  ok('at most 4 fruits at once', d.querySelectorAll('.mfruit').length <= 4);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
