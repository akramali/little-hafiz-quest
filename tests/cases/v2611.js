// v2.6.11: a phone that had "the Stranger" switched off keeps the Wise Elder off
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2')); s0.prefs.stranger = false; s0.profiles[0].strangerAt = 12345; localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  ok('the old setting carries over', L.store().prefs.teacher === false, JSON.stringify(L.store().prefs.teacher));
  ok('and when he last came', L.store().profiles[0].teacherAt === 12345);
  L.go('settings'); await wait(300);
  const tgl = d.querySelector('[data-act=tog][data-k=teacher]');
  ok('the settings switch says Your Teacher', !!tgl && /Your Teacher/.test(tgl.textContent) && !/Stranger/.test(tgl.textContent));
  ok('his drawing is the kind elder (robe sways)', !!w.document.createRange().createContextualFragment(w.LHQ_ART.elder('')).querySelector('.robe-sway'));
  done();
})();
