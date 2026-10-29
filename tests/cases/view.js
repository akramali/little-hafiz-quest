// screenshot any screen: ?t=view&v=<view>&n=<sūrah>&...  (see the cases below)
(async () => {
  fixture(Q.get('dressed') ? { outfit: { hat: 'explorer-cap', watch: 'explorer-watch', stick: 'trekking-pole', shield: 'sturdy-shield', cape: 'leaf-cape', glasses: 'sunrise-glasses', pet: 'ladybug-buddy' } } : undefined);
  if (Q.get('oldver')) localStorage.setItem('lhq_ver', Q.get('oldver'));
  const { w, d, L, idx } = await openGame();
  if (Q.get('dressed')) { const p = L.store().profiles[0]; p.items = w.LHQ_ART.ITEMS.map((it) => it.id); p.outfit = {}; ['hat', 'watch', 'stick', 'shield', 'cape', 'glasses', 'pet'].forEach((sl) => (p.outfit[sl] = w.LHQ_ART.ITEMS.find((it) => it.slot === sl && it.from && !it.gold).id)); }
  const v = Q.get('v'), n = +(Q.get('n') || 114), i = idx(n), p = Q.get('p') == null ? 0 : Q.get('p') === 'all' ? 'all' : +Q.get('p');
  const a = +(Q.get('a') || 0);
  if (v === 'map') L.go('map');
  else if (v === 'surah') L.go('surah', { i, p });
  else if (v === 'learn') L.go('learn', { i, p, a, phase: Q.get('phase') || 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  else if (v === 'words') L.go('words', { i, p, a, w: +(Q.get('w') || 3), phase: Q.get('phase') || 'build', shown: (Q.get('shown') || '').split(',').filter(Boolean).map(Number), doneA: [], savedA: [] });
  else if (v === 'path') L.go('path', { i, p, L: 2, k: +(Q.get('k') || 0), hint: 0, hints: 0, hearts: 3, maxH: 3 });
  else if (v === 'order') {
    L.go('surah', { i, p }); await wait(100);
    if (Q.get('rtl')) { L.store().prefs.pzrtl = true; }
    d.querySelector('[data-act=order]') ? d.querySelector('[data-act=order]').click() : 0;
    await wait(200);
    const st = L.st();
    (Q.get('placed') || '').split(',').filter(Boolean).forEach((j) => (st.placed[+j] = true));
    if (Q.get('placed')) { st.say = +Q.get('placed').split(',')[0]; L.go('order', st); }
  }
  else if (v === 'syncshare') { L.go('explorers'); await wait(100); d.querySelector('[data-act=syncshare]').click(); await wait(1200); }
  else if (v === 'splash') { L.go('splash'); await wait(1500); if (Q.get('whatsnew')) { const dt = d.querySelector('.updnote details'); if (dt) dt.open = true; } }
  else if (v === 'bag') L.go('bag', { tab: Q.get('tab') || 'look' });
  else if (v) L.go(v, { i, p, sel: Q.get('sel') != null ? +Q.get('sel') : null, focus: !!Q.get('focus') });
  if (Q.get('click')) { await wait(200); d.querySelector(Q.get('click')).click(); }
  if (Q.get('open')) { await wait(400); d.querySelectorAll('details').forEach((x) => (x.open = true)); }
  if (Q.get('scroll')) w.scrollTo(0, +Q.get('scroll'));
  if (Q.get('help')) { L.go('settings'); await wait(200); d.querySelector('[data-act=help]').click(); if (Q.get('help') === 'end') { await wait(200); const hc = d.querySelector('.infocard'); hc.scrollTop = hc.scrollHeight; } }
  if (Q.get('rail')) { await wait(600); d.querySelector('[data-act=worlds]').click(); }
  if (Q.get('mv')) {
    // freeze a move part-way: every animation paused at the same moment
    const svg = d.querySelector('.wd-ex svg.ex');
    svg.classList.add('mv-' + Q.get('mv'));
    await wait(80);
    svg.getAnimations({ subtree: true }).forEach((an) => { an.pause(); an.currentTime = (+Q.get('at') || 0.6) * 1000; });
  }
  await wait(800);
  done();
})();
