// (test concept, v2.6.0) the Stranger: appears, asks 3, throws, blocks, takes things, rematch, gifts
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], A = w.LHQ_ART;
  const m = d.getElementById('modal');
  const tap = (sel) => { const b = d.querySelector(sel); if (b) b.click(); return !!b; };
  const answer = async (oks) => {
    for (const ok of oks) {
      for (let t = 0; t < 80 && !d.querySelector('[data-act=strans]:not([disabled])'); t++) await wait(100);
      tap(`[data-act=strans][data-ok="${ok ? 1 : 0}"]`); await wait(300);
    }
    // the last answer: until the result shows
    for (let t = 0; t < 80 && L.st().view === 'stranger' && L.st().phase !== 'end'; t++) await wait(100);
    if (false) {
    }
  };
  if (Q.get('shot') === 'result') {
    L.go('stranger', { i: idx(112), p: 0, qs: [{}, {}, {}], q: 2, marks: [false, false, false], hits: 2, phase: 'end', anytime: false, rematch: false,
      result: { win: false, say: 'Hmm… I’ll keep these until you know it better!', html: '<p class="memo">💔 He took your Explorer cap and your Rain boots. They are waiting at <b>Al-Ikhlāṣ</b>: finish a review game there to get them back. Then he\'ll come back for a rematch!</p>' } });
    await wait(1500); done(); return;
  }
  // 1. it appears on the way back to the map (forced: the 5-minute and chance rules are skipped by a test switch)
  w.__strangerNow = true;
  prof.strangerAt = 0;
  L.go('surah', { i: idx(113), p: 0 }); await wait(200);
  L.go('map'); await wait(2400);
  ok('he appears between sūrahs', !!d.querySelector('#modal.show .strmeet'));
  m.click(); await wait(100); // a tap outside his card
  ok('a tap outside does not send him away', !!d.querySelector('#modal.show .strmeet'));
  if (Q.get('shot') === 'meet') { await wait(1500); done(); return; }
  tap('[data-act=strface]'); await wait(300);
  ok('the challenge screen', L.st().view === 'stranger' && !!d.querySelector('.arena .strfig svg') && !!d.querySelector('.arena .mefig svg'));
  const bub = d.querySelector('.strbubble').getBoundingClientRect();
  ok('his speech bubble is inside the screen', bub.left >= 4 && bub.right <= w.innerWidth - 4, Math.round(bub.left) + '…' + Math.round(bub.right));
  ok('no Listen during the challenge', !d.querySelector('.listen.show'));
  tap('[data-act=strgo]'); await wait(200);
  if (Q.get('shot') === 'ask') { await wait(1000); done(); return; }
  if (Q.get('shot') === 'rock' || Q.get('shot') === 'wind') {
    const kind = Q.get('shot');
    if (kind === 'rock') { prof.items.push('sturdy-shield'); prof.outfit.shield = 'sturdy-shield'; } else { prof.items.push('leaf-cape'); prof.outfit.cape = 'leaf-cape'; }
    L.go('stranger', Object.assign({}, L.st())); await wait(200);
    L.st().qs.forEach((q) => (q.throw = kind));
    tap('[data-act=strans][data-ok="0"]');
    await wait(+(Q.get('at') || 1300));
    d.querySelector('.arena').getAnimations({ subtree: true }).forEach((x) => x.pause());
    await wait(3000); done(); return;
  }
  // 2. three misses: every miss costs something (a shield takes the first rock and falls)
  prof.items.push('sturdy-shield', 'rain-boots', 'explorer-cap'); prof.outfit.shield = 'sturdy-shield'; prof.outfit.hat = 'explorer-cap';
  L.st().qs.forEach((q, j) => (q.throw = j ? 'water' : 'rock'));
  await answer([false]);
  ok('a shield takes the rock and falls itself', prof.lost.some((x) => x.id === 'sturdy-shield') && !L.st().hurt);
  await answer([false, false]);
  ok('all three missed: he takes things', L.st().phase === 'end' && prof.lost.length >= 1 && prof.rematch.includes(w.LHQ_DATA.surahs[L.st().i].n), `lost ${prof.lost.length}, rematch ${prof.rematch}`);
  ok('the explorer looks sad before going back to the world', !!d.querySelector('.mefig svg.ex-sad'));
  const n = prof.rematch[0], lostN = prof.lost.length;
  ok('every miss cost one thing (3 misses → 3 things)', lostN === 3, lostN);
  if (Q.get('shot') === 'end') { await wait(1000); done(); return; }
  // 3. a review game there gives them back and he returns for a rematch
  const i = idx(n);
  L.go('path', { i, p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  const s = w.LHQ_DATA.surahs[i];
  for (let k = 0; k < 12 && L.st().view === 'path'; k++) { tap('.pathbtns [data-act=hop]'); await wait(900); }
  ok('a review game there gives them back', !prof.lost.length && prof.rematchReady.includes(n), `lost ${prof.lost.length} ready ${prof.rematchReady}`);
  w.__strangerNow = false;
  L.go('map'); await wait(2400);
  ok('he comes back for a rematch, and Not now is allowed', /back/.test((d.querySelector('#modal.show .strmeet h3') || {}).textContent || '') && !!d.querySelector('[data-act=strrun]'));
  tap('[data-act=strrun]'); await wait(200);
  L.go('surah', { i: idx(113), p: 0 }); await wait(100); L.go('map'); await wait(2400);
  ok('after Not now he waits (the usual timer)', !d.querySelector('#modal.show .strmeet'));
  prof.strangerAt = 0;
  L.go('surah', { i: idx(113), p: 0 }); await wait(100); L.go('map'); await wait(2400);
  tap('[data-act=strface]'); await wait(300); tap('[data-act=strgo]'); await wait(200);
  const before = prof.pending.length;
  await answer([true, true, true]);
  ok('rematch won: a special gift, and he is gone', L.st().result.win && prof.pending.length > before && !prof.rematch.length, `gifts +${prof.pending.length - before}`);
  const gb = d.querySelector('.strend .giftbtn');
  ok('the gift is the same square box', !!gb && gb.getBoundingClientRect().height > 120, gb && Math.round(gb.getBoundingClientRect().height));
  gb.click(); await wait(300);
  d.querySelector('#modal [data-act=giftok]') ? d.querySelector('#modal [data-act=giftok]').click() : d.querySelector('#modal [data-act=wear], #modal [data-act=stick]').click();
  await wait(1200);
  ok('after opening it, on to the world', L.st().view === 'map');
  // 4. after the summit, wins bring hero gear; with all three, a Challenge button on the map
  prof.feats.push('once');
  prof.items = prof.items.filter((x) => !/^hero-/.test(x));
  for (let r = 0; r < 3; r++) {
    w.__lhq.go('map'); await wait(300);
    m.classList.remove('show');
    prof.pending = [];
    L.go('stranger', { i: idx(113), p: 0, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'rock' }, { k: 1, kind: 'next', cut: 0, throw: 'rock' }, { k: 2, kind: 'next', cut: 0, throw: 'rock' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: false, rematch: false, result: null, ack: '' });
    await answer([true, true, true]);
    const g = prof.pending.find((x) => /^hero-/.test(x.id));
    if (g) prof.items.push(g.id);
  }
  ok('three wins after the summit: armor, shield and sword', ['hero-armor', 'hero-shield', 'hero-sword'].every((id) => prof.items.includes(id)), prof.items.filter((x) => /^hero/.test(x)).join(','));
  L.go('map'); await wait(600);
  ok('⚔️ Challenge on the map', !!d.querySelector('[data-act=challenge]'));
  // 5. (Al-Ikhlāṣ is green here, not golden) wearing all the hero gear (golden), with only golden things and stickers: never hurt, stickers fall first
  prof.outfit = {};
  ['hero-armor', 'hero-shield', 'hero-sword'].forEach((id) => (prof.outfit[A.ITEMS.find((x) => x.id === id).slot] = id));
  prof.items = ['hero-armor', 'hero-shield', 'hero-sword'];
  prof.stickers = ['star', 'moon'];
  prof.lost = []; prof.lostSt = []; prof.rematch = [];
  L.go('stranger', { i: idx(112), p: 0, qs: [{ k: 0, kind: 'next', cut: 0, throw: 'wind' }, { k: 1, kind: 'next', cut: 0, throw: 'water' }, { k: 2, kind: 'next', cut: 0, throw: 'rock' }], q: 0, marks: [], hurt: false, fallen: [], phase: 'ask', anytime: true, rematch: false, result: null, ack: '' });
  await answer([false, false, false]);
  ok('hero armor blocks everything: never hurt', !L.st().hurt);
  ok('golden gear holds: two stickers fall, then the golden gear itself (nothing else left)', prof.lostSt.length === 2 && prof.lost.length === 1, `stickers ${prof.lostSt.length}, items ${prof.lost.map((x) => x.id)}`);
  ok('the setting can switch him off', 'stranger' in L.store().prefs);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
