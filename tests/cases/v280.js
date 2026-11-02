// v2.8.0: your Teacher and the Stranger are saved under their own names ('teacher', 'stranger'); saves from every
// earlier version keep their choices
(async () => {
  const cases = [
    ['before v2.6.11 (the Teacher was "the Stranger")', { stranger: false }, { strangerAt: 111 }, { teacher: false, stranger: true, at: 111 }],
    ['v2.6.11–v2.7.23 ("elder")', { elder: false }, { elderAt: 222, elderGift: '2026-10-30' }, { teacher: false, stranger: true, at: 222, gift: '2026-10-30' }],
    ['v2.8.0 on', { teacher: true, stranger: false }, { teacherAt: 333 }, { teacher: true, stranger: false, at: 333 }],
  ];
  for (const [label, prefs, prof, want] of cases) {
    fixture(prof);
    const s0 = JSON.parse(localStorage.getItem('lhq2'));
    s0.prefs = Object.assign({ theme: 'light', sfx: false }, prefs);
    localStorage.setItem('lhq2', JSON.stringify(s0));
    const { L } = await openGame();
    const p = L.store().prefs, pr = L.store().profiles[0];
    ok(`${label}: the choices carry over`, p.teacher === want.teacher && p.stranger === want.stranger && pr.teacherAt === want.at && (!want.gift || pr.teacherGift === want.gift), JSON.stringify({ t: p.teacher, s: p.stranger, at: pr.teacherAt, g: pr.teacherGift }));
    ok(`${label}: saved under the new names`, !('elder' in p) && !('visitor' in p) && !('elderAt' in pr) && !('elderGift' in pr));
  }
  done();
})();
