(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('surah', { i: idx(99), p: 0 }); await wait(300);
  d.querySelector('[data-act=mushaf]').click(); await wait(300);
  log('view', L.st().view, 'ayat', d.querySelectorAll('.mayah').length, 'fab:', d.querySelector('.listen small').textContent);
  // long press āyah 3
  const a3 = d.querySelector('.mayah[data-k="2"]'), r = a3.getBoundingClientRect();
  const opt = { bubbles: true, clientX: r.left + 10, clientY: r.top + 10, pointerId: 1 };
  a3.dispatchEvent(new w.PointerEvent('pointerdown', opt)); await wait(600);
  a3.dispatchEvent(new w.PointerEvent('pointerup', opt)); a3.click(); await wait(200);
  log('after hold: sel', L.st().sel, 'colored words', d.querySelectorAll('.mayah.sel .mw').length, 'fab:', d.querySelector('.listen small').textContent);
  ok('holding an āyah colors its words', L.st().sel === 2 && d.querySelectorAll('.mayah.sel .mw').length > 0);
  // a short tap clears
  d.querySelector('.mayah[data-k="0"]').click(); await wait(200);
  log('after tap: sel', L.st().sel, 'colored', d.querySelectorAll('.mw').length);
  ok('a tap elsewhere clears it', L.st().sel == null);
  // choose again and screenshot-state stays for the shot test
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
