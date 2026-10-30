// v2.5.8: Big Puzzle pieces, done-page messages, fruit depth, new glasses
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], S = w.LHQ_DATA.surahs;
  const all = (s) => ({ parts: s.parts.map(() => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: 0 });
  // Big Puzzle: Al-Humazah (9 āyāt, 2 checkpoints) is 9 pieces; Al-ʿAlaq (19 āyāt, 4 checkpoints) 10; An-Naba' (9 checkpoints) 9
  for (const [n, want] of [[104, 9], [96, 10], [78, 9]]) {
    const s = S[idx(n)];
    prof.prog[n] = all(s);
    L.go('surah', { i: idx(n), p: 'all' }); await wait(200);
    d.querySelector('[data-act=order][data-p=all]').click(); await wait(300);
    const pieces = d.querySelectorAll('.pcard').length, holes = [...d.querySelectorAll('.pz-holes text')].map((t) => t.textContent);
    ok(`Big Puzzle of ${n} has ${want} pieces`, pieces === want, `${pieces} pieces · holes ${holes.join(' ')}`);
    if (n === 104 && Q.get('hold')) { await wait(3000); done(); return; }
  }
  // it can still be finished: place every piece in its own hole
  const st = L.st();
  st.deck.forEach((j) => (st.placed[j] = true));
  const last = st.deck[0]; delete st.placed[last];
  L.go('order', st); await wait(150);
  L.st().sel = last; /* the piece picked up (pieces answer pointer events, not plain clicks) */
  d.querySelector(`.slot[data-j="${last}"]`).click(); await wait(1900);
  ok('a Big Puzzle still finishes and saves', L.st().view === 'done' && prof.prog[78].big === 1, L.st().view);
  // the gold message is one sentence (one block, a few lines high), not columns
  L.go('done', { i: idx(104), p: 0, msg: 'x', stars: 1, allStars: true }); await wait(150);
  const memo = d.querySelector('.memo.gold');
  ok('gold message reads as one sentence', getComputedStyle(memo).display === 'block' && memo.getBoundingClientRect().height < 100, Math.round(memo.getBoundingClientRect().height));
  // a fallen fruit sits at its depth: whatever stands in front of it is drawn after it
  L.go('map'); await wait(1000);
  const tree = d.querySelector('.mprop[data-k="meadow-tree"]');
  w.scrollTo(0, tree.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(300);
  tree.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(50);
  const f = d.querySelector('.mfruit'), fy = +f.dataset.y;
  const kids = [...f.parentNode.children], at = kids.indexOf(f);
  const wrong = kids.filter((el, j) => el.matches('.mprop, .mpal') && ((j > at && +el.dataset.y < fy) || (j < at && +el.dataset.y > fy)));
  ok('fruit drawn at its depth among the scenery', !wrong.length && getComputedStyle(f).zIndex === 'auto', wrong.length + ' out of order');
  // new glasses are surprise gifts and draw on the explorer
  const cool = ['pixel-shades', 'aviator-shades', 'visor-shades', 'star-shades', 'heart-shades'];
  ok('5 new glasses among the surprise gifts', cool.every((id) => (w.LHQ_ART.ITEMS.find((it) => it.id === id) || {}).drop));
  ok('they draw on the explorer', cool.every((id) => w.LHQ_ART.explorer(prof.look, { glasses: id }, { view: 'front' }).length > w.LHQ_ART.explorer(prof.look, {}, { view: 'front' }).length + 200));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
