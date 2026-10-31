// v2.7.3: Listen in the chain plays the lit āyah only; in the puzzle it plays the next piece to place
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const fab = () => (d.querySelector('.listen small') || {}).textContent;
  // the chain
  L.go('learn', { i: idx(99), p: 0, a: 3, phase: 'chain', popped: [false, false, false], peek: false, chain: 0, saidA: [0, 1, 2], savedA: [] }); await wait(200);
  ok('chain: Listen plays just the lit āyah', fab() === 'Āyah 1' && w.__lhq.fabTarget().items.length === 1, fab());
  // the puzzle: the next piece, all the way to the last one
  L.go('surah', { i: idx(113), p: 0 }); await wait(200);
  d.querySelector('[data-act=order]').click(); await wait(400);
  ok('puzzle: Listen plays the first piece to place', fab() === 'Next: āyah 1', fab());
  const st = L.st(), n = st.deck.length;
  for (let j = 0; j < n - 1; j++) st.placed[j] = true;
  L.go('order', st); await wait(200);
  ok('puzzle: with one piece left, Listen plays that last āyah', fab() === `Next: āyah ${n}`, fab());
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
