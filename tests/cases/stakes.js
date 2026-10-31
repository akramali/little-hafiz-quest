// the Stranger's rules: every miss costs; protection decides whether you're hurt and what falls
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], A = w.LHQ_ART, X = L.stranger;
  const own = (...ids) => ids.forEach((id) => prof.items.includes(id) || prof.items.push(id));
  const wear = (o) => { prof.outfit = Object.assign({}, o); };
  const k = (f) => (f ? f.k + ':' + f.id : 'nothing');
  prof.items = []; prof.lost = []; prof.stickers = ['star', 'moon', 'stars100']; prof.badge = '';
  // what things block
  ok('a shield blocks rocks, boots water, a hat acorns, glasses sand, a stick vines, a cape wind', X.blocksOf('sturdy-shield').includes('rock') && X.blocksOf('rain-boots').includes('water') && X.blocksOf('explorer-cap').includes('acorn') && X.blocksOf('sunrise-shades').includes('sand') && X.blocksOf('crystal-staff').includes('vines') && X.blocksOf('leaf-cape').includes('wind'));
  ok('the hero sword also parries rocks; the armor blocks everything', X.blocksOf('hero-sword').includes('rock') && X.blocksOf('hero-armor').length === 6);
  ok('comfy starter things and rides block nothing', !X.blocksOf('twig').length && !X.blocksOf('basic-shoes').length && !X.blocksOf('toy-car').length);
  ok('an animal buddy blocks rocks', X.blocksOf('ladybug-buddy').includes('rock'));
  // 1. nothing protecting: hurt, and the best worn thing (not golden) falls
  own('explorer-cap', 'leaf-cape', 'gold-explorer-cap'.replace(/.*/, A.ITEMS.find((it) => it.gold && it.slot === 'cape').id));
  const goldCape = A.ITEMS.find((it) => it.gold && it.slot === 'cape').id;
  wear({ hat: 'explorer-cap', cape: goldCape });
  let r = X.strikeFor('rock', prof, false);
  ok('unprotected: hurt, and the best non-golden thing worn falls', r.hurt && k(r.falls) === 'i:explorer-cap', JSON.stringify(r));
  // 2. ordinary matching gear takes the hit
  own('sturdy-shield'); wear({ shield: 'sturdy-shield', hat: 'explorer-cap' });
  r = X.strikeFor('rock', prof, false);
  ok('a shield blocks the rock and falls itself', !r.hurt && r.blocker === 'sturdy-shield' && k(r.falls) === 'i:sturdy-shield');
  // 3. golden gear, green sūrah: holds, the next thing falls
  wear({ cape: goldCape, hat: 'explorer-cap' });
  r = X.strikeFor('wind', prof, false);
  ok('golden cape, green sūrah: it holds, the hat falls', !r.hurt && r.blocker === goldCape && k(r.falls) === 'i:explorer-cap');
  // 4. golden sūrah: golden gear falls too
  r = X.strikeFor('wind', prof, true);
  ok('golden cape, golden sūrah: it falls', k(r.falls) === 'i:' + goldCape);
  // 5. buddies
  own('ladybug-buddy', 'toy-car'); wear({ pet: 'ladybug-buddy' });
  r = X.strikeFor('rock', prof, false);
  ok('an animal buddy jumps in front and is the one to go', r.blocker === 'ladybug-buddy' && k(r.falls) === 'i:ladybug-buddy');
  wear({ pet: 'toy-car' });
  r = X.strikeFor('rock', prof, false);
  ok('a ride does not block', r.hurt);
  // 6. the list: owned non-golden, then a sticker (not a badge), then golden
  prof.items = [goldCape]; prof.lost = []; wear({ cape: goldCape });
  r = X.strikeFor('wind', prof, false);
  ok('only golden gear left, green sūrah: a sticker falls (never a star badge)', k(r.falls) === 's:moon' || k(r.falls) === 's:star', k(r.falls));
  prof.stickers = ['stars100'];
  r = X.strikeFor('wind', prof, false);
  ok('no stickers left: the golden gear goes after all', k(r.falls) === 'i:' + goldCape);
  prof.items = []; wear({});
  r = X.strikeFor('rock', prof, false);
  ok('nothing left but comfy clothes and badges: hurt, nothing falls', r.hurt && !r.falls);
  // 7. throws come from the sūrah's world
  ok('each world throws its own two', X.WORLD_THROWS.length === 7 && X.WORLD_THROWS.every((t) => t.length === 2));
  // 8. a real battle: a right answer is acknowledged, a miss hurts and things fall to the ground
  prof.items = ['explorer-cap', 'rain-boots']; prof.stickers = ['star']; prof.lost = []; prof.lostSt = []; prof.fix = []; prof.rematch = []; prof.rematchReady = [];
  wear({ hat: 'explorer-cap', shoes: 'rain-boots' });
  L.go('stranger', { i: idx(113), p: 0, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }, { k: 1, kind: 'next', cut: 0, throw: 'rock' }, { k: 2, kind: 'next', cut: 0, throw: 'water' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: false, rematch: false, result: null, ack: '' });
  await wait(200);
  d.querySelector('[data-act=strans][data-ok="1"]').click(); await wait(300);
  ok('a right answer: he acknowledges it', d.querySelector('.strbubble.ack') && /right|know|remembered|impressive/i.test(d.querySelector('.strbubble').textContent));
  await wait(1400);
  d.querySelector('[data-act=strans][data-ok="0"]').click(); await wait(2200);
  ok('a miss with nothing to block: hurt (plaster), something falls', !!d.querySelector('.me .plaster') && prof.lost.length === 1, prof.lost.map((x) => x.id).join());
  await wait(1500);
  ok('it lies on the ground in the arena', d.querySelectorAll('.strground .strfallen').length === 1);
  for (let t = 0; t < 40 && !d.querySelector('[data-act=strans]:not([disabled])'); t++) await wait(100);
  d.querySelector('[data-act=strans][data-ok="0"]').click(); // water: the boots block it and fall
  for (let t = 0; t < 80 && L.st().phase !== 'end'; t++) await wait(100);
  ok('boots block the water and fall themselves', prof.lost.some((x) => x.id === 'rain-boots'), prof.lost.map((x) => x.id).join());
  ok('every miss cost something: 2 misses, 2 things', prof.lost.length === 2);
  ok('the result lists what fell and the explorer looks sad', /waiting at/.test(d.querySelector('.strend').textContent) && !!d.querySelector('.mefig svg.ex-sad'));
  if (Q.get('shot') === 'end') { await wait(500); done(); return; }
  // 9. revising there wins it all back and brings the rematch
  L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let t = 0; t < 10 && L.st().view === 'path'; t++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(900); }
  ok('a review game there wins everything back, and he will come for a rematch', !prof.lost.length && prof.rematchReady.includes(113));
  // 10. the icons: world signs, the world list, item cards
  L.go('map'); await wait(1000);
  ok('each world sign shows its throws', [...d.querySelectorAll('.msign .msthrows')].length === 7 && /🪨/.test(d.querySelector('.msign .msthrows').textContent));
  ok('the world list shows them too', d.querySelectorAll('.wr .wr-thr').length === 7);
  d.getElementById('modal').classList.remove('show');
  L.go('bag', { tab: 'shoes' }); await wait(300);
  ok('an item card shows what it blocks', /💧/.test((d.querySelector('[data-id="rain-boots"] .iblk') || {}).textContent || ''));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
