(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  // everyday glasses: owned from the start, off until tapped, tap again to take off
  L.go('bag', { tab: 'glasses' }); await wait(200);
  const cell = () => d.querySelector('[data-act=equip][data-id="everyday-glasses"]');
  log('glasses cell:', !!cell(), 'worn at start:', cell().getAttribute('aria-pressed'), 'outfit', prof().outfit.glasses || 'none');
  cell().click(); await wait(150); log('after tap worn:', cell().getAttribute('aria-pressed'), prof().outfit.glasses);
  cell().click(); await wait(150); log('after 2nd tap worn:', cell().getAttribute('aria-pressed'), prof().outfit.glasses || 'none');
  ok('tap to wear, tap again to take off', !prof().outfit.glasses);
  // bald for both
  L.go('bag', { tab: 'look' }); await wait(150);
  log('girl styles:', [...d.querySelectorAll('.hairpick')].map((b) => b.dataset.v).join(','));
  d.querySelector('[data-k=kid][data-v=boy]').click(); await wait(150);
  log('boy styles:', [...d.querySelectorAll('.hairpick')].map((b) => b.dataset.v).join(','));
  ok('boy hair styles include bald', [...d.querySelectorAll('.hairpick')].some((b) => b.dataset.v === 'bald'));
  // a wrong puzzle place: no message, the outline blinks red, the piece stays in the pile
  L.go('surah', { i: idx(112), p: 0 }); await wait(150); d.querySelector('.qstep[data-act=order]').click(); await wait(250);
  const pc = d.querySelector('.pcard[data-k="1"]'), r = pc.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + 30, clientY: r.top + 30, pointerId: 1 };
  pc.dispatchEvent(new w.PointerEvent('pointerdown', o)); d.dispatchEvent(new w.PointerEvent('pointerup', o)); await wait(80);
  d.querySelector('.pzslot[data-j="0"]').click(); await wait(100);
  log('wrong: toast shown', d.getElementById('toast').classList.contains('show'), 'outline red', !!d.querySelector('.pz-holes g.bad'), 'piece back in pile', !!d.querySelector('.pcard[data-k="1"]'), 'wobble', d.querySelector('.pcard[data-k="1"]').classList.contains('wobble'));
  ok('a wrong puzzle piece goes back to the pile', !!d.querySelector('.pcard[data-k="1"]'));
  // muṣḥaf loop button floats at the bottom
  L.go('mushaf', { i: idx(78), p: 0, sel: null }); await wait(200); w.scrollTo(0, 800); await wait(100);
  const lb = d.querySelector('.mfloat .loopbtn').getBoundingClientRect();
  log('loop button at bottom-right:', Math.round(w.innerHeight - lb.bottom), 'px from bottom,', Math.round(w.innerWidth - lb.right), 'px from right');
  // a done page with a gift has Save progress
  prof().pending = [{ k: 's', id: 'star' }];
  L.go('done', { i: idx(112), p: 0, msg: 'Well done', stars: 1 }); await wait(150);
  log('done page save button:', !!d.querySelector('.donescr [data-act=savefile]'));
  ok('done page has Save progress', !!d.querySelector('.donescr [data-act=savefile]'));
  // word timings snapped, and words stop at the cut
  const t = await (await w.fetch('audio/alafasy/timings.json', { cache: 'no-cache' })).json();
  log('timings snapped:', t.snapped);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
