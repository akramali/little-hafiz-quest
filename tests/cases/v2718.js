// v2.7.18: install it like an app (a browser's own install offer, as Chrome, Edge and Samsung Internet give)
(async () => {
  fixture();
  localStorage.removeItem('lhq_install_no');
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  L.go('splash'); await wait(300);
  ok('no banner while the browser has nothing to offer (a computer’s headless Chrome)', !d.querySelector('.installbar'));
  let prompted = false;
  const ev = new w.Event('beforeinstallprompt', { cancelable: true });
  ev.prompt = () => { prompted = true; };
  ev.userChoice = Promise.resolve({ outcome: 'accepted' });
  w.dispatchEvent(ev); await wait(300);
  ok('the browser offers it: our banner (not the browser’s)', !!d.querySelector('.installbar [data-act=install]') && ev.defaultPrevented && /Install/.test(d.querySelector('.installbar').textContent));
  d.querySelector('.installbar [data-act=install]').click(); await wait(300);
  ok('Install: the one-tap install dialog', prompted);
  ok('then the banner is gone', !d.querySelector('.installbar'));
  // offered again; ✕ hides it (for a month)
  const ev2 = new w.Event('beforeinstallprompt', { cancelable: true }); ev2.prompt = () => {};
  w.dispatchEvent(ev2); await wait(300);
  d.querySelector('.installbar [data-act=installno]').click(); await wait(200);
  L.go('settings'); await wait(100); L.go('splash'); await wait(200);
  ok('✕: not shown again for a while', !d.querySelector('.installbar') && +localStorage.getItem('lhq_install_no') > 0);
  ok('not on other screens', (L.go('map'), true) && !d.querySelector('.installbar'));
  localStorage.removeItem('lhq_install_no');
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
