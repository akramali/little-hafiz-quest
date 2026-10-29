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
  ok('a said āyah can be untapped', state() === '1✓ 2• 3 4' && fab() === 'From āyah 2', state() + ' / ' + fab());
  d.querySelector('.chain .link.cur').click(); await wait(80);
  log('tap it again:', state(), '| Listen:', fab());
  // Listen plays from the first one not said
  d.querySelector('.listen').click(); await wait(300);
  log('Listen plays:', JSON.stringify(L.st && w.__lhq ? (w.__lhq.queue ? w.__lhq.queue() : 'n/a') : ''), '| playing label', d.querySelector('.listen b').textContent);
  // tap along while it plays: it keeps playing
  d.querySelector('.chain .link.cur').click(); await wait(150);
  log('tapped along: still playing', d.querySelector('.listen b').textContent === 'Stop', '|', state());
  ok('tapping along keeps Listen playing', d.querySelector('.listen b').textContent === 'Stop');
  // go back while it plays: it carries on from there
  d.querySelector('.chain .link[data-j="0"]').click(); await wait(200);
  log('went back to āyah 1 while playing:', state(), '| playing', d.querySelector('.listen b').textContent, '| from', fab());
  ok('going back while playing carries on from there', state().startsWith('1•') && d.querySelector('.listen b').textContent === 'Stop');
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
