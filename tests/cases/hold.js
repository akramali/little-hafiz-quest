(async () => { try {
  fixture();
  const { w, d, L } = await openGame();
  const prof = L.store().profiles[0];
  L.store().profiles.push(Object.assign(JSON.parse(JSON.stringify(prof)), { id: 'pkid22', name: 'Zayd' }));
  L.go('explorers'); await wait(200);
  const rm = () => [...d.querySelectorAll('[data-hold=delprof]')].find((b) => b.dataset.id === 'pkid22');
  const o = (b) => { const r = b.getBoundingClientRect(); return { bubbles: true, clientX: r.left + 10, clientY: r.top + 10, pointerId: 1 }; };
  // a short tap only explains
  let b = rm(); b.dispatchEvent(new w.PointerEvent('pointerdown', o(b))); await wait(200); b.dispatchEvent(new w.PointerEvent('pointerup', o(b))); b.click(); await wait(200);
  log('short tap: still there', !!rm(), '| toast:', d.getElementById('toast').textContent);
  // let go half way: nothing happens
  b = rm(); b.dispatchEvent(new w.PointerEvent('pointerdown', o(b))); await wait(300);
  log('holding: ring filling', b.classList.contains('holding'), w.getComputedStyle(b.querySelector('rect')).strokeDashoffset);
  await wait(500); b.dispatchEvent(new w.PointerEvent('pointerup', o(b))); await wait(1200);
  log('let go after 0.8 s: still there', !!rm());
  ok('letting go early keeps the explorer', !!rm());
  // a full hold removes
  b = rm(); b.dispatchEvent(new w.PointerEvent('pointerdown', o(b))); await wait(1800);
  log('held 1.8 s: removed', !rm(), '| explorers', L.store().profiles.map((p) => p.name).join(','), '| toast:', d.getElementById('toast').textContent);
  ok('holding removes', !rm());
  // reset one sūrah by holding
  const before = !!L.store().profiles[0].prog[114];
  d.getElementById('resetSel').value = '0';
  b = d.querySelector('[data-hold=resetone]'); b.dispatchEvent(new w.PointerEvent('pointerdown', o(b))); await wait(1800);
  log('reset An-Nās by holding: had progress', before, '→ now', !!L.store().profiles[0].prog[114]);
  ok('holding resets a sūrah', before && !L.store().profiles[0].prog[114]);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message); }
  done();
})();
