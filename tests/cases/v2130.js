// v2.13.0: bedtime by the campfire (the Hidden Garden, after sunset: the four Quls three times each, then the duʿā),
// the journal's quiet hints, streak badges at 30 and 100 days, tajwīd colours (off at first)
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  w.__occasion = '';
  const errs = watchErrors(w);
  const A = w.LHQ_ART,
    prof = L.store().profiles[0];
  // 1. the campfire by the pavilion: lit any time (v2.13.4: the way into bedtime by day too)
  const pend0 = prof.pending.length; // (the sample explorer has gifts waiting already)
  w.__bedtime = false;
  L.garden(true);
  L.go('map');
  await wait(1200);
  let f = d.querySelector('.mbedfire');
  ok('the bedtime campfire is by the pavilion, lit even in the day', !!f && f.classList.contains('lit'));
  ok('…no moon on the map in the day', !d.querySelector('.mmoon'));
  f.click();
  await wait(1800);
  ok('…tapping it in the day opens bedtime too', L.st().view === 'bedtime');
  d.querySelector('.bar [data-act=back]').click();
  await wait(1700);
  ok('…Back: the Garden again', L.st().view === 'map' && L.garden());
  w.__bedtime = true;
  prof.items.push('kitten-buddy');
  prof.outfit.pet = 'kitten-buddy';
  L.go('map');
  await wait(1200);
  f = d.querySelector('.mbedfire');
  ok('…and after sunset', f && f.classList.contains('lit'));
  f.click();
  await wait(400);
  ok('tapping it: night falls first (a dusk, stars, a sleepy moon; v2.13.3)', !!d.querySelector('.ntrip.in .nt-dusk') && L.st().view === 'map');
  await wait(1400);
  ok('tapping it opens bedtime: the explorer and the Teacher sitting by the fire', L.st().view === 'bedtime' && !!d.querySelector('.btscene svg.ex.ex-sit') && !!d.querySelector('.btscene svg.elder-sit') && !!d.querySelector('.btscene svg.campfire'));
  ok('…the explorer\'s buddy beside them (moving), no staff or shield', !!d.querySelector('.btscene .ex-pet') && !d.querySelector('.btscene .ex-stick'));
  const say = () => d.querySelector('.btsay').textContent;
  ok('the Teacher names Al-Ikhlāṣ first (three Quls), three beads to fill, four little dots (no tabs; v2.13.3)', /Al-Ikhlāṣ/.test(say()) && d.querySelectorAll('.btbeads i').length === 3 && d.querySelectorAll('.btdots [data-act=btgo]').length === 4 && !d.querySelector('.bttabs'));
  const scene0 = d.querySelector('.btscene'),
    btn0 = d.querySelector('.btbtn').getBoundingClientRect().top,
    barAt = () => ['.bar [data-act=back]', '.bar .bar-title'].map((q) => { const r = d.querySelector(q).getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }).join(' '),
    bar0 = barAt();
  ok('…Listen plays it (Basmalah first)', JSON.stringify(w.__lhq.fabTarget().items.slice(0, 2)) === '[[1,1],[112,1]]', JSON.stringify(w.__lhq.fabTarget() && w.__lhq.fabTarget().items.slice(0, 2)));
  const said = async () => {
    d.querySelector('[data-act=btsaid]').click();
    await wait(120);
  };
  await said();
  await said();
  ok('two said: two beads lit', d.querySelectorAll('.btbeads i.on').length === 2 && L.st().step === 0);
  ok('…only “✓ Said it” under them (the bar has Back; v2.13.2)', !d.querySelector('[data-act=btback]') && d.querySelectorAll('.btpanel button.btn').length === 1);
  await said();
  ok('the third: the Teacher smiles, “MāshāAllāh!”', /MāshāAllāh/.test(say()) && !!d.querySelector('.btscr.happy') && !!d.querySelector('.btscene .bt-eld-h svg.elder.happy'));
  ok('…the scene not drawn again (the night carries on: only the words and the panel change)', d.querySelector('.btscene') === scene0);
  await wait(1800);
  ok('…then Al-Falaq, Al-Ikhlāṣ ticked', L.st().step === 1 && /Al-Falaq/.test(say()) && d.querySelector('[data-act=btgo][data-j="0"]').classList.contains('done') && !d.querySelector('.btscr.happy'));
  // any one, at any time: the duʿā's tab
  d.querySelector('[data-act=btgo][data-j="3"]').click();
  await wait(200);
  ok('a dot chooses any of them: the duʿā (said once, no Listen)', L.st().step === 3 && /Allāhumma bismika/.test(d.querySelector('.btbody').textContent) && /اللَّهُمَّ بِاسْمِكَ/.test(d.querySelector('.btbody').textContent) && d.querySelectorAll('.btbeads i').length === 1 && !w.__lhq.fabTarget());
  ok('…the panel the same height: the button where it was', Math.abs(d.querySelector('.btbtn').getBoundingClientRect().top - btn0) < 1);
  ok('…and the bar: Back and the title exactly where they were (Listen hidden, not taken out; v2.13.5)', barAt() === bar0, barAt() + ' vs ' + bar0);
  await said();
  await wait(1800);
  ok('…said: on to the next not said yet (Al-Falaq)', L.st().step === 1, L.st().step);
  d.querySelector('[data-act=btgo][data-j="0"]').click();
  await wait(200);
  ok('a finished one, chosen again: full beads; the dots never take a bead off', d.querySelectorAll('.btbeads i.on').length === 3 && L.st().cnt[0] === 3);
  d.querySelector('[data-act=btsaid]').click();
  await wait(200);
  ok('…“✓ Said it” there moves on to the next not said yet', L.st().step === 1);
  for (const nm of ['Al-Falaq', 'An-Nās']) {
    ok('…' + nm, say().includes(nm));
    for (let j = 0; j < 3; j++) await said();
    await wait(1800);
  }
  ok('all said: goodnight, by name, the Teacher smiling', /Goodnight/.test(say()) && !!d.querySelector('[data-act=btbye]') && !!d.querySelector('.btscr.happy'));
  ok('…the screen never scrolls', d.scrollingElement.scrollHeight <= w.innerHeight + 1, d.scrollingElement.scrollHeight + ' / ' + w.innerHeight);
  ok('…no gifts given at bedtime', prof.pending.length === pend0, prof.pending.length + ' / ' + pend0);
  d.querySelector('[data-act=btbye]').click();
  await wait(1700);
  ok('Goodnight goes back to the Garden (where it began)', L.st().view === 'map' && L.garden());
  // the map's 🌙 Bedtime button: only after sunset; back out to the world it began in
  L.garden(false);
  L.go('map');
  await wait(1200);
  ok('after sunset: a sleepy moon on the map (tap it for bedtime; no button, v2.13.2)', !!d.querySelector('.mmoon') && d.querySelectorAll('.mmoon .mz').length === 3 && !d.querySelector('.bedbtn'));
  d.querySelector('.mmoon').click();
  await wait(1700);
  ok('…it opens bedtime', L.st().view === 'bedtime');
  d.querySelector('.bar [data-act=back]').click();
  await wait(1700);
  ok('…and Back comes out in the same world (not the Garden)', L.st().view === 'map' && !L.garden());
  w.__bedtime = false;
  L.go('map');
  await wait(1200);
  ok('in the day: no moon', !d.querySelector('.mmoon'));
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
