// v2.6.7: speed and loop in Word Steps and Stepping Stones
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  for (const [v, st] of [['words', { i: idx(112), p: 0, a: 0, w: 2, phase: 'build', shown: [], doneA: [], savedA: [] }], ['path', { i: idx(112), p: 0, L: 2, k: 1, hint: 0, hints: 0, hearts: 3, maxH: 3 }]]) {
    L.go(v, st); await wait(300);
    ok(`${v}: speed and loop buttons`, !!d.querySelector('.lchead .speedchip') && !!d.querySelector('.lchead .loopbtn'));
    d.querySelector('.loopbtn').click(); await wait(100);
    const lbl = d.querySelector('.loopbtn').textContent;
    d.querySelector('.listen').click(); await wait(300);
    ok(`${v}: Listen plays it ${lbl}`, /3/.test(lbl) && d.querySelector('.listen b').textContent === 'Stop', lbl);
    d.querySelector('.listen').click(); await wait(100);
    while (!/1/.test(d.querySelector('.loopbtn').textContent) || /1[0-9]/.test(d.querySelector('.loopbtn').textContent)) { d.querySelector('.loopbtn').click(); await wait(50); }
  }
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
