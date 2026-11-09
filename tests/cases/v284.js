// v2.8.4: the Summit crown waits for the whole Juz; journal pictures only from begun checkpoints (and the early
// ones tidied away); the Teacher's test grows with the sūrah, has 15 s per answer, and his round stops for the day;
// a revision shows the campfire, not a star; family links carry the game version
(async () => {
  // a crown won too early (An-Naba's first star) and a picture from a checkpoint not begun, saved before v2.8.4
  fixture({ items: ['summit-crown', 'explorer-cap'], outfit: { hat: 'summit-crown' }, found: ['e:🌙', 'e:🏔️', 'e:🐪', 'e:🌋', 'e:🔥', 'e:☀️', 'e:🌍', 'e:🌳', 'p:meadow-sheep'] });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0],
    m = d.getElementById('modal');
  // 1. the crown
  log('items', prof.items.join(','), '| hat', prof.outfit.hat, '| pending', prof.pending.map((g) => g.id).join(','));
  ok('a crown won too early is taken back on loading', !prof.items.includes('summit-crown') && !prof.pending.some((g) => g.id === 'summit-crown') && prof.outfit.hat !== 'summit-crown');
  ok('the rest stays', prof.items.includes('explorer-cap'));
  // 2. the journal: a map thing stays; a picture from a checkpoint with no step finished goes
  log('found', prof.found.join(' '));
  const S = w.LHQ_DATA.surahs,
    inBegun = (e) => S.some((s) => s.P.some((x, q) => { const r = prof.prog[s.n]; const px = r && r.parts[q]; return px && (px.learn || px.words || px.path || px.order) && s.ayat.slice(x.from, x.to + 1).some((a) => a.scene.includes(e)); }));
  ok('map things stay in the journal', prof.found.includes('p:meadow-sheep'));
  ok('pictures from checkpoints not begun are gone', prof.found.length < 9, prof.found.length + ' of 9 left');
  ok('every picture left comes from a begun checkpoint', prof.found.filter((k) => k[0] === 'e').every((k) => inBegun(k.slice(2))));
  // in Look & Repeat of a checkpoint with nothing finished, a picture says to finish a step first
  const naba = S.find((s) => s.n === 78);
  const qNone = naba.P.findIndex((_, q) => !(prof.prog[78].parts[q] || {}).learn && !(prof.prog[78].parts[q] || {}).path);
  L.go('learn', { i: idx(78), p: qNone, a: naba.P[qNone].from, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(400);
  const pic = [...d.querySelectorAll('.e')].find((e) => w.__lhq.journal.has('e:' + e.textContent.trim()) && !prof.found.includes('e:' + e.textContent.trim()));
  if (pic) {
    pic.click(); await wait(200);
    const chip = d.querySelector('.jchip');
    log('chip:', chip && chip.textContent);
    ok('a picture from a checkpoint not begun: "Finish a step here first"', !!chip && chip.classList.contains('locked') && /Finish a step/.test(chip.textContent));
    chip && chip.click(); await wait(200);
    ok('…and it is not added', !prof.found.includes('e:' + pic.textContent.trim()));
  } else log('(no journal picture in that āyah)');
  // 3. the test grows with the sūrah
  const sizes = [112, 97, 91, 88, 78].map((n) => L.elder.size(S.find((s) => s.n === n)));
  log('questions for 112, 97, 91, 88, 78:', sizes.join(', '));
  ok('3 for the short ones, up to 7 for the longest', sizes.join(',') === '3,4,5,6,7');
  // 4. his round: every memorized sūrah practised today → tapping him says they're all roaring
  w.__elderNow = true;
  for (const n in prof.fire) prof.fire[n][0] = Date.now();
  L.go('map'); await wait(1500);
  const el = d.querySelector('.mpal.melder');
  if (el) {
    L.elder.tap(el); await wait(1200);
    log('his card:', m.textContent.trim().slice(0, 90));
    ok('all practised today: he says so in a card (no test)', !!d.querySelector('#modal.show .eldmeet') && /roaring in your heart/.test(m.textContent) && !d.querySelector('[data-act=eldface]'));
    d.querySelector('#modal [data-act=cno]').click(); await wait(200);
  } else log('(the Teacher is not on this map: skipped)');
  // 5. 15 seconds per answer: no answer counts as "Not quite"
  for (const n in prof.fire) prof.fire[n][0] = Date.now() - 2 * 864e5;
  prof.teacherAt = 0;
  L.elder.maybe(); await wait(400);
  d.querySelector('[data-act=eldface]').click(); await wait(300);
  d.querySelector('[data-act=eldgo]').click(); await wait(300);
  ok('a timer bar under the question', !!d.querySelector('.eldq .eldtime'));
  await wait(15600);
  log('after 15.6 s: marks', JSON.stringify(L.st().marks), '| q', L.st().q);
  ok('no answer in 15 s: "Not quite"', L.st().marks[0] === false);
  // 6. a revision: no star, no "stars to your next prize"; the campfire burns up instead
  prof.fire[113][0] = Date.now() - 12 * 864e5;
  L.go('done', { i: idx(113), p: 0, msg: 'Revised', stars: 1, noStar: true, fireFrom: 2 }); await wait(300);
  ok('a revision: no stars, no next-prize note, the campfire burning up', !d.querySelector('.trophy-stars span:not(.firerise):not(.fr-st)') && !d.querySelector('.nextprize') && d.querySelectorAll('.trophy-stars .firerise .fr-st').length === 4);
  // 7. family links carry the version: a newer one asks for the update first
  const raw = JSON.parse(JSON.stringify(prof));
  const code = await w.LHQ_SYNC.encode(raw, Object.assign(w.__lhq.syncCtx(), { version: '99.0.0' }));
  const back = await w.LHQ_SYNC.decode(code, w.__lhq.syncCtx());
  log('the link says version', back.appV);
  ok('the link carries its version', back.appV === '99.0.0');
  L.go('map'); await wait(300);
  L.openSync(code, ''); await wait(800);
  log('sync card:', m.textContent.replace(/\s+/g, ' ').slice(0, 160));
  ok('a link from a newer version: update first (no Sync button)', !!d.querySelector('#modal.show [data-act=syncupd]') && !d.querySelector('#modal.show [data-act=syncdo]'));
  // 8. every sūrah memorized: every design and sticker at once (not their colour and pattern versions), and the crown
  // (changed in the live game: it saves itself as the page reloads)
  S.forEach((x) => (prof.prog[x.n] = { parts: x.P.map(() => ({ learn: 1, words: 0, order: 0, next: 0, path: 3, la: 0, wa: 0 })), all: x.P.length > 1 ? 3 : 0 }));
  w.dispatchEvent(new w.Event('pagehide'));
  const g2 = await openGame(),
    p2 = g2.L.store().profiles[0],
    A = g2.w.LHQ_ART,
    kid = (it) => !it.for || it.for === 'girl';
  const designs = A.ITEMS.filter((it) => (it.drop || it.track) && !it.vof && kid(it)),
    versions = A.ITEMS.filter((it) => (it.drop || it.track) && it.vof && kid(it));
  log('designs owned', designs.filter((it) => p2.items.includes(it.id)).length, 'of', designs.length, '| versions owned', versions.filter((it) => p2.items.includes(it.id)).length, 'of', versions.length, '| stickers', p2.stickers.length);
  ok('every design is theirs', designs.every((it) => p2.items.includes(it.id)));
  ok('colour and pattern versions are still to win', versions.some((it) => !p2.items.includes(it.id) && !p2.pending.some((g) => g.id === it.id)));
  ok('every sticker is theirs', A.STICKERS.every((x) => p2.stickers.includes(x.id)));
  ok('the Summit crown comes now', p2.items.includes('summit-crown') || p2.pending.some((g) => g.id === 'summit-crown'));
  g2.L.go('show'); await wait(300);
  const box = [...g2.d.querySelectorAll('.ach')].find((e) => /things won/.test(e.textContent));
  log('achievements box:', box && box.textContent);
  ok('My Achievements: how many things are won, of how many', !!box && /\d+of \d+ things won/.test(box.textContent.replace(/\s+/g, ' ').replace(/(\d) of/, '$1of')));
  g2.L.go('bag', { tab: 'watch' }); await wait(300);
  log('watch tab note:', g2.d.querySelector('.wnote2').textContent);
  ok('My Explorer: won N of M in each kind', /won \d+ of \d+/.test(g2.d.querySelector('.wnote2').textContent));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
