// v2.9.0/v2.9.1: the Teacher's riddles (seven a day, opened from the journal), my tree with the buddies around it,
// the campfire going low (or out) on a mistake, and special days (a garland, a greeting and a sticker)
(async () => {
  fixture({ items: ['ladybug-buddy', 'toy-car'], outfit: { pet: 'ladybug-buddy' } });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0],
    m = d.getElementById('modal'),
    today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  w.__occasion = '';
  // 1. riddles (v2.9.1; v2.10.0: one and done, a button in the journal's header with the way to the next gift, two
  // minutes apart, a gift every seventh, more kinds of answers): opened from the journal, looked for on the map
  // (riddle j along the list: one whose answer is a thing on the map, for these taps)
  const pick = (test) => { for (let j = 0; j < 7; j++) { prof.riddle = [today, j, 0, 0, 0]; const r = L.riddleNow(prof); if (r && test(r[0])) return j; } return -1; };
  const jp = pick((k) => !/^[xs]:/.test(k));
  L.go('map'); await wait(1500);
  ok('the journal button has a dot while a riddle waits', !!d.querySelector('.jbtn .newdot'));
  const k = L.riddleNow(prof)[0];
  // tapping the answer on the map without opening the riddle solves nothing
  const el0 = d.querySelector(`.mprop[data-k="${k}"]`);
  if (el0) { el0.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(400); }
  ok('a tap on the answer before opening the riddle solves nothing', prof.riddle[1] === jp);
  L.go('journal', { w: 0 }); await wait(300);
  const btn = d.querySelector('.bar .jrbtn.on');
  log('riddle button:', btn && btn.textContent.replace(/\s+/g, ' '));
  ok('the riddle in the journal\'s header, glowing, with the way to the next gift', !!btn && btn.textContent.includes(jp + '/7') && !d.querySelector('.jriddle'));
  btn.click(); await wait(1600);
  ok('tapping it goes to the map, the clue at the bottom', L.st().view === 'map' && !!d.querySelector('.mriddle'));
  // a wrong thing: nothing lost, the riddle stays open
  const other = [...d.querySelectorAll('.mprop')].find((e) => e.dataset.k !== k);
  if (other) { other.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300); }
  ok('a wrong tap: nothing lost, still looking', !!d.querySelector('.mriddle') && prof.riddle[1] === jp);
  { // ✕: the clue slides away (a finger-sized target), then back in the journal; open it again from there
    const x = d.querySelector('.mriddle .mr-x'), r = x.getBoundingClientRect(), hit = w.getComputedStyle(x, '::after');
    x.click(); await wait(60);
    ok('closing the clue: it slides away, then it is gone', !!d.querySelector('.mriddle.closing') && r.width >= 40 && hit.inset === '-10px' && (await wait(400), !d.querySelector('.mriddle')));
    L.go('journal', { w: 0 }); await wait(300);
    d.querySelector('.jrbtn.on').click(); await wait(1600);
  }
  const el = d.querySelector(`.mprop[data-k="${k}"]`);
  log('answer', k, '| on the map', !!el);
  el.scrollIntoView({ block: 'center' }); await wait(300);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
  log('after: riddle', JSON.stringify(prof.riddle), '| card', m.textContent.trim().slice(0, 90));
  ok('found: a stamp, the next in two minutes', prof.riddle[0] === today && prof.riddle[1] === jp + 1 && prof.riddle[2] === 1 && prof.riddle[3] > Date.now() + 110000 && /you found the/.test(m.textContent) && new RegExp((6 - jp) + ' more for a gift').test(m.textContent));
  m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  L.go('journal', { w: 0 }); await wait(300);
  d.querySelector('.jrbtn').click(); await wait(200);
  ok('none waiting: the button says when the next comes', !d.querySelector('.jrbtn.on') && /next riddle comes in 2 minutes/.test(d.getElementById('toast') ? d.getElementById('toast').textContent : d.body.textContent));
  // one and done: every riddle once (a thing's second clue only after all the first ones), none skipped by days missed
  {
    const T = L.riddleCount(), all = [];
    for (let j = 0; j < T; j++) { prof.riddle = [today, j, 0, 0, 0]; all.push(L.riddleNow(prof).join('|')); }
    const N = T / 2, keys = all.map((x) => x.split('|')[0]);
    log('riddles:', T, '| first:', keys.slice(0, 5).join(' '));
    ok('every riddle once, a thing again only after all the others', T > 230 && new Set(all).size === T && new Set(keys.slice(0, N)).size === N && keys.every((x, j) => j < N || x === keys[j - N]));
    prof.riddle = ['2020-01-01', 40, 3, 0, 0];
    const later = L.riddleNow(prof);
    prof.riddle = [today, 40, 0, 0, 0];
    ok('days missed skip nothing: the next riddle is the next on the list', later && later.join() === L.riddleNow(prof).join());
    prof.riddle = [today, T, 0, 0, 0];
    ok('all found: they come round again in a new order', !!L.riddleNow(prof) && L.riddleNow(prof).join('|') !== all[0]);
    // every answer is there to tap on the map (a fruit: its tree)
    L.go('map'); await wait(1200);
    const FT = { apple: 'meadow-tree', acorn: 'forest-oak', pinecone: 'forest-pine', coconut: 'sands-palm', cherry: 'meadow-bush', blueberry: 'forest-berries', pear: 'canyon-cactus' };
    const missing = [...new Set(keys)].filter((x) => !d.querySelector(x.startsWith('s:') ? `.node[data-i="${idx(+x.slice(2))}"]` : x.startsWith('w:') ? `.msign[data-w="${x.slice(2)}"]` : x === 'x:bridge' ? '.mbridge, .mgate' : x.startsWith('x:') ? `.mprop[data-k="${FT[x.slice(2)]}"]` : `.mprop[data-k="${x}"]`));
    ok('every answer can be found on the map', !missing.length, missing.join(' '));
    prof.riddle = [today, jp + 1, 1, Date.now() + 120000, 0];
  }
  // (v2.10.0) a sūrah's stop can be the answer: tapping it solves the riddle instead of opening the sūrah
  {
    const n = 113, kk = 's:' + n;
    L.go('map'); await wait(1200);
    prof.riddle = [today, 1, 2, 0, 0];
    L.go('journal', { w: 0 }); await wait(200);
    d.querySelector('.jrbtn.on').click(); await wait(1600);
    w.__lhq.riddleSet && w.__lhq.riddleSet(kk);
    const node = d.querySelector(`.node[data-i="${idx(n)}"]`);
    node && node.scrollIntoView({ block: 'center' }); await wait(300);
    node && node.click(); await wait(1300);
    ok('a sūrah stop as the answer: solved, and the map stays', L.st().view === 'map' && prof.riddle[2] === 3 && /you found the/.test(m.textContent), L.st().view + ' ' + JSON.stringify(prof.riddle));
    m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  }
  // (v2.10.0) a fruit that only falls when its tree is tapped: catch it before an animal does
  {
    prof.riddle = [today, 2, 3, 0, 0];
    L.go('journal', { w: 0 }); await wait(200);
    d.querySelector('.jrbtn.on').click(); await wait(1600);
    w.__lhq.riddleSet('x:apple');
    const tree = d.querySelector('.mprop[data-k="meadow-tree"]');
    tree.scrollIntoView({ block: 'center' }); await wait(300);
    tree.click(); await wait(800);
    const f = d.querySelector('.mfruit[data-f="apple"]');
    const tappable = f && w.getComputedStyle(f).pointerEvents !== 'none';
    f && f.click(); await wait(1300);
    ok('a hidden answer: tap the tree, catch the apple that falls', tappable && prof.riddle[2] === 4 && /Apple/.test(m.textContent), JSON.stringify(prof.riddle));
    m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  }
  // every seventh found (here the 14th, on a day's 3rd): a gift to tap open, right on the Teacher's card
  prof.riddle = [today, 13, 2, 0, 0];
  const before = prof.pending.length;
  L.go('journal', { w: 0 }); await wait(200);
  d.querySelector('.jrbtn.on').click(); await wait(1600);
  const el7 = d.querySelector('.mprop[data-k]');
  w.__lhq.riddleSet(el7.dataset.k); // (whatever today's seventh is: answer it with a thing that's on the map)
  el7.scrollIntoView({ block: 'center' }); await wait(300);
  el7.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
  ok('the 14th riddle brings a gift, to tap open on the card', prof.riddle[1] === 14 && prof.riddle[2] === 3 && /A gift for you/.test(m.textContent) && prof.pending.length > before && prof.riddle[4] === 1 && !!m.querySelector('.giftbtn[data-act=opengift]'));
  m.querySelector('[data-act=opengift]') && m.querySelector('[data-act=opengift]').click(); await wait(600);
  ok('…and it opens', prof.pending.length === before);
  d.getElementById('modal').classList.remove('show');
  L.go('journal', { w: 0 }); await wait(200);
  ok('after the gift the button starts again: 0/7', d.querySelector('.jrbtn').textContent.includes('0/7'));
  prof.riddle = [today, 20, 7, 0, 0];
  L.go('journal', { w: 0 }); await wait(200);
  d.querySelector('.jrbtn').click(); await wait(200);
  ok('seven today: none waiting, more tomorrow', !L.riddleNow(prof) && !d.querySelector('.jrbtn.on') && /More tomorrow/.test(d.getElementById('toast') ? d.getElementById('toast').textContent : d.body.textContent));
  // 2. my tree: its button under the journal's, a screen of its own
  L.go('map'); await wait(1500);
  ok('the My Tree button on the map', !!d.querySelector('.tbtn[data-act=tree]'));
  ok('no plants at the stops any more (one tree instead)', !d.querySelector('.node .ngarden'));
  // (no fruit yet on a young tree: no one's hungry)
  prof.grow = [0, '', []];
  prof.buddy = ['2000-01-01', 0, 0];
  L.treeReset();
  d.querySelector('[data-act=tree]').click(); await wait(800);
  log('young tree', JSON.stringify({ size: L.treeInfo(prof).size.toFixed(3), fruits: L.treeInfo(prof).fruits.length }), '| hungry', JSON.stringify(L.hungry()));
  ok('a young tree with no fruit: no buddy hungry yet', L.treeInfo(prof).fruits.length === 0 && !L.hungry() && !d.querySelector('.tsvg .tbud.m-hungry'));
  L.go('map'); await wait(1200);
  // (a tree with fruit: fifteen sūrahs golden, and plenty of practice)
  w.LHQ_DATA.surahs.slice().sort((x, y) => y.n - x.n).slice(0, 15).forEach((x) => (prof.prog[x.n] = { parts: x.P.map(() => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 })), all: x.P.length > 1 ? 3 : 0 }));
  prof.grow = [200, '', []];
  d.querySelector('[data-act=tree]').click(); await wait(800);
  const info = L.treeInfo(prof), hg = L.hungry();
  log('tree', JSON.stringify({ size: info.size.toFixed(2), leaves: info.leaves, blossoms: info.blossoms.length, fruits: info.fruits.length }), '| hungry', JSON.stringify(hg));
  ok('my tree: fruit drawn, and a flower in the grass for every sūrah memorized', L.st().view === 'tree' && d.querySelectorAll('.tsvg .tfruit').length === info.fruits.length && info.fruits.length >= 2 && d.querySelectorAll('.tsvg [data-act=tflower]').length === info.flowers.length && info.flowers.length === info.memorized);
  ok('the buddies live around it, one hungry', d.querySelectorAll('.tsvg .tbud').length === 2 && d.querySelectorAll('.tsvg .tbud.m-hungry').length === 1);
  { // two flowers tapped one after the other: one name showing, not a pile; the bar sits in the flow (no extra offset)
    const fl = d.querySelectorAll('.tsvg [data-act=tflower]');
    fl[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(150);
    fl[1].dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(150);
    ok('my tree: one flower name at a time', d.querySelectorAll('.tftag').length === 1, d.querySelectorAll('.tftag').length);
    ok('my tree: the note sits below the title bar', d.querySelector('.tnote').getBoundingClientRect().top >= d.querySelector('.treescr > .bar').getBoundingClientRect().bottom - 6 && w.getComputedStyle(d.querySelector('.treescr > .bar')).top === '0px');
    { const nr = d.querySelector('.tnote').getBoundingClientRect(), cr = d.querySelector('.tsvg .tsun-c').getBoundingClientRect();
      ok('my tree: the sun (or moon) is never under the note', cr.top >= nr.bottom || cr.left >= nr.right - 8, JSON.stringify([nr.bottom, cr.top]));
      ok('my tree: the sky shows under the status bar (no bar colour there)', w.getComputedStyle(d.body, '::before').backgroundColor === 'rgba(0, 0, 0, 0)'); }
    const bud = d.querySelector('.tsvg .tbud');
    if (bud) {
      bud.classList.remove('m-asleep', 'hid'); // (awake and out in the open for this check)
      bud.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(120);
      const cs = w.getComputedStyle(bud.querySelector('.tbud-w'));
      ok('my tree: a tapped buddy does a move, starting at once', /bm-/.test(bud.getAttribute('class')) && /^tb/.test(cs.animationName) && cs.animationDelay === '0s', cs.animationName + ' ' + cs.animationDelay);
    }
  }
  const want = hg.want, fr = [...d.querySelectorAll('.tsvg .tfruit')].find((f) => f.dataset.t === want);
  fr.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(4800);
  log('fed: buddy', JSON.stringify(prof.buddy), '| hungry now', JSON.stringify(L.hungry()));
  ok('tapping the fruit it wants: it falls, the buddy eats, fed for the day', prof.buddy[0] === today && prof.buddy[1] === 1 && !L.hungry());
  await wait(1200);
  ok('no other buddy hungry for 30 seconds', !d.querySelector('.tsvg .tbud.m-hungry'));
  { // a fruit no one wanted falls and is nibbled away; drawn again, it stays off the tree (no jump back up)
    const f2 = [...d.querySelectorAll('.tsvg .tfruit:not(.fall):not(.ground)')][0];
    f2.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1200);
    L.go('tree', Object.assign({}, L.st())); await wait(300);
    const again = d.querySelector('.tsvg .tfruit[data-j="' + f2.dataset.j + '"]');
    ok('my tree: a fallen fruit no one wanted lies on the ground, also when the screen is drawn again (no jump back up)', again && again.classList.contains('fall') && !again.classList.contains('gone') && d.querySelector('.tsvg .tfruit[data-j="' + fr.dataset.j + '"]').classList.contains('gone'));
    d.querySelectorAll('.tsvg .tcrit').forEach((c) => c.remove());
    L.critterFor(again); await wait(200);
    ok('…a squirrel or a rabbit comes for it', !!d.querySelector('.tsvg .tcrit'));
    await wait(4800);
    ok('…picks it up and runs off', again.classList.contains('gone'));
  }
  // growing: a sūrah practised grows it once a day
  const g0 = prof.grow[0];
  const finishWords = async () => {
    const S112 = w.LHQ_DATA.surahs[idx(112)], last = S112.ayat.length - 1;
    L.go('words', { i: idx(112), p: 0, a: last, w: 1, phase: 'recall', shown: [], doneA: [...Array(last).keys()], savedA: [] }); await wait(300);
    const nW = d.querySelectorAll('.wflow > .wbox').length;
    L.go('words', Object.assign({}, L.st(), { shown: [...Array(nW).keys()] })); await wait(300);
    const wd = d.querySelector('[data-act=wdone]');
    if (wd) { wd.click(); await wait(1200); }
  };
  await finishWords();
  await finishWords();
  log('grow', g0, '→', JSON.stringify(prof.grow));
  ok('practising a sūrah grows the tree, once a day', prof.grow[0] === g0 + 1 && prof.grow[2].includes(112));
  // the Teacher's test with a miss: at the end, the campfire burns down from where it was
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('elder', { i: idx(113), p: 0, fire0: 5, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: true, rematch: false, result: null, ack: '' }); await wait(300);
  d.querySelector('[data-act=eldans][data-ok="0"]').click();
  for (let t = 0; t < 100 && L.st().phase !== 'end'; t++) await wait(100);
  const steps = d.querySelectorAll('.eldend .firerise .fr-st').length;
  log('after a miss: fire steps shown', steps, '| now', JSON.stringify(prof.fire[113]));
  ok('a test with a miss ends with the campfire going down to Low (roaring → low)', steps === 4);
  // out of hearts in a review game: the campfire goes down to Low, shown on the card
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
  d.querySelector('[data-act=oops]') && d.querySelector('[data-act=oops]').click();
  for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  log('out of hearts: fire', JSON.stringify(prof.fire[113]), '| steps', d.querySelectorAll('#modal .dropfire .fr-st').length);
  ok('out of hearts: the campfire goes down to Low (roaring → low), shown on the card', d.querySelectorAll('#modal .dropfire .fr-st').length === 4);
  d.querySelector('#modal [data-act=dropnext]') && d.querySelector('#modal [data-act=dropnext]').click(); await wait(300);
  // already low (or embers): it burns out
  prof.fire[113] = [Date.now() - 11 * 864e5, 3];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
  d.querySelector('[data-act=oops]') && d.querySelector('[data-act=oops]').click();
  for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  const daysNow = (Date.now() - prof.fire[113][0]) / 864e5;
  log('already low, out of hearts: days', daysNow.toFixed(1), '| steps', d.querySelectorAll('#modal .dropfire .fr-st').length);
  ok('already low: a mistake burns it out', daysNow >= 21 && d.querySelectorAll('#modal .dropfire .fr-st').length === 3);
  d.querySelector('#modal [data-act=dropnext]') && d.querySelector('#modal [data-act=dropnext]').click(); await wait(300);
  // the map keeps scenery clear of every stop's campfire (v2.9.1)
  w.LHQ_DATA.surahs.forEach((x) => { prof.prog[x.n] = { parts: x.P.map(() => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 })), all: x.P.length > 1 ? 3 : 0 }; prof.fire[x.n] = [Date.now() - 864e5, 1]; });
  prof.strangers = [0, 1, 2, 3, 4, 5, 6, 7]; // (every sūrah memorized: the Stranger has said his farewell already)
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(1500);
  const fires = [...d.querySelectorAll('.nfire')].map((f) => f.getBoundingClientRect()),
    scen = [...d.querySelectorAll('.mprop')].map((m) => ({ k: m.dataset.k, r: m.getBoundingClientRect() })),
    over = [];
  fires.forEach((f, i) => scen.forEach((q) => { const r = q.r, ix = Math.min(f.right, r.right - r.width * 0.15) - Math.max(f.left, r.left + r.width * 0.15), iy = Math.min(f.bottom, r.bottom) - Math.max(f.top, r.top + r.height * 0.1); if (ix > 6 && iy > 6) over.push(i + ':' + q.k); }));
  log('campfires', fires.length, '| covered by scenery:', over.join(' ') || 'none');
  ok('no campfire is covered by trees or other scenery', fires.length === 37 && !over.length);
  // 4. special days: a garland, a greeting and the sticker (once)
  w.__occasion = 'ramadan';
  try { w.localStorage.removeItem('lhq_greet'); } catch (e) {}
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(2400);
  log('garland', !!d.querySelector('.festive.f-ramadan'), '| pending', prof.pending.map((g) => g.id).slice(-2).join(','));
  ok('Ramadan: a garland over the map', !!d.querySelector('.festive.f-ramadan svg'));
  ok("…and this Hijri year's Ramadan sticker in the gift box", prof.pending.some((g) => g.k === 's' && /^ramadan-14\d\d$/.test(g.id)), prof.pending.map((g) => g.id).join(','));
  const n0 = prof.pending.length;
  L.go('surah', { i: idx(113), p: 0 }); await wait(100);
  L.go('map'); await wait(2400);
  ok('only once', prof.pending.length === n0);
  ok('a normal day: no garland', (w.__occasion = '', L.go('map'), await wait(400), !d.querySelector('.festive')));
  { // (v2.9.4) inside a step no drifting animals behind the card (a swipe showed them); the sūrah's page keeps them
    L.go('learn', { i: idx(113), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(400);
    const amb = d.querySelector('.scn-amb');
    ok('inside a step: the world\'s animals stay on the sūrah page', !amb || w.getComputedStyle(amb).display === 'none');
    L.go('surah', { i: idx(113), p: 0 }); await wait(400);
    ok('…and on the sūrah page they drift as before', !!d.querySelector('.scn-amb') && w.getComputedStyle(d.querySelector('.scn-amb')).display !== 'none');
    // (v2.9.4) puzzle pieces tinted from their pictures
    L.go('order', { i: idx(78), p: 1, deck: [0, 1, 2, 3, 4, 5], placed: {}, say: 0, sel: null, hearts: 4, maxH: 4 }); await wait(500);
    const fills = [...d.querySelectorAll('.pz-svg path')].map((p) => p.getAttribute('fill'));
    log('piece colours', fills.join(' '));
    ok('puzzle pieces take a light tint of their pictures', fills.length > 2 && fills.some((f) => !['#ffd9e4', '#d5efff', '#ddf7d2', '#fff0c2', '#e8dcff', '#ffe2c8'].includes(f)));
  }
  { // (v2.9.5) no Start button; the next learning step glows, review games never do
    const r = prof.prog[112] = { parts: [{ learn: 1, words: 0, order: 0, next: 0, path: 0, la: 0, wa: 0 }], all: 0 };
    L.go('surah', { i: idx(112), p: 0 }); await wait(300);
    const g1 = [...d.querySelectorAll('.qstep.glow')].map((b) => b.dataset.act);
    r.parts[0].words = 1;
    L.go('surah', { i: idx(112), p: 0 }); await wait(300);
    const g2 = d.querySelectorAll('.qstep.glow').length;
    ok('no Start button; the next learning step glows, a review game never', !d.querySelector('.qgo:not(.lock)') && g1.join() === 'words' && g2 === 0, g1.join() + ' / ' + g2);
  }
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
