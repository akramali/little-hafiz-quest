// v2.6.12: the Wise Elder walks with you through the world; at the summit he gives you his staff
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  s0.profiles[0].feats = ['once']; // reached the summit before v2.6.12
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], A = w.LHQ_ART;
  ok('summit reachers get his staff (waiting in a gift)', prof.pending.some((g) => g.id === 'elder-staff'), JSON.stringify(prof.pending));
  const it = A.ITEMS.find((x) => x.id === 'elder-staff');
  ok('the staff is a stick, golden tier, not a starter thing', !!it && it.slot === 'stick' && it.tier === 4 && !!it.quest);
  ok('he can be drawn without his staff', /pr-glow/.test(A.elder('')) && !/pr-glow/.test(A.elder('', true)));
  // the test screen: he walks without his staff now, taller than the explorer, in the world
  L.go('elder', { i: idx(113), p: 0, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }, { k: 1, kind: 'next', cut: 0, throw: 'rock' }, { k: 2, kind: 'next', cut: 0, throw: 'acorn' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: false, rematch: false, result: null, ack: '' });
  await wait(400);
  ok('he walks without it: the explorer is the master', !!d.querySelector('.eldfig svg') && !d.querySelector('.eldfig .pr-glow'));
  const eh = d.querySelector('.eldfig svg').getBoundingClientRect().height, mh = d.querySelector('.mefig svg').getBoundingClientRect().height;
  ok('he is taller than the explorer', eh > mh * 1.1, `${Math.round(eh)} vs ${Math.round(mh)}`);
  ok('they stand in the world: hills, a path, its things', !!d.querySelector('.eldworld .eldland') && d.querySelectorAll('.eldworld .eldprop').length >= 6);
  ok('neutral words: no swords or "challenge"', !/⚔|Challenge/.test(d.querySelector('.eldscr').textContent));
  // a new explorer has his staff on the ground at the summit, not before
  prof.pending = []; prof.items = prof.items.filter((x) => x !== 'elder-staff');
  ['hero-armor', 'hero-shield', 'hero-sword'].forEach((id) => prof.items.push(id));
  L.go('map'); await wait(400);
  ok('then he has his staff again (not given yet), on the Test button', !!d.querySelector('[data-act=challenge] .pr-glow'));
  ok('no temporary Elder button', !d.querySelector('[data-act=eldtest]'));
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
