(async () => { try {
  const f = document.getElementById('f');
  fixture();
  const bump = (on) => fetch('/__result/' + (on ? 'bump' : 'unbump'), { method: 'POST', body: '1' });
  await bump(false);
  let g = await openGame(); await wait(2500);
  if (!g.w.navigator.serviceWorker.controller) { f.src = '../?latest&r=1'; await new Promise((r) => (f.onload = r)); await wait(2000); g = { w: f.contentWindow, d: f.contentWindow.document, L: f.contentWindow.__lhq }; }
  const keys = async () => (await g.w.caches.keys()).filter((k) => k.startsWith('lhq2-shell')).join(',');
  log('installed:', !!g.w.navigator.serviceWorker.controller, await keys(), '| chip:', g.d.querySelector('.verchip').textContent);
  // a new version is released
  await bump(true);
  g.d.querySelector('.verchip').click(); await wait(200);
  g.d.querySelector('#modal [data-act=updcheck]').click();
  for (let t = 0; t < 40; t++) { await wait(250); const reg = await g.w.navigator.serviceWorker.getRegistration(); if (reg && reg.waiting) break; }
  const reg = await g.w.navigator.serviceWorker.getRegistration();
  await wait(500);
  log('downloaded and waiting:', !!(reg && reg.waiting), '| still running old:', !!reg.active, await keys(), '| chip:', g.d.querySelector('.verchip').textContent, '| modal:', (g.d.querySelector('#modal .updbox .saveinfo') || {}).textContent);
  ok('a new version waits while the old one runs', !!(reg && reg.waiting) && /Update/.test(g.d.querySelector('.verchip').textContent));
  g.w.__mark = 1;
  g.d.querySelector('#modal [data-act=updnow]').click();
  for (let t = 0; t < 40 && f.contentWindow.__mark; t++) await wait(250);
  await wait(1500);
  g = { w: f.contentWindow, d: f.contentWindow.document, L: f.contentWindow.__lhq };
  const reg2 = await g.w.navigator.serviceWorker.getRegistration();
  log('after Update: page reloaded', !g.w.__mark, '| active sw serves', await keys(), '| waiting', !!(reg2 && reg2.waiting));
  ok('Update now switches to it', !g.w.__mark && !(reg2 && reg2.waiting));
  // the week rule: another update, first seen 8 days ago, applies itself on the start screen
  await bump(false);
  await reg2.update(); for (let t = 0; t < 40; t++) { await wait(250); if ((await g.w.navigator.serviceWorker.getRegistration()).waiting) break; }
  log('next update waiting:', !!(await g.w.navigator.serviceWorker.getRegistration()).waiting);
  g.w.localStorage.setItem('lhq_upd_seen', String(Date.now() - 8 * 86400000));
  g.w.__mark = 2;
  g.L.go('map'); await wait(300); // inside a lesson nothing happens; arriving at the map does it
  for (let t = 0; t < 40 && f.contentWindow.__mark; t++) await wait(250);
  await wait(1500);
  log('a week later, back at the map: reloaded', !f.contentWindow.__mark, '| serves', (await f.contentWindow.caches.keys()).filter((k) => k.startsWith('lhq2-shell')).join(','));
  ok('a week later it updates by itself', !f.contentWindow.__mark);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  await fetch('/__result/unbump', { method: 'POST', body: '1' });
  done();
})();
