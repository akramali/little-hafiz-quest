// open many gifts in a row, the way a child does: box, then Wear it / Stick it on / Next gift, from the map,
// the done page and My Explorer, with sounds on
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2')); s0.prefs.sfx = true; localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message)); w.addEventListener('unhandledrejection', (e) => errs.push('promise: ' + (e.reason && e.reason.message)));
  const A = w.LHQ_ART, prof = () => L.store().profiles[0];
  const pool = [...A.STICKERS.map((x) => ({ k: 's', id: x.id })), ...A.ITEMS.filter((it) => it.drop).map((it) => ({ k: 'i', id: it.id }))];
  const log2 = [];
  let fails = 0, opened = 0;
  for (let round = 0; round < 6; round++) {
    const where = ['map', 'done', 'bag'][round % 3];
    prof().pending = pool.slice(round * 5, round * 5 + 5).map((g) => Object.assign({}, g));
    prof().stickers = []; prof().items = [];
    if (where === 'done') L.go('done', { i: idx(107), p: 0 }); else if (where === 'bag') L.go('bag', { tab: 'hat' }); else L.go('map');
    await wait(where === 'map' ? 900 : 300);
    const opener = d.querySelector('[data-act=opengift]');
    if (!opener) { log2.push(where + ': no gift button'); fails++; continue; }
    for (let n = 0; n < 6; n++) {
      const op = d.querySelector('[data-act=opengift]');
      if (!op) break;
      const before = prof().pending.length;
      op.click(); await wait(150); // one tap opens it
      const open = d.querySelector('#modal.show .giftcard.open');
      if (!open) { fails++; log2.push(`${where} gift ${n + 1}: tap did nothing (pending ${before} → ${prof().pending.length})`); break; }
      opened++;
      // the child picks one of the two buttons
      const btns = [...open.querySelectorAll('button')];
      const pick = btns[(round + n) % btns.length];
      pick.click(); await wait(where === 'map' || pick.dataset.act !== 'giftok' ? 400 : 150);
    }
    log2.push(`${where}: left waiting ${prof().pending.length}, stickers ${prof().stickers.length}, items ${prof().items.length}, view ${L.st().view}`);
  }
  log('opened', opened, '| failures', fails);
  ok('30 gifts in a row all open', opened === 30 && !fails, opened + ' opened, ' + fails + ' failed');
  log(log2.join('\n'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
