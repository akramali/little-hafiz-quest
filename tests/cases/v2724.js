// v2.7.24: a gift with a pattern can be tapped; six campfire steps; hearts later; the frog lands on the next set;
// the Stranger at the end of a world memorized
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const p = L.store().profiles[0], A = w.LHQ_ART;
  // 1. a patterned gift: its buttons can be tapped (an invisible pattern box covered them)
  p.pending = [{ k: 'i', id: A.ITEMS.find((it) => it.pat && it.slot === 'hat').id }];
  L.go('map'); await wait(1300);
  d.querySelector('[data-act=opengift]').click(); await wait(1600);
  const yay = d.querySelector('#modal [data-act=giftok]'), r = yay.getBoundingClientRect();
  ok('a patterned gift: its buttons are on top', d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).closest('button') === yay);
  yay.click(); await wait(400);
  // 2. the campfire: a step every few days, with its word
  const words = [];
  for (const days of [1, 5, 8, 12, 16, 22]) { p.fire[113] = [Date.now() - days * 864e5, 0]; L.go('surah', { i: idx(113), p: 0 }); await wait(120); words.push(d.querySelector('.herofire').textContent.trim()); }
  ok('roaring, strong, steady, low, embers, out', words.join(',') === 'Roaring,Strong,Steady,Low,Embers,Out', words.join(','));
  // 3. hearts: 3 until the Starry Path is done
  const all = (n) => w.LHQ_DATA.surahs.filter((s) => s.n >= n).forEach((s) => (p.prog[s.n] = { parts: s.parts.map(() => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: s.parts.length > 1 ? 3 : 0 }));
  all(97); // the first three worlds
  L.go('surah', { i: idx(100), p: 0 }); await wait(200);
  ok('three worlds done: still 3 hearts', /3 hearts/.test(d.body.textContent), (d.body.textContent.match(/\d hearts/) || [''])[0]);
  // 4. the frog onto the next set of stones: lands right on its stone
  L.go('path', { i: idx(100), p: 'all', L: 2, k: 9, hint: 0, hints: 0, hearts: 3, maxH: 3 }); await wait(600);
  const sets = d.getElementById('stsets'), nx = d.querySelector('.stone[data-j="10"]'), nr = nx.getBoundingClientRect();
  const want = nr.left - (sets.clientWidth - sets.scrollLeft);
  d.querySelector('[data-act=hop]').click(); await wait(1600);
  const cr = d.querySelector('.stone.cur').getBoundingClientRect();
  ok('the frog jumps to where its next stone will be', Math.abs(cr.left - want) < 6, `${Math.round(cr.left)} vs ${Math.round(want)}`);
  // 5. the Stranger: comes when a world is memorized (once), with the Teacher; nothing lost
  p.strangers = [0, 1]; // (worlds 1 and 2 already visited)
  const lostBefore = p.lost.length, itemsBefore = p.items.length;
  L.go('surah', { i: idx(100), p: 0 }); await wait(100); L.go('map'); await wait(1500);
  ok('world 3 memorized: the Stranger comes', L.st().view === 'stranger' && L.st().w === 2 && /Shining Sands/.test(d.body.textContent), L.st().view + ' ' + L.st().w);
  for (let k = 0; k < 8 && L.st().view === 'stranger'; k++) { d.querySelector('[data-act=strnext]').click(); for (let t = 0; t < 60 && d.querySelector('[data-act=strnext][disabled]'); t++) await wait(100); await wait(150); }
  await wait(1400);
  ok('three tries, then he goes: back on the map, nothing lost or won', L.st().view === 'map' && p.strangers.includes(2) && p.lost.length === lostBefore && p.items.length === itemsBefore);
  L.go('surah', { i: idx(100), p: 0 }); await wait(100); L.go('map'); await wait(1500);
  ok('once per world', L.st().view === 'map');
  // the setting
  L.go('settings'); await wait(200);
  ok('the Grown-up Corner can switch him off', !!d.querySelector('[data-act=tog][data-k=stranger]'));
  // backups and family links carry his visits
  const back = L.cleanStore(JSON.parse(JSON.stringify(L.store()))).profiles[0];
  const code = await w.LHQ_SYNC.encode(p, L.syncCtx()), raw = await w.LHQ_SYNC.decode(code, L.syncCtx());
  ok('his visits travel in backups and family links', JSON.stringify(back.strangers) === JSON.stringify(p.strangers) && JSON.stringify(raw.strangers.sort()) === JSON.stringify(p.strangers.slice().sort()));
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
