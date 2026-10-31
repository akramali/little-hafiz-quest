// v2.7.15: making an explorer looks like My look (Done top right, explorer always in view, only the choices
// scroll); every comfy color for everyone
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  const prof = L.store().profiles[0];
  prof.look.kid = 'boy'; prof.look.hair = 'short';
  L.go('create', { first: false }); await wait(500);
  ok('Done is at the top right', !!d.querySelector('.bar [data-act=made]'));
  const stage = d.querySelector('.wd-stage'), top0 = stage.getBoundingClientRect().top;
  const sc = [...d.querySelectorAll('.wbody, .wscroll-v')].find((el) => el.scrollHeight > el.clientHeight + 20);
  if (sc) { sc.scrollTop = 600; await wait(200); }
  ok('only the choices scroll; the explorer stays in view', !!sc && sc.scrollTop > 100 && Math.abs(stage.getBoundingClientRect().top - top0) < 2 && w.scrollY === 0, `${sc && sc.scrollTop} · ${w.scrollY}`);
  ok('a boy can pick every shirt, pants and shoe color', d.querySelectorAll('[data-act=look][data-k=tee]').length === w.LHQ_ART.TEES.length && d.querySelectorAll('[data-act=look][data-k=legs]').length === w.LHQ_ART.LEGS.length && d.querySelectorAll('[data-act=look][data-k=feet]').length === w.LHQ_ART.FEET.length);
  d.querySelector('.bar [data-act=made]').click(); await wait(400);
  ok('Done: back to My Explorer', L.st().view === 'bag', L.st().view);
  // a brand-new explorer: back leaves without keeping them
  const n = L.store().profiles.length;
  d.querySelector('[data-act=back]').click(); await wait(300);
  L.go('explorers'); await wait(200);
  d.querySelector('[data-act=newprof]').click(); await wait(400);
  ok('a new explorer: Let’s go at the top right', /Let’s go/.test(d.querySelector('.bar [data-act=made]').textContent) && L.store().profiles.length === n + 1);
  d.querySelector('.bar [data-act=back]').click(); await wait(400);
  ok('back from a new explorer: not kept', L.store().profiles.length === n && L.st().view === 'splash', `${L.store().profiles.length} ${L.st().view}`);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
