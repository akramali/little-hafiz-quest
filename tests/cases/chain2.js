(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const i = idx(99);
  L.go('learn', { i, p: 0, a: 3, phase: 'chain', popped: [false, false, false], peek: false, chain: 0, saidA: [0, 1, 2], savedA: [] });
  await wait(200);
  const state = () => [...d.querySelectorAll('.chain .link')].map((x) => x.querySelector('.num').textContent + (x.classList.contains('lit') ? '✓' : x.classList.contains('cur') ? '•' : '')).join(' ');
  const fab = () => (d.querySelector('.listen small') || {}).textContent;
  log('start:', state(), '| Listen:', fab());
  for (let n = 0; n < 3; n++) { d.querySelector('.chain .link.cur').click(); await wait(80); }
  log('said 3:', state(), '| Listen:', fab());
  d.querySelector('.chain .link[data-j="1"]').click(); await wait(80);
  log('tap āyah 2 again (untap):', state(), '| Listen:', fab());
  ok('a said āyah can be untapped; Listen plays just the lit āyah', state() === '1✓ 2• 3 4' && fab() === 'Āyah 2', state() + ' / ' + fab());
  d.querySelector('.chain .link.cur').click(); await wait(80);
  log('tap it again:', state(), '| Listen:', fab());
  // Listen plays from the first one not said
  d.querySelector('.listen').click(); await wait(300);
  log('Listen plays:', JSON.stringify(L.st && w.__lhq ? (w.__lhq.queue ? w.__lhq.queue() : 'n/a') : ''), '| playing label', d.querySelector('.listen b').textContent);
  // tap along: the next āyah lights up, and Listen is for that one
  d.querySelector('.chain .link.cur').click(); await wait(150);
  log('tapped along:', state(), '| Listen:', fab());
  ok('tapping along: Listen moves to the next lit āyah', fab() === 'Āyah 4', fab());
  d.querySelector('.chain .link[data-j="0"]').click(); await wait(200);
  ok('going back: Listen is for that āyah', state().startsWith('1•') && fab() === 'Āyah 1', state() + ' / ' + fab());
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
