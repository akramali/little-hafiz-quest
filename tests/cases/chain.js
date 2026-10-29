(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const tap = (act) => { const b = d.createElement('button'); b.dataset.act = act; d.getElementById('app').appendChild(b); b.click(); b.remove(); };
  for (const [n, every] of [[112, 1], [99, 1], [99, 3], [99, 5], [78, 4]]) {
    L.store().prefs.chain = every;
    const i = idx(n), sur = w.LHQ_DATA.surahs[i];
    L.go('learn', { i, p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] });
    await wait(100);
    const out = [];
    for (let g = 0; g < 14 && L.st().view === 'learn'; g++) {
      const a = L.st().a;
      L.st().phase = 'alone'; tap('saidit'); await wait(550);
      if (L.st().phase === 'chain') { out.push(`${a + 1}⛓${L.st().a + 1 - (L.st().a + 1 - 1)}`.replace(/⛓\d+$/, '⛓')); while (L.st().view === 'learn' && L.st().phase === 'chain') { tap('chainstep'); await wait(80); } await wait(800); }
      else out.push(String(a + 1));
    }
    log(`sūrah ${n} part 1, chain every ${every}:`, out.join(' '), '| then', L.st().view);
    ok(`sūrah ${n} chains every ${every}`, out.join(' ') === { '112:1': '1 2⛓ 3⛓ 4⛓', '99:1': '1 2⛓ 3⛓ 4⛓ 5⛓', '99:3': '1 2 3⛓ 4 5⛓', '99:5': '1 2 3 4 5⛓', '78:4': '1 2 3 4⛓ 5⛓' }[n + ':' + every], out.join(' '));
  }
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
