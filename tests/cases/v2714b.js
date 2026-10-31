// v2.7.14: a speech bubble on the map never runs off the screen
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  ['Zayd', 'Maryam', 'Yusuf'].forEach((n, j) => s0.profiles.push(Object.assign(JSON.parse(JSON.stringify(s0.profiles[0])), { id: 'px' + j, name: n + ' the explorer of the far mountains', at: 0 })));
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  L.go('map'); await wait(1500);
  const pals = [...d.querySelectorAll('.mpal')];
  const out = [];
  for (const pal of pals) {
    // move them right to the edge, then tap them
    pal.style.left = (Math.random() < 0.5 ? -10 : w.innerWidth - 60) + 'px';
    pal.scrollIntoView({ block: 'center' }); await wait(400);
    pal.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(700);
    const b = pal.querySelector('.mbubble');
    if (b) { const r = b.getBoundingClientRect(); if (r.left < 0 || r.right > w.innerWidth) out.push(`${Math.round(r.left)}…${Math.round(r.right)}`); }
  }
  ok('bubbles near the edge stay on the screen', pals.length >= 3 && !out.length, out.join(' '));
  done();
})();
