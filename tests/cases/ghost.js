// two fingers on the puzzle at once: no piece copy may stay behind
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('surah', { i: idx(107), p: 0 }); await wait(200);
  d.querySelector('[data-act=order]').click(); await wait(400);
  const P = (type, el, x, y, id) => (el || d).dispatchEvent(new w.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, isPrimary: id === 1, pointerType: 'touch' }));
  const cards = [...d.querySelectorAll('.pcard')];
  const c = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const [ax, ay] = c(cards[0]), [bx, by] = c(cards[1]);
  // finger 1 picks a piece and moves; finger 2 picks another and moves; both lift
  P('pointerdown', cards[0], ax, ay, 1); P('pointermove', d, ax + 30, ay - 40, 1);
  P('pointerdown', cards[1], bx, by, 2); P('pointermove', d, bx - 30, by - 60, 2);
  P('pointermove', d, ax + 60, ay - 90, 1);
  P('pointerup', d, ax + 60, ay - 90, 1); P('pointerup', d, bx - 30, by - 60, 2);
  await wait(300);
  log('two fingers: copies left on screen', d.querySelectorAll('.drag-ghost').length, '| lifted pieces', d.querySelectorAll('.pcard.lifted').length);
  ok('two fingers leave no stuck piece', !d.querySelectorAll('.drag-ghost').length && !d.querySelectorAll('.pcard.lifted').length);
  // one finger: drag a piece over its own place and let go there (it fits), then finish the puzzle the same way
  d.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
  for (let t = 0; t < 8 && L.st().view === 'order'; t++) {
    const st = L.st(), k = st.deck.find((j) => !st.placed[j]);
    if (k == null) break;
    const card = d.querySelector(`.pcard[data-k="${k}"]`), slot = d.querySelector(`.slot[data-j="${k}"]`);
    if (!card || !slot) break;
    const [x0, y0] = c(card), [x1, y1] = c(slot);
    P('pointerdown', card, x0, y0, 1); P('pointermove', d, (x0 + x1) / 2, (y0 + y1) / 2, 1); P('pointermove', d, x1, y1, 1);
    await wait(200);
    P('pointerup', d, x1, y1, 1); await wait(250);
  }
  await wait(2200);
  log('after finishing: view', L.st().view, '| copies left', d.querySelectorAll('.drag-ghost').length);
  ok('dragging pieces home finishes the puzzle', L.st().view === 'done' && !d.querySelectorAll('.drag-ghost').length);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
