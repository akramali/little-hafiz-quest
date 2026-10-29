(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  const drops = w.LHQ_ART.ITEMS.filter((it) => it.drop);
  log('drops in the game:', drops.length, '| starter ids:', w.LHQ_ART.ITEMS.filter((it) => !it.from && !it.feat && !it.track && !it.drop).map((it) => it.id).join(','));
  // 20 surprises: a mix of stickers and accessories
  const kinds = { s: 0, i: 0 }; prof().pending = [];
  for (let n = 0; n < 20; n++) { prof().daily = ''; L.st(); }
  // use the level gift path by finishing new levels
  for (let n = 0; n < 12; n++) {
    prof().prog[112].parts[0].path = 0; const before = prof().pending.length;
    L.go('path', { i: idx(112), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
    for (let k = 0; k < 4; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(950); }
    prof().pending.slice(before).forEach((g) => (kinds[g.k] = (kinds[g.k] || 0) + 1));
  }
  log('surprises from 12 first finishes: stickers', kinds.s, 'accessories', kinds.i, '| waiting:', prof().pending.map((g) => g.id).slice(0, 12).join(','));
  // open them all: a drop's card says it's a surprise
  const dropIds = new Set(drops.map((x) => x.id));
  L.go('bag', { tab: 'stick' }); await wait(200);
  const locked = [...d.querySelectorAll('.icell.locked small')].map((x) => x.textContent).filter((t) => t === 'A surprise gift').length;
  log('stick tab: locked surprises shown', locked);
  let sawDropCard = '';
  for (let n = 0; n < 40 && prof().pending.length; n++) {
    d.querySelector('[data-act=opengift]').click(); await wait(120);
    const g = prof().pending[0];
    d.querySelector('#modal [data-act=giftpop]').click(); await wait(150);
    if (g && dropIds.has(g.id) && !sawDropCard) sawDropCard = d.querySelector('#modal .giftcard h3').textContent + ' / ' + d.querySelector('#modal .giftcard .saveinfo').textContent;
    (d.querySelector('#modal [data-act=wear]') || d.querySelector('#modal [data-act=giftok]')).click(); await wait(250);
  }
  log('a drop gift card:', sawDropCard);
  log('after opening all: view', L.st().view, 'tab', L.st().tab, 'app text', d.getElementById('app').innerText.replace(/\s+/g, ' ').slice(0, 50));
  ok('surprise accessories exist', drops.length >= 40); ok('all surprises open', prof().pending.length === 0);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
