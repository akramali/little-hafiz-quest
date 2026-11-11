// v2.7.1: a backup file and a family-sharing code bring an explorer back exactly as they are
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const X = w.__lhq, A = w.LHQ_ART, SY = w.LHQ_SYNC;
  const p = L.store().profiles[0];
  const day = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const min = (t) => Math.floor(t / 60000) * 60000;
  const hr = (t) => Math.floor(t / 3.6e6) * 3.6e6; // (campfires travel to the hour since v2.10.0)
  // an explorer with a bit of everything
  const items = A.ITEMS.filter((it) => !it.gold && it.tier >= 1 && it.from).slice(0, 6).map((it) => it.id);
  const owned = new Set(p.items);
  items.forEach((id) => owned.has(id) || (p.items.push(id), p.got.push('i:' + id)));
  p.stickers = [...new Set([...p.stickers, 'moon', 'bee'])];
  ['s:moon', 's:bee'].forEach((k) => p.got.includes(k) || p.got.push(k));
  p.fresh = [p.got[p.got.length - 1], p.got[0]];
  p.pending = [{ k: 'i', id: A.ITEMS.find((it) => it.drop && !p.items.includes(it.id)).id }, { k: 's', id: 'sun', m: 1 }];
  p.stash = { outfit: { hat: items[0] }, badge: 'moon' };
  p.badge = 'bee';
  p.at = 5;
  p.look.feet = 2;
  p.greeted = true;
  p.daily = day(Date.now());
  p.teacherGift = day((() => { const x = new Date(); x.setDate(x.getDate() - 1); return x.getTime(); })());
  p.streak = [day(Date.now()), 6]; p.best = 11; p.dayT = [day(Date.now()), 42];
  p.teacherAt = min(Date.now() - 3600e3);
  p.rematch = [113]; p.rematchReady = [];
  p.lostSt = [{ id: 'star', n: 113 }]; p.stickers = p.stickers.filter((x) => x !== 'star');
  for (const n in p.fire) p.fire[n] = [hr(p.fire[n][0]), p.fire[n][1]];
  Object.assign(p.fire, { 113: [hr(Date.now() - 2 * 864e5), 1], 112: [hr(Date.now() - 864e5), 3] });
  p.found = [...X.journal].slice(0, 9);
  p.jdone = [3];
  p.time = 4321; p.stime = { 113: 600, 112: 300 };
  p.riddle = [day(Date.now()), 9, 3, Math.round(Date.now() / 1000) * 1000 + 60000, 1]; p.buddy = [day((() => { const x = new Date(); x.setDate(x.getDate() - 1); return x.getTime(); })()), 2, 6]; // (v2.9.1)
  p.grow = [17, day(Date.now()), [112, 113]]; // (v2.9.1: my tree)
  p.touched = Math.round(Date.now() / 1000) * 1000;
  const want = JSON.parse(JSON.stringify(p));
  // (lists that are sets compare in any order; got keeps its order: it's the order things were won)
  const SETS = ['items', 'stickers', 'found', 'fresh', 'jdone', 'wdone', 'feats', 'cpg', 'fix', 'rematch', 'rematchReady'];
  const norm = (k, v) => (SETS.includes(k) && Array.isArray(v) ? [...v].sort() : v);
  const diff = (got) => Object.keys(want).filter((k) => JSON.stringify(norm(k, got[k])) !== JSON.stringify(norm(k, want[k])));
  // 1. a backup file (the whole store as JSON, cleaned when loaded)
  const back = X.cleanStore(JSON.parse(JSON.stringify(L.store()))).profiles[0];
  const bd = diff(back);
  ok('a backup brings back every field exactly', !bd.length, bd.map((k) => `${k}: ${JSON.stringify(back[k])} ≠ ${JSON.stringify(want[k])}`).join(' | '));
  // 2. a family-sharing code, read on another phone (as a new explorer there)
  const code = await SY.encode(p, X.syncCtx());
  const raw = await SY.decode(code, X.syncCtx());
  const got = X.cleanProfile(raw);
  const sd = diff(got).filter((k) => k !== 'made');
  ok('a sharing code brings back every field exactly', !sd.length, sd.map((k) => `${k}: ${JSON.stringify(got[k])} ≠ ${JSON.stringify(want[k])}`).join(' | '));
  log('code length: ' + code.length);
  ok('the code stays a sensible size for a QR code', code.length < 2000, code.length);
  // 3. (v2.10.0) a big collection: the newest 30 wins keep their order, every thing owned comes along, the version up front
  {
    const big = JSON.parse(JSON.stringify(p)),
      many = A.ITEMS.filter((it) => !it.gold && it.from).slice(0, 120).map((it) => it.id);
    big.items = [...new Set([...big.items, ...many])];
    big.got = [...big.items.map((id) => 'i:' + id), ...big.stickers.map((id) => 's:' + id)].reverse();
    big.fresh = big.got.slice(-2);
    const cb = X.cleanProfile(JSON.parse(JSON.stringify(big))); // (what this phone itself keeps of it)
    Object.assign(big, { items: cb.items, got: cb.got, fresh: cb.fresh });
    const c2 = await SY.encode(big, X.syncCtx()), r2 = X.cleanProfile(await SY.decode(c2, X.syncCtx())), raw2 = await SY.decode(c2, X.syncCtx());
    log('big collection: ' + big.got.length + ' things, code ' + c2.length);
    ok('a big collection: all owned, the newest 30 in their order, still new ones still new', r2.items.length === big.items.length && JSON.stringify(r2.got.slice(-30)) === JSON.stringify(big.got.slice(-30)) && JSON.stringify(r2.fresh.sort()) === JSON.stringify(big.fresh.slice().sort()));
    ok('the version travels up front', raw2.appV === X.syncCtx().version, raw2.appV);
  }
  // 4. merging into the same explorer on another phone keeps the extras
  const other = X.cleanProfile(JSON.parse(JSON.stringify(want)));
  other.found = []; other.jdone = []; other.fire = {}; other.pending = []; other.streak = ['', 0]; other.best = 0; other.touched = 1;
  L.store().profiles.push(Object.assign(other, { id: 'pother' }));
  L.go('explorers'); await wait(200);
  d.querySelector('[data-act=syncpaste]').click(); await wait(150);
  d.getElementById('pastebox').value = code;
  d.querySelector('[data-act=pastego]').click(); await wait(800);
  const tgt = d.querySelector('[data-act=synctarget][data-id="pother"]');
  if (tgt) { tgt.click(); await wait(300); }
  const go = d.querySelector('[data-act=syncdo]');
  if (go) { go.click(); await wait(800); }
  const merged = L.store().profiles.find((x) => x.id === 'pother');
  ok('merged: journal, campfires, streak, gifts waiting and the Elder\'s stickers come along', !!merged && merged.found.length === want.found.length && JSON.stringify(merged.fire) === JSON.stringify(want.fire) && merged.best === 11 && want.pending.every((g) => merged.pending.some((x) => x.k === g.k && x.id === g.id)) && merged.lostSt.length === 1 && !merged.stickers.includes('star'), merged && JSON.stringify({ f: merged.found.length, fire: merged.fire, best: merged.best, pend: merged.pending, held: merged.lostSt }));
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
