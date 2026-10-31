// v2.6.9: no text selection or long-press menu, except text boxes and the share picture; zoom untouched
(async () => {
  fixture();
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  const cs = (el) => w.getComputedStyle(el);
  L.go('surah', { i: 1, p: 0 }); await wait(300);
  ok('text on a page cannot be selected', cs(d.querySelector('.bar-title')).userSelect === 'none');
  const ev = new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  d.querySelector('.qstep').dispatchEvent(ev);
  ok('a long press opens no menu', ev.defaultPrevented);
  L.go('create', { first: false }); await wait(300);
  const inp = d.getElementById('exname');
  ok('the name box can still be typed in and selected', cs(inp).userSelect !== 'none');
  const ev2 = new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  inp.dispatchEvent(ev2);
  ok('…with its own menu (paste)', !ev2.defaultPrevented);
  const vp = d.querySelector('meta[name=viewport]').content;
  ok('pinch-zoom still allowed', !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\D|$)/.test(vp), vp);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; '));
  done();
})();
