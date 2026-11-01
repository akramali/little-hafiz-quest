// v2.7.21: winning things back is the gift; the Teacher comes regardless (more often for cold fires); the frog
// lands on the bank and slips in after a mistake; apples in the meadow, ice at the peak
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const p = L.store().profiles[0], X = L.elder;
  // 1. winning back what fell: no extra gift on top
  // (everything her stars have earned already opened, so anything new would be an extra gift)
  p.pending.forEach((g) => (g.k === 'i' ? p.items : p.stickers).includes(g.id) || (g.k === 'i' ? p.items : p.stickers).push(g.id));
  if (!p.items.includes('explorer-cap')) p.items.push('explorer-cap');
  p.lost = [{ id: 'explorer-cap', n: 113 }]; p.fix = [113]; p.daily = ''; p.pending = [];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 14 && L.st().view === 'path'; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(1100); }
  ok('the cap is back, and that is the gift (nothing else waiting)', !p.lost.length && p.pending.length === 0, JSON.stringify(p.pending));
  // 2. the Teacher's own visit with every fire burning: he still comes
  for (const n in p.fire) p.fire[n][0] = Date.now() - 2 * 864e5;
  p.fix = []; p.rematch = []; p.rematchReady = []; p.elderAt = 0;
  L.go('map'); await wait(1200);
  w.__elderNow = true; X.maybe(); await wait(300); w.__elderNow = false;
  ok('every fire burning: he still comes now and then', !!d.querySelector('#modal.show .eldmeet'));
  d.getElementById('modal').click(); await wait(200);
  // 3. the worlds' throws
  ok('the peak throws ice; the meadow, apples', X.WORLD_THROWS[6].includes('ice') && d.querySelector('.msign') && [...d.querySelectorAll('.msign')].some((m) => /🍎/.test(m.textContent)));
  ok('jackets and winter hats keep off the ice; a cap does not', X.blocksOf('hoodie').includes('ice') && X.blocksOf('beanie').includes('ice') && X.blocksOf('earflap-hat').includes('ice') && !X.blocksOf('explorer-cap').includes('ice'));
  // 4. the frog slips in after a mistake (and climbs back)
  p.prog[113].parts[0].learn = 1; p.prog[113].parts[0].words = 1;
  L.go('path', { i: idx(113), p: 0, L: 2, k: 1, hint: 0, hints: 0, hearts: 3, maxH: 3 }); await wait(400);
  const fr = d.querySelector('.stone.cur .frog');
  d.querySelector('[data-act=oops]').click(); await wait(200);
  ok('a mistake: the frog slips into the water', fr.getAnimations().length > 0);
  // room above the stones for "tap me!"
  await wait(1200);
  const lb = d.querySelector('.stream > .taplbl'), lr = lb.getBoundingClientRect(), sr = d.querySelector('.stream').getBoundingClientRect(), fq = d.querySelector('.stone.cur .frog').getBoundingClientRect();
  ok('"tap me!" shows whole, above the frog', lb.style.display !== 'none' && lr.top >= sr.top && lr.bottom <= fq.top + 6 && Math.abs((lr.left + lr.right) / 2 - (fq.left + fq.right) / 2) < 6, `${Math.round(lr.top)}-${Math.round(lr.bottom)} stream ${Math.round(sr.top)} frog ${Math.round(fq.top)}`);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
