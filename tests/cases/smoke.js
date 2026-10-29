(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message + ' @' + e.lineno));
  const bad = [];
  const check = (label) => { const h = d.getElementById('app').innerHTML + d.getElementById('modal').innerHTML; if (/undefined|NaN|\[object/.test(h.replace(/data-[a-z]+="[^"]*"/g, ''))) bad.push(label + ': ' + (h.match(/.{40}(undefined|NaN|\[object).{20}/) || [''])[0]); };
  const S = w.LHQ_DATA.surahs;
  for (const theme of ['light', 'dim']) {
    L.store().prefs.theme = theme; w.document.documentElement.setAttribute('data-mode', theme);
    for (const v of ['splash', 'map', 'settings', 'create', 'explorers', 'syncshare']) { L.go(v); await wait(60); check(theme + ' ' + v); }
    for (const t of ['look', 'hat', 'hijab', 'pet', 'stickers']) { L.go('bag', { tab: t }); await wait(30); check(theme + ' bag ' + t); }
    for (let i = 0; i < S.length; i++) {
      const s = S[i], parts = s.parts.length > 1 ? [...s.parts.map((_, p) => p), 'all'] : [0];
      for (const p of parts) {
        L.go('surah', { i, p }); check(`${theme} ${s.n} surah ${p}`);
        L.go('mushaf', { i, p, sel: 0 }); check(`${theme} ${s.n} mushaf`);
        if (p === 'all') { L.go('path', { i, p, L: 3, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }); check(`${theme} ${s.n} path all`); L.go('order', { i, p, deck: s.parts.map((_, j) => j), placed: {}, say: null, sel: null, hearts: 3, maxH: 3 }); check(`${theme} ${s.n} big`); continue; }
        const from = s.parts[p][0] - 1;
        L.go('learn', { i, p, a: from, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); check(`${theme} ${s.n}:${p} learn`);
        L.go('words', { i, p, a: from, w: 1, phase: 'recall', shown: [0], doneA: [], savedA: [] }); check(`${theme} ${s.n}:${p} words`);
        L.go('path', { i, p, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }); check(`${theme} ${s.n}:${p} path`);
        const n = s.parts[p][1] - s.parts[p][0] + 1;
        L.go('order', { i, p, deck: [...Array(n).keys()], placed: { 0: true }, say: 0, sel: null, hearts: 3, maxH: 3 }); check(`${theme} ${s.n}:${p} order`);
      }
    }
    await wait(20);
  }
  log('bad', bad.length ? bad.slice(0, 8) : 'none');
  ok('no undefined/NaN on any screen', !bad.length, bad.slice(0, 3).join(' · ')); ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  log('errors', errs.length ? errs.slice(0, 8) : 'none');
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
