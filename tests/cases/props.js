(async () => {
  fixture();
  const { w, d, L } = await openGame();
  L.go('map'); await wait(1200);
  const by = {};
  d.querySelectorAll('.mprop').forEach((p) => { by[(p.dataset.w || Math.floor(+p.dataset.y / 1000))] = by[(p.dataset.w || Math.floor(+p.dataset.y / 1000))] || { all: 0, animals: 0 }; by[(p.dataset.w || Math.floor(+p.dataset.y / 1000))].all++; if (/sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat/.test(p.dataset.k)) by[(p.dataset.w || Math.floor(+p.dataset.y / 1000))].animals++; });
  log('props per world', JSON.stringify(by), 'total', d.querySelectorAll('.mprop').length);
  // any prop's ground point inside another prop's picture?
  const ps = [...d.querySelectorAll('.mprop')].map((p) => ({ k: p.dataset.k, x: +p.dataset.x, y: +p.dataset.y, l: p.offsetLeft, t: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight }));
  let hidden = 0; ps.forEach((a) => ps.forEach((b) => { if (a !== b && a.x > b.l + b.w * 0.2 && a.x < b.l + b.w * 0.8 && a.y > b.t + b.h * 0.2 && a.y < b.t + b.h - 6) hidden++; }));
  log('feet hidden inside another picture', hidden);
  ok('nothing hides behind something else', hidden === 0, hidden); ok('the worlds still have plenty of scenery', d.querySelectorAll('.mprop').length >= 90);
  done();
})();
