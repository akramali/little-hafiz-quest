// v2.9.0: the Teacher's riddle of the day, the buddy's care (food, or fuel for rides) and its tricks, the garden at
// each memorized stop, and special days (a garland, a greeting and a sticker)
(async () => {
  fixture({ items: ['ladybug-buddy', 'toy-car'], outfit: { pet: 'ladybug-buddy' } });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0],
    m = d.getElementById('modal'),
    today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  w.__occasion = '';
  // 1. the riddle: in the journal, a dot on its button; tapping the answer on the map solves it
  L.go('map'); await wait(1500);
  ok('the journal button has a dot while the riddle is open', !!d.querySelector('.jbtn .newdot'));
  L.go('journal', { w: 0 }); await wait(300);
  const strip = d.querySelector('.jriddle');
  log('riddle:', strip && strip.textContent.replace(/\s+/g, ' '));
  ok('the riddle of the day at the top of the journal', !!strip && /Riddle of the day/.test(strip.textContent) && !strip.classList.contains('done'));
  const k = L.riddleKey(prof);
  L.go('map'); await wait(1500);
  const el = d.querySelector(`.mprop[data-k="${k}"]`);
  log('answer', k, '| on the map', !!el);
  if (el) {
    el.scrollIntoView({ block: 'center' }); await wait(400);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
    log('after the tap: riddle', JSON.stringify(prof.riddle), '| card', m.textContent.trim().slice(0, 80));
    ok('tapping the answer solves it: a stamp', prof.riddle[0] === today && prof.riddle[1] === 1 && /you found it/.test(m.textContent));
    m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
    L.go('map'); await wait(800);
    ok('no dot once solved', !d.querySelector('.jbtn .newdot'));
  }
  // 7 stamps: a gift
  prof.riddle = ['2000-01-01', 6];
  const before = prof.pending.length;
  L.go('map'); await wait(1500);
  const el2 = d.querySelector(`.mprop[data-k="${k}"]`);
  if (el2) {
    el2.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(1300);
    ok('the 7th stamp brings a gift', prof.riddle[1] === 7 && prof.pending.length > before, prof.pending.length + ' vs ' + before);
    m.querySelector('[data-act=cno]') && m.querySelector('[data-act=cno]').click(); await wait(200);
  }
  // 2. the buddy: hungry until a step is finished, then fed (a line on the done page), and its card
  prof.buddy = ['2000-01-01', 1];
  log('mood before', L.buddyMood(prof));
  ok('a new day: the buddy is hungry', L.buddyMood(prof) === 'hungry');
  L.go('map'); await wait(1500);
  ok('on the map, a bubble by the hungry buddy', !!d.querySelector('.mex .budmood.m-hungry'));
  // finishing a step feeds it (Word Steps of Al-Ikhlāṣ, its last āyah)
  const S112 = w.LHQ_DATA.surahs[idx(112)], last = S112.ayat.length - 1;
  L.go('words', { i: idx(112), p: 0, a: last, w: 1, phase: 'recall', shown: [], doneA: [...Array(last).keys()], savedA: [] }); await wait(300);
  const nW = d.querySelectorAll('.wflow > .wbox').length;
  L.go('words', Object.assign({}, L.st(), { shown: [...Array(nW).keys()] })); await wait(300);
  const wd = d.querySelector('[data-act=wdone]');
  log('finish button', !!wd);
  if (wd) { wd.click(); await wait(1200); }
  log('view', L.st().view, '| buddy', JSON.stringify(prof.buddy), '| memo', [...d.querySelectorAll('.dbody .memo')].map((x) => x.textContent).join(' / ').slice(0, 120));
  ok('finishing a step feeds it, and the done page says so', prof.buddy[0] === today && prof.buddy[1] === 2 && /fed and happy/.test(d.body.textContent));
  ok('…and it learned its first trick (2 days)', /learned a new trick: Hop/.test(d.body.textContent));
  prof.buddy = ['2000-01-01', 1];
  L.go('bag', { tab: 'pet' }); await wait(400);
  ok('My Explorer: the mood bubble by the buddy', !!d.querySelector('.wd-ex .budmood'));
  d.querySelector('.wd-ex .budmood').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300);
  log('buddy card:', m.textContent.replace(/\s+/g, ' ').slice(0, 140));
  ok('its card: hungry, how to feed it', !!d.querySelector('#modal.show .budcard') && /hungry/.test(m.textContent));
  m.querySelector('[data-act=cno]').click(); await wait(200);
  prof.buddy = [today, 2];
  L.go('bag', { tab: 'pet' }); await wait(300);
  d.querySelector('.wd-ex .budmood') && d.querySelector('.wd-ex .budmood').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300);
  ok('fed today: happy (or asleep at night), with its trick', /happy and full|fast asleep/.test(m.textContent) && !!m.querySelector('[data-act=trick][data-t=hop]'));
  m.querySelector('[data-act=trick]') && m.querySelector('[data-act=trick]').click(); await wait(200);
  ok('the trick plays on the explorer', !!d.querySelector('.wd-ex svg.ex.tr-hop'));
  // a ride needs fuel
  prof.outfit.pet = 'toy-car'; prof.buddy = ['2000-01-01', 0];
  L.go('bag', { tab: 'pet' }); await wait(300);
  d.querySelector('.wd-ex .budmood').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(300);
  log('ride card:', m.textContent.replace(/\s+/g, ' ').slice(0, 100));
  ok('a ride needs fuel, not food', /needs fuel/.test(m.textContent) && /⛽/.test(m.textContent));
  m.querySelector('[data-act=cno]').click(); await wait(200);
  // 3. the garden grows with the different days a sūrah is practised
  prof.fire[113] = [Date.now() - 3 * 864e5, 3];
  log('garden at 3 days', L.gardenOf(w.LHQ_DATA.surahs[idx(113)], prof));
  ok('3 days practised: a sprout', L.gardenOf(w.LHQ_DATA.surahs[idx(113)], prof) === 1);
  L.go('map'); await wait(1500);
  ok('a plant at each memorized stop', d.querySelectorAll('.node .ngarden').length >= 3);
  // the Teacher's test with a miss: at the end, the campfire burns down from where it was
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('elder', { i: idx(113), p: 0, fire0: 5, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: true, rematch: false, result: null, ack: '' }); await wait(300);
  d.querySelector('[data-act=eldans][data-ok="0"]').click();
  for (let t = 0; t < 100 && L.st().phase !== 'end'; t++) await wait(100);
  const steps = d.querySelectorAll('.eldend .firerise .fr-st').length;
  log('after a miss: fire steps shown', steps, '| now', JSON.stringify(prof.fire[113]));
  ok('a test with a miss ends with the campfire going down to Low (roaring → low)', steps === 4);
  // out of hearts in a review game: the campfire burns down a step, shown on the card
  prof.fire[113] = [Date.now() - 2 * 864e5, 3];
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
  d.querySelector('[data-act=oops]') && d.querySelector('[data-act=oops]').click();
  for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  log('out of hearts: fire', L.gardenOf && JSON.stringify(prof.fire[113]), '| steps', d.querySelectorAll('#modal .dropfire .fr-st').length);
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
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
