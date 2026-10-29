(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('map'); await wait(1200);
  for (const k of ['meadow-windmill', 'meadow-cottage', 'sands-lighthouse', 'peak-flag', 'peak-cabin']) {
    const el = d.querySelector(`.mprop[data-k="${k}"]`);
    if (!el) { log(k, 'not on the map'); continue; }
    w.scrollTo(0, el.getBoundingClientRect().top + w.scrollY - w.innerHeight / 2); await wait(400);
    const anims = el.getAnimations({ subtree: true });
    const near = [...d.querySelectorAll('.mprop')].filter((a) => /sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat/.test(a.dataset.k) && a.dataset.w === el.dataset.w && Math.hypot(a.dataset.x - el.dataset.x, a.dataset.y - el.dataset.y) < 240);
    const x0 = near.map((a) => a.firstElementChild.getBoundingClientRect().left);
    for (let i = 0; i < 3; i++) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await wait(150); }
    await wait(600);
    const r1 = anims.map((a) => a.playbackRate.toFixed(1)).join(',');
    const moved = near.map((a, j) => Math.round(a.firstElementChild.getBoundingClientRect().left - x0[j]));
    await wait(6500);
    const r2 = anims.map((a) => a.playbackRate.toFixed(1)).join(',');
    await wait(1500);
    log(k, '| animations', anims.length, '| rate after 3 taps', r1, '→ later', r2, '| animals near', near.length, 'moved', moved.join(','), '| back home', near.every((a) => !a._busy));
    ok(k + ' speeds up and calms down', +r1.split(',')[0] > 3 && r2.split(',').every((x) => +x === 1)); ok(k + ': animals come back', near.every((a) => !a._busy));
  }
  // fruit in one world, animals of the next world don't come
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
