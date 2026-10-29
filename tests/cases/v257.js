(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = L.store().profiles[0], A = w.LHQ_ART;
  const m = d.getElementById('modal');
  // 1. a gift opened, then a tap outside the card
  prof.pending = [{ k: 's', id: A.STICKERS[2].id }, { k: 's', id: A.STICKERS[4].id }];
  L.go('done', { i: idx(107), p: 0, msg: 'x' }); await wait(200);
  d.querySelector('.giftbtn').click(); await wait(100);
  d.querySelector('#modal.show .gbox').click(); await wait(150);
  m.click(); await wait(200); // the backdrop
  log('gift opened, tapped outside: card closed', !m.classList.contains('show'), '| page says', (d.querySelector('.giftbtn b') || {}).textContent);
  d.querySelector('.giftbtn').click(); await wait(100);
  log('  the next gift opens from the page:', !!d.querySelector('#modal.show .gbox'));
  d.querySelector('#modal.show .gbox').click(); await wait(150);
  m.click(); await wait(200);
  log('  last one, tapped outside: closed', !m.classList.contains('show'), '| gift button left', !!d.querySelector('.giftbtn'), '| buttons work:', (() => { d.querySelector('[data-act=back]').click(); return L.st().view; })());
  ok('tapping outside an opened gift closes it and the page updates', !m.classList.contains('show') && !d.querySelector('.giftbtn'));
  // 2. chain default
  log('chain default', L.store().prefs.chain, '(old phones that never chose one get 3 too)');
  ok('chain every 3 by default', L.store().prefs.chain === 3);
  // 3. Look & Repeat: tapping the āyah doesn't play it
  L.go('learn', { i: idx(112), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(200);
  const ar = d.querySelector('.lcard .ar');
  log('Look & Repeat āyah tappable to play:', ar.hasAttribute('data-act'));
  ok('Look & Repeat: tapping the āyah does not play it', !ar.hasAttribute('data-act'));
  // 4. hearts note: only with both quests done
  const r = prof.prog[112] = { parts: [{ learn: 1, words: 0, order: 0, next: 0, path: 0, la: 0, wa: 0 }], all: 0 };
  L.go('surah', { i: idx(112), p: 0 }); await wait(200);
  const note1 = /careful/.test(d.querySelector('.qsep').textContent);
  r.parts[0].words = 1;
  L.go('surah', { i: idx(112), p: 0 }); await wait(200);
  const note2 = /careful/.test(d.querySelector('.qsep').textContent);
  log('hearts note: Look & Repeat only', note1, '| both quests', note2);
  ok('hearts note only once both quests are done', !note1 && note2);
  // 5. Read focus closes with the card shrinking and the page unblurring
  L.go('mushaf', { i: idx(112), p: 0, sel: 1, focus: true }); await wait(400);
  d.querySelector('.mfx').click(); await wait(60);
  const mid = { card: !!d.querySelector('.mfcard'), blurClass: !!d.querySelector('.mushaf.focusing'), filter: getComputedStyle(d.querySelector('.mtext')).filter };
  await wait(400);
  log('focus ✕: mid-close card still there', mid.card, '| page unblurring', !mid.blurClass, mid.filter, '| after: card', !!d.querySelector('.mfcard'), 'sel', L.st().sel);
  ok('focus card shrinks away while the page unblurs', mid.card && !mid.blurClass && !d.querySelector('.mfcard') && L.st().sel == null);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
