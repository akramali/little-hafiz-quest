// v2.7.0: the welcome and the walking stick, campfires, the journal (tap and hold), streaks, tappable things
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  // a second, brand-new explorer
  s0.profiles.push({ id: 'pnew', name: 'Zaid', made: true, look: { skin: 2, hair: 'short', hairColor: 1, hijabColor: 0, kid: 'boy', tee: 1, legs: 1 }, outfit: {}, prog: {}, items: [], stickers: [] });
  s0.cur = 'pnew';
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const X = w.__lhq, A = w.LHQ_ART, m = d.getElementById('modal');
  const tap = (sel) => { const b = d.querySelector(sel); if (b) b.click(); return !!b; };
  // (v2.7.2: a tap brings an "Add to journal" button; holdOn(el, long) taps and accepts it, holdOn(el, short) only taps)
  const holdOn = async (el, ms) => {
    el.click(); await wait(150);
    const chip = d.querySelector('.jchip');
    if (ms > 500 && chip) { chip.click(); await wait(150); }
    else if (chip) chip.remove();
  };
  // 1. a new explorer: "Begin the quest", no stick yet; the Wise Elder welcomes them and hands it over
  let p = L.store().profiles.find((x) => x.id === 'pnew');
  L.go('splash'); await wait(300);
  ok('a new explorer: Begin the quest', /Begin the quest/.test(d.querySelector('.sp-begin').textContent));
  tap('.sp-begin'); await wait(2600);
  ok('on the map, the Wise Elder welcomes them', !!d.querySelector('#modal.show .intro') && /Zaid/.test(m.textContent));
  const cards = [];
  for (let k = 0; k < 10 && !/Take it/.test(m.textContent); k++) { cards.push(m.querySelector('.intro').textContent); tap('[data-act=intro]:not(.introback)'); await wait(250); }
  const all = cards.join(' | ').toLowerCase();
  ok('the welcome covers the quest steps, gifts and dressing up, campfires and the journal', ['four steps', 'dress up', 'campfire', 'journal'].every((t) => all.includes(t)), cards.map((c) => c.slice(0, 40)).join(' | '));
  ok('…ends with their walking stick', /walking stick/i.test(m.textContent) && /Take it/.test(m.textContent));
  tap('[data-act=intro]:not(.introback)'); await wait(400);
  ok('taking it begins the quest', p.greeted && !m.classList.contains('show'));
  L.go('splash'); await wait(300);
  ok('then it says Continue the quest', /Continue the quest/.test(d.querySelector('.sp-begin').textContent));
  // back to the sample explorer
  L.store().cur = L.store().profiles[0].id;
  p = L.store().profiles[0];
  ok('explorers from before keep going (no welcome again)', p.greeted || p.items.length > 0 || Object.keys(p.prog).length > 0);
  // 2. campfires: memorized sūrahs have one; it burns down, and revising relights it
  ok('memorized sūrahs have a campfire', !!p.fire[113] && !!p.fire[112]);
  p.fire[113] = [Date.now() - 15 * 864e5, 0]; // a little over two weeks: embers
  L.go('map'); await wait(1500);
  ok('on the map: embers by Al-Falaq', !!d.querySelector(`.node[data-i="${idx(113)}"] .nfire.f1`));
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 12 && L.st().view === 'path'; k++) { tap('.pathbtns [data-act=hop]'); await wait(900); }
  ok('revising relights it', Date.now() - p.fire[113][0] < 60000, JSON.stringify(p.fire[113]));
  // 3. the journal: hold a thing on the map to add it; a quick tap or something not in it does nothing
  L.go('map'); await wait(1500);
  const keys = [...X.journal];
  const missing = keys.filter((k) => k[0] === 'p' && !d.querySelector(`.mprop[data-k="${k.slice(2)}"]`));
  ok('every thing of the journal is somewhere on the map', !missing.length, missing.join());
  p.found = [];
  const sheep = d.querySelector('.mprop[data-k="meadow-sheep"]');
  sheep.scrollIntoView({ block: 'center' }); await wait(600);
  await holdOn(sheep, 150);
  ok('a tap alone adds nothing (it offers the button)', !p.found.length);
  await holdOn(sheep, 900);
  ok('tap, then Add to journal: the sheep is in the journal', p.found.includes('p:meadow-sheep'), p.found.join());
  // in a sūrah: hold a picture
  L.go('learn', { i: idx(114), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(600);
  const pics = [...d.querySelectorAll('.e')];
  const shield = pics.find((e) => e.textContent.trim() === '🛡️'), people = pics.find((e) => e.textContent.trim() === '👨‍👩‍👧');
  if (shield) await holdOn(shield, 900);
  ok('a picture in a sūrah: the shield is in the journal', p.found.includes('e:🛡️'), p.found.join());
  const before = p.found.length;
  if (people) await holdOn(people, 900);
  ok('people are not in the journal: no button', !!people && p.found.length === before);
  // a whole page brings a gift
  L.go('journal', { w: 0 }); await wait(300);
  ok('the journal shows the page and the count', /My Journal/.test(d.body.textContent) && /of \d+ found/.test(d.body.textContent) && d.querySelectorAll('.jit').length > 8);
  const pg = [...d.querySelectorAll('.jit')].map((b) => b.dataset.k).concat([...d.querySelectorAll('.jsura .jem')].map((e) => 'e:' + e.textContent.trim()));
  const last = 'p:meadow-sheep';
  p.found = pg.filter((k) => k !== last);
  const g0 = p.pending.length;
  L.go('map'); await wait(1500);
  const sh2 = d.querySelector('.mprop[data-k="meadow-sheep"]');
  sh2.scrollIntoView({ block: 'center' }); await wait(600);
  await holdOn(sh2, 900);
  ok('the last thing of a page: the page is complete, a gift', p.jdone.includes(0) && p.pending.length > g0, `${p.jdone} gifts ${g0}→${p.pending.length}`);
  // 4. streaks
  const day = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  p.streak = [day(Date.now() - 864e5), 4]; p.best = 4; p.dayT = [day(Date.now()), 50];
  X.countDay(p, 15);
  ok('a minute of learning today adds to the streak', p.streak[1] === 5 && p.best === 5, JSON.stringify(p.streak));
  L.go('show'); await wait(400);
  ok('My Achievements shows the streak and the best', /5 days/.test(d.body.textContent) && /best 5/.test(d.body.textContent) && d.querySelectorAll('.ach').length === 8);
  L.go('splash'); await wait(300);
  ok('the start screen shows the streak (👣, the size of the settings button)', /5/.test(d.querySelector('.streakbtn').textContent) && d.querySelector('.streakbtn').offsetWidth === d.querySelector('[data-act=settings]').offsetWidth);
  d.querySelector('.streakbtn').click(); await wait(250);
  ok('tap it: the streak and the best so far', /5 days on the trail/.test(d.querySelector('#modal.show .streakcard').textContent) && /best so far: 5 days/.test(d.querySelector('#modal.show .streakcard').textContent));
  d.getElementById('modal').click(); await wait(150);
  // 7 days in a row: a little gift
  p.streak = [day(Date.now() - 864e5), 6]; p.dayT = [day(Date.now()), 50];
  const g7 = p.pending.length;
  X.countDay(p, 15);
  ok('7 days in a row: a gift', p.streak[1] === 7 && p.pending.length === g7 + 1, `${p.streak[1]} · gifts ${g7}→${p.pending.length}`);
  // 5. the boat sails off after a few taps (and comes back)
  L.go('map'); await wait(1500);
  const boat = d.querySelector('.mprop[data-k="sands-boat"]');
  ok('the boat on the sea can be tapped', !!boat);
  if (boat) { boat.scrollIntoView({ block: 'center' }); await wait(500); for (let k = 0; k < 3; k++) { boat.click(); await wait(150); } }
  ok('three taps: it sails off', !!boat && boat._away === true);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
