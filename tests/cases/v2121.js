// v2.12.1: the Hidden Garden fine-tuned: its stars bring gifts, every riddle there has something to find, its pavilion
// can be tapped, one gate (no label) and a trip through it, a fuller garden, Word Steps a sentence at a time for long
// āyāt, lanterns only once lit, new bags and toy vehicles, heels from behind
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const S = w.LHQ_DATA.surahs, A = w.LHQ_ART, prof = L.store().profiles[0];
  d.documentElement.style.scrollBehavior = 'auto';
  // 1. the gate by the summit: no label; through it, an animated trip
  L.go('map'); await wait(1500);
  ok('the gate by the summit has no label', !!d.querySelector('.mgate8') && !d.querySelector('.mg8-lab') && !/Hidden Garden/.test(d.querySelector('.mgate8').textContent));
  d.querySelector('.mgate8').click(); await wait(800);
  ok('through the gate: a glow fills the screen and the map zooms in', !!d.querySelector('.gtrip.in') && d.querySelector('#map').classList.contains('gzoom'));
  await wait(1500);
  ok('…and the Garden comes up', L.garden() === true && d.querySelectorAll('#map .node').length === 6);
  // 2. the Garden: fuller, one gate, every riddle has something to find
  const kinds = new Set([...d.querySelectorAll('#map .mprop')].map((e) => e.dataset.k));
  log('Garden scenery', d.querySelectorAll('#map .mprop').length, [...kinds].join());
  ok('a fuller Garden: cypresses, hedges, tulips, urns among the rest', ['garden-cypress', 'garden-hedge', 'garden-tulips', 'garden-urn', 'garden-orangetree'].every((k) => kinds.has(k)) && d.querySelectorAll('#map .mprop').length >= 25);
  ok('one gate in the Garden (the arch is a rose arbour now, no door)', d.querySelectorAll('.mgate8').length === 1);
  const target = (k) => (k[0] === 's' && k[1] === ':' ? d.querySelector(`#map .node[data-i="${idx(+k.slice(2))}"]`) : k === 'w:7' ? d.querySelector('#map .msign[data-w="7"]') : k === 'x:pomegranate' ? d.querySelector('#map .mprop[data-k="garden-pomtree"]') : k === 'x:date' ? d.querySelector('#map .mprop[data-k="garden-palm"]') : d.querySelector(`#map .mprop[data-k="${k}"], #map .msummit[data-k="${k}"]`));
  const gk = L.riddleKeys('g'), miss = gk.filter((k) => !target(k));
  log('Garden riddles', gk.join());
  ok('every Garden riddle has its answer on the Garden map', gk.length > 10 && !miss.length, miss.join());
  // the pavilion: tap it, it lights up, and it can go in the journal
  const pav = d.querySelector('#map .msummit[data-k="garden-pavilion"]');
  pav.scrollIntoView({ block: 'center' }); await wait(300);
  pav.click(); await wait(200);
  ok('the pavilion lights up when tapped', pav.classList.contains('poke-shine'));
  ok('…and can be added to the journal', !!d.querySelector('.jchip') && /Add to journal/.test(d.querySelector('.jchip').textContent));
  // 3. the Garden's stars bring gifts (a star counted in the Garden's own count)
  const today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  prof.daily = today; prof.pending = [];
  A.ITEMS.filter((it) => it.track && it.track <= 40).forEach((it) => prof.items.push(it.id)); // (the sample explorer's star-track prizes, as if opened long ago)
  // 4. Word Steps a piece at a time: Āyat al-Kursī in eight
  ok('Āyat al-Kursī in eight pieces of 4 to 8 words; a short āyah stays whole', L.pieces(S[idx(202)].ayat[0].ar).length === 8 && L.pieces(S[idx(202)].ayat[0].ar).every(([a, b]) => b - a + 1 >= 4 && b - a + 1 <= 8) && L.pieces(S[idx(114)].ayat[0].ar).length === 1);
  L.go('words', { i: idx(202), p: 0, a: 0, w: 1, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  ok('Word Steps shows only the first piece (7 words) and eight little part buttons', d.querySelectorAll('.wflow > .wbox').length === 7 && d.querySelectorAll('.wpcs button').length === 8 && /part 1 of 8/.test(d.querySelector('.wcount').textContent));
  let pieces = 0;
  for (let t = 0; t < 12 && L.st().view === 'words'; t++) {
    L.go('words', Object.assign({}, L.st(), { phase: 'recall', shown: [] }));
    await wait(120);
    for (let q = 0; q < 12 && d.querySelector('[data-act=wreveal]'); q++) { d.querySelector('[data-act=wreveal]').click(); await wait(40); }
    const nx = d.querySelector('.row [data-act=wpiece]');
    if (nx) { pieces++; nx.click(); await wait(150); } else { d.querySelector('[data-act=wdone]').click(); await wait(1500); }
  }
  log('after Word Steps:', L.st().view, 'pieces', pieces, 'pending', prof.pending.map((g) => g.id).join(), 'done stars', !!d.querySelector('.trophy-stars .tstar'));
  ok('…one piece after another, then done', pieces === 7 && L.st().view === 'done');
  ok('a Garden star counts: a star on the done page (not a revision)', !L.st().noStar && L.st().gained === 1 && !!d.querySelector('.trophy-stars .tstar'));
  ok('…and a gift from the Garden', prof.pending.some((g) => (g.k === 'i' && A.ITEMS.find((it) => it.id === g.id && it.garden === 'drop')) || (g.k === 's' && A.STICKERS.find((x) => x.id === g.id && x.garden))));
  ok('…no Juz ʿAmma “next prize” line in the Garden', !d.querySelector('.nextprize'));
  // 5. lanterns only once lit
  ok('My Tree: no lanterns waiting dark', !/#5d6a8c/.test(A.tree({ seed: 1, size: 0.1, leaves: 10, blossoms: [], flowers: [], fruits: [], lanterns: [0, 0, 0, 0, 0, 0] }).svg) && /#fff3b0/.test(A.tree({ seed: 1, size: 0.1, leaves: 10, blossoms: [], flowers: [], fruits: [], lanterns: [1, 0, 0, 0, 0, 0] }).svg));
  // 6. My Achievements as it was
  L.go('show'); await wait(300);
  ok('My Achievements: no Garden box', !/Garden stops/.test(d.body.textContent));
  // 7. new things to win, drawn front and back
  const IT = (id) => A.ITEMS.find((it) => it.id === id);
  ok('six toy vehicles among the everyday surprises', ['fire-truck', 'ambulance', 'police-car', 'crane-truck', 'digger', 'school-bus'].every((id) => IT(id) && IT(id).drop && IT(id).slot === 'pet' && /<path/.test(A.explorer({}, { pet: id }, { view: 'front' }))));
  ok('five bags among the Garden’s surprises', ['hiking-pack', 'messenger-bag', 'tassel-pouch', 'basket-pack', 'duffel-bag'].every((id) => IT(id) && IT(id).garden === 'drop' && IT(id).slot === 'bag' && A.explorer({}, { bag: id }, { view: 'back' }) !== A.explorer({}, {}, { view: 'back' })));
  ok('from behind, shoes show their heels (no frog face)', A.explorer({}, { shoes: 'frog-boots' }, { view: 'back' }) !== A.explorer({}, { shoes: 'frog-boots' }, { view: 'front' }).replace('ex-front', 'ex-back') && !/r="1\.7"/.test(A.explorer({}, { shoes: 'frog-boots' }, { view: 'back' })));
  // 8. back through the Garden's gate
  L.garden(true); L.go('map'); await wait(1500);
  d.querySelector('.mgate8.back').click(); await wait(2200);
  ok('back through the gate: Juz ʿAmma', L.garden() === false && d.querySelectorAll('#map .node').length === 37);
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
