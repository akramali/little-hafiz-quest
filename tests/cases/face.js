(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('map'); await wait(1200);
  const A = w.LHQ_ART, out = [];
  let dbg = null; w.__dbgFace = (o) => (dbg = o);
  const eat = /sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat/;
  for (const k of ['meadow-tree', 'meadow-bush', 'forest-oak', 'forest-pine', 'forest-berries', 'forest-bigtree', 'sands-palm', 'canyon-cactus', 'peak-pine']) {
    for (const t of [...d.querySelectorAll(`.mprop[data-k="${k}"]`)].slice(0, 1)) {
      w.scrollTo(0, t.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(400);
      const before = new Set(d.querySelectorAll('.mfruit'));
      t.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(60);
      const mine = [...d.querySelectorAll('.mfruit')].find((x) => !before.has(x));
      const a = [...d.querySelectorAll('.mprop')].find((x) => x._busy && eat.test(x.dataset.k));
      if (!a) { await wait(3500); continue; }
      // sample while eating (after the run)
      let rec = null;
      for (let i = 0; i < 40 && !rec; i++) {
        await wait(150);
        const f = mine;
        if (!f || !f.isConnected) break;
        const fm = new w.DOMMatrixReadOnly(getComputedStyle(f.firstElementChild).transform), sc = Math.hypot(fm.a, fm.b);
        const fr = f.getBoundingClientRect(), ar = a.firstElementChild.getBoundingClientRect();
        if (sc < 0.95 && sc > 0.05) { // mid-bite
          const m = new w.DOMMatrixReadOnly(getComputedStyle(a.firstElementChild).transform);
          const looks = Math.sign(m.a) * (A.FACE_LEFT.includes(a.dataset.k) ? -1 : 1);
          const fdir = Math.sign(fr.left + fr.width / 2 - (ar.left + ar.width / 2));
          rec = `${a.dataset.k} eats ${k}: looks ${looks > 0 ? 'right' : 'left'}, fruit to the ${fdir > 0 ? 'right' : 'left'} ${looks === fdir ? '✓' : '✗'}`;
        }
      }
      if (rec) out.push(rec);
      await wait(4500);
    }
  }
  log(out.join('\n'));
  ok('animals face the fruit they eat', out.length >= 5 && out.every((x) => x.endsWith('✓')), out.filter((x) => !x.endsWith('✓')).join(' · ') || out.length + ' meals');
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
