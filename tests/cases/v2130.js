// v2.13.0: bedtime by the campfire (the Hidden Garden, after sunset: the four Quls three times each, then the duʿā),
// the journal's quiet hints, streak badges at 30 and 100 days, tajwīd colours (off at first)
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  w.__occasion = '';
  const errs = watchErrors(w);
  const A = w.LHQ_ART,
    prof = L.store().profiles[0];
  // 1. the campfire by the pavilion: cold before sunset, lit after
  w.__bedtime = false;
  L.garden(true);
  L.go('map');
  await wait(1200);
  let f = d.querySelector('.mbedfire');
  ok('the bedtime campfire is by the pavilion, cold in the day', !!f && !f.classList.contains('lit'));
  f.click();
  await wait(300);
  ok('…tapping it in the day only says it is lit after sunset', L.st().view === 'map');
  w.__bedtime = true;
  prof.items.push('kitten-buddy');
  prof.outfit.pet = 'kitten-buddy';
  L.go('map');
  await wait(1200);
  f = d.querySelector('.mbedfire');
  ok('…lit after sunset', f && f.classList.contains('lit'));
  f.click();
  await wait(500);
  ok('tapping it opens bedtime: the explorer and the Teacher sitting by the fire', L.st().view === 'bedtime' && !!d.querySelector('.btscene svg.ex.ex-sit') && !!d.querySelector('.btscene svg.elder-sit') && !!d.querySelector('.btscene svg.campfire'));
  ok('…the explorer\'s buddy beside them (moving), no staff or shield', !!d.querySelector('.btscene .ex-pet') && !d.querySelector('.btscene .ex-stick'));
  const say = () => d.querySelector('.btsay').textContent;
  ok('the Teacher names Al-Kāfirūn first, three beads to fill', /Al-Kāfirūn/.test(say()) && d.querySelectorAll('.btbeads i').length === 3);
  ok('…Listen plays it (Basmalah first)', w.__lhq.fabTarget && JSON.stringify(w.__lhq.fabTarget().items.slice(0, 2)) === '[[1,1],[109,1]]', JSON.stringify(w.__lhq.fabTarget() && w.__lhq.fabTarget().items.slice(0, 2)));
  const said = async () => {
    d.querySelector('[data-act=btsaid]').click();
    await wait(120);
  };
  await said();
  await said();
  ok('two said: two beads lit', d.querySelectorAll('.btbeads i.on').length === 2 && L.st().step === 0);
  d.querySelector('[data-act=btback]').click();
  await wait(100);
  ok('Back takes one off', L.st().n === 1);
  await said();
  await said();
  ok('the third: “MāshāAllāh”, then on to Al-Ikhlāṣ', /MāshāAllāh/.test(say()));
  await wait(1800);
  ok('…Al-Ikhlāṣ next', L.st().step === 1 && /Al-Ikhlāṣ/.test(say()));
  for (const nm of ['Al-Falaq', 'An-Nās']) {
    for (let j = 0; j < 3; j++) await said();
    await wait(1800);
    ok('…then ' + nm, /Al-Falaq|An-Nās/.test(say()) && say().includes(nm));
  }
  for (let j = 0; j < 3; j++) await said();
  await wait(1800);
  ok('then the duʿā for sleeping, said once (no Listen)', !!d.querySelector('.btdua') && d.querySelectorAll('.btbeads i').length === 1 && !w.__lhq.fabTarget());
  await said();
  await wait(1800);
  ok('then goodnight, by name', /Goodnight/.test(say()) && !!d.querySelector('[data-act=btbye]'));
  ok('…no gifts given at bedtime', prof.pending.length === 0 || prof.pending.every((g) => g.k !== 'bedtime'));
  d.querySelector('[data-act=btbye]').click();
  await wait(400);
  ok('Goodnight goes back to the Garden', L.st().view === 'map');
  L.garden(false);
  // 2. the journal: a quiet hint under a sūrah's name
  L.go('journal', { w: 0 });
  await wait(300);
  log('journal hints', d.querySelectorAll('.jsname .jnew').length, 'new,', d.querySelectorAll('.jsname .jlock').length, 'locked');
  ok('the journal: the red “new” dot where a step is done, a lock where none is', d.querySelectorAll('.jsname .jnew.newdot').length > 0 && d.querySelectorAll('.jsname .jlock').length > 0);
  // 3. streak badges: 30 and 100 days in a row
  ok('two streak badges, after the star and world badges (15 in all)', A.BADGES.length === 15 && A.BADGES.some((b) => b.id === 'streak30' && b.streak === 30) && A.BADGES.some((b) => b.id === 'streak100' && b.streak === 100));
  prof.pending = [];
  prof.best = 29;
  w.__lhq.starBadges(prof);
  ok('…not at 29 days', !prof.pending.some((g) => g.id === 'streak30'));
  prof.best = 30;
  w.__lhq.starBadges(prof);
  ok('…at 30 days (the best streak)', prof.pending.some((g) => g.id === 'streak30') && !prof.pending.some((g) => g.id === 'streak100'));
  prof.best = 100;
  w.__lhq.starBadges(prof);
  ok('…and at 100', prof.pending.some((g) => g.id === 'streak100'));
  prof.pending = [];
  // 4. tajwīd colours: off at first; on, the Arabic to read is coloured (Look & Repeat, Read), word games not
  ok('tajwīd colours off at first', !L.prefs().tajweed);
  L.go('learn', { i: idx(112), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  ok('…no colours while off', !d.querySelector('.tj'));
  L.go('settings');
  await wait(200);
  d.querySelector('[data-k=tajweed]').click();
  await wait(900);
  ok('switched on in the Grown-up Corner, with its colour key', L.prefs().tajweed && d.querySelectorAll('.tajkey span').length === 7);
  L.go('learn', { i: idx(112), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
  await wait(300);
  const ar = d.querySelector('.ar-box .ar');
  ok('Look & Repeat: qalqalah on the dāl of aḥad (112:1), the text itself unchanged', !!ar.querySelector('.tj-q') && /د/.test(ar.querySelector('.tj-q').textContent) && ar.textContent.replace(/\s*﴿.*$/, '').trim() === w.LHQ_DATA.surahs[idx(112)].ayat[0].ar);
  L.go('mushaf', { i: idx(114), p: 0 });
  await wait(300);
  ok('Read: ghunnah on the nūn of an-nās', [...d.querySelectorAll('.mtext .tj-gh')].some((x) => /ن/.test(x.textContent)));
  L.go('words', { i: idx(112), p: 0, a: 0, w: 3, phase: 'build', shown: [], doneA: [], savedA: [] });
  await wait(300);
  ok('Word Steps keeps its own word colours', !d.querySelector('.wflow .tj'));
  // every coloured span covers whole letters (no mark coloured apart from its letter)
  const TJ = await (await w.fetch('tajweed.json')).json();
  const S = w.LHQ_DATA.surahs,
    bad = [];
  S.filter((s) => !s.asma).forEach((s) => s.ayat.forEach((a, k) => (TJ.ayat[(s.sura || s.n) + ':' + ((s.from || 1) + k)] || []).forEach(([b, e]) => {
    // (combining marks only: the small wāw and yā' of a long hu/hi, U+06E5-6, are letters of their own)
    const MARK = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u08F0-\u08F2]/;
    if (MARK.test(a.ar[b] || '') || MARK.test(a.ar[e] || '')) bad.push((s.sura || s.n) + ':' + ((s.from || 1) + k) + '@' + b);
  })));
  ok('every coloured span is whole letters with their marks', bad.length === 0, bad.slice(0, 5).join(' '));
  // 5. Āyat al-Kursī: yaʾūduhū with its vowels in the right places (yā' with fatḥah, hamzah with ḍammah)
  const kursi = S.find((s) => s.sura === 2 && s.from === 255);
  ok('Āyat al-Kursī reads يَـُٔودُهُۥ', kursi && kursi.ayat[0].ar.includes('يَـُٔود') && !kursi.ayat[0].ar.includes('يُـَٔ'));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
