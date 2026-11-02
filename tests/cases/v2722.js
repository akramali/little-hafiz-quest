// v2.7.22: surprises are paced along the journey (they last until every star), milestones aren't held back;
// pattern versions of everyday things
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  const p = L.store().profiles[0], A = w.LHQ_ART;
  const drops = A.ITEMS.filter((it) => it.drop && (!it.for || it.for === 'girl'));
  ok('more everyday surprises, many with a pattern', drops.length >= 90 && A.ITEMS.filter((it) => it.pat).length >= 48, `${drops.length} · ${A.ITEMS.filter((it) => it.pat).length}`);
  ok('a pattern shows on the thing itself', /<pattern /.test(A.item('dots-rain-boots', p.look) || A.item(A.ITEMS.find((it) => it.pat).id, p.look)));
  // early in the journey, with a good few surprises already: the next first finish brings none
  p.pending = [];
  p.stickers = A.STICKERS.slice(0, 12).map((x) => x.id);
  drops.slice(0, 10).forEach((it) => p.items.includes(it.id) || p.items.push(it.id));
  p.daily = '';
  const before = p.pending.length;
  p.prog[112].parts[0].path = 0;
  L.go('path', { i: idx(112), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 12 && L.st().view === 'path'; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(1100); }
  await wait(600);
  const got = p.pending.slice(before).filter((g) => g.k === 's' || A.ITEMS.find((it) => it.id === g.id && it.drop));
  ok('22 surprises at ~12 stars: none more for now (saved for later)', !got.length, JSON.stringify(got));
  ok('…and no star-track prize pulled early', !p.pending.some((g) => (A.ITEMS.find((it) => it.id === g.id) || {}).track > 15));
  // a milestone still brings one (7 days in a row)
  const day = (t) => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  p.streak = [day((() => { const x = new Date(); x.setDate(x.getDate() - 1); return x.getTime(); })()), 6]; p.dayT = [day(Date.now()), 50];
  const b2 = p.pending.length;
  w.__lhq.countDay(p, 15);
  ok('a milestone (7 days in a row) still brings a gift', p.pending.length === b2 + 1);
  ok('no errors', !errs.length, errs.join(' | '));
  done();
})();
