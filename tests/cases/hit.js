// can a finger actually reach each button? (the topmost element at its center must be the button or inside it)
(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const S = w.LHQ_DATA.surahs, blocked = [];
  const audit = (label) => {
    d.querySelectorAll('#app [data-act]').forEach((b) => {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > w.innerHeight || r.right < 0 || r.left > w.innerWidth) return;
      const cs = w.getComputedStyle(b); if (+cs.opacity === 0 || cs.pointerEvents === 'none' || cs.visibility === 'hidden') return; // not shown or not tappable now
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), w.innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 1), w.innerHeight - 1);
      const top = d.elementFromPoint(cx, cy);
      if (!top || (top !== b && !b.contains(top) && top.closest('[data-act]') !== b)) blocked.push(`${label}: ${b.dataset.act}${b.className ? '.' + String(b.className).split(' ')[0] : ''} covered by ${top ? top.tagName.toLowerCase() + '.' + String(top.className.baseVal != null ? top.className.baseVal : top.className).split(' ')[0] : 'nothing'}`);
    });
  };
  const views = [['splash'], ['map'], ['settings'], ['bag', { tab: 'hat' }], ['bag', { tab: 'look' }]];
  for (const [v, o] of views) { L.go(v, o || {}); await wait(250); audit(v); }
  for (const n of [114, 99, 78]) {
    const i = idx(n);
    L.go('surah', { i, p: 0 }); await wait(250); audit(n + ' surah'); w.scrollTo(0, 400); await wait(100); audit(n + ' surah scrolled'); w.scrollTo(0, 0);
    L.go('mushaf', { i, p: 0, sel: null }); await wait(150); audit(n + ' mushaf');
    L.go('learn', { i, p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(150); audit(n + ' learn');
    L.go('words', { i, p: 0, a: 0, w: 1, phase: 'build', shown: [], doneA: [], savedA: [] }); await wait(150); audit(n + ' words');
    L.go('path', { i, p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }); await wait(150); audit(n + ' path');
  }
  log([...new Set(blocked)].join('\n') || 'all reachable');
  const KNOWN = [/surah scrolled/, /cpscroll\.cpmore covered by (button\.cpf|div\.cptrail)/, /wprev\.btn covered by div\.row/, /^splash: poke/, /part\.cpf covered by nothing/];
  const fresh = [...new Set(blocked)].filter((x) => !KNOWN.some((k) => k.test(x)));
  ok('no newly blocked buttons (known overlaps allowed)', !fresh.length, fresh.slice(0, 5).join(' · '));
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message); }
  done();
})();
