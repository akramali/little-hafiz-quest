// open several gifts in a row, every way, from different screens: the screen behind must never be blank
(async () => { try {
  fixture();
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  const prof = () => L.store().profiles[0];
  const setGifts = () => { prof().pending = [{ k: 'i', id: 'kufi' }, { k: 's', id: 'moon' }, { k: 'i', id: 'green-vest' }, { k: 's', id: 'stars100' }, { k: 'i', id: 'little-backpack' }]; prof().items = []; prof().stickers = []; };
  const state = (label) => {
    const app = d.getElementById('app'), m = d.getElementById('modal');
    const r = app.getBoundingClientRect();
    log(`${label}: view=${L.st().view} tab=${L.st().tab || ''} modal=${m.classList.contains('show')} appHeight=${Math.round(r.height)} text=${app.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)} | bodyClass=${d.body.className}`);
    ok(`${label}: page shows (not blank)`, r.height > 200 && !m.classList.contains('show') || m.classList.contains('show'), Math.round(r.height));
  };
  const ways = [['giftok'], ['wear'], ['stick'], ['backdrop']];
  for (const start of ['map', 'done', 'bag']) {
    for (const [way] of ways) {
      setGifts();
      if (start === 'map') { L.go('map'); await wait(700); }
      else if (start === 'done') L.go('done', { i: idx(113), p: 0, msg: 'Well done', stars: 1 });
      else L.go('bag', { tab: 'hat' });
      await wait(200);
      for (let n = 0; n < 8 && prof().pending.length; n++) {
        const op = d.querySelector('[data-act=opengift]');
        if (!op) break;
        op.click(); await wait(200); // one tap opens the gift
        const btn = way === 'giftok' ? d.querySelector('#modal [data-act=giftok]')
          : way === 'wear' ? (d.querySelector('#modal [data-act=wear]') || d.querySelector('#modal [data-act=stick]'))
          : way === 'stick' ? (d.querySelector('#modal [data-act=stick]') || d.querySelector('#modal [data-act=giftok]'))
          : null;
        if (btn) btn.click(); else d.getElementById('modal').click(); // tap outside the card
        await wait(400);
      }
      await wait(300);
      state(`${start} / ${way}`);
    }
  }
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
