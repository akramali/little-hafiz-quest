// (v2.12.20) buddies and worn things that move on their own: each has its parts, they move only on the explorer and the
// buddies at My Tree (never in gift tiles or stickers), every part turns about its own point (its unseen square holds
// it all), walking starts the walking moves, tapping the buddy starts its "every so often" moves at once
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  w.__occasion = '';
  const errs = watchErrors(w);
  const A = w.LHQ_ART,
    prof = L.store().profiles[0];
  const own = (id) => prof.items.includes(id) || prof.items.push(id);
  // what each buddy must have (the classes after pr-mv-), and the ones that move every so often
  const PETS = {
    'ladybug-buddy': ['lbwing', 'lbshell'], 'elephant-buddy': ['trunk', 'espray'], 'butterfly-buddy': ['bfly'], 'camel-buddy': ['nod', 'chew'],
    'eagle-buddy': ['flap'], 'golden-hoopoe': ['flap', 'crest'], 'sky-falcon': ['flap'], 'kitten-buddy': ['tail', 'ear', 'yawn'],
    'bird-buddy': ['bhop', 'note'], 'pink-bird-buddy': ['bhop', 'note'], 'turtle-buddy': ['thead'], 'bee-buddy': ['bloop', 'buzz'], 'bunny-buddy': ['bunhop', 'earl', 'earr', 'nose'],
    'toy-car': ['wheel', 'puff'], 'toy-train': ['wheel', 'smoke'], 'speed-boat': ['wake', 'rock'], 'monster-truck': ['wheel', 'mbody'], 'toy-helicopter': ['heli'],
    'toy-plane': ['loop'], 'toy-rocket': ['lift', 'boost'], 'space-rocket': ['lift', 'boost'], 'garden-bike': ['wheel', 'ding'],
    'fire-truck': ['wheel', 'ladder', 'spray'], 'ambulance': ['wheel'], 'police-car': ['wheel'], 'crane-truck': ['wheel', 'boom', 'hook'],
    'digger': ['wheel', 'scoop'], 'school-bus': ['wheel', 'stop', 'haz'],
  };
  const SIREN = { 'fire-truck': 1, ambulance: 2, 'police-car': 2, 'crane-truck': 1, digger: 1 };
  Object.keys(PETS).forEach(own);
  const bad = [],
    still = [],
    pivots = [],
    occ = [];
  // every part with an unseen square: its box is that square (nothing reaches past it), so it turns about its point
  const checkPivots = (root, who) =>
    root.querySelectorAll('[class^="pr-mv-"]').forEach((g) => {
      const f = g.firstElementChild;
      if (!f || f.tagName !== 'rect' || f.getAttribute('fill') !== 'none') return;
      const b = g.getBBox(),
        r = f.getBBox();
      if (Math.abs(b.x - r.x) > 0.05 || Math.abs(b.y - r.y) > 0.05 || Math.abs(b.width - r.width) > 0.05 || Math.abs(b.height - r.height) > 0.05) pivots.push(who + ':' + g.getAttribute('class') + ' box ' + [b.x, b.y, b.width, b.height].map((v) => v.toFixed(1)).join(',') + ' sq ' + [r.x, r.y, r.width].map((v) => v.toFixed(1)).join(','));
    });
  for (const id of Object.keys(PETS)) {
    prof.outfit.pet = id;
    L.go('bag', { tab: 'pet' });
    await wait(150);
    const pet = d.querySelector('.wd-ex .ex-pet');
    const has = (k) => pet && pet.querySelector('.pr-mv-' + k);
    PETS[id].forEach((k) => has(k) || bad.push(id + ' lacks ' + k));
    if (SIREN[id] && (!pet || pet.querySelectorAll('.pr-siren').length !== SIREN[id])) bad.push(id + ' lights');
    // on the explorer the "every so often" parts move; in the tiles below nothing does
    pet && pet.querySelectorAll('[data-o]').forEach((p) => getComputedStyle(p).animationName === 'none' && occ.push(id + ':' + p.getAttribute('class')));
    d.querySelectorAll('.wrow .icell [class^="pr-mv-"], .wrow .icell .pr-siren').forEach((p) => getComputedStyle(p).animationName !== 'none' && still.push(id + ' tile:' + p.getAttribute('class')));
    if (pet) checkPivots(pet, id);
  }
  log('missing parts', bad.join(' | ') || 'none');
  ok('every buddy has its moving parts (and the emergency vehicles their lights)', bad.length === 0, bad.join(' | '));
  ok('…its "every so often" moves run on the explorer', occ.length === 0, occ.join(' | '));
  ok('…nothing moves in the gift tiles', still.length === 0, still.join(' | '));
  // worn things
  const GEAR = [
    ['hat', 'beanie', 'pom'], ['hat', 'earflap-hat', 'tassel'], ['hat', 'ranger-hat', 'leaf'], ['shoes', 'lightup-sneakers', 'lightup'], ['watch', 'band-watch', 'wmin'], ['watch', 'band-watch', 'whour'],
    ['watch', 'explorer-watch', 'needle'], ['watch', 'crystal-watch', 'shine'], ['watch', 'neon-watch', 'shine'], ['glasses', 'neon-shades', 'shine'], ['glasses', 'mirror-shades', 'shine'],
    ['shield', 'sturdy-shield', 'shine'], ['shield', 'round-shield', 'shine'], ['stick', 'crystal-staff', 'spark'], ['stick', 'star-staff', 'spark'], ['stick', 'hero-sword', 'spark'],
    ['bag', 'tassel-pouch', 'pouch'], ['bag', 'heart-purse', 'pouch'], ['bag', 'flower-purse', 'pouch'], ['bag', 'sling-bag-navygold', 'pouch'],
  ];
  const gbad = [];
  prof.outfit = { pet: 'toy-car' };
  for (const [slot, id, k] of GEAR) {
    own(id);
    prof.outfit[slot] = id;
    L.go('bag', { tab: slot });
    await wait(120);
    const ex = d.querySelector('.wd-ex svg.ex'),
      p = ex && ex.querySelector('.pr-mv-' + k);
    if (!p) gbad.push(id + ' lacks ' + k);
    if (ex) checkPivots(ex, id);
    prof.outfit = { pet: 'toy-car' };
  }
  // the keychain swings on the back of the pack (from the front: just its straps)
  own('keychain-pack');
  prof.outfit = { bag: 'keychain-pack' };
  L.go('bag', { tab: 'bag' });
  await wait(120);
  d.querySelector('[data-act=turn]').click();
  await wait(200);
  if (!d.querySelector('.wd-ex svg.ex-back .pr-mv-dangle')) gbad.push('keychain-pack back lacks dangle');
  // a hijab sways (front and back), its band moving with it
  prof.look.hair = 'hijab';
  prof.look.kid = 'girl';
  prof.outfit = {};
  L.go('bag', { tab: 'hat' });
  await wait(150);
  const hj = d.querySelectorAll('.wd-ex svg.ex .pr-mv-hijab');
  if (!hj.length) gbad.push('hijab front lacks sway');
  if (d.querySelector('.wd-ex svg.ex')) checkPivots(d.querySelector('.wd-ex svg.ex'), 'hijab');
  log('gear', gbad.join(' | ') || 'all there');
  ok('worn things have their moving parts (bobble, tassels, leaf, soles, hands, needle, shines, sparkles, pouches, keychain, hijab)', gbad.length === 0, gbad.join(' | '));
  ok('every moving part turns about its own point (nothing reaches past its square)', pivots.length === 0, pivots.join(' | '));
  // a pattern laid over a thing: its moving parts keep still (the pattern would slide off them)
  ok('…a patterned bobble beanie keeps its bobble still', !/pr-mv-/.test(A.item('checks-beanie')) && /pr-mv-pom/.test(A.explorer({}, { hat: 'beanie' })));
  // stickers stay still (and the yawn stays hidden)
  const cat = A.sticker('cat');
  ok('the cat sticker has no moving parts', !/pr-mv-/.test(cat), cat.slice(0, 80));
  // walking: wheels turn, lamps flash in turn, the bobble bounces, the soles flash
  prof.look.hair = 'short';
  prof.look.kid = 'boy';
  prof.outfit = { pet: 'police-car', hat: 'beanie', shoes: 'lightup-sneakers' };
  L.go('bag', { tab: 'pet' });
  await wait(150);
  const ex = d.querySelector('.wd-ex svg.ex');
  ex.classList.add('walk');
  await wait(60);
  const an = (sel) => getComputedStyle(ex.querySelector(sel)).animationName;
  const lamps = [...ex.querySelectorAll('.pr-siren')].map((l) => getComputedStyle(l).animationDelay).join(',');
  log('walking', an('.pr-mv-wheel'), an('.pr-mv-pom'), an('.pr-mv-lightup'), lamps);
  ok('walking: wheels turn, the bobble bounces, the soles flash', an('.pr-mv-wheel') === 'lhq-spin' && an('.pr-mv-pom') === 'mv-pom' && an('.pr-mv-lightup') === 'mv-lightup');
  ok('…the lamps flash at once, a pair in turn', lamps === '0s,-0.45s', lamps);
  ex.classList.remove('walk');
  // tapping the buddy: its moves start now (the pair keeps its half-beat apart)
  await wait(60);
  const petEl = ex.querySelector('.ex-pet');
  petEl.querySelector('.pr-siren').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(60);
  const after = [...petEl.querySelectorAll('.pr-siren')].map((l) => l.style.animationDelay).join(',');
  log('tap', after);
  ok('tapping the buddy flashes its lights at once, still in turn', after === '0s,0.45s', after);
  // My Tree: buddies move there too (a sleeping one keeps still)
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
