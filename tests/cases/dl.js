// download prompt + loop: Naba (long) asks first; An-Nās (short) downloads quietly; loop 3× plays 3 times
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  await w.caches.delete('lhq2-audio');
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const toast = () => (d.getElementById('toast').classList.contains('show') ? d.getElementById('toast').textContent : '');
  const fab = () => d.querySelector('.listen');
  // short sūrah: quiet download, then plays
  L.go('learn', { i: idx(114), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  fab().click();
  await wait(2500);
  log('114 quiet: modal=', d.getElementById('modal').classList.contains('show'), 'playing=', !L.player.paused, 'src blob=', (L.player.getAttribute('src') || '').startsWith('blob:'), 't=', L.player.currentTime.toFixed(2), 'toast=', toast());
  fab().click(); // stop
  // long sūrah: asks first
  L.go('learn', { i: idx(78), p: 0, a: 2, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  fab().click();
  await wait(1200);
  const card = d.querySelector('#modal .dlcard');
  log('78 asks:', !!card, card && card.querySelector('h3').textContent);
  d.querySelector('[data-act=dlyes]').click();
  await wait(200);
  log('busy shown:', d.querySelector('#modal .dlcard.busy') != null, 'label:', fab().querySelector('small').textContent);
  await wait(4000);
  log('78 after: modal=', d.getElementById('modal').classList.contains('show'), 'playing=', !L.player.paused, 't=', L.player.currentTime.toFixed(2), 'toast=', toast());
  const saved = await (await w.caches.open('lhq2-audio')).match(new URL('audio/alafasy/078.mp3', w.location.href).href);
  log('078 saved in cache:', !!saved);
  ok('a recitation downloads and is saved', !!saved);
  fab().click(); // stop
  // loop: 3× on An-Nās āyah 1 (short), count the plays
  L.go('learn', { i: idx(114), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  d.querySelector('.loopbtn').click();
  log('loop label:', d.querySelector('.loopbtn text').textContent);
  let seeks = 0; L.player.addEventListener('seeked', () => seeks++);
  fab().click();
  const arcs = [];
  for (let t = 0; t < 60; t++) { await wait(500); arcs.push(d.querySelector('.loopbtn .lr-arc').getAttribute('stroke-dasharray').split(' ')[0]); if (L.player.paused && t > 4 && fab().querySelector('b').textContent === 'Listen') break; }
  log('ring over time:', [...new Set(arcs)].join(' → '), 'seeks:', seeks, 'stopped:', fab().querySelector('b').textContent);
  // Not now: nothing plays
  await w.caches.delete('lhq2-audio');
  L.go('learn', { i: idx(79), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300); fab().click(); await wait(1200);
  d.querySelector('[data-act=dlno]').click(); await wait(300);
  log('not now: listen=', fab().querySelector('b').textContent, 'modal=', d.getElementById('modal').classList.contains('show'));
  ok('Not now leaves Listen idle', fab().querySelector('b').textContent === 'Listen');
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
