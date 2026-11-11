// v2.10.1: Read lights each word of the chosen āyah as it's recited (in the page and in the close-up card), over and
// over in a loop; with no āyah chosen the whole āyah is lit. And the explorer's watch from behind.
(async () => {
  fixture({ items: ['explorer-watch'], outfit: { watch: 'explorer-watch' } });
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const i = idx(112);
  // 1. an āyah chosen (colored words): Listen plays it, its words light up one after another
  L.go('mushaf', { i, p: 0, sel: 0, focus: false }); await wait(500);
  const n = d.querySelectorAll('.mayah.sel .mw').length;
  const lit = [];
  const look = (sel) => { const all = [...d.querySelectorAll(sel)], j = all.findIndex((e) => e.classList.contains('speak')); if (j >= 0 && lit[lit.length - 1] !== j) lit.push(j); };
  d.querySelector('.listen').click();
  for (let t = 0; t < 80 && d.querySelector('.listen b').textContent === 'Stop'; t++) { await wait(100); look('.mayah.sel .mw'); }
  log('āyah 1 words', n, '| lit in turn:', lit.join(','));
  ok('each word of the chosen āyah lights up in turn', n > 1 && lit.length === n && lit.every((j, k) => j === k), lit.join(','));
  ok('none lit once it ends', !d.querySelector('.mw.speak'));
  // 2. the close-up card, in a loop (3×): the words light up again from the start
  L.go('mushaf', { i, p: 0, sel: 0, focus: true }); await wait(500);
  d.querySelector('.mfloat .loopbtn').click(); await wait(100);
  lit.length = 0;
  d.querySelector('.listen').click();
  for (let t = 0; t < 260 && d.querySelector('.listen b').textContent === 'Stop'; t++) { await wait(100); look('.mfocus .fword'); }
  log('close-up, loop: lit', lit.join(','));
  ok('in the close-up card too, and again with each loop', lit.join(',') === [...Array(n).keys(), ...Array(n).keys(), ...Array(n).keys()].join(','), lit.join(','));
  d.querySelector('.mfloat .loopbtn').click(); await wait(100);
  // 3. no āyah chosen: the whole āyah lit, no single words
  L.go('mushaf', { i, p: 0, sel: null, focus: false }); await wait(500);
  d.querySelector('.listen').click();
  let whole = false, word = false;
  for (let t = 0; t < 40; t++) { await wait(100); whole = whole || !!d.querySelector('.mayah.now'); word = word || !!d.querySelector('.speak'); }
  d.querySelector('.listen').click(); await wait(200);
  ok('no āyah chosen: the whole āyah is lit, no single words', whole && !word);
  // 4. the watch from behind: its band and buckle, not its face
  const A = w.LHQ_ART, look1 = L.store().profiles[0].look;
  const front = A.explorer(look1, { watch: 'explorer-watch' }, { view: 'front' }), back = A.explorer(look1, { watch: 'explorer-watch' }, { view: 'back' });
  ok('the watch shows its face from the front and only its band from behind', front.includes('#ef4b4b') && !back.includes('#ef4b4b'));
  // 5. (v2.10.3) the gift card's button: a stick or a shield is held, a buddy comes along, clothes are worn
  const said = {};
  for (const id of ['blue-knobbly-branch', 'sturdy-shield', 'ladybug-buddy', 'kufi']) {
    const prof = L.store().profiles[0];
    prof.pending = [{ k: 'i', id }]; prof.items = prof.items.filter((x) => x !== id);
    L.go('bag', { tab: 'hat' }); await wait(250);
    d.querySelector('[data-act=opengift]').click(); await wait(300);
    const b = d.querySelector('#modal [data-act=wear]');
    said[id] = b ? b.textContent.trim() : '';
    d.querySelector('#modal [data-act=giftok]').click(); await wait(200);
  }
  log('gift buttons:', JSON.stringify(said));
  ok('the gift card says Hold it for a stick or a shield, Take it along for a buddy, Wear it for clothes', /Hold it/.test(said['blue-knobbly-branch']) && /Hold it/.test(said['sturdy-shield']) && /Take it along/.test(said['ladybug-buddy']) && /Wear it/.test(said.kufi), JSON.stringify(said));
  const notes = {};
  for (const tab of ['stick', 'shield', 'pet', 'hat']) { L.go('bag', { tab }); await wait(200); notes[tab] = (d.querySelector('.wnote2') || {}).textContent || ''; }
  ok('My Explorer: tap to hold a stick or shield, take along a buddy, wear clothes', /tap to hold/.test(notes.stick) && /tap to hold/.test(notes.shield) && /tap to take along/.test(notes.pet) && /tap to wear/.test(notes.hat), JSON.stringify(notes));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
