(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const NEW = w.LHQ_SYNC;
  // the 2.5.2 encoder, loaded on its own
  const src = await (await fetch('fixtures/sync-v1.js')).text();
  const box = {}; new Function('window', src)(box);
  const OLD = box.LHQ_SYNC;
  const ctx = { surahs: w.LHQ_DATA.surahs, items: w.LHQ_ART.ITEMS, stickers: [...w.LHQ_ART.STICKERS, ...w.LHQ_ART.BADGES], looks: w.LHQ_ART.LOOKS, slots: ['hat', 'hijab', 'glasses', 'top', 'pants', 'shoes', 'cape', 'bag', 'stick', 'shield', 'watch', 'pet'] };
  const p = L.store().profiles[0];
  p.look.tee = 2; p.look.legs = 3;
  const c1 = await OLD.encode(p, ctx), c2 = await NEW.encode(p, ctx);
  const d1 = await NEW.decode(c1, ctx), d2 = await NEW.decode(c2, ctx);
  log('format 1 code opens:', d1.name, 'stars parts', Object.keys(d1.prog).length, '| colors', d1.look.tee, d1.look.legs);
  log('format 2 code opens:', d2.name, 'stars parts', Object.keys(d2.prog).length, '| colors', d2.look.tee, d2.look.legs, '| lengths', c1.length, c2.length);
  ok('old (format 1) links still open', d1.name === 'Amina' && Object.keys(d1.prog).length > 0); ok('new links carry the colors', d2.look.tee === 2 && d2.look.legs === 3);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
