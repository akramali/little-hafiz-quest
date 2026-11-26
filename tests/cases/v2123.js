// v2.12.3: fair surprises (never the same kind twice in a row, a thing after a sticker, every kind as likely), 28 new
// cool things, and the 99 Names' voices: the nasheed for lines (its words lit as sung), a clear voice for a tapped name,
// and its opening (“He is Allah…”) in Read
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
  // 3. the 99 Names' voices
  const N = S.find((s) => s.n === 207);
  const nt = await (await w.fetch('audio/names-nasheed/timings.json')).json(), st = await (await w.fetch('audio/names-sadiq/timings.json')).json();
  ok('the nasheed: ten lines and the opening, a time for every word', nt.surahs['207'].length === 11 && N.ayat.every((a, k) => nt.surahs['207'][k][2].length === a.ar.split(' ').length) && nt.surahs['207'][10][2].length === N.opening.ar.split(' ').length);
  ok('…in order, each line after the one before', nt.surahs['207'].slice(0, 10).every((l, k, all) => !k || l[0] >= all[k - 1][1] - 0.05));
  ok('the clear voice: ten lines, a time for every name word', st.surahs['207'].length === 10 && N.ayat.every((a, k) => st.surahs['207'][k][2].length === a.ar.split(' ').length));
  L.go('words', { i: idx(207), p: 0, a: 0, w: 3, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  ok('Listen is on the 99 Names now', !!d.querySelector('.listen.show'));
  d.querySelector('[data-act=fab]').click(); await wait(1200);
  const yes = d.querySelector('#modal.show [data-act=dlyes]'); // (a big file asks before it downloads, as long sūrahs do)
  if (yes) yes.click();
  await wait(4000);
  const res = () => w.performance.getEntriesByType('resource').map((e) => e.name);
  ok('a line plays from the nasheed, its words lighting up as sung', res().some((u) => /names-nasheed\/207\.mp3/.test(u)) && w.__lhq.player.currentTime > 0.5 && !!d.querySelector('.wflow > .wbox.heard'), w.__lhq.player.currentTime);
  d.querySelector('[data-act=fab]').click(); await wait(300);
  d.querySelector('[data-act=sayw]').click(); await wait(1200);
  if (d.querySelector('#modal.show [data-act=dlyes]')) d.querySelector('#modal.show [data-act=dlyes]').click();
  await wait(2500);
  ok('a name tapped plays from the clear voice', res().some((u) => /names-sadiq\/207\.mp3/.test(u)));
  L.go('mushaf', { i: idx(207), sel: null }); await wait(300);
  ok('Read: the opening “He is Allah…” above the names', /هُوَ اللَّهُ/.test(d.querySelector('.mbism').textContent));
  const ft = L.fabTarget();
  ok('…and the whole plays it first, then the ten lines', ft.items[0].join() === '207,11' && ft.items.length === 11);
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
