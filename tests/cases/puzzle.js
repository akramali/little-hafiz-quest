(async () => { try {
  fixture({ pending: [] });
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  const pick = (j) => { const c = d.querySelector(`.pcard[data-k="${j}"]`); const r = c.getBoundingClientRect(); const o = { bubbles: true, clientX: r.left + 30, clientY: r.top + 30, pointerId: 1 }; c.dispatchEvent(new w.PointerEvent('pointerdown', o)); d.dispatchEvent(new w.PointerEvent('pointerup', o)); };
  const place = async (k, j) => { pick(k); await wait(80); d.querySelector(`.pzslot[data-j="${j}"]`).click(); await wait(150); };
  const solve = async () => { const n = d.querySelectorAll(".pzslot").length + Object.keys(L.st().placed).length; for (let j = 0; j < n; j++) if (!L.st().placed[j]) await place(j, j); };
  // part puzzle, Al-Ikhlāṣ, with a wrong try first
  L.go('surah', { i: idx(112), p: 0 }); await wait(150);
  d.querySelector('.qstep[data-act=order]').click(); await wait(250);
  log('pieces', d.querySelectorAll('.pcard.pzt').length, 'slots', d.querySelectorAll('.pzslot').length);
  const hearts0 = L.st().hearts;
  await place(1, 0);
  log('wrong: placed?', !!L.st().placed[0], 'hearts', hearts0, '→', L.st().hearts);
  ok('wrong piece costs a heart', L.st().hearts === hearts0 - 1);
  await place(0, 0);
  log('right: placed?', !!L.st().placed[0], 'say', L.st().say, 'fab', d.querySelector('.listen small').textContent);
  await solve(); await wait(1800);
  log('finished view', L.st().view, 'order saved', L.store().profiles[0].prog[112].parts[0].order);
  ok('finished puzzle saves', L.st().view === 'done' && L.store().profiles[0].prog[112].parts[0].order === 1);
  // right to left: piece 0 sits at the right
  L.store().prefs.pzrtl = true;
  L.go('surah', { i: idx(112), p: 0 }); await wait(150); d.querySelector('.qstep[data-act=order]').click(); await wait(250);
  const s0 = d.querySelector('.pzslot[data-j="0"]').getBoundingClientRect(), s1 = d.querySelector('.pzslot[data-j="1"]').getBoundingClientRect();
  log('rtl: slot0 right of slot1?', s0.left > s1.left);
  L.store().prefs.pzrtl = false;
  // Big Puzzle on Al-Bayyinah (98): locked until both parts' puzzles are done
  L.go('surah', { i: idx(98), p: 'all' }); await wait(200);
  log('big locked:', !!d.querySelector('.qstep.locked[data-act=biglocked]'));
  prof().prog[98] = { parts: [0, 1].map(() => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 })), all: 0 };
  prof().pending = [];
  L.go('surah', { i: idx(98), p: 'all' }); await wait(200);
  const bigBtn = d.querySelector('.qstep[data-act=order]');
  log('big open:', !!bigBtn);
  bigBtn.click(); await wait(300);
  log('big pieces', d.querySelectorAll('.pcard.pzt').length, 'title', d.querySelector('.bar-title').textContent.trim().slice(0, 30));
  await solve(); await wait(1800);
  log('big finished view', L.st().view, 'big saved', prof().prog[98].big, 'memo', [...d.querySelectorAll('.memo')].map((m) => m.textContent.trim()).join(' | '), 'stars shown', d.querySelectorAll('.trophy-stars span').length);
  ok('Big Puzzle finishes and saves', L.st().view === 'done' && prof().prog[98].big === 1);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
