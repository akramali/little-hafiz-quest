(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  ['Zayd', 'Maryam', 'Yusuf'].forEach((n, j) => s0.profiles.push(Object.assign(JSON.parse(JSON.stringify(s0.profiles[0])), { id: 'px' + j, name: n, at: 0 })));
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('map'); await wait(1200);
  const pal = d.querySelector('.mpal:not(.melder)'), mex = d.querySelector('.mex');
  w.scrollTo(0, pal.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(500);
  const rp = pal.getBoundingClientRect(), rm = mex.getBoundingClientRect();
  log('sizes: other', Math.round(rp.width / (pal.getBoundingClientRect().width / pal.offsetWidth)), 'x', pal.offsetHeight, '| chosen', mex.offsetWidth, 'x', mex.offsetHeight);
  ok('other explorers are full size', pal.offsetWidth === mex.offsetWidth && pal.offsetHeight === mex.offsetHeight);
  log('name tag before tapping:', !!pal.querySelector('.mpal-name, .mbubble'));
  pal.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300);
  const b = pal.querySelector('.mbubble');
  log('after tap:', b && b.textContent);
  const x0 = b.getBoundingClientRect().left;
  // they walk 80 px: the name goes with them
  pal.firstElementChild.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(80px,0)' }], { duration: 300, fill: 'forwards' });
  await wait(450);
  log('walked 80 px: name moved', Math.round(b.getBoundingClientRect().left - x0), 'px');
  ok('the name follows them', Math.abs(b.getBoundingClientRect().left - x0 - 80) < 3);
  await wait(3500);
  log('a few seconds later: name gone', !pal.querySelector('.mbubble'));
  ok('the name fades', !pal.querySelector('.mbubble'));
  if (Q.get('hold')) { pal.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(5000); }
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
