// v2.6.0: golden worlds, speed button, one-tap gifts, world rides, loop button clear of the tags
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0], S = w.LHQ_DATA.surahs;
  const full = (s, gold) => ({ parts: s.parts.map(() => ({ learn: 1, words: 1, order: gold ? 1 : 0, next: 1, path: 3, la: 0, wa: 0 })), all: s.parts.length > 1 ? 3 : 0, big: gold ? 1 : 0 });
  // world 1 golden, world 2 green
  S.filter((s) => s.n >= 109).forEach((s) => (prof.prog[s.n] = full(s, true)));
  S.filter((s) => s.n >= 103 && s.n <= 108).forEach((s) => (prof.prog[s.n] = full(s, false)));
  L.go('map'); await wait(1200);
  const wr = (wi) => d.querySelector(`.wr[data-w="${wi}"]`);
  ok('a golden world is marked gold', wr(0).classList.contains('gold'));
  ok('a memorized world is marked green, not gold', wr(1).classList.contains('done') && !wr(1).classList.contains('gold'));
  ok('the world sign says golden', !!d.querySelector('.msign.gold'));
  // world 1 golden → its ride
  L.go('path', { i: idx(114), p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 8 && L.st().view === 'path'; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(900); }
  ok('a golden world wins its ride', prof.pending.some((g) => g.id === 'toy-car') || prof.items.includes('toy-car'), prof.pending.map((g) => g.id).join(','));
  ok('7 rides, the rocket for the top world', w.LHQ_ART.ITEMS.filter((it) => it.wgold).length === 7 && w.LHQ_ART.ITEMS.find((it) => it.id === 'space-rocket').wgold === 7);
  // one tap opens a gift; Next gift returns to the same screen
  prof.pending = [{ k: 's', id: 'star' }, { k: 's', id: 'moon' }];
  L.go('done', { i: idx(112), p: 0, msg: 'x', stars: 1 }); await wait(200);
  d.querySelector('.giftbtn').click(); await wait(200);
  ok('one tap opens the gift', !!d.querySelector('#modal.show .giftcard.open'));
  d.querySelector('#modal [data-act=giftok]').click(); await wait(200);
  ok('Next gift goes back to the same screen', L.st().view === 'done' && !d.getElementById('modal').classList.contains('show') && !!d.querySelector('.giftbtn'));
  // Look & Repeat: speed and loop side by side, nothing under the loop button
  L.go('learn', { i: idx(109), p: 0, a: 2, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(200);
  const lb = d.querySelector('.lcard .loopbtn').getBoundingClientRect();
  const under = [...d.querySelectorAll('.lcard .ayah-tag, .lcard .twin')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < lb.right && lb.left < r.right && r.top < lb.bottom && lb.top < r.bottom; });
  ok('nothing under the loop button', !under.length);
  ok('speed button beside the loop', !!d.querySelector('.lcbtns .speedchip'));
  d.querySelector('.speedchip').click(); await wait(200);
  ok('the speed button opens a quick picker', !!d.querySelector('#modal.show .speedcard'));
  d.querySelector('#modal .speedticks button[data-v="0.5"]').click(); await wait(200);
  ok('picking a speed applies at once, picker stays open', L.store().prefs.speed === 0.5 && L.player.playbackRate === 0.5 && !!d.querySelector('#modal.show .speedcard') && /0\.5/.test(d.querySelector('.speedchip').textContent));
  L.go('mushaf', { i: idx(112), p: 0, sel: null }); await wait(300);
  ok('Read has the speed button too', !!d.querySelector('.mfloat .speedchip') && !!d.querySelector('.mfloat .loopbtn'));
  ok('no gear on the Listen bar', !d.querySelector('.speedbtn'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
