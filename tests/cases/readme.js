// README screenshots: ?t=readme&shot=<name>
(async () => {
  const full = (n) => ({ parts: Array.from({ length: n }, () => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: n > 1 ? 3 : 0 });
  const prog = { 114: full(1), 113: full(1), 112: full(1), 111: full(1), 110: full(1), 109: full(1), 108: full(1), 107: full(1),
    106: { parts: [{ learn: 1, words: 1, order: 0, next: 0, path: 2, la: 0, wa: 0 }], all: 0 }, 99: { parts: [{ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 0, wa: 0 }, { learn: 0, words: 0, order: 0, next: 0, path: 0, la: 3, wa: 0 }], all: 0 } };
  const stime = { 114: 1520, 113: 1310, 112: 840, 111: 1460, 110: 980, 109: 1700, 108: 760, 107: 1210, 106: 690, 99: 1830 };
  const p = { id: 'pyusuf1', name: 'Yusuf', look: { skin: 2, hair: 'curly', hairColor: 0, hijabColor: 0, kid: 'boy' },
    outfit: { hat: 'kufi', top: 'green-vest', shoes: 'trail-boots', bag: 'little-backpack', pet: 'ladybug-buddy', glasses: 'everyday-glasses' },
    prog, items: ['kufi', 'green-vest', 'trail-boots', 'little-backpack', 'ladybug-buddy', 'explorer-cap', 'rain-boots', 'leaf-cape'], stickers: ['star', 'moon', 'rainbow'], badge: 'star', pending: [], lost: [], made: true, at: 8, daily: '2099-01-01', time: 12310, stime };
  localStorage.setItem('lhq2', JSON.stringify({ v: 2, cur: p.id, profiles: [p], prefs: { theme: 'light', sfx: false } }));
  const { w, d, L, idx } = await openGame();
  const prof = L.store().profiles[0];
  // own everything already earned, with nothing waiting in the gift box
  prof.items = [...new Set([...prof.items, ...prof.pending.filter((g) => g.k === 'i').map((g) => g.id)])];
  prof.stickers = [...new Set([...prof.stickers, ...prof.pending.filter((g) => g.k === 's').map((g) => g.id)])];
  prof.pending = []; prof.fresh = [];
  const shot = Q.get('shot');
  if (shot === 'splash') L.go('splash');
  else if (shot === 'map' || shot === 'progress') {
    L.go('map'); await wait(1200);
    if (shot === 'progress') d.querySelector('[data-act=progress][data-t=stars]').click();
    else { w.scrollBy(0, 230); await wait(400); } // the world's sign, with its throws, in view
  } else if (shot === 'surah') L.go('surah', { i: idx(99), p: 1 });
  else if (shot === 'explorer') L.go('bag', { tab: 'hat' });
  else if (shot === 'summit') L.go('summit', { i: idx(78), feats: ['once'], after: { i: idx(78), p: 'all', msg: '', stars: 1 } });
  else if (shot === 'puzzle') {
    L.go('order', { i: idx(78), p: 1, deck: [3, 0, 4, 1, 5, 2], placed: { 0: true, 1: true, 2: true }, say: 2, sel: null, hearts: 4, maxH: 4 });
  } else if (shot === 'mushaf') {
    Object.assign(L.store().prefs, { translit: true, wordmean: true, meaning: true });
    L.go('surah', { i: idx(112), p: 0 }); await wait(300);
    d.querySelector('[data-act=mushaf]').click(); await wait(1500);
    L.go('mushaf', Object.assign({}, L.st(), { sel: 1, focus: true }));
  }
  else if (shot === 'awards') L.go('show');
  else if (shot === 'learn') L.go('learn', { i: idx(113), p: 0, a: 1, phase: 'repeat', popped: [true, false, false], peek: false, chain: 0, saidA: [0], savedA: [] });
  else if (shot === 'words') {
    Object.assign(L.store().prefs, { translit: true, wordmean: true });
    L.go('surah', { i: idx(112), p: 0 }); await wait(200);
    d.querySelector('[data-act=words]').click(); await wait(1500);
    L.go('words', Object.assign({}, L.st(), { a: 0, w: 3, phase: 'build' }));
  } else if (shot === 'stranger') {
    prof.prog[100] = full(2);
    L.go('stranger', { i: idx(100), p: 0, qs: [{ k: 2, kind: 'next', cut: 0, throw: 'sand' }, { k: 4, kind: 'next', cut: 0, throw: 'water' }, { k: 6, kind: 'next', cut: 0, throw: 'sand' }], q: 1, marks: [true], hurt: false, fallen: [], phase: 'ask', anytime: false, rematch: false, result: null, ack: '' });
  }
  await wait(shot === 'summit' ? 9000 : 1500);
  done();
})();
