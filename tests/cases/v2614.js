// v2.6.14: still stickers, Auto theme by the sun, a smooth Version card, the Wise Elder roaming the map
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], A = w.LHQ_ART, X = w.__lhq;
  const m = d.getElementById('modal');
  const tap = (sel) => { const b = d.querySelector(sel); if (b) b.click(); return !!b; };
  // stickers stay still; buddies still move
  const moving = A.STICKERS.filter((s) => /lhq-(blink|flap|wave|wing-l|bounce|hover|wobble)|pr-(bob|flap|sway|ripple)/.test(A.sticker(s.id))).map((s) => s.id);
  ok('no sticker moves', !moving.length, moving.join());
  ok('the butterfly buddy still flaps', /lhq-flap/.test(A.item('butterfly-buddy', prof.look)));
  // Auto follows the sun, not the phone's dark mode
  L.store().prefs.theme = 'auto'; L.go('settings'); await wait(200);
  tap('[data-act=set][data-k=theme][data-v=auto]'); await wait(200);
  const mode = d.documentElement.getAttribute('data-mode');
  const noon = new Date(); noon.setHours(12, 0, 0, 0);
  const night = new Date(); night.setHours(1, 0, 0, 0);
  ok('Auto: light at noon, dim at 1 am (from the time zone, no permission)', X.sunDown(noon) === false && X.sunDown(night) === true);
  ok('Auto sets the page to light or dim by the sun', mode === (X.sunDown() ? 'dim' : 'light'), mode);
  // the Version card pops up once and then changes in place
  L.go('splash'); await wait(400);
  m.classList.remove('show');
  tap('[data-act=updates]'); await wait(200);
  const card = d.querySelector('#modal.show .updcard');
  for (let t = 0; t < 30; t++) await wait(100); // the check comes back
  tap('[data-act=updcheck]'); await wait(1500);
  ok('the Version card stays the same card (no second pop-in)', !!card && card.isConnected);
  m.classList.remove('show');
  // the Wise Elder on the map, in the world he's in now
  L.go('map'); await wait(1500);
  const el = d.querySelector('#map .mpal[data-id="elder"]');
  ok('the Wise Elder roams the map', !!el && +el.dataset.w === X.elder.world(), el && el.dataset.w);
  ok('he is taller than the explorers there', !!el && el.offsetHeight > 108);
  // tap him: the test any time
  el.click(); await wait(1200);
  ok('tapping him offers his test', !!d.querySelector('#modal.show .eldmeet'));
  const answer = async (oks) => {
    for (const k of oks) {
      for (let t = 0; t < 80 && !d.querySelector('[data-act=eldans]:not([disabled])'); t++) await wait(100);
      tap(`[data-act=eldans][data-ok="${k ? 1 : 0}"]`); await wait(300);
    }
    for (let t = 0; t < 80 && L.st().phase !== 'end'; t++) await wait(100);
  };
  tap('[data-act=eldface]'); await wait(300); tap('[data-act=eldgo]'); await wait(200);
  let before = prof.pending.length;
  await answer([true, true, true]);
  ok('the first win of the day brings a gift', prof.pending.length > before, `${before} → ${prof.pending.length}`);
  L.go('map'); await wait(1200); m.classList.remove('show');
  d.querySelector('#map .mpal[data-id="elder"]').click(); await wait(1200);
  tap('[data-act=eldface]'); await wait(300); tap('[data-act=eldgo]'); await wait(200);
  before = prof.pending.length;
  await answer([true, true, true]);
  ok('more wins that day: praise, no gift (gifts never run out)', prof.pending.length === before && /once a day/.test(d.querySelector('.eldend').textContent));
  // switched off: he's not on the map
  L.store().prefs.elder = false; L.go('surah', { i: idx(113), p: 0 }); await wait(100); L.go('map'); await wait(1200);
  ok('switched off: not on the map', !d.querySelector('#map .mpal[data-id="elder"]'));
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
