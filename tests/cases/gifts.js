// a new level always brings a gift; replaying an old level doesn't
(async () => {
  const d0 = new Date(), today = d0.getFullYear() + '-' + String(d0.getMonth() + 1).padStart(2, '0') + '-' + String(d0.getDate()).padStart(2, '0');
  fixture({ daily: today });
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  // own everything that is already due, so only the new rule can give a gift
  prof().items = w.LHQ_ART.ITEMS.filter((it) => it.track || it.from).map((it) => it.id).filter((id) => !/gold/.test(id));
  prof().pending = [];
  const run = async (L2, label) => {
    if (label !== 'level 2 again') prof().prog[112].parts[0].path = 0; // Stepping Stones not done yet: a new star
    L.go('path', { i: idx(112), p: 0, L: L2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
    await wait(200);
    const before = prof().pending.length;
    for (let k = 0; k < 4; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(1100); }
    await wait(300);
    log(`${label}: gifts +${prof().pending.length - before}`, prof().pending.slice(before).map((g) => g.k + ':' + g.id).join(','), '| memo:', [...d.querySelectorAll('.memo')].map((m) => m.textContent.trim()).join(' | '));
  };
  await run(2, 'level 2 first time');
  await run(2, 'level 2 again');
  // with every sticker collected, an early star-track prize instead
  prof().stickers = w.LHQ_ART.STICKERS.map((x) => x.id); prof().pending = [];
  prof().items = prof().items.filter((id) => !(w.LHQ_ART.ITEMS.find((it) => it.id === id) || {}).track);
  const keep = prof().items.slice();
  // give back the ones already due by stars, so only far-off prizes remain
  w.LHQ_ART.ITEMS.filter((it) => it.track && it.track <= 30).forEach((it) => keep.push(it.id)); prof().items = keep;
  await run(3, 'level 3, all stickers owned');
  d.querySelector('[data-act=opengift]') && d.querySelector('[data-act=opengift]').click(); await wait(300);
  d.querySelector('[data-act=giftpop]') && d.querySelector('[data-act=giftpop]').click(); await wait(300);
  log('gift card:', (d.querySelector('#modal .giftcard h3') || {}).textContent, '/', (d.querySelector('#modal .giftcard .saveinfo') || {}).textContent);
  ok('a gift card opens', !!d.querySelector('#modal .giftcard h3'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
