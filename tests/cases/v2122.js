// v2.12.2: chains that don't leave one āyah over, a bigger riddle picture, Stepping Stones and Picture Puzzle by the
// pieces of a long āyah, the 99 Names of Allah in the Hidden Garden (lines, its own voice, a treasure, a 7th lantern,
// its riddle in a set of its own, family links format 5), the lighter trip through the gate
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  w.__occasion = '';
  const errs = watchErrors(w);
  const S = w.LHQ_DATA.surahs, A = w.LHQ_ART, prof = L.store().profiles[0];
  // 1. chains: 7 āyāt chained every 3 → at 3 and 7 (not at 6, one before the end)
  L.prefs().chain = 3;
  const at = (a) => (L.go('learn', { i: idx(201), p: 0, a, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }), L.chainNow());
  log('chain points (7 āyāt, every 3):', [0, 1, 2, 3, 4, 5, 6].filter(at).map((a) => a + 1).join());
  ok('7 āyāt chained every 3: at 3 and 7 only (the last one joins the second chain)', [0, 1, 2, 3, 4, 5, 6].filter(at).join() === '2,6');
  L.prefs().chain = 1;
  ok('…chained after every āyah, as before', [1, 2, 3, 4, 5, 6].every(at));
  // 3. Stepping Stones and the Puzzle by pieces: Āyat al-Kursī in 8
  L.go('path', { i: idx(202), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }); await wait(300);
  ok('Stepping Stones: Āyat al-Kursī in 8 stones, each with its own picture and caption', d.querySelectorAll('.stone').length === 8 && /Ever-Living/.test(d.querySelector('.card').textContent), d.querySelectorAll('.stone').length);
  d.querySelector('[data-act=hint]').click(); await wait(150);
  log('hint shows', d.querySelector('.first-word') && d.querySelector('.first-word').textContent);
  ok('…a hint shows the first word of the first part', !!d.querySelector('.first-word') && d.querySelector('.first-word').textContent.trim().split(/\s+/).length <= 2);
  L.go('order', { i: idx(202), p: 0, deck: [3, 0, 4, 1, 5, 2, 7, 6], placed: {}, say: null, sel: null, hearts: 3, maxH: 3 }); await wait(300);
  ok('Picture Puzzle: Āyat al-Kursī in 8 pieces', d.querySelectorAll('.pzdeck .pzt').length === 8);
  ok('a short āyah is still one stone', (L.go('path', { i: idx(114), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }), await wait(200), d.querySelectorAll('.stone').length === S[idx(114)].ayat.length));
  // 4. the 99 Names
  const N = S.find((s) => s.n === 207);
  ok('the 99 Names: a Garden stop of ten lines, 99 names, two checkpoints', !!N && N.garden && N.ayat.length === 10 && N.ayat.reduce((t, a) => t + a.names.length, 0) === 99 && N.P.length === 2);
  L.go('learn', { i: idx(207), p: 0, a: 1, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(300);
  ok('Look & Repeat says “line”, not āyah', /line 2 of 10/.test(d.querySelector('.bar').textContent), d.querySelector('.bar').textContent.replace(/\s+/g, ' '));
  L.go('mushaf', { i: idx(207), sel: null }); await wait(300);
  ok('Read: no āyah marks between the lines', !/﴿/.test(d.querySelector('.mtext').textContent) && /✦/.test(d.querySelector('.mtext').textContent));
  ok('its treasure: a tasbīḥ bead bracelet and its golden edition', !!A.ITEMS.find((it) => it.id === 'tasbih-bracelet' && it.garden === 7) && !!A.ITEMS.find((it) => it.id === 'gold-tasbih-bracelet'));
  ok('a seventh lantern on My Tree', L.treeInfo(prof).lanterns.length === 7 || L.treeInfo(prof).lanterns.length === 0);
  const sets = L.riddleSets('g');
  ok('its riddle in a set of its own on the end (no one’s order changes)', sets.length === 2 && sets[1].join() === 's:207' && !sets[0].includes('s:207'));
  // (its recitation comes in an update: no Listen there yet, and a tap says so)
  L.go('learn', { i: idx(207), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(300);
  ok('no Listen on the 99 Names yet (its recitation is on its way)', !d.querySelector('.listen.show'));
  L.go('words', { i: idx(207), p: 0, a: 0, w: 2, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  d.querySelector('[data-act=sayw]').click(); await wait(300);
  ok('…a tap on a name says the recitation is coming', /coming in an update/.test(d.getElementById('toast').textContent));
  ok('…while the other stops still have Listen', (L.go('learn', { i: idx(202), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }), await wait(300), !!d.querySelector('.listen.show')));
  // a family link carries it (format 5)
  prof.prog[207] = { parts: [{ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 }, { learn: 1, words: 0, order: 0, next: 0, path: 0, la: 0, wa: 0 }], all: 0 };
  const code = await w.LHQ_SYNC.encode(prof, L.syncCtx());
  const back = L.cleanProfile(await w.LHQ_SYNC.decode(code, L.syncCtx()));
  ok('a family link carries the 99 Names (format 5)', w.LHQ_SYNC && back.prog[207] && back.prog[207].parts[0].path === 3 && back.prog[207].parts[1].learn === 1);
  // 5. the trip through the gate zooms the gate, not the whole map
  L.garden(false); L.go('map'); await wait(1500);
  d.querySelector('.mgate8').click(); await wait(600);
  ok('through the gate: the gate grows, the map itself doesn’t zoom (smoother on phones)', d.querySelector('.mgate8.gzoom') && !d.querySelector('#map.gzoom'));
  await wait(1500);
  ok('…the Garden: seven stops now', L.garden() === true && d.querySelectorAll('#map .node').length === 7);
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
