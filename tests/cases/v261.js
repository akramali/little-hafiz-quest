// v2.6.1: the MāshāAllāh page fits, the world list closes on an outside tap, swipe to turn, the Stranger test button
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0];
  // a busy done page: a memorized sūrah, gold, a prize, a level gift, the prize bar and a gift
  prof.pending = [{ k: 's', id: 'star' }, { k: 's', id: 'moon' }];
  L.go('done', { i: idx(108), p: 0, big: '🐸', msg: 'You hopped across Al-Kawthar, from the pictures! No help needed!', stars: 1, memorized: true, allStars: true, prizes: 1, levelGift: true, nextAct: 'order', nextLabel: 'Picture Puzzle 🧩' });
  await wait(400);
  ok('no “You memorized” box', !/You memorized/.test(d.querySelector('.donescr').textContent));
  const btns = [...d.querySelectorAll('.donescr .drow .btn')].map((b) => b.getBoundingClientRect());
  ok('the buttons fit on the screen without scrolling', btns.every((r) => r.bottom <= w.innerHeight), btns.map((r) => Math.round(r.bottom)).join(',') + ' of ' + w.innerHeight);
  if (Q.get('shot') === 'done') { done(); return; }
  // world list: a tap outside closes it, and that tap does nothing else
  L.go('map'); await wait(1000);
  d.querySelector('[data-act=worlds]').click(); await wait(100);
  const open1 = !!d.querySelector('.wrail.open');
  d.querySelector('[data-act=progress]').click(); await wait(350); // it folds away (0.2 s)
  ok('the world list closes on a tap outside', open1 && !d.querySelector('.wrail.open') && !d.getElementById('modal').classList.contains('show'));
  ok('the world sign has no extra words', [...d.querySelectorAll('.msign b')].every((b) => /^World \d$/.test(b.textContent)));
  ok('no 🧪 Stranger test button any more', !d.querySelector('[data-act=strtest]'));
  ok('settings say just “The Stranger”', (() => { L.go('settings'); return /The Stranger(?! \(test\))/.test(d.body.textContent) && !/Stranger \(test\)/.test(d.body.textContent); })());
  // swipe to turn the explorer
  L.go('bag', { tab: 'hat' }); await wait(300);
  const st0 = d.querySelector('.wd-stage'), r = st0.getBoundingClientRect();
  const P = (type, x) => st0.dispatchEvent(new w.PointerEvent(type, { bubbles: true, clientX: x, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' }));
  P('pointerdown', r.left + r.width * 0.7); P('pointerup', r.left + r.width * 0.2); await wait(200);
  ok('a swipe turns the explorer around', !!d.querySelector('.wd-ex svg.ex-back'));
  P('pointerdown', r.left + r.width * 0.2); P('pointerup', r.left + r.width * 0.75); await wait(200);
  ok('and back', !!d.querySelector('.wd-ex svg.ex-front'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
