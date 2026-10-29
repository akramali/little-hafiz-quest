(async () => { try {
  fixture({ time: 3725, stime: { 114: 900, 113: 600 }, stickers: ['stars100'], items: ['little-backpack'], outfit: { hat: 'red-explorer-cap' } });
  const { w, d, L, idx } = await openGame();
  const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
  L.go('bag', { tab: 'hat' }); await wait(200);
  d.querySelector('[data-act=show]').click(); await wait(300);
  log('view', L.st().view, 'achievements:', [...d.querySelectorAll('.ach')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
  // the share picture: capture what would be shared
  let shared = null;
  w.navigator.canShare = () => true; w.navigator.share = async (o) => { shared = o; };
  d.querySelector('[data-act=share]').click();
  for (let t = 0; t < 40 && !d.querySelector('[data-act=sharego]'); t++) await wait(250);
  log('share card: picture', !!d.querySelector('.shareimg'), 'buttons', [...d.querySelectorAll('.sharecard .btn')].map((b) => b.textContent.trim()).join(' | '));
  d.querySelector('[data-act=sharego]').click();
  for (let t = 0; t < 20 && !shared; t++) await wait(100);
  if (shared) await fetch('/__result/sharepng', { method: 'POST', body: shared.files[0] });
  log('shared file:', shared ? `${shared.files[0].name} ${shared.files[0].type} ${shared.files[0].size} bytes` : 'none');
  if (shared) { const img = new Image(); img.src = URL.createObjectURL(shared.files[0]); img.style.cssText = 'position:fixed;left:400px;top:0;width:540px;height:675px'; document.body.appendChild(img); await new Promise((r) => (img.onload = r)); log('img', img.naturalWidth, 'x', img.naturalHeight); }
  // time keeps counting while touched
  const t0 = L.store().profiles[0].time;
  for (let k = 0; k < 3; k++) { d.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true })); await wait(5100); }
  log('time grew by', Math.round(L.store().profiles[0].time - t0), 's in ~15s of use');
  ok('share picture made', !!shared); ok('learning time counts', L.store().profiles[0].time - t0 >= 10);
  ok('no game errors', !errs.length, errs.slice(0, 3).join('; ')); log('errors', errs);
  } catch (e) { ok('test ran without throwing', false, e.message), log('THREW', e.message, e.stack.split('\n')[1]); }
  done();
})();
