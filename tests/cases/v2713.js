// v2.7.13: campfires over three weeks; low ones breathe on the map; the Teacher visits cold fires; relit fires flare
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const p = L.store().profiles[0], m = d.getElementById('modal'), day = 864e5;
  // 1. the timeline: strong for a week, half lit the second, embers the third, then out
  const words = [];
  for (const age of [3, 10, 17, 25]) {
    p.fire[113] = [Date.now() - age * day, 0];
    L.go('surah', { i: idx(113), p: 0 }); await wait(150);
    words.push(d.querySelector('.herofire').textContent.trim());
  }
  ok('3, 10, 17, 25 days: strong, half lit, low, out', words.join(',') === 'Strong,Half lit,Low,Out', words.join(','));
  // 2. on the map, only the low and out fires breathe
  p.fire[113] = [Date.now() - 17 * day, 0];
  p.fire[112] = [Date.now() - 2 * day, 0];
  L.go('map'); await wait(1500);
  const anim = (n) => w.getComputedStyle(d.querySelector(`.node[data-i="${idx(n)}"] .nfire svg`)).animationName;
  ok('a low fire breathes on the map, a strong one is still', anim(113) === 'fireBreathe' && anim(112) === 'none', anim(113) + ' / ' + anim(112));
  // 3. the sūrahs list shows each memorized sūrah's campfire
  d.querySelector('[data-act=progress]').click(); await wait(300);
  ok('the sūrahs list shows the campfires', d.querySelectorAll('#modal.show .pgfire').length >= 2 && !!d.querySelector('#modal.show .pgfire.f1'));
  m.classList.remove('show');
  // 4. the Teacher's own visits go to a cold fire; all burning, he only says hello
  for (const n in p.fire) p.fire[n][0] = Date.now() - 2 * day;
  p.fire[112][0] = Date.now() - 22 * day;
  p.fix = []; p.rematch = []; p.rematchReady = []; p.elderAt = 0;
  w.__elderNow = true; L.elder.maybe(); await wait(300);
  ok('his visit is to the cold fire (Al-Ikhlāṣ)', !!d.querySelector('#modal.show .eldmeet') && /getting cold/.test(m.textContent) && /Al-Ikhlāṣ/.test(m.textContent), m.textContent.slice(0, 120));
  m.classList.remove('show');
  p.fire[112][0] = Date.now() - 2 * day; p.elderAt = 0;
  L.elder.maybe(); await wait(300);
  ok('every fire burning: no test, just a hello', !d.querySelector('#modal.show .eldmeet') && /all your campfires are burning/.test(d.getElementById('toast').textContent), d.getElementById('toast').textContent);
  w.__elderNow = false;
  // 5. practising a low fire relights it, and it flares up on the map
  p.fire[113][0] = Date.now() - 16 * day;
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 12 && L.st().view === 'path'; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(900); }
  L.go('map'); await wait(1400);
  const fire = d.querySelector(`.node[data-i="${idx(113)}"] .nfire`);
  ok('relit: strong again, and it flares up', fire.classList.contains('f3') && fire.getAnimations().some((a) => a instanceof w.CSSAnimation === false), fire.className);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
