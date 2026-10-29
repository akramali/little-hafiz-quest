(async () => { try {
  const f = document.getElementById('f');
  const full = (n) => ({ parts: Array.from({ length: n }, () => ({ learn: 1, words: 1, order: 1, next: 0, path: 3, la: 127, wa: 127 })), all: n > 1 ? 3 : 0 });
  // phone A: Amina, with An-Nās to Al-Lahab done and a dressed-up outfit
  const A = { id: 'pamina1', name: 'Amina', look: { skin: 2, hair: 'ponytail', hairColor: 1, hijabColor: 0, kid: 'girl' }, outfit: { hat: 'explorer-cap' }, prog: { 114: full(1), 113: full(1), 112: full(1), 111: full(1) },
    items: ['explorer-cap', 'sunrise-shades', 'flower-stick'], stickers: ['moon', 'star'], pending: [], lost: [], made: true, at: 3, daily: '2099-01-01', time: 5000, stime: { 114: 900 }, touched: Date.now() };
  localStorage.setItem('lhq2', JSON.stringify({ v: 2, cur: A.id, profiles: [A], prefs: { theme: 'light', sfx: false } }));
  let g = await openGame();
  g.L.go('explorers'); await wait(200);
  log('explorers page sections:', [...g.d.querySelectorAll('.sheet h3')].map((h) => h.textContent).join(' | '));
  g.d.querySelector('[data-act=syncshare]').click();
  for (let t = 0; t < 30 && !g.L.st().link; t++) await wait(100);
  const link = g.L.st().link;
  log('link length', link.length, '| QR shown', !!g.d.querySelector('.qrsvg'), '| starts', link.slice(0, 60));
  // phone B: a different Amina (Al-Falaq only, older, plain outfit) and Yusuf
  const B1 = { id: 'pother9', name: 'Amina', look: { skin: 1, hair: 'short', hairColor: 0, hijabColor: 0, kid: 'girl' }, outfit: {}, prog: { 113: full(1), 110: full(1) }, items: ['basic-shirt'], stickers: ['cloud'], pending: [], lost: [], made: true, at: 0, daily: '2099-01-01', time: 7000, stime: { 110: 300 }, touched: Date.now() - 86400000 };
  const B2 = { id: 'pyusuf2', name: 'Yusuf', look: { skin: 3, hair: 'curly', hairColor: 0, hijabColor: 0, kid: 'boy' }, outfit: {}, prog: {}, items: [], stickers: [], pending: [], lost: [], made: true, at: 0, daily: '2099-01-01' };
  localStorage.setItem('lhq2', JSON.stringify({ v: 2, cur: B2.id, profiles: [B1, B2], prefs: { theme: 'light', sfx: false } }));
  f.src = '../?latest&phone=b#' + link.split('#')[1];
  await new Promise((r) => (f.onload = r)); await wait(1500);
  g = { w: f.contentWindow, d: f.contentWindow.document, L: f.contentWindow.__lhq };
  const card = g.d.querySelector('#modal.show .synccard');
  log('sync screen:', !!card, '|', card && card.querySelector('.syncwho b').textContent, '| picked:', card && [...card.querySelectorAll('.syncopt.on')].map((b) => b.textContent.trim()).join(), '| summary:', card && (card.querySelector('.syncsum') || {}).textContent, '| address bar code gone:', !g.w.location.hash);
  g.d.querySelector('[data-act=syncdo]').click(); await wait(500);
  const st = g.L.store(), amina = st.profiles.find((p) => p.name === 'Amina');
  log('after sync: explorers', st.profiles.length, '| Amina id', amina.id, '| sūrahs with progress', Object.keys(amina.prog).sort().join(','), '| outfit hat', amina.outfit.hat, '| look hair', amina.look.hair, '| items', amina.items.length, '| stickers', amina.stickers.join(','), '| time', amina.time, '| done:', g.d.getElementById('toast').textContent, '| sync card closed:', !g.d.querySelector('#modal.show'), '| view', g.L.st().view);
  ok('sync merges into the same explorer', st.profiles.length === 2 && amina.id === 'pamina1' && Object.keys(amina.prog).length === 5 && amina.time === 7000);
  // paste into a phone with no explorers
  localStorage.setItem('lhq2', JSON.stringify({ v: 2, cur: '', profiles: [], prefs: { theme: 'light', sfx: false } }));
  f.src = '../?latest&phone=c'; await new Promise((r) => (f.onload = r)); await wait(800);
  g = { w: f.contentWindow, d: f.contentWindow.document, L: f.contentWindow.__lhq };
  g.L.go('explorers'); await wait(200);
  g.d.querySelector('[data-act=syncpaste]').click(); await wait(150);
  g.d.getElementById('pastebox').value = 'Here is the link: ' + link + ' thanks';
  g.d.querySelector('[data-act=pastego]').click(); await wait(600);
  const c2 = g.d.querySelector('#modal.show .synccard');
  log('paste on an empty phone: sync screen', !!c2, '| summary', c2 && (c2.querySelector('.syncsum') || {}).textContent);
  g.d.querySelector('[data-act=syncdo]').click(); await wait(400);
  log('new explorer:', g.L.store().profiles.map((p) => `${p.name} ⭐${Object.keys(p.prog).length} sūrahs`).join(','));
  ok('pasting on an empty phone makes the explorer', g.L.store().profiles.length === 1);
  // a bad paste
  g.L.go('explorers'); await wait(150);
  g.d.querySelector('[data-act=syncpaste]').click(); await wait(100); g.d.getElementById('pastebox').value = 'hello'; g.d.querySelector('[data-act=pastego]').click(); await wait(200);
  log('bad paste toast:', g.d.getElementById('toast').textContent);
  ok('a bad paste is refused', /doesn't look like/.test(g.d.getElementById('toast').textContent));
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
