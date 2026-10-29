// changing the loop count while it plays keeps playing and restarts the count
(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('learn', { i: idx(114), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  const fab = () => d.querySelector('.listen'), num = () => d.querySelector('.loopbtn text').textContent;
  fab().click(); // 1×
  await wait(2500);
  log('playing 1×:', !L.player.paused, 'label', num(), 'ring full', d.querySelector('.loopbtn .lr-arc').getAttribute('stroke-dasharray').startsWith('300.0'), 'arrow shown', !!d.querySelector('.loopbtn .lr-tip'));
  d.querySelector('.loopbtn').click(); await wait(300); // → 3×
  log('after tap → still playing:', !L.player.paused, fab().querySelector('b').textContent, 'label', num());
  const seen = [];
  for (let t = 0; t < 60; t++) { await wait(500); seen.push(num()); if (fab().querySelector('b').textContent === 'Listen') break; }
  log('count over time:', [...new Set(seen)].join(' → '), '| ended:', fab().querySelector('b').textContent);
  ok('loop counts down 3× → 2× → 1×', [...new Set(seen)].join(',').startsWith('3×,2×,1×'), [...new Set(seen)].join(',')); ok('Listen ends', fab().querySelector('b').textContent === 'Listen');
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message); }
  done();
})();
