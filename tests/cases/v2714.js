// v2.7.14: swipe through pages (How to play, Word Steps), and go back in How to play
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const swipe = (el, dx) => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    el.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 5 }));
    el.dispatchEvent(new w.PointerEvent('pointerup', { bubbles: true, clientX: x + dx, clientY: y + 4, pointerId: 5 }));
  };
  const card = () => d.querySelector('#modal.show .intro'), title = () => card().querySelector('h3').textContent;
  // How to play
  L.go('settings'); await wait(200);
  d.querySelector('[data-act=howto]').click(); await wait(200);
  ok('the first card has no Back', !card().querySelector('.introback'));
  const t0 = title();
  swipe(card(), -120); await wait(300);
  const t1 = title();
  ok('swipe left: the next card', t1 !== t0 && card().dataset.k === '1', t1);
  swipe(card(), -120); await wait(300);
  card().querySelector('.introback').click(); await wait(200);
  ok('Back: the card before', title() === t1, title());
  swipe(card(), 120); await wait(300);
  ok('swipe right: back to the first', title() === t0, title());
  // on a phone: a finger swipe (touch events)
  const touchSwipe = (el, dx) => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const T = (cx) => new w.Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
    el.dispatchEvent(new w.TouchEvent('touchstart', { bubbles: true, touches: [T(x)], changedTouches: [T(x)] }));
    el.dispatchEvent(new w.TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [T(x + dx)] }));
  };
  touchSwipe(card(), -120); await wait(300);
  ok('a finger swipe turns the card too', card().dataset.k === '1', card().dataset.k);
  ok('the card keeps sideways swipes for itself', /pan-y/.test(w.getComputedStyle(card()).touchAction), w.getComputedStyle(card()).touchAction);
  // a tap outside closes it
  d.getElementById('modal').click(); await wait(200);
  ok('a tap outside closes How to play', !d.querySelector('#modal.show'));
  // My look: just the explorer and the choices
  L.go('bag', { tab: 'look' }); await wait(300);
  ok('My look: no categories or side buttons', !d.querySelector('.wtabs') && !d.querySelector('.wd-side') && !!d.querySelector('.lookbox'));
  // out of hearts: Next time (or a tap outside) goes back to the sūrah; Try again plays again
  const outOfHearts = async () => {
    L.go('path', { i: idx(113), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 1, maxH: 3 }); await wait(300);
    const b = d.querySelector('[data-act=oops]');
    if (b) b.click();
    for (let t = 0; t < 30 && !d.querySelector('#modal.show .dropcard'); t++) await wait(100);
  };
  await outOfHearts();
  ok('out of hearts: Next time and Try again', !!d.querySelector('#modal.show .dropcard [data-act=dropnext]') && !!d.querySelector('#modal.show .dropcard [data-act=retry]'));
  d.getElementById('modal').click(); await wait(400);
  ok('a tap outside is Next time: back to the sūrah', !d.querySelector('#modal.show') && L.st().view === 'surah', L.st().view);
  await outOfHearts();
  d.querySelector('#modal [data-act=retry]').click(); await wait(400);
  ok('Try again plays it again', L.st().view === 'path', L.st().view);
  // Word Steps
  L.go('words', { i: idx(99), p: 0, a: 0, w: 1, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  swipe(d.querySelector('.wstage'), -120); await wait(300);
  ok('Word Steps: swipe left for the next āyah', L.st().a === 1, L.st().a);
  swipe(d.querySelector('.wstage'), 120); await wait(300);
  ok('…and right for the one before', L.st().a === 0, L.st().a);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
