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
  // 5. the Stranger (v2.8.1): never on the map; with Worlds 1-3 memorized, setting out for World 4 meets him once,
  // then on to the sūrah chosen; nothing lost or won
  p.strangers = [];
  const lostBefore = p.lost.length, itemsBefore = p.items.length;
  L.go('surah', { i: idx(100), p: 0 }); await wait(100); L.go('map'); await wait(1500);
  ok('back on the map: no Stranger there', L.st().view === 'map');
  L.go('surah', { i: idx(96), p: 0 }); await wait(300);
  ok('setting out for World 4: he meets you at the bridge of Shining Sands', L.st().view === 'stranger' && L.st().w === 2 && /Shining Sands/.test(d.body.textContent), L.st().view + ' ' + L.st().w);
  for (let k = 0; k < 8 && L.st().view === 'stranger'; k++) { d.querySelector('[data-act=strnext]').click(); for (let t = 0; t < 60 && d.querySelector('[data-act=strnext][disabled]'); t++) await wait(100); await wait(150); }
  await wait(1400);
  ok('three tries, he goes, and on to the sūrah chosen: nothing lost or won', L.st().view === 'surah' && L.st().i === idx(96) && p.strangers.includes(2) && p.lost.length === lostBefore && p.items.length === itemsBefore, L.st().view);
  L.go('map'); await wait(1200); L.go('surah', { i: idx(96), p: 0 }); await wait(300);
  ok('once per gate', L.st().view === 'surah');
  // gaps hold him back: World 6 memorized, World 4 not yet → no gate beyond
  all(82); w.LHQ_DATA.surahs.filter((x) => x.n >= 91 && x.n <= 96).forEach((x) => delete p.prog[x.n]);
  L.go('map'); await wait(1200); L.go('surah', { i: idx(80), p: 0 }); await wait(300);
  ok('World 4 not memorized: he waits (even with Worlds 5 and 6 done)', L.st().view === 'surah');
  const through = async () => { for (let k = 0; k < 8 && L.st().view === 'stranger'; k++) { d.querySelector('[data-act=strnext]').click(); for (let t = 0; t < 120 && d.querySelector('[data-act=strnext][disabled]'); t++) await wait(100); await wait(150); } await wait(1400); };
  // several due at once: only the latest comes
  p.strangers = []; all(86);
  // (Worlds 1-6 memorized now: the Sky Kingdom's sūrahs from just above, Worlds 1-5 here)
  L.go('map'); await wait(1000); L.go('surah', { i: idx(80), p: 0 }); await wait(300);
  ok('Worlds 1-6 memorized at once: only the latest gate (Sky Kingdom)', L.st().view === 'stranger' && L.st().w === 5, L.st().view + ' ' + L.st().w);
  await through();
  ok('…and the ones before it are kept too', [2, 3, 4, 5].every((x) => p.strangers.includes(x)));
  // the whole Juz: the last time, back on the map
  all(78);
  L.go('surah', { i: idx(78), p: 0 }); await wait(100); L.go('map'); await wait(1600);
  ok('every sūrah memorized: back on the map, the last time', L.st().view === 'stranger' && L.st().w === 7, L.st().view + ' ' + L.st().w);
  await through();
  ok('…and never again', L.st().view === 'map' && p.strangers.includes(7));
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
