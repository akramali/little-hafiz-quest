// Read: Listen plays the Bismillah, then the sūrah in order, each from its own file; with a loop it starts over
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  L.go('mushaf', { i: idx(112), p: 0, sel: null }); await wait(500);
  const seq = [], files = new Set();
  const look = () => {
    const now = d.querySelector('.mayah.now');
    const k = now ? +now.dataset.k : null;
    if (k != null && seq[seq.length - 1] !== k) seq.push(k);
    if (!L.player.paused) files.add(L.player.currentSrc || L.player.src);
  };
  d.querySelector('.listen').click();
  for (let t = 0; t < 120 && d.querySelector('.listen b').textContent === 'Stop'; t++) { await wait(250); look(); }
  ok('Bismillah, then āyāt 1–4 in order', seq.join(',') === '-1,0,1,2,3', seq.join(','));
  ok('the Bismillah and the sūrah play from their own files', files.size >= 2, files.size);
  ok('it stops at the end', d.querySelector('.listen b').textContent === 'Listen');
  // a loop of 3: Bismillah and the sūrah three times
  d.querySelector('.mfloat .loopbtn').click(); await wait(100);
  const seq2 = [];
  d.querySelector('.listen').click();
  for (let t = 0; t < 360 && d.querySelector('.listen b').textContent === 'Stop'; t++) {
    await wait(250);
    const now = d.querySelector('.mayah.now'), k = now ? +now.dataset.k : null;
    if (k != null && seq2[seq2.length - 1] !== k) seq2.push(k);
  }
  ok('looped 3×: the whole thing three times', seq2.join(',') === '-1,0,1,2,3,-1,0,1,2,3,-1,0,1,2,3', seq2.join(','));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
