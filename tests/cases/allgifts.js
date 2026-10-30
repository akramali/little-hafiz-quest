// open every gift the game can give, one after another: each box must open
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const A = w.LHQ_ART, prof = L.store().profiles[0];
  const gifts = [...A.ITEMS.filter((it) => it.from || it.feat || it.drop || it.track || it.gold).map((it) => ({ k: 'i', id: it.id })), ...A.STICKERS.map((x) => ({ k: 's', id: x.id })), ...A.STICKERS.slice(0, 5).map((x) => ({ k: 's', id: x.id, m: 1 })), ...A.BADGES.map((x) => ({ k: 's', id: x.id }))];
  const bad = [];
  L.go('done', { i: 0, p: 0 }); await wait(200);
  for (let i = 0; i < gifts.length; i += 3) {
    const batch = gifts.slice(i, i + 3);
    prof.pending = batch.map((g) => Object.assign({}, g));
    prof.items = prof.items.filter((id) => !batch.some((g) => g.id === id));
    prof.stickers = prof.stickers.filter((id) => !batch.some((g) => g.id === id));
    d.getElementById('modal').classList.remove('show');
    for (const g of batch) {
      const e0 = errs.length;
      // one tap on a gift opens it
      const ob = d.createElement('button'); ob.dataset.act = 'opengift'; d.getElementById('app').appendChild(ob); ob.click(); ob.remove(); await wait(20);
      const open = d.querySelector('#modal.show .giftcard.open');
      if (!open || errs.length > e0) { bad.push(`${g.k}:${g.id}${g.m ? ' (mini)' : ''} → ${errs.slice(e0).join('; ') || 'did not open'}`); break; }
      const got = g.k === 'i' ? prof.items.includes(g.id) : prof.stickers.includes(g.id);
      if (!got) bad.push(g.id + ': not added');
      const next = open.querySelector('[data-act=giftok]'); next.click(); await wait(10);
    }
  }
  log('gifts tried', gifts.length, '| problems', bad.length ? '\n  ' + bad.slice(0, 20).join('\n  ') : 'none');
  ok('every gift opens and is added', !bad.length && gifts.length > 200, bad.slice(0, 3).join(' · ')); ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  log('errors', errs.slice(0, 5));
  done();
})();
