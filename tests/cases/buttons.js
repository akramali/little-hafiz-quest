// tap every button on every screen, one at a time from a fresh screen: report errors and taps that do nothing
(async () => {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  w.HTMLInputElement.prototype.click = function () { this._clicked = true; };
  w.prompt = () => null; w.location.reload = () => log('reload asked'); w.navigator.share = () => Promise.resolve(); w.confirm = () => true;
  const i112 = idx(112), i78 = idx(78);
  const screens = {
    splash: () => L.go('splash'),
    explorers: () => L.go('explorers'),
    syncshare: async () => { L.go('explorers'); d.querySelector('[data-act=syncshare]').click(); await wait(600); },
    settings: () => L.go('settings'),
    map: () => L.go('map'),
    surah: () => L.go('surah', { i: i78, p: 0 }),
    surah112: () => L.go('surah', { i: i112, p: 0 }),
    learn: () => L.go('learn', { i: i112, p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }),
    words: () => L.go('words', { i: i112, p: 0, a: 0, w: 2, phase: 'build', shown: [], doneA: [], savedA: [] }),
    path: () => L.go('path', { i: i112, p: 0, L: 2, k: 0, hint: 0, hints: 0, hearts: 3, maxH: 3 }),
    order: async () => { L.go('surah', { i: i112, p: 0 }); d.querySelector('[data-act=order]').click(); await wait(200); },
    bag: () => L.go('bag', { tab: 'hat' }),
    look: () => L.go('bag', { tab: 'look' }),
    show: () => L.go('show'),
    mushaf: () => L.go('mushaf', { i: i112, p: 0, sel: null }),
    mushafsel: () => L.go('mushaf', { i: i112, p: 0, sel: 1, focus: true }),
  };
  const hash = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0; return h; };
  const sig = () => [hash(d.documentElement.outerHTML), JSON.stringify(w.__lhq.store().prefs), L.st().view, JSON.stringify(L.st()).length, d.getElementById('app').innerHTML.length, d.getElementById('modal').classList.contains('show') ? d.getElementById('modal').innerHTML.length : 0, d.getElementById('toast').classList.contains('show') ? d.getElementById('toast').textContent : '', d.body.className, (d.querySelector('.listen') || {}).className].join('|');
  const dead = [], bad = [];
  let total = 0;
  for (const [name, open] of Object.entries(screens)) {
    const reset = async () => { d.getElementById('modal').classList.remove('show'); d.getElementById('toast').classList.remove('show'); w.__lhq.store().profiles[0].pending = []; await open(); await wait(250); };
    await reset();
    const n = d.querySelectorAll('#app [data-act], body > .mfloat [data-act]').length;
    for (let j = 0; j < n; j++) {
      await reset();
      const els = [...d.querySelectorAll('#app [data-act], body > .mfloat [data-act]')];
      const el = els[j];
      if (!el || el.disabled || !el.getClientRects().length) continue;
      const act = el.dataset.act;
      fetch('/__result/buttons_p', { method: 'POST', body: name + ' ' + j + ' ' + act + '\n' + OUT.join('\n') });
      if (act === 'mclear' && el.classList.contains('screen')) continue; // the page itself
      total++;
      const before = sig(), e0 = errs.length;
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      await wait(250);
      const after = sig();
      if (errs.length > e0) bad.push(`${name}: ${act} → ${errs.slice(e0).join('; ')}`);
      else if (before === after && !el.querySelector('input,select') && el.tagName !== 'SELECT') dead.push(`${name}: ${act} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`);
      w.__lhq.stopAudio && w.__lhq.stopAudio();
    }
  }
  log('buttons tapped', total);
  log('errors:', bad.length ? '\n  ' + bad.join('\n  ') : 'none');
  log('no visible effect:', dead.length ? '\n  ' + dead.join('\n  ') : 'none');
  // taps on an option already chosen do nothing, rightly; Share and Copy need a real phone
  const QUIET = ['pickprof', 'synclink', 'synccopy', 'fs', 'reciter', 'set', 'cpscroll', 'wtscroll', 'ljump', 'wbead', 'slot', 'look'];
  ok('no button throws', !bad.length, bad.slice(0, 3).join(' · '));
  ok('no dead buttons (beyond already-chosen options)', !dead.some((x) => !QUIET.includes(x.split(': ')[1].split(' ')[0])), dead.filter((x) => !QUIET.includes(x.split(': ')[1].split(' ')[0])).join(' · '));
  ok('buttons tapped', total > 300, total);
  done();
})();
