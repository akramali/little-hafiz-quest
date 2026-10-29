(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  // save / load a progress file
  let saved = null;
  const origCreate = w.URL.createObjectURL;
  w.URL.createObjectURL = (b) => { saved = b; return origCreate(b); };
  L.go('explorers'); await wait(200);
  d.querySelector('[data-act=savefile]').click(); await wait(200);
  const text = await saved.text();
  log('saved file:', saved.type, text.length, 'bytes, has app:', JSON.parse(text).app);
  ok('save file is a progress file', JSON.parse(text).app === 'little-hafiz-quest');
  const before = JSON.stringify(prof().prog);
  prof().prog = {}; prof().name = 'Changed'; L.go('explorers'); await wait(100);
  const file = new w.File([text], 'p.json', { type: 'application/json' });
  const input = d.getElementById('loadfile'); const dt = new w.DataTransfer(); dt.items.add(file); input.files = dt.files; input.dispatchEvent(new w.Event('change', { bubbles: true }));
  await wait(300);
  log('confirm shown:', !!d.querySelector('#modal [data-act=cyes]'));
  d.querySelector('#modal [data-act=cyes]').click(); await wait(300);
  log('after load: name', prof().name, 'progress restored', JSON.stringify(prof().prog) === before);
  ok('loading a file restores progress', JSON.stringify(prof().prog) === before);
  // a bad file
  const bad = new w.File(['{"hello":1}'], 'x.json'); const dt2 = new w.DataTransfer(); dt2.items.add(bad); input.files = dt2.files; input.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(300);
  log('bad file toast:', d.getElementById('toast').textContent);
  ok('a bad file is refused', /isn't a Little Hafiz Quest/.test(d.getElementById('toast').textContent));
  // badges: 100 stars → a badge
  const full = (n) => ({ parts: Array.from({ length: n }, () => ({ learn: 1, words: 1, order: 1, next: 1, path: 3, la: 0, wa: 0 })), all: n > 1 ? 3 : 0 });
  w.LHQ_DATA.surahs.slice(0, 26).forEach((s) => (prof().prog[s.n] = full(s.parts.length)));
  prof().pending = [];
  L.go('path', { i: idx(112), p: 0, L: 1, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 });
  for (let k = 0; k < 4; k++) { d.querySelector('.pathbtns [data-act=hop]').click(); await wait(1000); }
  log('badges waiting:', prof().pending.filter((g) => /^stars/.test(g.id)).map((g) => g.id).join(','), '| memo:', [...d.querySelectorAll('.memo.gold')].map((m) => m.textContent.trim()).join(' | '));
  ok('star badges given', prof().pending.some((g) => /^stars/.test(g.id)));
  // checkpoint done screen: next checkpoint, not the next game
  L.go('learn', { i: idx(99), p: 0, a: 4, phase: 'alone', popped: [true, true, true], peek: false, chain: 0, saidA: [0, 1, 2, 3], savedA: [] });
  await wait(100); d.querySelector('[data-act=saidit]').click(); await wait(800);
  for (let t = 0; t < 8 && L.st().view !== 'done'; t++) { const c = d.querySelector('.btn[data-act=chainstep]'); /* “Said it! Next”: tapping a said link goes back to it */ if (c) c.click(); await wait(300); }
  await wait(600);
  log('checkpoint done → buttons:', [...d.querySelectorAll('.donescr .btn')].map((b) => b.textContent.trim()).join(' | '));
  ok('checkpoint done page offers the next checkpoint', /Next checkpoint/.test(d.querySelector('.donescr').textContent));
  // checkpoint arrows
  L.go('surah', { i: idx(78), p: 0 }); await wait(400);
  const tr = d.getElementById('cptrail'), more = d.querySelector('.cpmore:not(.cpless)');
  const top1 = d.elementFromPoint(more.getBoundingClientRect().left + 10, more.getBoundingClientRect().top + 10);
  log('right arrow tappable:', top1 === more, 'opacity', w.getComputedStyle(more).opacity);
  ok('checkpoint › arrow tappable', top1 === more);
  more.click(); await wait(700);
  const less = d.querySelector('.cpless');
  log('scrolled to', Math.round(tr.scrollLeft), 'left arrow visible', w.getComputedStyle(less).opacity, 'tappable', d.elementFromPoint(less.getBoundingClientRect().left + 10, less.getBoundingClientRect().top + 10) === less);
  // listen keeps its width when it turns into Stop
  L.go('learn', { i: idx(114), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(200);
  const fab = d.querySelector('.listen'), w0 = fab.offsetWidth;
  fab.click(); await wait(1500);
  log('listen width', w0, '→', fab.offsetWidth, 'playing bg', w.getComputedStyle(fab).backgroundImage.slice(0, 40));
  fab.click();
  // every move runs
  prof().items = w.LHQ_ART.ITEMS.map((it) => it.id);
  const pick = (slot) => w.LHQ_ART.ITEMS.find((it) => it.slot === slot && it.from).id;
  prof().outfit = { hat: pick('hat'), watch: pick('watch'), stick: pick('stick'), shield: pick('shield'), cape: pick('cape'), glasses: pick('glasses'), pet: pick('pet') };
  L.go('bag', { tab: 'hat' }); await wait(200);
  const seen = new Set();
  for (let k = 0; k < 60; k++) { d.querySelector('.wd-ex').click(); const svg = d.querySelector('.wd-ex svg.ex'); const m = [...svg.classList].find((c) => c.startsWith('mv-')); if (m) seen.add(m.slice(3)); await wait(40); }
  log('moves seen:', [...seen].sort().join(','));
  ok('explorer does many moves', seen.size >= 10, [...seen].join(','));
  log('ex-hat / ex-glasses groups:', !!d.querySelector('.wd-ex .ex-hat'), !!d.querySelector('.wd-ex .ex-glasses'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
