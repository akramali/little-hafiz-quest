// the Stranger's throws really fly from him to the explorer, and the explorer defends with what blocks them
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0];
  const run = async (kind, setup) => {
    setup();
    L.go('stranger', { i: idx(113), p: 0, qs: [0, 1, 2].map((k) => ({ k, kind: 'next', cut: 0, throw: kind })), q: 0, marks: [], hits: 0, phase: 'ask', anytime: false, rematch: false, result: null });
    await wait(200);
    const foe = d.querySelector('.strfig svg').getBoundingClientRect(), me = d.querySelector('.mefig svg').getBoundingClientRect();
    d.querySelector('[data-act=strans][data-ok="0"]').click();
    const xs = [], moves = new Set();
    for (let t = 0; t < 26; t++) {
      await wait(100);
      const p = d.querySelector('.strproj');
      if (p) { const r = p.getBoundingClientRect(); xs.push(Math.round(r.left + r.width / 2)); }
      const svg = d.querySelector('.mefig svg.ex');
      if (svg) [...svg.classList].filter((c) => c.startsWith('mv-')).forEach((c) => moves.add(c));
    }
    const note = (d.querySelector('.strnote') || {}).textContent || '';
    await wait(2500); // let this throw finish (its next question) before the next run
    return { xs, moves: [...moves], note, from: Math.round(foe.left + foe.width / 2), to: Math.round(me.left + me.width / 2), hits: L.st().hits };
  };
  const rock = await run('rock', () => { prof.items.push('sturdy-shield'); prof.outfit = { shield: 'sturdy-shield' }; });
  log('rock', JSON.stringify(rock));
  ok('the rock flies from him to the explorer', rock.xs.length > 4 && Math.max(...rock.xs) > rock.to + 60 && Math.min(...rock.xs) < rock.to + 60, rock.xs.join(' '));
  ok('the shield goes up and blocks it', rock.moves.includes('mv-shield') && /Blocked/.test(rock.note) && rock.hits === 0, rock.moves + ' ' + rock.note);
  const wind = await run('wind', () => { prof.items.push('leaf-cape'); prof.outfit = { cape: 'leaf-cape' }; });
  log('wind', JSON.stringify(wind));
  ok('the wind is visible for over a second', wind.xs.length >= 10, wind.xs.length);
  ok('the cape billows and holds', wind.moves.includes('mv-cape') && wind.hits === 0);
  const buddy = await (async () => { let r; for (let t = 0; t < 6; t++) { r = await run('rock', () => { prof.items.push('ladybug-buddy'); prof.outfit = { pet: 'ladybug-buddy' }; }); if (r.moves.includes('mv-pethop')) break; } return r; })();
  ok('sometimes an animal buddy jumps in front of a rock', buddy.moves.includes('mv-pethop') && /jumped/.test(buddy.note), buddy.note);
  let carBlocked = false;
  for (let t = 0; t < 5; t++) { const r = await run('rock', () => { prof.items.push('toy-car'); prof.outfit = { pet: 'toy-car' }; }); if (r.hits === 0) carBlocked = true; }
  ok('a ride never blocks', !carBlocked);
  const water = await run('water', () => { prof.outfit = {}; });
  ok('nothing to block: the explorer is hit', water.hits === 1 && /Oof/.test(water.note));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
