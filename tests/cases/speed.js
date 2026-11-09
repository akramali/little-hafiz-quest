(async () => {
  // a phone that had "slower recitation" and "repeat 3×" switched on before v2.5.2
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2')); s0.prefs.slow = true; s0.prefs.repeat = 3; localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const pr = L.store().prefs;
  log('after update: speed', pr.speed, '| slow kept?', 'slow' in pr, '| repeat kept?', 'repeat' in pr);
  ok('old “slower” becomes 0.75×', pr.speed === 0.75 && !('slow' in pr) && !('repeat' in pr));
  ok('a saved 0.25× (gone since v2.8.4) becomes 0.5×', w.__lhq.cleanStore({ v: 2, profiles: [], prefs: { speed: 0.25 } }).prefs.speed === 0.5);
  L.go('settings'); await wait(300);
  log('settings: speed slider', !!d.getElementById('speed'), '| labels', [...d.querySelectorAll('.speedticks button')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join(' '), '| repeat row', /Repeat each/.test(d.body.textContent), '| slower row', /Slower recitation/.test(d.body.textContent));
  const sl = d.getElementById('speed'); sl.value = 5; sl.dispatchEvent(new w.Event('input', { bubbles: true })); await wait(100);
  log('slider to the end: speed', L.store().prefs.speed, '| player rate', L.player.playbackRate, '| on', d.querySelector('.speedticks .on').textContent);
  ok('slider sets the speed', L.store().prefs.speed === 2 && L.player.playbackRate === 2);
  ok('the speeds: 0.5× to 2×, with 1.25× (v2.8.4)', [...d.querySelectorAll('.speedticks button')].map((b) => b.dataset.v).join(',') === '0.5,0.75,1,1.25,1.5,2');
  d.querySelector('.speedticks button[data-v="1.25"]').click(); await wait(200);
  log('tap 1.25×: speed', L.store().prefs.speed, '| slider at', d.getElementById('speed').value);
  // plays at that speed
  L.go('learn', { i: idx(112), p: 0, a: 0, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: [], savedA: [] }); await wait(200);
  d.querySelector('.listen').click(); await wait(1500);
  log('playing at', L.player.playbackRate, '| repeat badge on Listen', !!d.querySelector('.listen .rep'));
  ok('plays at the chosen speed', L.player.playbackRate === 1.25);
  d.querySelector('.listen').click();
  // the info button and How to play
  L.go('settings'); await wait(200);
  log('info button icon', !!d.querySelector('[data-act=help] .infoic'), '| first thing in the corner:', d.querySelector('.screen > .bar + *').textContent.trim());
  d.querySelector('[data-act=help]').click(); await wait(200);
  const ic = d.querySelector('#modal.show .infocard');
  log('info: title', ic.querySelector('h3').textContent.replace(/\s+/g, ' '), '| sections', [...ic.querySelectorAll('h4')].map((h) => h.textContent).join(', '), '| quran.com', !!ic.querySelector('a[href="https://quran.com"]'), '| issues', !!ic.querySelector('a[href$="/issues"]'), '| how-to inside', !!ic.querySelector('.howto'));
  ic.querySelector('.cardx').click(); await wait(150);
  // How to play: the same cards as the Teacher's welcome, closable, ending with "Let's play!"
  ok('the Grown-up Corner says How to play', /How to play/.test(d.querySelector('[data-act=howto]').textContent));
  d.querySelector('[data-act=howto]').click(); await wait(200);
  const titles = [];
  for (let k = 0; k < 12 && !/Let’s play/.test(d.getElementById('modal').textContent); k++) { titles.push(d.querySelector('#modal.show .intro h3').textContent); d.querySelector('#modal [data-act=intro]:not(.introback)').click(); await wait(150); }
  titles.push(d.querySelector('#modal.show .intro h3').textContent);
  log('how to play cards:', titles.join(' | '));
  ok('How to play shows the welcome cards, without the walking stick', titles.length >= 8 && titles.some((t) => /Four steps/.test(t)) && titles.some((t) => /Listen and read/.test(t)) && titles.some((t) => /every day/.test(t)) && !titles.some((t) => /walking stick/.test(t)), titles.join(' | '));
  d.querySelector('#modal [data-act=intro]:not(.introback)').click(); await wait(150);
  log('closed', !d.querySelector('#modal.show'));
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  done();
})();
