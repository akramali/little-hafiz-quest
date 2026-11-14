// v2.11.0: a watch shows its real face on the wrist; star badges have their own tab and are pinned on the other
// side of the shirt from the sticker; a game finished the first time always brings something (a bonus sticker when
// nothing else came: the map's things, then gold and shimmer editions)
(async () => {
  // an old save: the 200-stars badge worn as the sticker
  fixture({ stickers: ['moon', 'stars100', 'stars200'], badge: 'stars200' });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const A = w.LHQ_ART, X = w.__lhq, prof = L.store().profiles[0];
  // 1. watches: the worn watch carries its big face's own drawing (the smiley's smile, the rocket's body)
  const worn = (id) => A.explorer(prof.look, { watch: id }, { view: 'front' });
  ok('a worn smiley watch shows the smiley face', worn('smile-watch').includes('M-8.6 3.4Q0 11.6 8.6 3.4'));
  ok('a worn rocket watch shows the rocket', worn('rocket-watch').includes('M0 -13Q6 -6 5 4L-5 4Q-6 -6 0 -13Z'));
  // 2. badges
  ok('an old save: the badge worn as the sticker moves to its own side', prof.medal === 'stars200' && prof.badge === '', prof.badge + '/' + prof.medal);
  L.go('bag', { tab: 'stickers' }); await wait(300);
  ok('the Stickers tab no longer lists badges', !d.querySelector('.wbody [data-id^="stars"]'));
  d.querySelector('[data-act=stick][data-id=moon]').click(); await wait(300);
  L.go('bag', { tab: 'badges' }); await wait(300);
  ok('a Badges tab with the star badges', !!d.querySelector('.wtab[data-t=badges]') && d.querySelectorAll('.wbody [data-act=stick][data-id^="stars"]').length === 2);
  d.querySelector('[data-act=stick][data-id=stars100]').click(); await wait(300);
  ok('a sticker and a badge worn together, one badge at a time', prof.badge === 'moon' && prof.medal === 'stars100', prof.badge + '/' + prof.medal);
  const ex = d.querySelector('.wd-ex svg').outerHTML;
  ok('…both drawn on the shirt, on either side', /<svg x="64" y="163"/.test(ex) && /<svg x="95" y="162"/.test(ex));
  d.querySelector('[data-act=comfy]').click(); await wait(200);
  const off = prof.medal === '' && prof.badge === '';
  d.querySelector('[data-act=comfy]').click(); await wait(200);
  ok('Comfy takes both off, Back puts both back', off && prof.medal === 'stars100' && prof.badge === 'moon');
  // 3. bonus stickers
  ok('290 bonus stickers: 35 from the map, 35 new drawings (v2.11.1), a gold and a shimmer edition of each of the 110', A.STICKERS.filter((x) => x.fill).length === 290 && A.STICKERS.filter((x) => x.foil).length === 220 && A.STICKERS.filter((x) => /^d-/.test(x.id)).length === 35);
  const gold = A.sticker('gold-moon');
  ok('a gold sticker has a foil edge', gold.includes('url(#lhq-foil-gold)'));
  // the order: a new map picture first; with every one of those, a gold edition of one collected (not of one missing)
  prof.pending = [];
  X.bonusSticker(prof);
  const first = prof.pending.pop();
  ok('the first bonus sticker is a new picture (from the map, or a new drawing)', first && /^[pd]-/.test(first.id) && !w.LHQ_ART.STICKERS.find((x) => x.id === first.id).foil, first && first.id);
  const keep = prof.stickers.slice();
  prof.stickers.push(...A.STICKERS.filter((x) => x.fill && !x.foil).map((x) => x.id));
  X.bonusSticker(prof);
  const second = prof.pending.pop();
  ok('…then a gold edition of a sticker already collected', second && /^gold-/.test(second.id) && prof.stickers.includes(second.id.slice(5)), second && second.id);
  prof.stickers = keep;
  // a step finished the first time, with the surprises used up for now: a bonus sticker comes
  prof.stickers = [...new Set([...prof.stickers, ...A.STICKERS.filter((x) => !x.fill).slice(0, 30).map((x) => x.id)])];
  A.ITEMS.filter((it) => it.track && it.track <= 14).forEach((it) => prof.items.includes(it.id) || prof.items.push(it.id)); // (star-track prizes already won: none due)
  prof.pending = []; prof.daily = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  const s0 = JSON.stringify(prof.prog[78]);
  L.go('path', { i: idx(78), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let t = 0; t < 14 && L.st().view === 'path'; t++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(950); }
  await wait(1500);
  log('after Stepping Stones in An-Naba:', L.st().view, '| pending', prof.pending.map((g) => g.id).join(','), '| prog', s0, '→', JSON.stringify(prof.prog[78]));
  ok('a new star with nothing else coming: a bonus sticker', prof.pending.some((g) => g.k === 's' && w.LHQ_ART.STICKERS.find((x) => x.id === g.id && x.fill)), prof.pending.map((g) => g.id).join(','));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
