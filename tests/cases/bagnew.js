// (v2.12.16) My Explorer's "new" dots clear as soon as a thing is tapped, or its tab is left
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const pr = L.store().profiles[0], A = w.LHQ_ART;
  const hats = A.ITEMS.filter((it) => it.slot === 'hat' && !it.girl).slice(0, 3), golds = A.ITEMS.filter((it) => it.slot === 'hat' && it.gold).slice(0, 2), shield = A.ITEMS.find((it) => it.slot === 'shield');
  [...hats, ...golds, shield].forEach((it) => { pr.items.push(it.id); pr.got.push('i:' + it.id); pr.fresh.push('i:' + it.id); });
  L.go('bag', { tab: 'hat' }); await wait(500);
  const dots = () => d.querySelectorAll('.wrow .icell .newdot').length, tabNew = (t) => !!d.querySelector('.wtab[data-t=' + t + '].hasnew');
  const before = dots();
  d.querySelector('.icell[data-id="' + hats[0].id + '"]').click(); await wait(300);
  const after = dots();
  ok('tapping a new thing clears its dot at once', after === before - 1, before + ' → ' + after);
  ok('…the hats tab still shows new (others unseen)', tabNew('hat'));
  d.querySelector('.wtab[data-t=shield]').click(); await wait(300);
  ok('leaving the hats tab: its dot goes', !tabNew('hat'));
  ok('…the shield tab still new until left or tapped', tabNew('shield'));
  d.querySelector('.icell[data-id="' + shield.id + '"]').click(); await wait(300);
  ok('tapping the only new shield clears the tab dot at once', !tabNew('shield'));
  d.querySelector('.wtab[data-t=hat]').click(); await wait(300);
  done();
})();
