/*
 * Little Hafiz Quest: family sync code
 * ====================================
 * Packs one explorer into a short code that travels inside a link (after the "#", which browsers never send
 * to a server) or a QR code, and unpacks it again on the other phone. No server, no account: the code is the
 * progress. Plain browser JavaScript, used by js/game.js through window.LHQ_SYNC.
 *
 * The code is a few hundred characters: everything is yes/no or small numbers, written bit by bit, then
 * compressed (deflate) and written in URL-safe base64. Treasures and stickers are a bitmap over the game's
 * list of things, sorted by id; a checksum of that list says whether both phones have the same list (they
 * do when both run the same version). If they don't, the things that come from stars are given again from
 * the stars, and only the rest waits until both phones are updated.
 *
 *   encode(profile, ctx) → Promise<string>        decode(code, ctx) → Promise<profile-like object>
 *   ctx = { surahs, items, stickers, looks, slots } (from js/game.js)
 */
(function () {
  'use strict';

  const FORMAT = 1;

  /* ---------- bits ---------- */
  function writer() {
    const bytes = [];
    let cur = 0,
      n = 0;
    const bit = (b) => {
      cur = (cur << 1) | (b ? 1 : 0);
      if (++n === 8) {
        bytes.push(cur);
        cur = 0;
        n = 0;
      }
    };
    const w = {
      bit,
      num(v, bits) {
        for (let i = bits - 1; i >= 0; i--) bit((v >> i) & 1);
      },
      // a whole number of any size: 7 bits at a time, with a "more" bit
      big(v) {
        v = Math.max(0, Math.floor(v));
        do {
          const part = v % 128;
          v = Math.floor(v / 128);
          bit(v > 0);
          w.num(part, 7);
        } while (v > 0);
      },
      text(s) {
        const u = new TextEncoder().encode(s || '');
        w.num(Math.min(u.length, 255), 8);
        u.slice(0, 255).forEach((b) => w.num(b, 8));
      },
      done() {
        if (n) bytes.push(cur << (8 - n));
        return new Uint8Array(bytes);
      },
    };
    return w;
  }
  function reader(bytes) {
    let pos = 0;
    const bit = () => {
      const by = bytes[pos >> 3];
      if (by == null) throw new Error('short');
      const b = (by >> (7 - (pos & 7))) & 1;
      pos++;
      return b;
    };
    const r = {
      bit,
      num(bits) {
        let v = 0;
        for (let i = 0; i < bits; i++) v = (v << 1) | bit();
        return v >>> 0;
      },
      big() {
        let v = 0,
          mul = 1,
          more;
        do {
          more = bit();
          v += r.num(7) * mul;
          mul *= 128;
        } while (more);
        return v;
      },
      text() {
        const len = r.num(8),
          u = new Uint8Array(len);
        for (let i = 0; i < len; i++) u[i] = r.num(8);
        return new TextDecoder().decode(u);
      },
    };
    return r;
  }

  /* ---------- compression (where the browser has it) and URL-safe base64 ---------- */
  const CAN_ZIP = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  async function pipe(bytes, stream) {
    const buf = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
    return new Uint8Array(buf);
  }
  const b64 = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => {
    const t = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(t, (c) => c.charCodeAt(0));
  };

  /* ---------- the game's list of things: items and stickers, sorted by id ---------- */
  function catalog(ctx) {
    const list = [...ctx.items.map((it) => 'i:' + it.id), ...ctx.stickers.map((x) => 's:' + x.id)].sort();
    let h = 0;
    list.forEach((k) => {
      for (let i = 0; i < k.length; i++) h = (Math.imul(h, 31) + k.charCodeAt(i)) | 0;
    });
    return { list, at: new Map(list.map((k, j) => [k, j])), sum: h & 0xffff };
  }

  async function encode(p, ctx) {
    const w = writer(),
      cat = catalog(ctx),
      L = ctx.looks;
    w.text(p.id);
    w.text(p.name);
    w.big(Math.round((p.touched || 0) / 1000));
    w.num(p.look.skin, 4);
    w.num(Math.max(0, L.hair.indexOf(p.look.hair)), 5);
    w.num(p.look.hairColor, 4);
    w.num(p.look.hijabColor, 4);
    w.num(p.look.kid === 'boy' ? 1 : p.look.kid === 'girl' ? 2 : 0, 2);
    // treasures and stickers
    w.num(cat.sum, 16);
    w.num(cat.list.length, 12);
    const own = new Set([...p.items.map((id) => 'i:' + id), ...p.stickers.map((id) => 's:' + id)]);
    cat.list.forEach((k) => w.bit(own.has(k)));
    const ref = (k) => (cat.at.has(k) ? cat.at.get(k) + 1 : 0);
    ctx.slots.forEach((sl) => w.num(p.outfit[sl] ? ref('i:' + p.outfit[sl]) : 0, 12));
    w.num(p.badge ? ref('s:' + p.badge) : 0, 12);
    // progress, checkpoint by checkpoint
    ctx.surahs.forEach((s) => {
      const r = p.prog[s.n];
      s.P.forEach((P0, q) => {
        const x = (r && r.parts[q]) || {};
        const size = P0.to - P0.from + 1;
        w.bit(x.learn);
        w.bit(x.words);
        w.num(x.path || 0, 2);
        w.bit(x.order);
        w.num(x.la || 0, size);
        w.num(x.wa || 0, size);
      });
      if (s.P.length > 1) {
        w.num((r && r.all) || 0, 2);
        w.bit(r && r.big);
      }
    });
    // lost things, broken hearts, worlds, the summit, checkpoint gifts, learning time
    const lost = (p.lost || []).filter((x) => cat.at.has('i:' + x.id)).slice(0, 63);
    w.num(lost.length, 6);
    lost.forEach((x) => {
      w.num(ref('i:' + x.id), 12);
      w.num(ctx.surahs.findIndex((s) => s.n === x.n), 6);
    });
    ctx.surahs.forEach((s) => w.bit((p.fix || []).includes(s.n)));
    for (let wi = 0; wi < 7; wi++) w.bit((p.wdone || []).includes(wi));
    ['once', 'three', 'all'].forEach((f) => w.bit((p.feats || []).includes(f)));
    ctx.surahs.forEach((s) => s.P.forEach((_, q) => w.bit((p.cpg || []).includes(s.n + ':' + q))));
    w.big(p.time || 0);
    ctx.surahs.forEach((s) => w.big((p.stime && p.stime[s.n]) || 0));
    const body = w.done();
    const zip = CAN_ZIP ? await pipe(body, new CompressionStream('deflate-raw')) : body;
    return b64(new Uint8Array([FORMAT, CAN_ZIP ? 1 : 0, ...zip]));
  }

  async function decode(code, ctx) {
    const raw = unb64(String(code).trim());
    if (raw[0] !== FORMAT) throw new Error('format');
    let body = raw.slice(2);
    if (raw[1] & 1) {
      if (!CAN_ZIP) throw new Error('nozip');
      body = await pipe(body, new DecompressionStream('deflate-raw'));
    }
    const r = reader(body),
      cat = catalog(ctx),
      L = ctx.looks;
    const p = { id: r.text(), name: r.text() };
    p.touched = r.big() * 1000;
    p.look = { skin: r.num(4), hair: L.hair[r.num(5)] || 'short', hairColor: r.num(4), hijabColor: r.num(4), kid: ['', 'boy', 'girl'][r.num(2)] || '' };
    const sum = r.num(16),
      count = r.num(12);
    const same = sum === cat.sum && count === cat.list.length; // the same list of things on both phones
    const owned = [];
    for (let j = 0; j < count; j++) if (r.bit()) owned.push(j);
    const key = (j) => (same && j > 0 ? cat.list[j - 1] : null);
    const ids = (pre) => (same ? owned.map((j) => cat.list[j]).filter((k) => k.startsWith(pre)).map((k) => k.slice(2)) : []);
    p.items = ids('i:');
    p.stickers = ids('s:');
    p.outfit = {};
    ctx.slots.forEach((sl) => {
      const k = key(r.num(12));
      if (k && k.startsWith('i:')) p.outfit[sl] = k.slice(2);
    });
    const bk = key(r.num(12));
    p.badge = bk && bk.startsWith('s:') ? bk.slice(2) : '';
    p.prog = {};
    ctx.surahs.forEach((s) => {
      const parts = s.P.map((P0) => {
        const size = P0.to - P0.from + 1;
        return { learn: r.bit(), words: r.bit(), path: r.num(2), order: r.bit(), next: 0, la: r.num(size), wa: r.num(size) };
      });
      const multi = s.P.length > 1;
      const all = multi ? r.num(2) : 0,
        big = multi ? r.bit() : 0;
      if (parts.some((x) => x.learn || x.words || x.path || x.order || x.la || x.wa) || all || big) p.prog[s.n] = { parts, all, big };
    });
    const lostN = r.num(6);
    p.lost = [];
    for (let j = 0; j < lostN; j++) {
      const k = key(r.num(12)),
        s = ctx.surahs[r.num(6)];
      if (k && s && k.startsWith('i:')) p.lost.push({ id: k.slice(2), n: s.n });
    }
    p.fix = ctx.surahs.filter(() => r.bit()).map((s) => s.n);
    p.wdone = [0, 1, 2, 3, 4, 5, 6].filter(() => r.bit());
    p.feats = ['once', 'three', 'all'].filter(() => r.bit());
    p.cpg = [];
    ctx.surahs.forEach((s) => s.P.forEach((_, q) => r.bit() && p.cpg.push(s.n + ':' + q)));
    p.time = r.big();
    p.stime = {};
    ctx.surahs.forEach((s) => {
      const t = r.big();
      if (t) p.stime[s.n] = t;
    });
    p.made = true;
    p.sameThings = same;
    return p;
  }

  window.LHQ_SYNC = { encode, decode, canZip: CAN_ZIP };
})();
