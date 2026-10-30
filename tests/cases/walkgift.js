(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = L.store().profiles[0];
  prof.pending = [{ k: 's', id: w.LHQ_ART.STICKERS[3].id }];
  L.go('map'); await wait(1000);
  // the explorer walks into a sūrah; a gift is on screen and the child taps it mid-walk
  const node = d.querySelector(`.node[data-i="${idx(111)}"]`);
  node.click(); await wait(100);
  log('walking: busy', d.body.classList.contains('busy'));
  d.querySelector('[data-act=opengift]') && 0;
  const ob = d.createElement('button'); ob.dataset.act = 'opengift'; d.getElementById('modal').appendChild(ob);
  // (open it directly: the HUD is rightly ignored during the walk)
  w.__lhq && 0;
  d.getElementById('modal').classList.add('show'); ob.click(); await wait(100);
  await wait(150);
  log('box tapped mid-walk opened:', !!d.querySelector('#modal.show .giftcard.open'), '| sticker added', prof.stickers.includes(w.LHQ_ART.STICKERS[3].id));
  ok('a gift box tapped mid-walk opens', !!d.querySelector('#modal.show .giftcard.open') && prof.stickers.includes(w.LHQ_ART.STICKERS[3].id));
  await wait(2500);
  log('after the walk: view', L.st().view, '| busy', d.body.classList.contains('busy'));
  // a walk cut short: the map is redrawn mid-walk
  d.getElementById('modal').classList.remove('show');
  L.go('map'); await wait(900);
  d.querySelector(`.node[data-i="${idx(110)}"]`).click(); await wait(150);
  L.go('map'); await wait(300);
  log('walk cut short by a redraw: busy', d.body.classList.contains('busy'), '| a tap works:', (() => { d.querySelector('[data-act=progress]').click(); return d.getElementById('modal').classList.contains('show'); })());
  ok('a walk cut short never leaves taps ignored', !d.body.classList.contains('busy'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
