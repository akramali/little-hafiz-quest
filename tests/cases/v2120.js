// v2.12.0: the Hidden Garden (World 8): Al-Fātiḥah, Āyat al-Kursī, the end of Al-Baqarah, Al-Kahf 1–10, Al-Mulk and
// Al-Wāqiʿah, through a gate by the summit; its own map, journal, riddles, treasures, badge, ride and lanterns, its
// stars apart from Juz ʿAmma's
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const S = w.LHQ_DATA.surahs, A = w.LHQ_ART, prof = L.store().profiles[0];
  const G = S.filter((s) => s.garden);
  const full = (n) => ({ parts: Array.from({ length: n }, () => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: n > 1 ? 3 : 0, big: n > 1 ? 1 : 0 });
  const hop = async () => { for (let t = 0; t < 40 && L.st().view === 'path'; t++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(900); } await wait(1500); };
  // 1. the stops
  ok('the Garden’s stops after An-Naba’ (v2.12.2: and the 99 Names), with their āyāt', G.map((s) => s.n).join() === '201,202,203,204,205,206,207' && G.map((s) => s.ayat.length).join() === '7,1,2,10,30,96,10' && S.indexOf(G[0]) === 37);
  ok('the Arabic as in the Juz (open tanween), Āyat al-Kursī: “Allāhu…”, 50 words', G[1].ayat[0].ar.startsWith(String.fromCharCode(0x671, 0x644, 0x644, 0x651, 0x64e, 0x647, 0x64f)) && G[1].ayat[0].ar.split(' ').length === 50 && /[\u08f0-\u08f2]/.test(G[5].ayat.map((a) => a.ar).join('')));
  // 2. Juz ʿAmma's numbers stay its own
  L.go('map'); await wait(1500);
  const hud = d.querySelector('.hud').textContent.replace(/\s+/g, ' ');
  log('Juz HUD', hud);
  ok('Juz ʿAmma: 37 sūrahs and 505 stars, as before', /\/37/.test(hud) && /\/505/.test(hud));
  ok('the map has 37 stops, and a gate by the summit', d.querySelectorAll('#map .node').length === 37 && !!d.querySelector('.mgate8:not(.back)'));
  d.querySelector('[data-act=worlds]').click(); await wait(400);
  ok('the worlds list has the Garden on top as World 8', /World 8/.test(d.querySelector('.wrail').textContent) && !!d.querySelector('.wrail [data-act=garden]'));
  d.querySelector('[data-act=worlds]').click(); await wait(300);
  // 3. through the gate
  d.querySelector('.mgate8').click(); await wait(1600);
  const gnodes = [...d.querySelectorAll('#map .node')].map((b) => +b.dataset.i);
  log('Garden nodes', gnodes.join(), '| HUD', d.querySelector('.hud').textContent.replace(/\s+/g, ' '));
  ok('the Garden: its own map, its six stops (the game’s own numbers on them)', gnodes.join() === G.map((s) => S.indexOf(s)).join() && L.garden() === true);
  ok('…its HUD counts its stops and stars', /\/7/.test(d.querySelector('.hud').textContent) && !/\/505/.test(d.querySelector('.hud').textContent));
  ok('…a sign saying World 8, and the gate back at its start', /World 8/.test(d.querySelector('.msign').textContent) && !!d.querySelector('.mgate8.back'));
  ok('…its own scenery', !!d.querySelector('.mprop[data-k^="garden-"]') && !d.querySelector('.mprop[data-k^="meadow-"]'));
  // its journal: one page, its own look
  L.go('journal'); await wait(300);
  ok('the Garden Journal: its one page, World 8, no tabs', /The Garden Journal/.test(d.body.textContent) && !!d.querySelector('.jbook.jgarden') && !d.querySelector('.jtabs') && /World 8/.test(d.querySelector('.jhead').textContent));
  // its riddles are its own
  const rk = L.riddleNow(prof);
  log('Garden riddle', JSON.stringify(rk));
  ok('a riddle in the Garden is about the Garden', !!rk && (/^garden-/.test(rk[0]) || /^(x:(pomegranate|date)|w:7|s:20[1-6])$/.test(rk[0])), rk && rk[0]);
  L.go('map'); await wait(1200);
  ok('back on the map: still the Garden', d.querySelectorAll('#map .node').length === 7);
  d.querySelector('.mgate8.back').click(); await wait(1600);
  ok('through the gate back: Juz ʿAmma again', d.querySelectorAll('#map .node').length === 37 && L.garden() === false);
  // 4. a stop's page
  L.go('surah', { i: idx(202), p: 0 }); await wait(300);
  log('header', d.querySelector('.bar').textContent.replace(/\s+/g, ' '));
  ok('Āyat al-Kursī: its own name (not 2:255.), World 8, no Bismillah before it', /^Āyat al-Kursī/.test(d.querySelector('.bar-title').textContent.trim()) && /World 8/.test(d.querySelector('.bar').textContent) && !d.querySelector('.bismbtn'), d.querySelector('.bar-title').textContent);
  L.go('mushaf', { i: idx(203), sel: null }); await wait(300);
  ok('Read: the end of Al-Baqarah with its own āyah numbers (285, 286) and no Basmalah', /٢٨٥/.test(d.querySelector('.mtext').textContent) && /٢٨٦/.test(d.querySelector('.mtext').textContent) && !d.querySelector('.mbism'));
  L.go('surah', { i: idx(205), p: 0 }); await wait(300);
  ok('Al-Mulk: 67, with its Bismillah', /67\. Al-Mulk/.test(d.querySelector('.bar').textContent) && !!d.querySelector('.bismbtn'));
  // 5. rewards: memorizing Āyat al-Kursī (its Stepping Stones, every other step done): its treasure and golden edition
  prof.prog[202] = { parts: [{ learn: 1, words: 1, order: 1, next: 1, path: 0, la: 0, wa: 0 }], all: 0 };
  prof.pending = [];
  L.go('path', { i: idx(202), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  await hop();
  log('after Āyat al-Kursī:', prof.pending.map((g) => g.id).join(','));
  ok('memorized: the Guardian shield, and every star: its golden edition', prof.pending.some((g) => g.id === 'guardian-shield') && prof.pending.some((g) => g.id === 'gold-guardian-shield'));
  ok('back to the Garden’s map after a game there', (L.go('map'), await wait(1200), d.querySelectorAll('#map .node').length === 7));
  ok('not one of Juz ʿAmma’s stars', !/\/505/.test(d.querySelector('.hud').textContent));
  // a first finish that brings nothing else: a Garden gift
  prof.prog[201] = { parts: [{ learn: 0, words: 1, order: 0, next: 0, path: 0, la: 0, wa: 0 }], all: 0 };
  prof.pending = []; prof.daily = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  L.go('order', { i: idx(201), p: 0, deck: [0, 1, 2, 3, 4, 5, 6], placed: {}, say: null, sel: null, hearts: 3, maxH: 3 });
  await wait(300);
  const puz = L.st();
  for (let t = 0; t < 7 && L.st().view === 'order'; t++) { const q = puz.deck.find((j) => !puz.placed[j]); puz.placed[q] = true; }
  L.gardenGift(prof); // (as the finish would: the same pool)
  log('Garden gift:', prof.pending.map((g) => g.id).join(','));
  ok('a Garden gift: one of its editions of everyday things', prof.pending.some((g) => g.k === 'i' && A.ITEMS.find((it) => it.id === g.id && it.garden === 'drop')));
  // 6. the lanterns: dark, lit, golden
  prof.prog[204] = full(2); prof.prog[204].parts[0].order = 0; prof.prog[204].all = 3;
  const lan = L.treeInfo(prof).lanterns;
  log('lanterns', lan.join());
  ok('My Tree’s lanterns: Āyat al-Kursī golden, Al-Kahf lit (memorized), the rest dark', lan.join() === '0,2,0,1,0,0,0');
  // 7. every stop memorized: the World 8 badge; every star: the Garden bike
  G.forEach((s) => (prof.prog[s.n] = full(s.P.length)));
  prof.prog[201].parts[0].path = 0;
  prof.pending = []; prof.items = prof.items.filter((id) => id !== 'garden-bike'); prof.stickers = prof.stickers.filter((id) => id !== 'world8');
  L.go('path', { i: idx(201), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  await hop();
  log('after the whole Garden:', prof.pending.map((g) => g.id).join(','));
  ok('the whole Garden memorized: the World 8 badge', prof.pending.some((g) => g.id === 'world8'));
  ok('…and all golden: the Garden bike', prof.pending.some((g) => g.id === 'garden-bike'));
  ok('…Al-Fātiḥah’s Star medallion cape', prof.pending.some((g) => g.id === 'medallion-cape'));
  // 8. a family link carries the Garden (where in it, its riddles, its progress) and a backup too
  prof.gat = 4; prof.griddle = ['2026-11-19', 5, 2, 0, 0];
  const code = await w.LHQ_SYNC.encode(prof, L.syncCtx());
  const back = L.cleanProfile(await w.LHQ_SYNC.decode(code, L.syncCtx()));
  log('round trip: gat', back.gat, 'griddle', JSON.stringify(back.griddle), 'Wāqiʿah', JSON.stringify(back.prog[206] && back.prog[206].parts.length));
  ok('a family link carries the Garden: where in it, its riddles, every stop', back.gat === 4 && back.griddle[1] === 5 && G.every((s) => JSON.stringify(back.prog[s.n].parts.map((x) => x.path)) === JSON.stringify(prof.prog[s.n].parts.map((x) => x.path))));
  const store2 = L.cleanStore(JSON.parse(JSON.stringify(L.store())));
  ok('a backup too', store2.profiles[0].gat === 4 && store2.profiles[0].griddle[1] === 5 && !!store2.profiles[0].prog[206]);
  ok('checkpoint gifts up to Al-Wāqiʿah’s twelfth checkpoint are kept', L.cleanProfile(Object.assign({}, prof, { cpg: ['206:11'] })).cpg.includes('206:11'));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
