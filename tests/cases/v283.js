// v2.8.3: the sūrahs list rings each number like the map (gold: every star, green: memorized); Stars shows no campfires
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const m = d.getElementById('modal');
  L.go('map'); await wait(1200);
  d.querySelector('[data-act=progress][data-t=surahs]').click(); await wait(300);
  const pn = (n) => m.querySelectorAll('.pgrow')[idx(n)].querySelector('.pn').className;
  log('rings', [114, 113, 112, 111].map((n) => n + ':' + pn(n)).join(' '));
  ok('every star: a gold ring (An-Nās)', /\bgold\b/.test(pn(114)), pn(114));
  ok('memorized, stars to go: a green ring (Al-Ikhlāṣ)', /\bgreen\b/.test(pn(112)), pn(112));
  ok('not memorized: no ring (Al-Masad)', !/gold|green/.test(pn(111)), pn(111));
  ok('Sūrahs shows the campfires', m.querySelectorAll('.pgfire').length >= 3);
  d.querySelector('[data-act=progress][data-t=stars]').click(); await wait(300);
  ok('Stars shows only the bars and stars, no campfires', !m.querySelector('.pgfire') && m.querySelectorAll('.pgbar').length === 37);
  ok('Stars keeps the rings', /\bgold\b/.test(pn(114)));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
