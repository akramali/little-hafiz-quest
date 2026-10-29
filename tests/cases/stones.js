(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('path', { i: idx(78), p: 'all', L: 1, k: 9, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  await wait(300);
  const sets = d.getElementById('stsets');
  log('start: k=', L.st().k, 'scroll set', Math.round(sets.scrollLeft / sets.clientWidth), 'dots on', [...d.querySelectorAll('.stdots button')].findIndex((b) => b.classList.contains('on')));
  d.querySelector('.pathbtns [data-act=hop]').click();
  await wait(1500);
  const s2 = d.getElementById('stsets');
  log('after hop: k=', L.st().k, 'scroll set', Math.round(s2.scrollLeft / s2.clientWidth), 'cur stone j=', d.querySelector('.stone.cur').dataset.j, 'dots on', [...d.querySelectorAll('.stdots button')].findIndex((b) => b.classList.contains('on')));
  // look at another set, then a hint must not jump back... but a hop does
  d.querySelector('.stdots button:nth-child(4)').click(); await wait(700);
  log('looked at set', Math.round(s2.scrollLeft / s2.clientWidth));
  d.querySelector('[data-act=hint]').click(); await wait(300);
  log('after hint still at', Math.round(d.getElementById('stsets').scrollLeft / s2.clientWidth));
  d.querySelector('.pathbtns [data-act=hop]').click(); await wait(1200);
  log('after hop k=', L.st().k, 'back at set', Math.round(d.getElementById('stsets').scrollLeft / s2.clientWidth));
  ok('the frog hops on and the stones follow', L.st().k === 11);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
