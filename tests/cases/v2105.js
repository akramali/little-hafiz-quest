// v2.10.5: a progress file adds to what's on the phone (a merge, never taking anything away), every explorer at
// once; the file's name has the time too (a second save the same day is a new file)
(async () => {
  fixture();
  const s0 = JSON.parse(localStorage.getItem('lhq2'));
  s0.profiles.push(Object.assign(JSON.parse(JSON.stringify(s0.profiles[0])), { id: 'ptest2', name: 'Yusuf', items: ['kitten-buddy'] }));
  localStorage.setItem('lhq2', JSON.stringify(s0));
  const { w, d, L } = await openGame();
  const errs = watchErrors(w);
  const S = () => L.store(),
    toastTxt = () => d.getElementById('toast').textContent,
    stars = (p) => Object.values(p.prog).reduce((t, r) => t + r.parts.reduce((u, x) => u + (x.learn ? 1 : 0) + (x.words ? 1 : 0) + (x.path ? 1 : 0) + (x.order ? 1 : 0), 0), 0);
  // save: capture the file
  let blob = null, name = '';
  const oc = w.URL.createObjectURL, oclick = w.HTMLAnchorElement.prototype.click;
  w.URL.createObjectURL = (b) => ((blob = b), oc(b));
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) name = this.download; else oclick.call(this); };
  L.go('explorers'); await wait(200);
  d.querySelector('[data-act=savefile]').click(); await wait(200);
  const file1 = await blob.text();
  log('file name', name);
  ok('the file name has the date and the time', /^little-hafiz-quest-progress-\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d\.json$/.test(name), name);
  const load = async (text) => {
    d.getElementById('toast').textContent = '';
    const input = d.getElementById('loadfile'), dt = new w.DataTransfer();
    dt.items.add(new w.File([text], 'p.json', { type: 'application/json' }));
    input.files = dt.files; input.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(400);
  };
  // 1. the same file again: nothing to do
  await load(file1);
  ok('loading the file just saved: already up to date, no question', /up to date/i.test(toastTxt()) && !d.querySelector('#modal.show [data-act=cyes]'), toastTxt());
  // 2. a smaller, older file into a phone that has more: nothing taken away
  const small = JSON.parse(file1);
  small.store.profiles.forEach((p) => { p.prog = { 114: p.prog[114] }; p.items = []; p.touched = 1; });
  const before = JSON.stringify(S().profiles);
  await load(JSON.stringify(small));
  ok('a smaller, older file: up to date, nothing taken away', /up to date/i.test(toastTxt()) && JSON.stringify(S().profiles) === before, toastTxt());
  // 3. a phone with only Amina (less done) loads the family file: Yusuf comes in, Amina gets her stars back
  const amina = S().profiles[0], full = stars(amina);
  S().profiles.splice(1, 1); amina.prog = { 114: amina.prog[114] }; L.go('explorers'); await wait(100);
  await load(file1);
  const rows = [...d.querySelectorAll('#modal .syncopt')].map((r) => r.textContent.replace(/\s+/g, ' ').trim());
  log('load card:', rows.join(' | '));
  ok('the card lists every explorer in the file with what it brings', rows.length === 2 && /\+\d+ ⭐/.test(rows[0]) && /New explorer/.test(rows[1]), rows.join(' | '));
  d.querySelector('#modal [data-act=cyes]').click(); await wait(400);
  ok('…both explorers at once: Yusuf added, Amina merged', S().profiles.length === 2 && S().profiles[1].name === 'Yusuf' && S().profiles[1].items.includes('kitten-buddy') && stars(S().profiles[0]) === full, S().profiles.map((p) => p.name + ':' + stars(p)).join(' '));
  // 4. a new install (no explorers): exactly the file
  S().profiles.splice(0); S().cur = ''; L.go('explorers'); await wait(100);
  await load(file1);
  d.querySelector('#modal [data-act=cyes]').click(); await wait(400);
  const strip = (p) => JSON.stringify(Object.assign({}, p, { touched: 0, fresh: [], got: [], pending: [] }));
  const orig = JSON.parse(file1).store.profiles;
  ok('an empty phone gets the file exactly', S().profiles.length === 2 && S().profiles.every((p, i) => strip(p) === strip(orig[i])), S().profiles.map((p, i) => strip(p) === strip(orig[i])).join(','));
  // 5. a file from a newer version waits for the update
  const newer = JSON.parse(file1); newer.version = '9.0.0';
  await load(JSON.stringify(newer));
  ok('a newer version\'s file: update first', /newer version/.test(toastTxt()) && !d.querySelector('#modal.show [data-act=cyes]'), toastTxt());
  // 6. a .txt file (how Android shares it) loads the same way
  ok('the file picker takes .txt too (shared from Android)', /\.txt/.test(d.getElementById('loadfile').accept));
  ok('no game errors', errs.length === 0, errs.join(' | '));
  done();
})();
