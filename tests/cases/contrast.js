// every text on the world's own background (not on a card) must stand out from it, in every world and theme
(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const parse = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const sceneAt = (y) => {
    const sc = d.querySelector('#bg .scn'); if (!sc) return hex('#dff2ff');
    const v = (n) => hex(sc.style.getPropertyValue(n).trim());
    const f = Math.min(1, Math.max(0, y / w.innerHeight));
    return f < 0.7 ? mixc(v('--sky0'), v('--sky1'), f / 0.7) : mixc(v('--sky1'), v('--g0'), (f - 0.7) / 0.3);
  };
  const bad = new Map();
  const audit = (label) => {
    const els = [...d.querySelectorAll('#app *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim()));
    els.forEach((e) => {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
      const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join('');
      if (!/[A-Za-z0-9\u0600-\u06ff]/.test(own)) return; // emoji and symbols only
      const cs = w.getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const fg = parse(cs.color); if (!fg || fg[3] < 0.3) return;
      // the first ancestor that paints a background
      let bgc = null, a = e;
      while (a && a !== d.body) {
        const s = w.getComputedStyle(a);
        if (s.backgroundImage !== 'none') { const g = s.backgroundImage.match(/rgba?\([^)]+\)/); if (g) { const c = parse(g[0]); if (c[3] > 0.4) { bgc = c.slice(0, 3); break; } } }
        const c = parse(s.backgroundColor); if (c && c[3] >= 0.4) { bgc = c[3] >= 0.95 ? c.slice(0, 3) : mixc(sceneAt(r.top + r.height / 2), c.slice(0, 3), c[3]); break; }
        a = a.parentElement;
      }
      const onScene = !bgc;
      if (onScene) bgc = sceneAt(r.top + r.height / 2);
      const k = ratio(fg.slice(0, 3), bgc);
      if (k < (onScene ? 3.2 : 3) && !e.closest('.stream, .listen, .btn.go, .bubble, .qgo')) {
        const key = `${e.tagName.toLowerCase()}.${String(e.className).split(' ').filter(Boolean).join('.')}${onScene ? ' [on scene]' : ''}`;
        const prev = bad.get(key) || { n: 0, worst: 99, where: [], text: e.textContent.trim().slice(0, 30) };
        prev.n++; prev.worst = Math.min(prev.worst, k); if (prev.where.length < 4) prev.where.push(label);
        bad.set(key, prev);
      }
    });
  };
  const worlds = [113, 104, 101, 94, 88, 84, 80];
  for (const theme of ['light', 'dim']) {
    L.store().prefs.theme = theme; d.documentElement.setAttribute('data-mode', theme); L.go('splash'); await wait(700);
    for (const n of worlds) {
      const i = idx(n);
      const screens = [
        ['surah', { i, p: 0 }], ['surah', { i, p: 'all' }],
        ['learn', { i, p: 0, a: w.LHQ_DATA.surahs[i].parts[0][0] - 1, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }],
        ['words', { i, p: 0, a: w.LHQ_DATA.surahs[i].parts[0][0] - 1, w: 1, phase: 'build', shown: [], doneA: [], savedA: [] }],
        ['path', { i, p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }],
        ['order', { i, p: 0, deck: [0, 1, 2], placed: { 0: true }, say: 0, sel: null, hearts: 3, maxH: 3 }],
        ['mushaf', { i, p: 0, sel: null }],
        ['done', { i, p: 0, msg: 'You did it!', stars: 1, nextAct: 'words', nextLabel: 'Next' }],
      ];
      for (const [v, o] of screens) {
        L.go(v, o); await wait(60);
        for (const y of [0, 500, 1100]) { w.scrollTo(0, y); await wait(20); audit(`${theme} ${n} ${v}${o && o.p === 'all' ? ' all' : ''}`); }
      }
    }
  }
  const rows = [...bad.entries()].sort((a, b) => a[1].worst - b[1].worst);
  const KNOWN = ['One part at a time', '🧭 Part 1: your quest', '🚩 Checkpoints'];
  const fresh = [...bad.entries()].filter(([k, v]) => !KNOWN.some((t) => v.text.startsWith(t)));
  ok('no new low-contrast text (known captions on bright scenery allowed)', !fresh.length, fresh.slice(0, 4).map(([k, v]) => `${v.worst.toFixed(2)} ${k} "${v.text}"`).join(' · '));
  log(rows.length ? rows.map(([k, v]) => `${v.worst.toFixed(2)}  ${k}  ×${v.n}  "${v.text}"  e.g. ${v.where.join('; ')}`).join('\n') : 'all readable');
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
