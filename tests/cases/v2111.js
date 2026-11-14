// v2.11.1: a world badge for every world memorized (a crest in the Badges tab, pinned like a star badge); watches a
// little smaller on the wrist
(async () => {
  const full = (n) => ({ parts: Array.from({ length: n }, () => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: n > 1 ? 3 : 0 });
  // World 1 (114–109): every sūrah memorized but Al-Kāfirūn's Stepping Stones
  const prog = { 114: full(1), 113: full(1), 112: full(1), 111: full(1), 110: full(1), 109: { parts: [{ learn: 1, words: 1, order: 1, next: 1, path: 0, la: 0, wa: 0 }], all: 0 } };
  fixture({ prog });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const A = w.LHQ_ART, prof = L.store().profiles[0];
  ok('seven world badges, each its own crest', A.BADGES.filter((b) => b.world).length === 7 && new Set(A.BADGES.filter((b) => b.world).map((b) => A.sticker(b.id))).size === 7);
  ok('not given before the world is memorized', !prof.pending.some((g) => g.id === 'world1') && !prof.stickers.includes('world1'));
  L.go('bag', { tab: 'badges' }); await wait(300);
  ok('the Badges tab shows it still to win: "Memorize World 1"', /Memorize World 1/.test(d.querySelector('.wbody').textContent));
  prof.daily = '2099-01-01';
  L.go('path', { i: idx(109), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let t = 0; t < 14 && L.st().view === 'path'; t++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(950); }
  await wait(1500);
  log('after Al-Kāfirūn:', L.st().view, '| pending', prof.pending.map((g) => g.id).join(','), '| memo', [...d.querySelectorAll('.memo.gold')].map((m) => m.textContent.trim()).join(' | '));
  ok('memorizing the last sūrah of World 1 brings its badge', prof.pending.some((g) => g.k === 's' && g.id === 'world1'));
  ok('…said on the finish screen', /First Steps! A special badge/.test(d.body.textContent));
  // open it from the gift box and pin it on
  prof.pending = prof.pending.filter((g) => g.id === 'world1');
  L.go('bag', { tab: 'badges' }); await wait(300);
  const gb = d.querySelector('[data-act=opengift], [data-act=gifts], .giftbtn');
  if (gb) { gb.click(); await wait(600); }
  const card = d.querySelector('#modal.show .giftcard');
  log('gift card:', card && card.textContent.replace(/\s+/g, ' ').trim());
  ok('the gift card: for memorizing World 1, "Pin it on!"', !!card && /memorizing every sūrah of World 1/.test(card.textContent) && /Pin it on/.test(card.textContent));
  if (card) { card.querySelector('[data-act=stick]').click(); await wait(600); }
  ok('pinned on the badge side', prof.medal === 'world1', prof.medal);
  // watches: the dial a little smaller (v2.11.1)
  const ex = A.explorer(prof.look, { watch: 'smile-watch' }, { view: 'front' });
  ok('the watch dial on the wrist: radius 7.5', /rx="7.5" ry="7.5"/.test(ex));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
