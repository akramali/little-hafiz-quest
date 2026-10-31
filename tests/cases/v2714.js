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
  d.querySelector('#modal [data-act=cno]').click(); await wait(200);
  // Word Steps
  L.go('words', { i: idx(99), p: 0, a: 0, w: 1, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(300);
  swipe(d.querySelector('.wstage'), -120); await wait(300);
  ok('Word Steps: swipe left for the next āyah', L.st().a === 1, L.st().a);
  swipe(d.querySelector('.wstage'), 120); await wait(300);
  ok('…and right for the one before', L.st().a === 0, L.st().a);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
