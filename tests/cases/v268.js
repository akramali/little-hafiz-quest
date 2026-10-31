// v2.6.8: Read starts with the Bismillah, which can be chosen and looked at; the recited āyah stays in view;
// the screen stays on while reciting; world names are whole in the list
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = watchErrors(w);
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  let locks = 0, released = 0;
  Object.defineProperty(w.navigator, 'wakeLock', { configurable: true, value: { request: () => { locks++; const l = new w.EventTarget(); l.release = () => { released++; return Promise.resolve(); }; return Promise.resolve(l); } } });
  Object.assign(L.store().prefs, { translit: true, wordmean: true });
  L.go('mushaf', { i: idx(78), p: 0, sel: null }); await wait(500);
  const items = L.fabTarget().items;
  ok('Listen in Read starts with the Bismillah', JSON.stringify(items[0]) === '[1,1]' && items.length === 41, JSON.stringify(items.slice(0, 2)));
  d.querySelector('.listen').click(); await wait(400);
  ok('the screen stays on while reciting', locks === 1);
  ok('the Bismillah is marked as being recited first', !!d.querySelector('.mbism .mayah.now'));
  // the recitation moves on: the āyah being recited is scrolled into view, and back up when a loop starts over
  w.scrollTo(0, 0); await wait(100);
  L.markNow([78, 31]); await wait(900);
  const r31 = d.querySelector('.mayah[data-k="30"]').getBoundingClientRect();
  ok('a late āyah being recited is scrolled into view', r31.top >= 0 && r31.bottom <= w.innerHeight && w.scrollY > 300, Math.round(r31.top) + ' / ' + Math.round(w.scrollY));
  L.markNow([1, 1]); await wait(900);
  const rb = d.querySelector('.mbism .mayah').getBoundingClientRect();
  ok('looping back, it scrolls up to the Bismillah', rb.top >= 0 && rb.bottom <= w.innerHeight);
  d.querySelector('.listen').click(); await wait(200);
  ok('stop lets the screen sleep again', released >= 1);
  // the Bismillah can be held and looked at up close
  const b = d.querySelector('.mbism .mayah'), r = b.getBoundingClientRect();
  const opt = { bubbles: true, clientX: r.left + 10, clientY: r.top + 10, pointerId: 1 };
  b.dispatchEvent(new w.PointerEvent('pointerdown', opt)); await wait(600);
  b.dispatchEvent(new w.PointerEvent('pointerup', opt)); b.click(); await wait(200);
  ok('holding the Bismillah colors its words', L.st().sel === -1 && d.querySelectorAll('.mbism .mw').length === 4);
  d.querySelector('.mbism .mayah.sel').click(); await wait(500);
  const fw = [...d.querySelectorAll('.mfcard .fword')].map((x) => x.innerText.replace(/\n/g, '/'));
  ok('up close: each word with its transliteration and meaning', fw.length === 4 && /bis'mi/.test(fw[0]) && /name/.test(fw[0]), fw.join(' | '));
  ok('Listen plays just the Bismillah', /Bismillah/.test(d.querySelector('.listen small').textContent));
  d.querySelector('.mfx[data-act=mclear]').click(); await wait(500);
  // world names whole in the list
  L.go('map'); await wait(900);
  d.querySelector('[data-act=worlds]').click(); await wait(300);
  const cut = [...d.querySelectorAll('.wr-list .wr-tx small')].filter((x) => x.scrollWidth > x.clientWidth + 1 || /…/.test(x.textContent));
  ok('every world name shows in full', !cut.length, cut.map((x) => x.textContent).join(','));
  ok('the throws are still there', d.querySelectorAll('.wr-list .wr-thr').length === 7);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
