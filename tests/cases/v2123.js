// v2.12.3: fair surprises (never the same kind twice in a row, a thing after a sticker, every kind as likely), 28 new
// cool things, and the 99 Names' voices: the nasheed for lines (its words lit as sung), a clear voice for a tapped name,
// and its opening (“He is Allah…”) in Read (v2.12.4: its recordings taken out again)
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  w.__occasion = '';
  const errs = watchErrors(w);
  const S = w.LHQ_DATA.surahs, A = w.LHQ_ART, prof = L.store().profiles[0];
  const IT = (id) => A.ITEMS.find((it) => it.id === id);
  // 1. fair surprises: twelve explorers, thirty surprises each
  const kindOf = (g) => (g.k === 's' ? 's' : IT(g.id).slot);
  let repeats = 0, minItems = 1, maxItems = 0, minSlots = 99;
  for (let e = 0; e < 12; e++) {
    prof.pending = []; prof.items = []; prof.stickers = []; prof.got = [];
    for (let t = 0; t < 30; t++) L.surprise(prof, false, true);
    const ks = prof.pending.map(kindOf);
    repeats += ks.filter((k, j) => j && k === ks[j - 1]).length;
    const share = ks.filter((k) => k !== 's').length / ks.length;
    minItems = Math.min(minItems, share); maxItems = Math.max(maxItems, share);
    minSlots = Math.min(minSlots, new Set(ks.slice(0, 10).filter((k) => k !== 's')).size);
  }
  log('12 explorers × 30 surprises: same kind twice in a row', repeats, '| things', Math.round(minItems * 100) + '–' + Math.round(maxItems * 100) + '% | kinds of thing in the first ten, at least', minSlots);
  ok('never the same kind of surprise twice in a row', repeats === 0);
  ok('every explorer gets plenty of things to wear (not mostly stickers)', minItems >= 0.5);
  ok('…of many kinds (at least 4 kinds of thing in the first ten)', minSlots >= 4);
  prof.pending = [{ k: 's', id: A.STICKERS[0].id }];
  L.bonusSticker(prof);
  ok('after a sticker, a level’s “nothing else came” gift is a thing, not a second sticker', prof.pending.length === 2 && prof.pending[1].k === 'i');
  // 2. the new things
  const NEW = ['mirror-shades', 'catseye-shades', 'wrap-shades', 'neon-shades', 'hex-shades', 'aurora-watch', 'ocean-watch', 'thunder-watch', 'paw-watch', 'planet-watch', 'light-pole', 'rope-staff', 'carved-staff', 'pro-pole',
    'trucker-cap', 'glow-cap', 'camo-cap', 'straw-hat', 'propeller-cap', 'safari-helmet', 'lightup-sneakers', 'skate-shoes', 'snow-boots', 'racing-sneakers', 'keychain-pack', 'belt-bag', 'rolltop-pack', 'glow-pack'];
  const bad = NEW.filter((id) => !IT(id) || !IT(id).drop || !/<path/.test(A.item(id)) || A.explorer({}, { [IT(id).slot]: id }, { view: 'front' }) === A.explorer({}, {}, { view: 'front' }) && A.explorer({}, { [IT(id).slot]: id }, { view: 'back' }) === A.explorer({}, {}, { view: 'back' }));
  ok('28 new cool things among the surprises, each drawn and worn', !bad.length, bad.join());
  const NEW4 = ['raglan-tee', 'rugby-shirt', 'zip-hoodie', 'denim-jacket', 'knit-sweater', 'star-pants', 'zip-pants', 'earmuffs', 'tote-bag', 'canvas-sneakers', 'slip-ons', 'galaxy-cape', 'lightning-cape', 'neon-shield', 'compass-shield', 'flame-shades', 'led-visor', 'heart-watch', 'fishing-rod'];
  const bad4 = NEW4.filter((id) => !IT(id) || !IT(id).drop || !/<path/.test(A.item(id)) || A.explorer({}, { [IT(id).slot]: id }, { view: 'front' }) === A.explorer({}, {}, { view: 'front' }) && A.explorer({}, { [IT(id).slot]: id }, { view: 'back' }) === A.explorer({}, {}, { view: 'back' }));
  ok('v2.12.4: 19 more, everyday and cool, each drawn and worn', !bad4.length, bad4.join());
  // (v2.12.5) for girls: 16 hijab styles and 11 flowery, pastel things, girls only; a boy never gets one, a girl gets hijabs
  const GIRL5 = ['hijab-blossom', 'hijab-daisy', 'hijab-leaves', 'hijab-hearts', 'hijab-clouds', 'hijab-gingham', 'hijab-strawberry', 'hijab-pastel-rainbow', 'hijab-butterfly', 'hijab-tiedye', 'hijab-bow', 'hijab-galaxy', 'hijab-sunset', 'hijab-sparkle', 'hijab-flowercrown', 'hijab-pearls',
    'flower-crown', 'ruffle-blouse', 'pastel-cardigan', 'floral-pants', 'flower-purse', 'bow-backpack', 'ballet-flats', 'flower-glasses', 'lace-parasol', 'petal-cape', 'bow-watch',
    // v2.12.6
    'hijab-lemonade', 'hijab-cherries', 'hijab-pastel-stars', 'hijab-watermelon', 'hijab-lilac-lace', 'hijab-moons', 'hijab-rainbow-glitter', 'heart-purse', 'sparkle-sneakers', 'pearl-bracelet', 'flower-dress', 'bunny-buddy', 'flower-basket', 'lace-cape'];
  const girlLook = { skin: 2, hair: 'hijab', hairColor: 0, hijabColor: 2, kid: 'girl' };
  const bad5 = GIRL5.filter((id) => !IT(id) || !IT(id).drop || IT(id).for !== 'girl' || !/<path/.test(A.item(id)) || (A.explorer(girlLook, { [IT(id).slot]: id }, { view: 'front' }) === A.explorer(girlLook, {}, { view: 'front' }) && A.explorer(girlLook, { [IT(id).slot]: id }, { view: 'back' }) === A.explorer(girlLook, {}, { view: 'back' })));
  ok('v2.12.5–6: 41 new things for girls (23 hijab styles), each drawn and worn', !bad5.length, bad5.join());
  const runFor = (kid) => {
    prof.look = Object.assign({}, prof.look, kid === 'girl' ? girlLook : { hair: 'short', kid: 'boy' });
    prof.pending = []; prof.items = []; prof.stickers = []; prof.got = [];
    for (let t = 0; t < 60; t++) L.surprise(prof, false, true);
    return prof.pending.filter((g) => g.k === 'i').map((g) => IT(g.id));
  };
  const boyGot = runFor('boy'), girlGot = runFor('girl');
  log('60 surprises: a boy got', boyGot.filter((it) => it.for === 'girl').length, 'girls’ things; a girl got', girlGot.filter((it) => it.slot === 'hijab').length, 'hijabs and', girlGot.filter((it) => it.for === 'girl' && it.slot !== 'hijab').length, 'other girls’ things');
  ok('a boy never gets the girls’ things; a girl gets hijabs and flowery things among her surprises', !boyGot.some((it) => it.for === 'girl') && girlGot.filter((it) => it.slot === 'hijab').length >= 3 && girlGot.some((it) => it.for === 'girl' && it.slot !== 'hijab'));
  // (v2.12.4) a sticker and a badge are drawn over a hijab's drape, not under it
  const hj = A.explorer({ skin: 3, hair: 'hijab', hairColor: 0, hijabColor: 2, kid: 'girl' }, { sticker: 'moon', medal: 'stars100' }, { view: 'front' });
  ok('a sticker and a badge show over a hijab', hj.indexOf('<svg x="64" y="163"') > hj.indexOf('class="ex-head"') && hj.indexOf('<svg x="95" y="162"') > hj.indexOf('class="ex-head"'));
  // 3. the 99 Names: no recitation (v2.12.4: both recordings taken out): no Listen, a tap says it's coming; its opening still in Read
  const N = S.find((s) => s.n === 207);
  ok('the 99 Names have no voice for now', N.silent && !N.voice && !N.wordVoice);
  L.go('words', { i: idx(207), p: 0, a: 0, w: 3, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  ok('no Listen on the 99 Names', !d.querySelector('.listen.show'));
  d.querySelector('[data-act=sayw]').click(); await wait(300);
  ok('…a tap on a name says the recitation is coming', /coming in an update/.test(d.getElementById('toast').textContent));
  ok('…its recordings are gone from the game', (await w.fetch('audio/names-nasheed/timings.json')).status === 404 && (await w.fetch('audio/names-sadiq/207.mp3')).status === 404);
  L.go('mushaf', { i: idx(207), sel: null }); await wait(300);
  ok('Read: the opening “He is Allah…” still above the names', /هُوَ اللَّهُ/.test(d.querySelector('.mbism').textContent));
  // (v2.12.6) the Grown-up Corner shares the game itself
  let shared = null;
  Object.defineProperty(w.navigator, 'share', { value: (o) => ((shared = o), Promise.resolve()), configurable: true });
  L.go('settings'); await wait(300);
  d.querySelector('[data-act=shareapp]').click(); await wait(300);
  ok('Share the game: the phone’s share menu with the game’s own address', !!shared && /^https:\/\/akramali\.github\.io\/little-hafiz-quest\/$/.test(shared.url) && /Little Hafiz Quest/.test(shared.title), shared && shared.url);
  Object.defineProperty(w.navigator, 'share', { value: undefined, configurable: true });
  let copied = null;
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: (t) => ((copied = t), Promise.resolve()) }, configurable: true });
  d.querySelector('[data-act=shareapp]').click(); await wait(300);
  ok('…without a share menu, the link is copied', copied === 'https://akramali.github.io/little-hafiz-quest/' && /Link copied/.test(d.getElementById('toast').textContent));
  // (v2.12.7) fixes: stickers fully still (a windmill's blades on its white edge), a long āyah's later stones small and
  // unnumbered, a riddle's picture on its own, the special day's lights under the "Updated" note, a solid status-bar strip
  ok('a sticker has no moving parts (the windmill’s blades stay on its white edge)', !/class="(pr-|lhq-(?!art))/.test(A.sticker('p-windmill')) && !/pr-spin/.test(A.sticker('p-lighthouse')));
  L.go('path', { i: idx(98), p: 1, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }); await wait(300);
  const pcs = [...d.querySelectorAll('.stone.pc')];
  ok('Stepping Stones: a long āyah’s later parts are small stones with no “8·2” numbers', pcs.length === 3 && pcs.every((x) => !/\d/.test(x.textContent)) && !/·/.test(d.querySelector('.stream').textContent));
  w.__occasion = 'jumuah'; L.go('splash'); await wait(400);
  ok('the start screen’s lights are inside it (so the “Updated” note covers them)', !!d.querySelector('.splash .festive'));
  w.__occasion = '';
  L.go('bag', { tab: 'hat' }); await wait(300);
  ok('the strip behind the status bar: a solid color, the same as the bar’s', d.documentElement.style.getPropertyValue('--topbar') === d.querySelector('meta[name="theme-color"]').getAttribute('content') && w.getComputedStyle(d.body, '::before').backdropFilter === 'none');
  // (v2.12.8) My Achievements: every box with its total; āyāt counted from Juz ʿAmma only; no ".0"
  prof.look = Object.assign({}, prof.look, { hair: 'short', kid: 'boy' });
  const a0 = L.achievements(prof);
  prof.prog[201] = { parts: [{ learn: 1, words: 0, order: 0, next: 0, path: 0, la: 0, wa: 0 }], all: 0 };
  ok('the Garden’s āyāt don’t count toward the 564 of Juz ʿAmma', L.achievements(prof).ayat === a0.ayat && a0.allAyat === 564);
  L.go('show'); await wait(300);
  const grid = d.querySelector('.achgrid').textContent;
  log('achievements', grid.replace(/\s+/g, ' '));
  ok('My Achievements: sūrahs “of 37 … learned”, badges “of 15” (v2.13.0: + two streak badges), things “of 421” for a boy', /of 37 sūrahs learned/.test(grid) && /of 15 badges/.test(grid) && /of 421 things won/.test(grid) && /of 564 āyāt learned/.test(grid));
  ok('…a whole percentage without “.0”', !/\.0%/.test(grid) && /\d%/.test(grid));
  // (v2.12.9) How to play: the campfire burns up from out to roaring and back down, its word under it
  L.go('settings'); await wait(300);
  d.querySelector('[data-act=howto]').click(); await wait(400);
  for (let q = 0; q < 10 && !/campfires/.test(d.querySelector('#modal').textContent); q++) { [...d.querySelectorAll('#modal [data-act=intro]')].pop().click(); await wait(250); }
  const words = [...d.querySelectorAll('.cfcycle .cfword')].map((x) => x.textContent).join(',');
  ok('How to play: the campfire roaring, down to out, then roaring again (v2.12.15)', d.querySelectorAll('.cfcycle .cfstep').length === 6 && words === 'Roaring,Strong,Steady,Low,Embers,Out', words);
  // (v2.12.10) its journal card taps a sheep into the book; a card of the tree growing; a crisp stopwatch
  for (let q = 0; q < 10 && !/Fill your journal/.test(d.querySelector('#modal').textContent); q++) { [...d.querySelectorAll('#modal [data-act=intro]')].pop().click(); await wait(250); }
  ok('How to play: a sheep tapped flies into the journal', !!d.querySelector('.jtap .jt-fly svg') && !!d.querySelector('.jtap .jt-book svg'));
  [...d.querySelectorAll('#modal [data-act=intro]')].pop().click(); await wait(400);
  ok('…then the tree growing (shown at once)', /Watch your tree grow/.test(d.querySelector('#modal').textContent) && d.querySelectorAll('.treegrow .tg-step').length >= 1);
  await wait(2500);
  ok('…in six stages, the rest drawn in quiet moments', d.querySelectorAll('.treegrow .tg-step').length === 6, d.querySelectorAll('.treegrow .tg-step').length);
  [...d.querySelectorAll('#modal [data-act=intro]')].pop().click(); await wait(300);
  ok('…and a little every day, with a drawn stopwatch (not the blurry emoji)', /A little every day/.test(d.querySelector('#modal').textContent) && !!d.querySelector('.clockart svg') && !/⏱️/.test(d.querySelector('.intart').textContent));
  d.querySelector('#modal [data-act=cno]') && d.querySelector('#modal [data-act=cno]').click();
  // (v2.12.11) the tree blossoms from 15%, fruits from 25%; eight kinds, bananas last at ~78%
  const kindsAt = (z) => [...new Set(L.treeInfo(prof, z).fruits)];
  ok('tree: no blossoms at 14%, blossoms at 15%, no fruit before 25%', L.treeInfo(prof, 0.14).blossoms.length === 0 && L.treeInfo(prof, 0.15).blossoms.length > 0 && L.treeInfo(prof, 0.24).fruits.length === 0 && L.treeInfo(prof, 0.25).fruits.length > 0);
  ok('…eight fruits, bananas from ~78% (not at 76%)', w.LHQ_ART.FRUIT_TYPES.length === 8 && kindsAt(0.79).includes('banana') && !kindsAt(0.76).includes('banana'), kindsAt(0.79).join(','));
  prof.time = 0; L.go('show'); await wait(300);
  ok('no time yet: “0 min spent learning”', /0 minspent learning/.test(d.querySelector('.achgrid').textContent.replace(/\s+/g, '')) || /0 min/.test(d.querySelector('.achgrid').textContent));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
