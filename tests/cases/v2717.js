// v2.7.17: the update note closes with a tap outside; the pencil opens Change your explorer; Home goes back out
// to the start screen (the reverse of Continue); the runner for the streak
(async () => {
  fixture();
  localStorage.setItem('lhq_ver', '2.7.0'); // this phone last ran an older version: "Updated to …" shows
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  ok('after an update, the note shows', !!d.querySelector('.updnote'));
  d.querySelector('.sp-art').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(200);
  ok('a tap outside it closes it', !d.querySelector('.updnote'));
  // the pencil
  L.go('bag', { tab: 'hat' }); await wait(300);
  ok('My Explorer has the pencil (no "My look")', !!d.querySelector('.bar [data-act=editme]') && !/My look/.test(d.querySelector('.bar').textContent));
  d.querySelector('[data-act=editme]').click(); await wait(300);
  ok('the pencil: Change your explorer, Done at the top', L.st().view === 'create' && /Change your explorer/.test(d.querySelector('.bar').textContent) && !!d.querySelector('.bar [data-act=made]'));
  d.querySelector('.bar [data-act=made]').click(); await wait(300);
  ok('Done: back to My Explorer', L.st().view === 'bag' && L.st().tab === 'hat', L.st().view + ' ' + L.st().tab);
  // Home from the world: the map fades, the start screen zooms back out
  L.go('map'); await wait(1200);
  d.querySelector('[data-act=home]').click(); await wait(100);
  ok('Home: the map fades out first', !!d.querySelector('.mapscr.leaving'));
  await wait(400);
  ok('then the start screen zooms back out', L.st().view === 'splash' && !!d.querySelector('.splash.returning'));
  L.go('settings'); await wait(200); L.go('splash'); await wait(100);
  ok('from elsewhere, the start screen fades in', !!d.querySelector('.splash.arrive'));
  // the streak: a runner
  const day = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  L.store().profiles[0].streak = [day(Date.now()), 3];
  L.go('settings'); await wait(100); L.go('splash'); await wait(200);
  ok('the streak is a runner 🏃', /🏃/.test(d.querySelector('.streakbtn').textContent));
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
