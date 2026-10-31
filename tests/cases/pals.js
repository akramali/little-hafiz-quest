// every explorer on the phone in the world: 10 explorers, most of them on the same sūrah
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  const names = ['Zayd', 'Maryam', 'Yusuf', 'Aisha', 'Ibrahim', 'Khadija', 'Musa', 'Hafsa', 'Umar'];
  const where = Q.get('spread') ? [0, 0, 5, 9, 12, 16, 20, 25, 30] : Q.get('top') ? [36, 36, 36, 36, 36, 36, 36, 36, 36] : [0, 0, 0, 0, 0, 0, 0, 0, 0];
  names.forEach((n, j) => s0.profiles.push(Object.assign(JSON.parse(JSON.stringify(s0.profiles[0])), { id: 'px' + j, name: n, at: where[j], look: { skin: j % 5, hair: j % 2 ? 'long' : 'short', hairColor: j % 4, hijabColor: 0, kid: j % 2 ? 'girl' : 'boy' } })));
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const st = L.store();
  log('explorers', st.profiles.length, '| colors', st.profiles.map((p) => `${p.look.tee}/${p.look.legs}`).join(' '));
  L.go('map'); await wait(1500);
  const pals = [...d.querySelectorAll('.mpal:not(.melder)')];
  log('on the map: others', pals.length, '| worlds', pals.map((p) => p.dataset.w).join(','), '| current', !!d.querySelector('.mex'));
  ok('every other explorer is on the map', pals.length === st.profiles.length - 1, pals.length + ' of ' + (st.profiles.length - 1));
  // overlaps between explorers
  const rs = pals.map((p) => p.getBoundingClientRect());
  let ov = 0; rs.forEach((a, i) => rs.forEach((b, j) => { if (i < j && a.left < b.right - 10 && b.left < a.right - 10 && a.top < b.bottom - 10 && b.top < a.bottom - 10) ov++; }));
  log('overlapping pairs', ov);
  // scroll to them
  const first = pals[0];
  if (Q.get('scrollto')) { w.scrollTo(0, first.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(800); }
  first.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300);
  log('tap: bubble', (d.querySelector('.mbubble') || {}).textContent);
  ok('tapping an explorer shows their name', /⭐/.test((d.querySelector('.mbubble') || {}).textContent || ''));
  // idle life over 20 s
  const seen = new Set();
  const obs = new w.MutationObserver(() => d.querySelectorAll('.mbubble').forEach((b) => seen.add(b.textContent)));
  obs.observe(d.querySelector('.mlayer'), { childList: true, subtree: true });
  let waves = 0;
  const wob = new w.MutationObserver((ms) => ms.forEach((m) => m.target.classList && m.target.classList.contains('mv-wave') && waves++));
  wob.observe(d.querySelector('.mlayer'), { attributes: true, attributeFilter: ['class'], subtree: true });
  await wait(+(Q.get('idle') || 20000));
  log('bubbles seen', [...seen].join(' | '));
  log('waves', waves, '| fruits fallen', d.querySelectorAll('.mfruit').length);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
