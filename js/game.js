/*
 * Little Hafiz Quest: game logic (v2)
 * ===================================
 * A picture-and-gesture adventure that helps a young child memorize Juz ‘Amma (sūrahs 78–114)
 * with a grown-up who reads the Arabic. Plain browser JavaScript: no frameworks, no build step,
 * no network requests except the game's own files.
 *
 * How it is organized
 *   - Content comes from js/data.js (window.LHQ_DATA), art from js/art.js (window.LHQ_ART),
 *     the quest map from js/map.js (window.LHQ_MAP).
 *   - State `st` holds the current screen; V[st.view]() returns that screen's HTML; render() draws it.
 *   - All taps go through one delegated click handler that reads data-act="..." attributes.
 *   - Explorers (one per child) each keep their own stars, collection, outfit and lost items.
 *     Everything is saved on the device only (browser storage, with a cookie copy when it fits).
 *   - Recitation: one MP3 per sūrah per reciter in audio/<reciter>/, with āyah and word timings in
 *     audio/<reciter>/timings.json. The player seeks to an āyah (or a single word) and stops at its end.
 *   - Offline: sw.js caches the app; recitations are cached when played or saved from settings.
 *
 * The quest
 *   - Splash → Begin → the map (An-Nās at the bottom, An-Naba’ on the mountain top).
 *   - Inside a sūrah: the quest (1 Look & Repeat, 2 Word Steps), then the review games (Stepping Stones
 *     from the pictures, and a jigsaw Picture Puzzle). A long sūrah's whole-sūrah step has Stepping Stones
 *     and the Big Puzzle. The 📖 Read button opens the whole sūrah as a muṣḥaf page.
 *   - A sūrah is "memorized" when its Stepping Stones is done (the whole sūrah, for long ones).
 *     Gifts: a sūrah's first star gives its treasure, and every level finished for the first time
 *     brings a gift (see finish and giveLevelGift).
 *   - Review games (Stepping Stones, Picture Puzzle) use 3 hearts once a part has been
 *     learned. Losing all 3 drops the newest item at that sūrah; finishing a game there brings it back.
 *     Grown-ups can switch hearts off.
 *
 * Safety notes
 *   - HTML is built from the bundled data and art and from numbers/whitelisted values. The only free
 *     text is an explorer's name, which always goes through esc().
 *     Stored data is validated before use (cleanStore, cleanProfile).
 *   - No eval, no inline event handlers, no third-party scripts (see the CSP in index.html).
 */
(function () {
  'use strict';

  const VERSION = '2.6.8';
  const DATA = window.LHQ_DATA;
  if (!DATA || !Array.isArray(DATA.surahs)) throw new Error('Little Hafiz Quest: js/data.js did not load.');
  const ART = window.LHQ_ART;
  const MAP = window.LHQ_MAP;
  const SND = window.LHQ_SOUNDS;
  if (!ART || !MAP || !SND) throw new Error('Little Hafiz Quest: js/art.js, js/map.js or js/sounds.js did not load.');
  const S = DATA.surahs; // learning order: An-Nās (114) → An-Naba’ (78)
  const BYN = Object.create(null); // sūrah number -> sūrah (no inherited keys)
  S.forEach((s, i) => {
    s.idx = i;
    BYN[s.n] = s;
    s.P = s.parts.map(([a, b]) => ({ from: a - 1, to: b - 1 }));
  });
  const BISM = DATA.bismillah;
  const WORLDS = [
    { name: 'First Steps', from: 114, to: 109 },
    { name: 'Little Treasures', from: 108, to: 103 },
    { name: 'Shining Sands', from: 102, to: 97 },
    { name: 'Sun & Moon', from: 96, to: 91 },
    { name: 'Starry Path', from: 90, to: 86 },
    { name: 'Sky Kingdom', from: 85, to: 82 },
    { name: 'The Great Climb', from: 81, to: 78 },
  ];
  const worldOf = (s) => WORLDS.findIndex((w) => s.n <= w.from && s.n >= w.to);
  const WORLD_ICON = ['meadow-flower-pink', 'forest-pine', 'sands-palm', 'canyon-cactus', 'starry-moon', 'sky-balloon', 'peak-summit']; // props shown on the world rail
  const WCOL = ['#e74c3c', '#f39c12', '#d4a20b', '#27ae60', '#16a085', '#2e86de', '#8e44ad', '#e84393'];

  /* items and stickers come from the art library */
  const ITEMS = ART.ITEMS;
  const ITEM = Object.create(null);
  ITEMS.forEach((it) => (ITEM[it.id] = it));
  const SURAH_ITEM = Object.create(null); // sūrah number -> the item it gives (first star)
  const GOLD_ITEM = Object.create(null); // sūrah number -> its golden edition (every star)
  ITEMS.forEach((it) => {
    if (it.from) (it.gold ? GOLD_ITEM : SURAH_ITEM)[it.from] = it;
  });
  const starter = (it) => !it.from && !it.feat && !it.track && !it.drop && !it.wgold && !it.quest; // the comfy clothes everyone starts with
  const DROPS = ITEMS.filter((it) => it.drop); // everyday accessories that come as surprise gifts (art.js)
  const wornByDefault = (it) => starter(it) && ART.DEFAULTS[it.slot] === it.id; // the everyday glasses are owned, not worn
  const TRACK = ITEMS.filter((it) => it.track).sort((a, b) => a.track - b.track); // a prize every few stars
  const FEAT_ITEM = Object.create(null); // 'once' | 'three' | 'all' -> the summit reward
  ITEMS.forEach((it) => {
    if (it.feat) FEAT_ITEM[it.feat] = it;
  });
  const STICKER = Object.create(null);
  ART.STICKERS.forEach((x) => (STICKER[x.id] = x));
  ART.BADGES.forEach((x) => (STICKER[x.id] = x)); // star badges: one for every 100 stars, never given at random
  const SLOTS = ['hat', 'hijab', 'glasses', 'top', 'pants', 'shoes', 'cape', 'bag', 'stick', 'shield', 'watch', 'pet'];
  const SLOT_INFO = {
    hat: ['🧢', 'Hats'],
    hijab: ['🧕', 'Hijabs'],
    glasses: ['👓', 'Glasses'],
    top: ['👕', 'Tops'],
    pants: ['👖', 'Pants'],
    shoes: ['👟', 'Shoes'],
    cape: ['🦸', 'Capes'],
    bag: ['🎒', 'Bags'],
    stick: ['🪵', 'Sticks'], // shown as STICK_IC (a walking stick) in My Explorer
    shield: ['🛡️', 'Shields'],
    watch: ['⌚', 'Watches'],
    pet: ['🐾', 'Buddies'],
  };
  // the Sticks category: a walking stick (the 🪵 emoji is a log)
  const STICK_IC =
    '<span class="wtab-svg"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 21.5L17.5 4" stroke="#2b2340" stroke-width="5.4" stroke-linecap="round"/><path d="M6.5 21.5L17.5 4" stroke="#c98a4b" stroke-width="2.8" stroke-linecap="round"/><path d="M15.2 7.6Q19.6 4.4 22 6.6Q19 10.2 15.2 7.6Z" fill="#5fbf4a" stroke="#2b2340" stroke-width="1.3" stroke-linejoin="round"/></svg></span>';
  const TIER_LABEL = ['', 'A new treasure!', '✨ Shiny!', '🌟 Sparkly!', '👑 Legendary!'];

  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function rgba(h, a) {
    const c = hexRgb(h);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function shade(h, f) {
    const c = hexRgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
    return '#' + c.map((v) => (v < 16 ? '0' : '') + v.toString(16)).join('');
  }
  function mixHex(a, b, t) {
    const x = hexRgb(a),
      y = hexRgb(b);
    return '#' + x.map((v, j) => Math.round(v + (y[j] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  // how light a color is (0 black … 1 white), as the eye sees it
  function lumHex(h) {
    return hexRgb(h)
      .map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
      .reduce((t, v, j) => t + v * [0.2126, 0.7152, 0.0722][j], 0);
  }
  /* a sūrah's colors: --c and its tints, --cd a darker shade, --ct the color for text on a card (darker
     on light cards, lighter on dim ones, always readable), --con the text color on a --c background */
  function cv(h) {
    const ct = isNight() ? mixHex(h, '#ffffff', 0.45) : lumHex(h) > 0.3 ? shade(h, 0.55) : shade(h, 0.76);
    return (
      '--c:' + h + ';--c14:' + rgba(h, 0.14) + ';--c18:' + rgba(h, 0.18) + ';--c30:' + rgba(h, 0.3) + ';--c35:' + rgba(h, 0.35) + ';--cd:' + shade(h, 0.76) +
      ';--ct:' + ct + ';--con:' + (1.05 / (lumHex(h) + 0.05) >= (lumHex(h) + 0.05) / 0.073 ? '#ffffff' : '#2b2340') // whichever stands out more
    );
  }
  function wv(h) {
    return (
      '--wc:' + h + ';--wc10:' + rgba(h, 0.1) + ';--wc12:' + rgba(h, 0.12) + ';--wc22:' + rgba(h, 0.22) + ';--wc45:' + rgba(h, 0.45) + ';--wcd:' + shade(h, 0.9) + ';--wcdd:' + shade(h, 0.62)
    );
  }
  const esc = (t) =>
    String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* a real cog for the Grown-up Corner (8 teeth) */
  function gearPath() {
    let d = '';
    const R = 10.2,
      r = 7.6,
      n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        w = 0.21;
      const pts = [
        [r, a - 0.39 + w * 0.2],
        [R, a - w],
        [R, a + w],
        [r, a + 0.39 - w * 0.2],
      ];
      pts.forEach(([rad, ang], j) => {
        d += (i === 0 && j === 0 ? 'M' : 'L') + (12 + rad * Math.cos(ang)).toFixed(2) + ' ' + (12 + rad * Math.sin(ang)).toFixed(2);
      });
    }
    return d + 'Z';
  }
  const ICON = {
    back: '<svg class="i" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    moon: '<svg class="i" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#ffc83d" stroke="#e0a100"/></svg>',
    gear: `<svg class="i gear" viewBox="0 0 24 24"><path d="${gearPath()}" fill="#9aa5c4" stroke="#5d6788" stroke-width="1.6"/><circle cx="12" cy="12" r="3.1" fill="#fff" stroke="#5d6788" stroke-width="1.6"/></svg>`,
    home: '<svg class="i" viewBox="0 0 24 24"><path d="M4 11.5L12 5l8 6.5"/><path d="M6.5 10v8.5h11V10"/><path d="M10.2 18.5v-4.6h3.6v4.6"/></svg>',
    bag: '<svg class="i" viewBox="0 0 24 24"><path d="M6 9.5c0-3 2.5-5 6-5s6 2 6 5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18.5z" fill="#ffb347" stroke="#c46a00"/><path d="M9 20v-5h6v5" stroke="#c46a00"/><path d="M9.5 4.9C9.5 3.6 10.6 2.8 12 2.8s2.5.8 2.5 2.1" stroke="#c46a00"/></svg>',
    play: '<svg class="i" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    fsIn: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
    fsOut: '<svg class="i" viewBox="0 0 24 24"><path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>',
  };

  /* ================= saving: explorers + settings ================= */
  const STORE_KEY = 'lhq2';
  // per part: activities done, plus la / wa = which āyāt (bit k = k-th āyah of the part) were said in Look & Repeat / Word Steps
  const blank = () => ({ learn: 0, path: 0, order: 0, next: 0, words: 0, la: 0, wa: 0 });
  const DEFAULT_PREFS = {
    theme: 'auto',
    meaning: true,
    translit: false,
    sfx: true,
    audio: true,
    chain: 3, // Look & Repeat: chain after every 3 new āyāt (or every 1, 4, 5)
    chainSet: false, // chosen by a grown-up (v2.5.7: until then, the default of 3)
    stranger: true, // (test concept, v2.6.0) the Stranger's challenge on the map
    speed: 1, // recitation speed (v2.5.2; replaces "slower" and "repeat each āyah": the loop button repeats)
    reciter: 'alafasy',
    hearts: true,
    actions: false, // the "Do it" actions start off (v2.4.4); grown-ups can switch them on
    fullscreen: false,
    pzrtl: false, // Picture Puzzle from right to left
    wordmean: false, // the meaning of each word (Word Steps, the muṣḥaf)
  };
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2];
  const CHAINS = [1, 3, 4, 5]; // Look & Repeat: chain the āyāt after every new one, or every 3, 4 or 5
  const MAX_EXPLORERS = 10;
  let store = null;
  let prefs = Object.assign({}, DEFAULT_PREFS);

  // starter shirt and pants colors that the other explorers aren't wearing yet
  function starterColors(others) {
    const all = [];
    ART.TEES.forEach((_, tee) => ART.LEGS.forEach((__, legs) => all.push({ tee, legs })));
    const used = (c, k) => others.some((p) => p.look[k] === c[k]);
    // a new shirt and new pants if there are any left, else at least a new pair
    const best = all.filter((c) => !used(c, 'tee') && !used(c, 'legs'));
    const fresh = all.filter((c) => !others.some((p) => p.look.tee === c.tee && p.look.legs === c.legs));
    const pool = best.length ? best : fresh.length ? fresh : all;
    return pool[(Math.random() * pool.length) | 0];
  }
  function newProfile(name) {
    return {
      id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      name: name || '',
      look: { skin: 1, hair: 'short', hairColor: 0, hijabColor: 0, kid: '', tee: 0, legs: 0 },
      outfit: {},
      prog: {},
      items: [],
      stickers: [],
      pending: [],
      lost: [],
      got: [], // everything won, oldest first: 'i:<item id>' or 's:<sticker id>'
      badge: '', // the sticker stuck on the explorer's shirt
      wdone: [], // worlds already celebrated (a star in every sūrah)
      fresh: [], // wins not seen yet in My Explorer (a "new" dot): same keys as got
      stash: null, // the outfit put aside by the "comfy clothes" button, to swap back
      cpg: [], // checkpoints whose small gift was given ('<sūrah>:<part>')
      feats: [], // summit milestones reached: 'once', 'three', 'all'
      fix: [], // sūrahs where all the hearts ran out in a review game (a broken heart on the map until fixed)
      daily: '',
      at: 0,
      made: false,
      time: 0, // seconds spent learning (for grown-ups)
      stime: {}, // the same, per sūrah
      touched: 0, // when this explorer was last used (ms): the newer phone's look and outfit win in a sync
    };
  }
  const int = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
  /* Copy only known fields with valid values (never trust storage blindly). */
  function cleanProg(o) {
    const out = {};
    if (!o || typeof o !== 'object') return out;
    for (const n in o) {
      const s = BYN[n],
        v = o[n];
      if (!s || !v || typeof v !== 'object' || !Array.isArray(v.parts)) continue;
      out[s.n] = {
        parts: s.P.map((_, p) => {
          const x = v.parts[p] || {};
          return {
            learn: x.learn ? 1 : 0,
            words: x.words ? 1 : 0,
            order: x.order ? 1 : 0,
            next: x.next ? 1 : 0,
            path: int(x.path, 0, 3, 0),
            la: int(x.la, 0, 1023, 0),
            wa: int(x.wa, 0, 1023, 0),
          };
        }),
        all: int(v.all, 0, 3, 0),
        big: v.big ? 1 : 0, // the whole-sūrah Big Puzzle (no star; a gift the first time)
      };
    }
    return out;
  }
  // v2.2's Rainbow wings became the Hafiz crown in v2.3
  const RENAMED = { 'rainbow-wings': 'hafiz-crown' };
  function renameOld(o) {
    const ren = (id) => RENAMED[id] || id;
    const key = (k) => (typeof k === 'string' && k[0] === 'i' ? 'i:' + ren(k.slice(2)) : k);
    ['items'].forEach((f) => Array.isArray(o[f]) && (o[f] = o[f].map(ren)));
    ['got', 'fresh'].forEach((f) => Array.isArray(o[f]) && (o[f] = o[f].map(key)));
    if (Array.isArray(o.pending)) o.pending = o.pending.map((g) => (g && RENAMED[g.id] ? Object.assign({}, g, { id: RENAMED[g.id] }) : g));
    if (o.outfit && o.outfit.bag === 'rainbow-wings') {
      o.outfit = Object.assign({}, o.outfit);
      delete o.outfit.bag;
    }
  }
  function cleanProfile(o) {
    if (!o || typeof o !== 'object') return null;
    renameOld(o);
    const p = newProfile();
    if (typeof o.id === 'string' && /^[a-z0-9]{2,24}$/.test(o.id)) p.id = o.id;
    if (typeof o.name === 'string') p.name = o.name.slice(0, 16);
    const L = o.look || {};
    p.look = {
      skin: int(L.skin, 0, ART.LOOKS.skin.length - 1, 1),
      hair: ART.LOOKS.hair.includes(L.hair) ? L.hair : 'short',
      hairColor: int(L.hairColor, 0, ART.LOOKS.hairColor.length - 1, 0),
      hijabColor: int(L.hijabColor, 0, ART.LOOKS.hijabColor.length - 1, 0),
      kid: ART.LOOKS.kid.includes(L.kid) ? L.kid : '', // '' = not chosen yet (a girl's hair style counts as girl)
      tee: int(L.tee, 0, ART.TEES.length - 1, 0), // starter shirt and pants colors (v2.5.3)
      legs: int(L.legs, 0, ART.LEGS.length - 1, 0),
    };
    if (p.look.kid && !ART.LOOKS.hairFor[p.look.kid].includes(p.look.hair)) p.look.hair = ART.LOOKS.hairFor[p.look.kid][0]; // boys and girls have their own styles
    p.prog = cleanProg(o.prog);
    const uniq = (a) => [...new Set(a)];
    p.items = uniq((Array.isArray(o.items) ? o.items : []).filter((id) => ITEM[id] && !starter(ITEM[id])));
    p.stickers = uniq((Array.isArray(o.stickers) ? o.stickers : []).filter((id) => STICKER[id]));
    p.pending = (Array.isArray(o.pending) ? o.pending : [])
      .filter((g) => g && ((g.k === 'i' && ITEM[g.id] && !p.items.includes(g.id)) || (g.k === 's' && STICKER[g.id])))
      .map((g) => (g.m ? { k: g.k, id: g.id, m: 1 } : { k: g.k, id: g.id }))
      .slice(0, 60);
    p.lost = (Array.isArray(o.lost) ? o.lost : [])
      .filter((x) => x && ITEM[x.id] && BYN[x.n] && p.items.includes(x.id))
      .map((x) => ({ id: x.id, n: x.n }));
    const lostIds = p.lost.map((x) => x.id);
    const out = {};
    if (o.outfit && typeof o.outfit === 'object')
      SLOTS.forEach((sl) => {
        const id = o.outfit[sl];
        if (ITEM[id] && ITEM[id].slot === sl && (p.items.includes(id) || starter(ITEM[id])) && !lostIds.includes(id)) out[sl] = id;
      });
    p.outfit = out;
    const owned = [...p.items.map((id) => 'i:' + id), ...p.stickers.map((id) => 's:' + id)];
    const got = uniq((Array.isArray(o.got) ? o.got : []).filter((k) => owned.includes(k)));
    p.got = [...owned.filter((k) => !got.includes(k)), ...got]; // older saves: what they already had comes first
    if (typeof o.badge === 'string' && p.stickers.includes(o.badge)) p.badge = o.badge;
    p.fresh = uniq((Array.isArray(o.fresh) ? o.fresh : []).filter((k) => owned.includes(k)));
    const st0 = o.stash && typeof o.stash === 'object' ? o.stash : null;
    if (st0) {
      p.stash = { outfit: {}, badge: typeof st0.badge === 'string' && p.stickers.includes(st0.badge) ? st0.badge : '' };
      SLOTS.forEach((sl) => {
        const id = st0.outfit && st0.outfit[sl];
        if (ITEM[id] && ITEM[id].slot === sl && p.items.includes(id)) p.stash.outfit[sl] = id;
      });
    }
    p.cpg = uniq((Array.isArray(o.cpg) ? o.cpg : []).filter((k) => typeof k === 'string' && /^\d{2,3}:\d$/.test(k))).slice(0, 200);
    p.feats = uniq((Array.isArray(o.feats) ? o.feats : []).filter((k) => FEAT_ITEM[k]));
    p.fix = uniq((Array.isArray(o.fix) ? o.fix : []).filter((n) => BYN[n]));
    // (test concept, v2.6.0) the Stranger: where he took things, whether he comes back, stickers he holds
    // sūrahs where he took things (he comes back for a rematch once they're won back), and those ready now
    const nums = (v) => uniq((Array.isArray(v) ? v : BYN[v] ? [v] : []).map(Number).filter((n) => BYN[n]));
    p.rematch = nums(o.rematch);
    p.rematchReady = Array.isArray(o.rematchReady) ? nums(o.rematchReady) : o.rematchReady === true ? p.rematch.slice() : [];
    p.lostSt = (Array.isArray(o.lostSt) ? o.lostSt : []).filter((x) => x && STICKER[x.id] && BYN[x.n]).map((x) => ({ id: x.id, n: x.n }));
    p.strangerAt = typeof o.strangerAt === 'number' && isFinite(o.strangerAt) ? o.strangerAt : 0;
    p.wdone = Array.isArray(o.wdone)
      ? uniq(o.wdone.filter((w) => Number.isInteger(w) && w >= 0 && w < WORLDS.length))
      : WORLDS.map((_, wi) => wi).filter((wi) => worldDone(wi, p)); // no party for worlds finished before v2.1
    if (typeof o.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.daily)) p.daily = o.daily;
    p.at = int(o.at, 0, S.length - 1, 0);
    p.made = !!o.made;
    const secs = (v) => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.min(Math.round(v), 1e8) : 0);
    p.time = secs(o.time);
    p.touched = typeof o.touched === 'number' && isFinite(o.touched) && o.touched > 0 ? Math.round(o.touched) : 0;
    if (o.stime && typeof o.stime === 'object') for (const n in o.stime) if (BYN[n] && secs(o.stime[n])) p.stime[BYN[n].n] = secs(o.stime[n]);
    return p;
  }
  function cleanPrefs(o) {
    const out = Object.assign({}, DEFAULT_PREFS);
    if (!o || typeof o !== 'object') return out;
    ['meaning', 'translit', 'sfx', 'audio', 'hearts', 'actions', 'fullscreen', 'pzrtl', 'wordmean', 'stranger'].forEach((k) => {
      if (typeof o[k] === 'boolean') out[k] = o[k];
    });
    if (['auto', 'light', 'dim'].includes(o.theme)) out.theme = o.theme;
    if (SPEEDS.includes(o.speed)) out.speed = o.speed;
    if (o.chainSet === true && CHAINS.includes(o.chain)) Object.assign(out, { chain: o.chain, chainSet: true });
    else if (o.slow === true) out.speed = 0.75; // "slower recitation" (80%) before v2.5.2
    if (typeof o.reciter === 'string' && /^[a-z0-9-]{2,32}$/.test(o.reciter)) out.reciter = o.reciter;
    return out;
  }
  function cleanStore(o) {
    // there may be no explorers at all (a new device, or every one removed): Begin then makes one
    const raw = o && Array.isArray(o.profiles) ? o.profiles : [];
    const profiles = raw.map(cleanProfile).filter(Boolean).slice(0, MAX_EXPLORERS);
    // explorers from before v2.5.3 all wore the same comfy clothes: give each their own starter colors
    profiles.forEach((p, i) => {
      const was = raw.find((r) => r && r.id === p.id);
      if (i && was && was.look && was.look.tee == null) Object.assign(p.look, starterColors(profiles.slice(0, i)));
    });
    const cur = profiles.some((p) => p.id === o.cur) ? o.cur : profiles.length ? profiles[0].id : '';
    return { v: 2, cur, profiles, prefs: cleanPrefs(o && o.prefs) };
  }

  // Cookies are scoped to this app's folder (GitHub Pages serves many projects from one domain).
  const COOKIE_PATH = location.pathname.replace(/[^/]*$/, '').replace(/[^A-Za-z0-9/_.~%-]/g, '') || '/';
  const COOKIE_SECURE = location.protocol === 'https:' ? '; Secure' : '';
  function setCookie(k, v, maxAge) {
    try {
      document.cookie = `${k}=${v}; max-age=${maxAge == null ? 60 * 60 * 24 * 400 : maxAge}; path=${COOKIE_PATH}; SameSite=Lax${COOKIE_SECURE}`;
    } catch (e) {}
  }
  function getCookie(k) {
    try {
      const m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)'));
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }
  function save(keepTouched) {
    store.prefs = prefs;
    const cur = store.profiles.find((p) => p.id === store.cur);
    if (cur && cur.made && !keepTouched) cur.touched = Date.now();
    const json = JSON.stringify(store);
    try {
      localStorage.setItem(STORE_KEY, json);
    } catch (e) {}
    const c = encodeURIComponent(json);
    if (c.length < 3900) setCookie(STORE_KEY, c);
    else setCookie(STORE_KEY, '', 0);
  }

  /* v1 progress (single string) — read once to move it into the first explorer */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function decProgV1(str) {
    const out = {};
    if (!str) return out;
    if (str[0] === '{') {
      try {
        const o = JSON.parse(str);
        for (const n in o) {
          const s = BYN[n],
            v = o[n];
          if (!s || !v || typeof v !== 'object') continue;
          const r = { parts: s.P.map(blank), all: 0 };
          Object.assign(r.parts[0], {
            learn: v.learn ? 1 : 0,
            path: Math.min(3, Math.max(0, Number(v.path) | 0)),
            order: v.order ? 1 : 0,
            next: v.next ? 1 : 0,
          });
          out[n] = r;
        }
      } catch (e) {}
      return out;
    }
    if (!str.startsWith('1~')) return out;
    str
      .slice(2)
      .split('.')
      .forEach((seg, i) => {
        const s = S[i];
        if (!s || !seg) return;
        const r = { parts: s.P.map(blank), all: 0 };
        s.P.forEach((_, p) => {
          const c = Math.max(0, B64.indexOf(seg[p] || 'A'));
          r.parts[p] = { learn: c & 1, order: (c >> 1) & 1, next: (c >> 2) & 1, words: (c >> 3) & 1, path: (c >> 4) & 3 };
        });
        if (s.P.length > 1) r.all = Math.min(3, Math.max(0, B64.indexOf(seg[s.P.length] || 'A')));
        out[s.n] = r;
      });
    return out;
  }
  function loadAll() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch (e) {}
    if (raw == null) {
      const c = getCookie(STORE_KEY);
      if (c) {
        try {
          raw = decodeURIComponent(c);
        } catch (e) {}
      }
    }
    let o = null;
    try {
      o = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    if (o) {
      store = cleanStore(o);
    } else {
      // first visit to v2: bring v1 stars and settings along
      let p1 = getCookie('lhq_prog'),
        f1 = getCookie('lhq_prefs');
      try {
        if (p1 == null) p1 = localStorage.getItem('lhq_prog');
        if (f1 == null) f1 = localStorage.getItem('lhq_prefs');
      } catch (e) {}
      // v1 stars become the first explorer; with nothing from v1 there is no explorer yet
      const first = newProfile();
      first.prog = cleanProg(decProgV1(p1));
      let oldPrefs = null;
      try {
        if (f1) oldPrefs = JSON.parse(f1[0] === '{' ? f1 : decodeURIComponent(f1));
      } catch (e) {}
      const hadV1 = Object.keys(first.prog).length > 0;
      store = { v: 2, cur: hadV1 ? first.id : '', profiles: hadV1 ? [first] : [], prefs: cleanPrefs(oldPrefs) };
    }
    // The classic version (v1, retired in v2.5.0) kept its stars apart; fold them into the first explorer
    // once, so a family that went back to it loses nothing (the best of both is kept).
    try {
      const v1 = localStorage.getItem('lhq_prog');
      if (v1 && !localStorage.getItem('lhq_v1folded') && store.profiles.length) {
        const prog = cleanProg(decProgV1(v1));
        for (const n in prog) mergeProg(store.profiles[0], n, prog[n]);
      }
      if (v1) localStorage.setItem('lhq_v1folded', '1');
    } catch (e) {}
    // treasures follow the stars: one star wins a sūrah's treasure, every star its golden edition, and the
    // star track gives a prize every few stars
    store.profiles.forEach((prof) => {
      S.forEach((s) => giveSurahGift(s, prof));
      giveTrackPrizes(prof);
      giveStarBadges(prof);
      giveWorldRides(prof);
    });
    prefs = store.prefs;
  }
  /* the best of two records of a sūrah's progress (used by family sync and the classic version's stars) */
  function mergeProg(into, n, from) {
    const s = BYN[n];
    if (!s || !from) return;
    const r = rec(s.n, into);
    s.P.forEach((_, q) => {
      const a = r.parts[q] || (r.parts[q] = blank()),
        b = from.parts[q];
      if (!b) return;
      ['learn', 'words', 'order', 'next'].forEach((k) => (a[k] = a[k] || b[k] ? 1 : 0));
      a.path = Math.max(a.path || 0, b.path || 0);
      a.la = (a.la | b.la) & 1023;
      a.wa = (a.wa | b.wa) & 1023;
    });
    r.all = Math.max(r.all || 0, from.all || 0);
    if (from.big) r.big = 1;
  }
  // The current explorer. With no explorers yet, a blank stand-in (never saved) keeps every screen working.
  let nobody = null;
  const P = () => store.profiles.find((p) => p.id === store.cur) || store.profiles[0] || nobody || (nobody = newProfile());
  const noExplorers = () => !store.profiles.length;

  function rec(n, prof) {
    const s = BYN[n],
      pr = (prof || P()).prog;
    return pr[n] || (pr[n] = { parts: s.P.map(blank), all: 0 });
  }
  function partRec(n, p) {
    const r = rec(n);
    return r.parts[p] || (r.parts[p] = blank());
  }
  /* Since v2.4.3 each checkpoint has 4 stars (Look & Repeat, Word Steps, Stepping Stones, Picture Puzzle) and
     a long sūrah one more for its whole-sūrah Stepping Stones. Saves from before keep counting: Stepping
     Stones at any of the old levels is done, and the old What Comes Next no longer counts. */
  const partStars = (x) => (x ? (x.learn ? 1 : 0) + (x.words ? 1 : 0) + (x.path ? 1 : 0) + (x.order ? 1 : 0) : 0);
  function surahStars(s, prof) {
    const r = (prof || P()).prog[s.n];
    return r ? r.parts.reduce((t, x) => t + partStars(x), 0) + (r.all ? 1 : 0) : 0;
  }
  const surahMax = (s) => s.P.length * 4 + (s.P.length > 1 ? 1 : 0);
  // memorized: the sūrah's Stepping Stones done (the whole sūrah, for one with checkpoints)
  function surahDone(s, prof) {
    const r = (prof || P()).prog[s.n];
    if (!r) return false;
    return s.P.length > 1 ? !!r.all : !!(r.parts[0] && r.parts[0].path);
  }
  function starRow(k, max) {
    let o = '';
    for (let i = 0; i < max; i++) o += i < k ? '⭐' : '☆';
    return o;
  }
  const totalStars = (prof) => S.reduce((t, s) => t + surahStars(s, prof), 0);
  const MAX_STARS = S.reduce((t, s) => t + surahMax(s), 0);
  /* A world is complete when every sūrah in it has at least one star. Each one gives an extra heart, up to 5. */
  const worldSurahs = (wi) => S.filter((s) => worldOf(s) === wi);
  function worldDone(wi, prof) {
    return worldSurahs(wi).every((s) => surahStars(s, prof) > 0);
  }
  const maxHearts = (prof) => Math.min(5, 3 + WORLDS.filter((_, wi) => worldDone(wi, prof)).length);
  /* The summit milestones for the whole Juz: a star in every sūrah, three in every sūrah, every star */
  const FEAT_TEST = {
    once: (prof) => S.every((s) => surahStars(s, prof) > 0),
    three: (prof) => S.every((s) => surahStars(s, prof) >= Math.min(3, surahMax(s))),
    all: (prof) => S.every((s) => surahStars(s, prof) >= surahMax(s)),
  };
  const FEAT_HINT = { once: 'A star in every sūrah', three: '3 stars in every sūrah', all: 'Every star in the Juz' };
  const FEAT_WHY = {
    once: 'For reaching the summit: a star in every sūrah! Every sticker is yours too.',
    three: 'For three stars in every sūrah. A crown for a true little hafiz!',
    all: 'For every single star in Juz ‘Amma. One of a kind, just like you!',
  };

  /* ================= gifts, collection, lost items ================= */
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  /* A sūrah's treasure comes with its first star; its golden edition (a special reward) with every star.
     Returns what was newly given: '', 'item', 'gold' or 'both'. */
  function giveSurahGift(s, prof) {
    prof = prof || P();
    let given = '';
    const give = (it) => {
      if (!it || prof.items.includes(it.id) || prof.pending.some((g) => g.id === it.id)) return false;
      prof.pending.push({ k: 'i', id: it.id });
      return true;
    };
    const got = surahStars(s, prof);
    if (got > 0 && give(SURAH_ITEM[s.n])) given = 'item';
    if (got >= surahMax(s) && give(GOLD_ITEM[s.n])) given = given ? 'both' : 'gold';
    return given;
  }
  function giveDailyGift() {
    const prof = P();
    if (prof.daily === today()) return false;
    prof.daily = today();
    return giveSurprise(prof);
  }
  /* A surprise gift: a sticker not collected yet, or an everyday accessory not won yet (a stick, a bag, a
     hat…), picked at random, so there is often something new to wear. The sūrah and milestone treasures
     stay the special ones. Returns false when every sticker and accessory is already collected. */
  function giveSurprise(prof, small) {
    const waiting = (k) => prof.pending.filter((g) => g.k === k).map((g) => g.id);
    const haveS = new Set([...prof.stickers, ...waiting('s')]);
    const stickers = ART.STICKERS.filter((x) => !haveS.has(x.id));
    const things = DROPS.filter((it) => forKid(it, prof) && !hasOrWaits(it, prof));
    if (!stickers.length && !things.length) return false;
    const pick = (list) => list[(Math.random() * list.length) | 0];
    if (things.length && (!stickers.length || Math.random() < 0.6)) prof.pending.push({ k: 'i', id: pick(things).id });
    else prof.pending.push(small ? { k: 's', id: pick(stickers).id, m: 1 } : { k: 's', id: pick(stickers).id });
    return true;
  }
  const isLost = (id, prof) => (prof || P()).lost.some((x) => x.id === id);
  const lostAt = (n) => P().lost.filter((x) => x.n === n);
  /* Some things are for boys only (kufis) or girls only (hijabs); the hijab hair style is for girls too. */
  const kidOf = (prof) => (ART.isGirl((prof || P()).look) ? 'girl' : 'boy');
  const forKid = (it, prof) => !it.for || it.for === kidOf(prof);
  function wornOutfit(prof) {
    prof = prof || P();
    const o = {};
    SLOTS.forEach((sl) => {
      const id = prof.outfit[sl];
      if (id && !isLost(id, prof) && ITEM[id] && forKid(ITEM[id], prof)) o[sl] = id;
    });
    return o;
  }
  /* The explorer as they look now: their outfit, the sticker on their shirt, and a sad, scruffy face
     while something they own is lost somewhere on the map. */
  function explorer(opts, prof) {
    prof = prof || P();
    opts = Object.assign({ view: 'front' }, opts);
    if (opts.mood == null) opts.mood = prof.lost.length || (prof.lostSt || []).length ? 'sad' : '';
    return ART.explorer(prof.look, Object.assign(wornOutfit(prof), { sticker: prof.badge }), opts);
  }
  function gotIt(prof, key) {
    prof.got = prof.got.filter((k) => k !== key);
    prof.got.push(key);
    if (!prof.fresh.includes(key)) prof.fresh.push(key); // "new" until seen in My Explorer
  }
  const NEWDOT = '<i class="newdot" aria-label="new"></i>';
  // items drawn and named for this explorer (a girl's crowns are tiaras)
  const itemPic = (id) => ART.item(id, P().look);
  const itemName = (id) => (ART.isGirl(P().look) && ITEM[id].girl) || ITEM[id].name;

  /* ================= theme ================= */
  const darkMQ = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const isNight = () => prefs.theme === 'dim' || (prefs.theme === 'auto' && !!(darkMQ && darkMQ.matches));
  function applyTheme() {
    document.documentElement.setAttribute('data-mode', prefs.theme);
  }

  /* ================= sounds: soft nature sounds (js/sounds.js), quieter while the reciter plays ================= */
  const sfx = {};
  SND.names.forEach((n) => (sfx[n] = () => SND.play(n)));
  SND.setup({ on: () => prefs.sfx, quiet: () => !player.paused });

  /* ================= reciters & recitation player ================= */
  const FALLBACK_RECITERS = [{ id: 'alafasy', name: 'Mishary Rashid Alafasy', note: 'Clear and melodic', mb: 0 }];
  let RECITERS = FALLBACK_RECITERS;
  const TIM = Object.create(null); // reciter -> { "<sūrah>": [[start, end, [[ws, we], ...]], ...] }
  const timLoad = Object.create(null);
  function reciter() {
    return RECITERS.find((r) => r.id === prefs.reciter) || RECITERS[0];
  }
  function loadReciters() {
    return fetch('audio/reciters.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length)
          RECITERS = list
            .filter((r) => r && typeof r.id === 'string' && /^[a-z0-9-]{2,32}$/.test(r.id))
            .map((r) => ({ id: r.id, name: String(r.name || r.id), note: String(r.note || ''), mb: +r.mb || 0 }));
        if (!RECITERS.some((r) => r.id === prefs.reciter)) prefs.reciter = RECITERS[0].id;
        if (st.view === 'settings') render();
      })
      .catch(() => {});
  }
  function loadTimings(id) {
    if (TIM[id]) return Promise.resolve(TIM[id]);
    if (!timLoad[id])
      timLoad[id] = fetch(`audio/${id}/timings.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no timings'))))
        .then((j) => (TIM[id] = j && j.surahs ? j.surahs : {}))
        .catch((e) => {
          delete timLoad[id];
          throw e;
        });
    return timLoad[id];
  }
  const player = new Audio();
  player.preload = 'auto';
  let queue = [],
    playing = false,
    fabKey = '',
    playRec = 'alafasy'; // the reciter of what is playing now
  const pad = (n) => String(n).padStart(3, '0');
  /* The loop button (Look & Repeat, the muṣḥaf): Listen plays 1, 3, 10 or 99 times (until Stop). */
  const LOOPS = [1, 3, 10, 99];
  let loopN = 1,
    loopRun = null; // while looping: { total, per, played } (per = segments in one pass)
  /* items: [sūrah, āyah (1-based)] or [sūrah, āyah, word index] for a single word.
     opts: once (ignore the repeat setting), loop (play the whole list that many times), reciter. */
  function playList(items, opts) {
    opts = opts || {};
    if (!prefs.audio) {
      toast('The reciter is switched off in the Grown-up Corner');
      return;
    }
    unlockAudio();
    const id = opts.reciter || reciter().id;
    playRec = id;
    queue = [];
    if (opts.loop) {
      for (let r = 0; r < opts.loop; r++) queue.push(...items);
      loopRun = { total: opts.loop, per: items.length, played: 0, items };
    } else {
      loopRun = null;
      queue.push(...items);
    }
    playing = true;
    keepAwake(true);
    const tok = ++playTok;
    updateFab();
    loadTimings(id)
      .catch(() => {
        throw new Error(navigator.onLine === false ? 'This reciter is not saved for offline use yet.' : 'The recitation could not load. Try again in a moment.');
      })
      .then(() => prepFile(id, items[0][0], tok))
      .then((url) => {
        if (!playing || tok !== playTok) return;
        fileSrc = url;
        playNext();
      })
      .catch((e) => {
        if (tok !== playTok) return;
        stopAudio();
        if (e && e.message !== 'cancel') toast(e.message || 'The recitation could not play. Try again in a moment.');
      });
  }
  let playTok = 0;

  /* Recitation files are downloaded whole and kept on the device before they first play, then play from
     memory. Streaming a long sūrah and jumping deep into it on a slow connection is what failed on some
     phones; a whole file always plays. Small files come down quietly; a long sūrah asks first. */
  const BIG_FILE = 700 * 1024;
  const FETCH_OK = /^https?:$/.test(location.protocol);
  const audioHref = (id, n) => new URL(`audio/${id}/${pad(n)}.mp3`, location.href).href;
  let fileKey = '',
    fileSrc = '',
    blobUrl = '',
    dlPct = null; // download progress shown on the Listen button
  async function storedAudio(href) {
    if (!OFFLINE_OK) return null;
    try {
      const hit = await (await caches.open(AUDIO_CACHE)).match(href);
      return hit ? await hit.blob() : null;
    } catch (e) {
      return null;
    }
  }
  async function prepFile(id, n, tok) {
    const key = id + '/' + n;
    if (key === fileKey) return blobUrl;
    const href = audioHref(id, n);
    if (!FETCH_OK) return href; // opened from a file: play it straight from there
    let blob = await storedAudio(href);
    if (!blob) blob = await downloadAudio(id, n, href, tok);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(new Blob([blob], { type: 'audio/mpeg' }));
    fileKey = key;
    return blobUrl;
  }
  async function downloadAudio(id, n, href, tok) {
    const offlineMsg = 'This recitation is not saved for offline use yet. Connect to the internet once to hear it.';
    let size = 0;
    try {
      const h = await fetch(href, { method: 'HEAD', cache: 'no-cache' });
      if (!h.ok) throw new Error();
      size = +h.headers.get('content-length') || 0;
    } catch (e) {
      throw new Error(navigator.onLine === false ? offlineMsg : 'The recitation could not load. Try again in a moment.');
    }
    const big = size > BIG_FILE;
    if (big && !(await askDownload(id, n, size))) throw new Error('cancel');
    if (tok !== playTok) throw new Error('cancel');
    let res;
    try {
      res = await fetch(href, { cache: 'no-cache' });
      if (!res.ok || res.status !== 200) throw new Error();
    } catch (e) {
      throw new Error(navigator.onLine === false ? offlineMsg : 'The recitation could not load. Try again in a moment.');
    }
    const total = size || +res.headers.get('content-length') || 0;
    const chunks = [];
    let got = 0;
    const show = (pct) => {
      dlPct = pct;
      const bar = document.getElementById('dlbar');
      if (bar) bar.style.width = pct + '%';
      updateFab();
    };
    show(0);
    try {
      if (res.body && res.body.getReader) {
        const rd = res.body.getReader();
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          chunks.push(value);
          got += value.length;
          if (total) show(Math.min(99, Math.round((got / total) * 100)));
        }
      } else chunks.push(await res.arrayBuffer());
    } catch (e) {
      throw new Error('The download stopped. Check the internet connection and try again.');
    } finally {
      dlPct = null;
      if (big) closeModal('.dlcard');
      updateFab();
    }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    if (OFFLINE_OK)
      caches
        .open(AUDIO_CACHE)
        .then((c) => c.put(href, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } })))
        .then(() => (offline.saved = null))
        .catch(() => {});
    return blob;
  }
  /* a long sūrah not saved yet: ask before downloading it (resolves true to download) */
  let dlAnswer = null;
  function askDownload(id, n, size) {
    const s = BYN[n],
      mb = (size / 1048576).toFixed(1);
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card dlcard"><div class="dlico">⬇️</div><h3>${s ? s.name : 'This sūrah'} needs downloading first</h3>
      <p class="saveinfo">It's a long sūrah (${mb} MB). It downloads once and is then saved on this device, so it plays even without internet.</p>
      <div class="dlprog"><i id="dlbar"></i></div>
      <div class="row"><button class="btn wide" data-act="dlno">Not now</button><button class="btn go wide" data-act="dlyes">Download</button></div></div>`;
    m.classList.add('show');
    return new Promise((res) => (dlAnswer = res));
  }
  function closeModal(sel) {
    const m = document.getElementById('modal');
    if (!sel || m.querySelector(sel)) hideModal();
  }
  /* Phones only let a page start sound straight after a tap. Playing a moment of silence on the tap keeps
     the player allowed to start the recitation once its file is ready, even after a download. */
  let unlocked = false;
  function unlockAudio() {
    if (unlocked || !FETCH_OK) return;
    unlocked = true;
    try {
      player.src = 'audio/silence.mp3';
      const pr = player.play();
      if (pr && pr.catch) pr.catch((e) => e && e.name === 'NotAllowedError' && (unlocked = false));
    } catch (e) {
      unlocked = false;
    }
  }
  let segTimer = null,
    curSeg = null,
    advTok = 0;
  /* Play the next queued āyah or word: seek inside its sūrah file and stop at its end. */
  function playNext() {
    const it = queue.shift();
    if (!it) {
      stopAudio();
      return;
    }
    try {
      const id = playRec,
        T = TIM[id] && TIM[id][it[0]];
      const ay = T && T[it[1] - 1];
      if (!ay) {
        stopAudio();
        return;
      }
      let seg;
      if (it.length > 2) {
        const w = ay[2] && ay[2][it[2]];
        if (!w) {
          stopAudio();
          return;
        }
        // The word timings are cut at the quietest moment between two words (tools/build_audio.py,
        // snap_words), so a word plays from its start to its end and no further. The last word fades out
        // after its stated end, so it plays to the end of the āyah.
        const lastW = it[2] === ay[2].length - 1;
        seg = { start: Math.max(0, w[0] - (it[2] === 0 ? 0.03 : 0)), end: lastW ? ay[1] + 0.06 : w[1], word: !lastW };
      } else seg = { start: Math.max(0, ay[0] - 0.05), end: ay[1] + 0.15 };
      curSeg = seg;
      markNow(it);
      const url = fileSrc || `audio/${id}/${pad(it[0])}.mp3`;
      if (player.getAttribute('src') !== url) player.src = url;
      player.defaultPlaybackRate = player.playbackRate = prefs.speed;
      const seek = () => {
        try {
          if (Math.abs(player.currentTime - curSeg.start) > 0.03) player.currentTime = curSeg.start;
        } catch (e) {}
      };
      if (curSeg.start > 0.3) player.muted = true; // stay silent until the seek lands
      if (player.readyState >= 1) seek();
      else
        player.addEventListener('loadedmetadata', function once() {
          player.removeEventListener('loadedmetadata', once);
          if (curSeg) seek();
        });
      const pr = player.play();
      if (pr && pr.catch) pr.catch(() => {});
      if (player.readyState >= 1 && !player.seeking) player.muted = false;
      clearInterval(segTimer);
      segTimer = setInterval(() => {
        // a timer is more precise than 'timeupdate' (~4 per second)
        if (!playing || !curSeg) return;
        if (!player.seeking && player.currentTime >= curSeg.start - 0.1) player.muted = false;
        // a single word stops a moment early: the check runs every 30 ms and the sound already on its way
        // out still plays, so the next word never slips in
        const stopAt = curSeg.end - (curSeg.word ? 0.03 : 0);
        if (player.currentTime >= stopAt && player.currentTime < curSeg.end + 2) {
          player.pause();
          finishSeg();
        }
      }, 30);
    } catch (e) {
      stopAudio();
    }
  }
  function finishSeg() {
    clearInterval(segTimer);
    segTimer = null;
    curSeg = null;
    if (loopRun) {
      loopRun.played++;
      drawLoops();
    }
    const tok = ++advTok;
    setTimeout(() => {
      if (playing && tok === advTok) playNext();
    }, 450);
  }
  /* While the reciter plays, the screen stays on (Wake Lock), so a long sūrah or loop isn't cut off when the
     phone would dim and lock. An endless (99×) loop lets go after 15 minutes. */
  let wakeLock = null,
    wakeWanted = false,
    wakeT = 0;
  function keepAwake(on) {
    clearTimeout(wakeT);
    wakeWanted = on;
    if (!on) {
      if (wakeLock) wakeLock.release().catch(() => {});
      wakeLock = null;
      return;
    }
    if (loopRun && loopRun.total >= 99) wakeT = setTimeout(() => keepAwake(false), 15 * 60000);
    if (wakeLock || !navigator.wakeLock || document.hidden) return;
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (!wakeWanted) return l.release();
        wakeLock = l;
        l.addEventListener('release', () => wakeLock === l && (wakeLock = null));
      })
      .catch(() => {});
  }
  // the lock ends when the page is hidden: take it again on coming back, if still reciting
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && wakeWanted && playing && !wakeLock && navigator.wakeLock)
      navigator.wakeLock.request('screen').then((l) => (wakeLock = l), () => {});
  });
  function stopAudio() {
    playing = false;
    keepAwake(false);
    queue = [];
    advTok++;
    playTok++;
    loopRun = null;
    if (dlAnswer) {
      dlAnswer(false);
      dlAnswer = null;
    }
    clearInterval(segTimer);
    segTimer = null;
    curSeg = null;
    try {
      player.pause();
      player.muted = false;
    } catch (e) {}
    updateFab();
    drawLoops();
    markNow(null);
  }
  function markNow(it) {
    const k = it && it.length === 2 ? (it[0] === 1 ? -1 : it[1] - 1) : null; // [1, 1] is the Basmalah
    let cur = null;
    document.querySelectorAll('.mayah').forEach((el) => {
      const on = k != null && +el.dataset.k === k;
      el.classList.toggle('now', on);
      if (on) cur = el;
    });
    // Read: the āyah being recited stays in view (back up to the top when a loop starts over)
    if (cur && st.view === 'mushaf' && !st.focus) {
      const r = cur.getBoundingClientRect(),
        top = 170, // under the bar and the floating buttons
        bottom = innerHeight - 40;
      if (r.top < top || r.bottom > bottom) scrollTo({ top: Math.max(0, scrollY + r.top - (k === -1 ? top + 120 : Math.max(top, (innerHeight - r.height) / 2))), behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  player.addEventListener('seeked', () => {
    if (curSeg && player.currentTime >= curSeg.start - 0.1) player.muted = false;
  });
  player.addEventListener('ended', () => {
    // only the end of a recitation segment moves on (not the moment of silence that unlocks playback)
    if (playing && curSeg) finishSeg();
  });
  player.addEventListener('error', () => {
    if (playing && player.getAttribute('src')) {
      stopAudio();
      toast(
        navigator.onLine === false
          ? 'This recitation is not saved for offline use yet. Save it in the Grown-up Corner.'
          : 'The recitation could not play. Try again in a moment.',
      );
    }
  });

  /* What the big orange Listen button plays on each screen */
  function fabTarget() {
    const v = st.view,
      s = S[st.i];
    if (!s || !['surah', 'learn', 'path', 'order', 'words', 'mushaf'].includes(v)) return null;
    const one = (k) => ({ key: `${s.n}:${k}`, label: `Āyah ${k + 1}`, items: [[s.n, k + 1]] });
    const many = (ks, label) => ({ key: `${s.n}:${ks.join(',')}`, label, items: ks.map((k) => [s.n, k + 1]) });
    const c = ctx();
    if (v === 'surah') return multi(s) && st.p !== 'all' ? many(range(c), `Part ${st.p + 1}`) : many(range(c), 'Whole sūrah');
    if (v === 'learn') {
      if (st.phase !== 'chain') return Object.assign(one(st.a), { loop: true });
      // the chain: Listen helps from where the child is, the āyāt not tapped yet (the key stays the same while
      // they tap along, so the recitation isn't cut off at each tap)
      const L = chainList(),
        rest = L.slice(Math.min(st.chain, L.length - 1));
      return { key: `${s.n}:chain:${st.a}`, label: rest.length < L.length ? `From āyah ${rest[0] + 1}` : 'The chain', items: rest.map((k) => [s.n, k + 1]) };
    }
    if (v === 'path') return Object.assign(one(c.from + st.k), { loop: true });
    if (v === 'order') {
      const all = st.p === 'all' ? range({ from: 0, to: s.ayat.length - 1 }) : range(c);
      if (st.say == null) return many(all, st.p === 'all' ? 'Whole sūrah' : 'In order');
      const ks = puzzleItems()[st.say].say;
      return ks.length > 1 ? many(ks, `Āyāt ${ks[0] + 1}–${ks[ks.length - 1] + 1}`) : one(ks[0]);
    }
    if (v === 'words') return Object.assign(one(st.a), { loop: true });
    if (v === 'mushaf') {
      // the whole sūrah starts with the Basmalah ([1, 1]); it can also be chosen on its own (sel -1)
      if (st.sel === -1) return { key: `${s.n}:bism`, label: 'Bismillah', items: [[1, 1]], loop: true };
      if (st.sel != null) return Object.assign(one(st.sel), { loop: true });
      const all = many(range({ from: 0, to: s.ayat.length - 1 }), 'Whole sūrah');
      return Object.assign(all, { items: [[1, 1], ...all.items], loop: true });
    }
    return null;
  }
  function updateFab() {
    const t = fabTarget();
    document.querySelectorAll('.listen').forEach((f) => {
      f.classList.toggle('show', !!t && prefs.audio);
      f.classList.toggle('playing', playing);
      f.querySelector('b').textContent = playing ? 'Stop' : 'Listen';
      if (t) f.querySelector('small').textContent = dlPct != null ? `Downloading ${dlPct}%` : t.label;
    });
    const key = t ? t.key : '';
    if (key !== fabKey && playing) {
      fabKey = key;
      stopAudio();
      return;
    }
    fabKey = key;
  }

  /* the loop button: how many times Listen plays, as a ring that empties as the plays go by */
  // beside the loop button: the recitation speed; a tap opens a quick picker right there
  const speedChip = () => {
    // a little speedometer: the needle points left when slow, right when fast
    const ang = -80 + (SPEEDS.indexOf(prefs.speed) / (SPEEDS.length - 1)) * 160,
      r = (ang * Math.PI) / 180,
      nx = (12 + 8 * Math.sin(r)).toFixed(1),
      ny = (14 - 8 * Math.cos(r)).toFixed(1);
    return `<button class="speedchip ${prefs.speed !== 1 ? 'on' : ''}" data-act="speedpop" aria-label="Recitation speed ${prefs.speed} times. Tap to change"><svg viewBox="0 0 24 16" aria-hidden="true"><path d="M3 14A9 9 0 0 1 21 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 14L${nx} ${ny}" stroke="#ff7a1a" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="14" r="2" fill="currentColor"/></svg><b>${speedLabel(prefs.speed)}</b></button>`;
  };
  function showSpeed() {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card speedcard"><button class="cardx" data-act="cno" aria-label="Close">✕</button><h3>🔊 Recitation speed</h3>
      <p class="saveinfo">Slower helps with a new āyah. It changes right away, even while Listen plays.</p>${speedSlider()}</div>`;
    m.classList.add('show');
  }
  function loopBtn() {
    return `<button class="loopbtn ${loopN > 1 ? 'on' : ''}" data-act="loop" aria-label="Listen plays ${loopN === 99 ? 'again and again' : loopN === 1 ? 'once' : loopN + ' times'}. Tap to change">${loopRing()}</button>`;
  }
  function loopRing() {
    // an almost full circle with a gap at the top; while looping, it empties one step per play
    const counting = loopRun && loopRun.total > 1; // a single play doesn't count down
    const left = counting ? Math.max(0, 1 - Math.floor(loopRun.played / loopRun.per) / loopRun.total) : 1;
    const arc = (cls, len) => `<circle class="${cls}" cx="24" cy="24" r="18" pathLength="360" stroke-dasharray="${len} 400" transform="rotate(-60 24 24)"/>`;
    const n = counting ? Math.max(1, loopRun.total - Math.floor(loopRun.played / loopRun.per)) : loopN; // plays left, counting down
    return `<svg viewBox="0 0 48 48" aria-hidden="true">${arc('lr-track', 300)}${arc('lr-arc', (300 * left).toFixed(1))}${counting ? '' : '<path class="lr-tip" d="M14.8 12.1L17.8 6.9L11.8 6.8"/>'}<text x="24" y="28.6" text-anchor="middle">${n}×</text></svg>`;
  }
  function drawLoops() {
    document.querySelectorAll('.loopbtn').forEach((b) => {
      b.innerHTML = loopRing();
      b.classList.toggle('on', loopN > 1);
    });
  }

  /* ================= effects ================= */
  const fxEl = document.getElementById('fx');
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst(x, y, n = 18, set = ['⭐', '✨', '🌟', '💛', '🌙']) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'p';
      s.textContent = set[i % set.length];
      const ang = Math.random() * Math.PI * 2,
        dist = 80 + Math.random() * 140;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.fontSize = 18 + Math.random() * 22 + 'px';
      fxEl.appendChild(s);
      if (s.animate) {
        const dx = Math.round(Math.cos(ang) * dist),
          dy = Math.round(Math.sin(ang) * dist - 40),
          r = Math.round(Math.random() * 360 - 180);
        s.animate(
          [
            { transform: 'translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(.4)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + r + 'deg) scale(1.1)', opacity: 0 },
          ],
          { duration: 1100, easing: 'cubic-bezier(.15,.7,.4,1)', fill: 'forwards' },
        );
      }
      setTimeout(() => s.remove(), 1200);
    }
  }
  function burstAt(el, n, set) {
    if (!el) {
      burst(innerWidth / 2, innerHeight / 2, n, set);
      return;
    }
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n, set);
  }
  function bigParty(set) {
    sfx.win();
    for (let i = 0; i < 4; i++)
      setTimeout(() => burst(innerWidth * (0.2 + 0.6 * Math.random()), innerHeight * (0.25 + 0.35 * Math.random()), 22, set), i * 220);
  }
  function wobble(el) {
    if (!el) return;
    el.classList.remove('wobble');
    void el.offsetWidth;
    el.classList.add('wobble');
    setTimeout(() => el.classList.remove('wobble'), 500);
  }
  let toastT;
  /* every card closes the way it opened: it shrinks and fades while the page behind clears (still "closed" at
     once for the game: only the look lingers for a moment) */
  function hideModal() {
    const m = document.getElementById('modal');
    if (!m.classList.contains('show')) return;
    m.classList.remove('show');
    if (reduceMotion) return;
    m.classList.add('closing');
    clearTimeout(m._closeT);
    m._closeT = setTimeout(() => m.classList.remove('closing'), 220);
  }
  // the list of worlds folds away the way it opened
  function closeRail(rl) {
    rl = rl || document.querySelector('.wrail.open');
    if (!rl) return;
    const tg = rl.querySelector('.wr-toggle');
    if (tg) tg.setAttribute('aria-expanded', 'false');
    if (reduceMotion) return rl.classList.remove('open');
    rl.classList.add('closing');
    setTimeout(() => rl.classList.remove('open', 'closing'), 200);
  }
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ================= helpers ================= */
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const toArNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const AR_LETTER = /[ء-يٮ-ۓۺ-ۼ]/;
  function wordsOf(ar) {
    const out = [];
    ar.split(/\s+/).forEach((t) => {
      if (!t) return;
      if (AR_LETTER.test(t) || !out.length) out.push(t);
      else out[out.length - 1] += ' ' + t;
    });
    return out;
  }
  const firstWord = (ar) => wordsOf(ar)[0];
  function ctx() {
    const s = S[st.i];
    if (st.p === 'all') return { s, from: 0, to: s.ayat.length - 1, all: true };
    const P = s.P[st.p || 0];
    return { s, from: P.from, to: P.to };
  }
  function range(c) {
    const r = [];
    for (let k = c.from; k <= c.to; k++) r.push(k);
    return r;
  }
  function partOf(s, k) {
    return s.P.findIndex((P) => k >= P.from && k <= P.to);
  }
  function multi(s) {
    return s.P.length > 1;
  }
  const pnum = (p) => (p === 'all' || p == null ? 0 : p);

  function sceneHTML(a, cls = '') {
    return `<div class="scene an-${a.anim} ${cls}">${a.scene.map((e) => `<span class="e">${e}</span>`).join('')}</div>`;
  }
  const pics = (a) => `<span class="pics">${a.scene.map((e) => `<span class="e">${e}</span>`).join('')}</span>`;
  function arHTML(s, a, k, opts = {}) {
    return `<div class="ar-box">
    <div class="ar-label">${opts.label || '📖 Grown-up reads'}</div>
    <div class="ar ${opts.blur ? 'blur' : ''} ${opts.sm ? 'sm' : ''}" lang="ar" ${opts.quiet ? '' : `data-act="say" data-n="${s.n}" data-k="${k}"`}>${a.ar} ﴿${toArNum(k + 1)}﴾</div>
    ${prefs.translit && !opts.blur ? `<div class="tr">${a.tr}</div>` : ''}
    ${prefs.meaning && !opts.blur ? `<div class="mean">💬 ${a.kid}</div>` : ''}
  </div>`;
  }
  // the action to do with the āyah (can be switched off in the Grown-up Corner)
  const gest = (a) => (prefs.actions ? `<div class="gest"><small>Do it</small>${a.gesture}</div>` : '');
  function bar(title, sub, to, extra) {
    return `<div class="bar"><button class="icon-btn" data-act="back" data-to="${to}" aria-label="Back">${ICON.back}</button>
    <div class="bar-title">${title}${sub ? `<small>${sub}</small>` : ''}</div>${extra || ''}
    <button class="listen" data-act="fab" aria-label="Listen to the recitation"><span class="ic"><svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#fff"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18.3 6.5a7.5 7.5 0 0 1 0 11"/></svg><span class="stop"></span></span><span><b>Listen</b><small></small></span></button>${extra ? '' : '<span class="bar-sp" aria-hidden="true"></span>'}</div>`;
  }
  function coach(html, icon = '🦉', extra = '') {
    return `<div class="coach"><span class="owl">${icon}</span><div>${html}</div>${extra}</div>`;
  }
  /* one numbered dot per āyah of this part: tap one to practice that āyah (done = said already) */
  function dots(c, cur, done) {
    return `<div class="dots" role="group" aria-label="Āyāt in this part">${range(c)
      .map(
        (k) =>
          `<button class="dot ${k === cur ? 'cur' : done.includes(k) ? 'done' : ''}" data-act="ljump" data-k="${k}" aria-label="Āyah ${k + 1}"${k === cur ? ' aria-current="step"' : ''}>${k + 1}</button>`,
      )
      .join('')}</div>`;
  }
  /* Saved per-āyah progress of a part: which āyāt were said in Look & Repeat ('la') or built in Word Steps ('wa').
     Coming back resumes where the child left off. Once a part is complete, a new visit starts a fresh run. */
  function savedAyat(s, p, key) {
    const x = (P().prog[s.n] && P().prog[s.n].parts[p]) || blank(),
      P0 = s.P[p];
    const all = range({ from: P0.from, to: P0.to });
    if ((key === 'la' && x.learn) || (key === 'wa' && x.words)) return all; // finished before per-āyah saving
    return all.filter((k) => (x[key] >> (k - P0.from)) & 1);
  }
  function markAyah(s, p, key, k) {
    const x = partRec(s.n, p);
    x[key] = (x[key] | (1 << (k - s.P[p].from))) & 1023;
    save();
  }
  function startRun(s, p, key) {
    const saved = savedAyat(s, p, key),
      all = range({ from: s.P[p].from, to: s.P[p].to });
    const run = saved.length >= all.length ? [] : saved; // a finished part: practice it all again
    return { run, saved, first: all.find((k) => !run.includes(k)) };
  }
  /* the next āyah still to do after k (wrapping round), or -1 when every āyah in the part is done */
  function nextTodo(c, k, done) {
    const todo = range(c).filter((x) => !done.includes(x));
    if (!todo.length) return -1;
    const after = todo.find((x) => x > k);
    return after != null ? after : todo[0];
  }
  function tag(s, k) {
    const a = s.ayat[k];
    return `<span class="ayah-tag"><span class="num">${k + 1}</span>${a.hook}</span>${a.twin ? `<span class="twin">👯 twin of #${a.twin}</span>` : ''}`;
  }
  function partLabel(s, p) {
    const P = s.P[p];
    return `Part ${p + 1} · āyāt ${P.from + 1}–${P.to + 1}`;
  }
  // chain now? after every new āyah from the second one on, or after every 3, 4 or 5 (and always at the last one)
  function chainNow() {
    const c = ctx(),
      at = st.a - c.from + 1;
    return chainList().length > 1 && (at % prefs.chain === 0 || st.a === c.to);
  }
  function chainList() {
    const c = ctx();
    const L = [];
    if (!c.all && st.p > 0) L.push(c.from - 1);
    for (let k = c.from; k <= st.a; k++) L.push(k);
    return L;
  }
  function toyBtn(s) {
    return s.toy ? `<button class="toy" data-act="toy" aria-label="Tap the ${s.toy[0]}">${s.toy[0]}<small>tap!</small></button>` : '';
  }

  /* ================= hearts (review games) ================= */
  // both quests (Look & Repeat and Word Steps) done: the review games then have hearts
  function learned() {
    const s = S[st.i];
    const r = P().prog[s.n];
    if (!r) return false;
    const both = (x) => !!(x && x.learn && x.words);
    if (st.p === 'all') return r.parts.every(both);
    return both(r.parts[pnum(st.p)]);
  }
  const heartsOn = () => prefs.hearts && ['path', 'order'].includes(st.view) && st.hearts != null && learned();
  function heartsBar() {
    if (!heartsOn()) return '';
    const all = st.maxH || 3;
    // a little explorer face that gets worried as the hearts run out
    const mood = st.hearts <= 1 || P().lost.length ? 'sad' : '';
    return `<div class="hearts" aria-label="${st.hearts} of ${all} hearts left"><span class="phead hface">${explorer({ cls: 'mini', mood })}</span>${Array.from({ length: all }, (_, j) => `<span class="hrt ${j < st.hearts ? '' : 'gone'}">${ART.heart(j < st.hearts)}</span>`).join('')}</div>`;
  }
  /* a mistake in a review game: lose a heart; at zero, drop the newest item here */
  function loseHeart() {
    if (!heartsOn()) return false;
    st.hearts = Math.max(0, st.hearts - 1);
    sfx.heart();
    const hs = $app.querySelectorAll('.hearts .hrt');
    const el = hs[st.hearts];
    if (el) {
      el.classList.add('gone', 'pop');
      el.innerHTML = ART.heart(false);
      burstAt(el, 6, ['💔', '✨']);
    }
    const face = $app.querySelector('.hearts .hface');
    if (face && st.hearts <= 1) face.innerHTML = explorer({ cls: 'mini', mood: 'sad' });
    if (st.hearts === 0) setTimeout(dropItem, 650);
    return true;
  }
  function dropItem() {
    const prof = P(),
      s = S[st.i];
    const restart = { view: st.view, i: st.i, p: st.p, L: st.L };
    const cand = prof.items.filter((id) => !isLost(id)).slice(-1)[0];
    // a broken heart marks this sūrah on the map until a review game here is finished
    if (!prof.fix.includes(s.n)) prof.fix.push(s.n);
    save();
    let body;
    if (cand) {
      prof.lost.push({ id: cand, n: s.n });
      save();
      body = `<div class="dropscene"><div class="dropex">${explorer({ view: 'front' })}</div><div class="dropit">${itemPic(cand)}</div></div>
      <h3>Oh no! Your ${itemName(cand)} fell off!</h3>
      <p class="saveinfo">It's waiting for you at <b>${s.name}</b> on the map. Finish a review game there to get it back and cheer your explorer up!</p>`;
    } else {
      body = `<div class="dropit">💪</div><h3>Out of hearts!</h3><p class="saveinfo">That's okay, we learn by trying. Let's try again!</p>`;
    }
    stopAudio();
    pendingRestart = restart;
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card dropcard">${body}<div class="row"><button class="btn go wide" data-act="retry">🔁 Try again</button></div></div>`;
    m.classList.add('show');
  }
  let pendingRestart = null;
  function restartActivity(r) {
    st.i = r.i;
    st.p = r.p;
    if (r.view === 'path') startPath();
    else if (r.view === 'order') startOrder();
  }

  /* ================= state, scenes & render ================= */
  const $app = document.getElementById('app');
  const $bg = document.getElementById('bg');
  let st = { view: 'splash' };
  let mapCtl = null;
  function go(view, params = {}) {
    if (view === 'map' && ['surah', 'done', 'learn', 'words', 'path', 'order', 'mushaf'].includes(st.view)) setTimeout(maybeStranger, 1400);
    // leaving My Explorer: everything new there has been seen
    if (st.view === 'bag' && view !== 'bag' && P().fresh.length) {
      P().fresh = [];
      save();
    }
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove()); // a piece being dragged never follows to a new screen
    st = Object.assign({ view }, params);
    if (GAMES.includes(view)) st.starsBefore = totalStars(); // a first finish (a new star) always brings a gift
    render(true);
    if (view === 'splash' || view === 'map') maybeForce();
    if (view !== 'splash' && justUpdated) {
      justUpdated = false; // the "Updated to …" note has been seen
      try {
        localStorage.setItem(VER_SEEN, VERSION);
      } catch (e) {}
    }
  }
  const GAMES = ['learn', 'words', 'path', 'order'];
  let sceneKeyNow = '',
    sceneSky = '#bfe6ff'; // the top of the world's sky behind the screen
  /* The phone's own bars blend in: the status bar takes the color at the top of each screen (theme-color),
     and the page paints behind both bars in the screen's own colors (see body::before and --pagebg). */
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function setTopColor(c) {
    if (themeMeta && themeMeta.getAttribute('content') !== c) themeMeta.setAttribute('content', c);
  }
  const SPLASH_SKY = ['#7fc8ff', '#0d0f33'], // the start screen's sky (art.js lhq-g-sky / lhq-g-skyn), day / night
    SPLASH_GROUND = ['#967d80', '#584e69']; // and the shaded ledge at its bottom
  function blendBars() {
    const night = isNight(),
      hasBar = !!$app.querySelector('.bar');
    document.body.classList.toggle('hasbar', hasBar);
    if (st.view === 'splash' || st.view === 'summit') {
      setTopColor(SPLASH_SKY[+night]);
      document.documentElement.style.setProperty('--pagebg', SPLASH_GROUND[+night]);
    } else if (st.view === 'map') {
      const g = ART.WORLDS[0]; // the map's bottom is the first world's meadow
      document.documentElement.style.setProperty('--pagebg', night && g.dim ? g.dim.ground[1] : g.ground[1]);
    } else setTopColor(hasBar ? mixHex(sceneSky, night ? '#0e0f2d' : '#cdebff', 0.86) : sceneSky); // the top bar (--barbg) over the sky
  }
  /* the living background behind lessons: the world's sky, a strip of ground with props, gentle motion */
  function setScene(wi) {
    const night = isNight();
    // text that sits right on the world (not on a card) is dark on a light sky and light on a dark one
    const sky = wi == null ? null : night && ART.WORLDS[wi].dim ? ART.WORLDS[wi].dim.sky : ART.WORLDS[wi].sky;
    document.documentElement.dataset.scn = (sky ? (lumHex(sky[0]) + lumHex(sky[1])) / 2 < 0.36 : night) ? 'dark' : 'light';
    const key = wi == null ? 'none' : wi + (night ? 'n' : 'd');
    if (key === sceneKeyNow) return;
    sceneKeyNow = key;
    if (sky) sceneSky = sky[0];
    // what shows past the end of the page on a phone: the ground of this world
    const gw = ART.WORLDS[wi == null ? 0 : wi];
    document.documentElement.style.setProperty('--pagebg', night && gw.dim ? gw.dim.ground[1] : gw.ground[1]);
    if (wi == null) {
      $bg.innerHTML = '';
      return;
    }
    const w = ART.WORLDS[wi],
      pl = night && w.dim ? Object.assign({}, w, w.dim) : w;
    const names = (ART.PROPS_BY_WORLD[wi] || []).filter((nm) => nm !== 'peak-summit');
    const props = [0, 1, 2, 3, 4]
      .map((j) => {
        const name = names[(j * 3 + wi) % names.length];
        const svg = (name && ART.props[name]) || '';
        const left = [3, 22, 70, 88, 48][j],
          size = [80, 54, 64, 86, 40][j],
          hgt = /viewBox="0 0 100 150"/.test(svg) ? size * 1.5 : size;
        return svg ? `<div class="scn-prop" style="left:${left}%;width:${size}px;height:${hgt}px">${svg}</div>` : '';
      })
      .join('');
    $bg.innerHTML = `<div class="scn" style="--sky0:${pl.sky[0]};--sky1:${pl.sky[1]};--g0:${pl.ground[0]};--g1:${pl.ground[1]}">
      <div class="scn-sky"></div><div class="scn-amb">${ART.ambient(wi)}</div>
      <div class="scn-ground"><svg viewBox="0 0 400 60" preserveAspectRatio="none"><path d="M0 26 C60 8 120 8 180 22 S300 40 400 14 V60 H0Z" fill="${pl.ground[0]}"/><path d="M0 40 C80 26 150 30 230 40 S340 50 400 34 V60 H0Z" fill="${pl.ground[1]}"/></svg>${props}</div></div>`;
  }
  /* Update the page in place: keep the elements that stay the same and change only what differs, so a tap
     that changes one word or one bubble doesn't replay the screen's entrance or flash the page. */
  function morph(from, to) {
    if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) {
      from.replaceWith(to);
      return;
    }
    if (from.nodeType === 3 || from.nodeType === 8) {
      if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
      return;
    }
    if (from.nodeType !== 1) return;
    for (const a of [...from.attributes]) if (!to.hasAttribute(a.name)) from.removeAttribute(a.name);
    for (const a of [...to.attributes]) if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value);
    if (from.nodeName === 'INPUT' && from !== document.activeElement && from.value !== to.value) from.value = to.value;
    if (from.id === 'map') return; // the map draws itself (js/map.js)
    morphKids(from, to);
  }
  function morphKids(from, to) {
    const a = [...from.childNodes],
      b = [...to.childNodes];
    b.forEach((nb, j) => {
      if (a[j]) morph(a[j], nb);
      else from.appendChild(nb);
    });
    for (let j = b.length; j < a.length; j++) a[j].remove();
  }
  let drawn = '';
  function render(scroll) {
    if (mapCtl && st.view !== 'map') {
      mapCtl.destroy();
      mapCtl = null;
      document.body.classList.remove('busy'); // a walk on the map can't finish now
    }
    document.body.className = 'v-' + st.view;
    const s = S[st.i];
    if (st.view === 'splash' || st.view === 'map' || st.view === 'summit') setScene(null);
    else if (s && st.i != null && !['settings', 'bag', 'create', 'show'].includes(st.view)) setScene(worldOf(s));
    else setScene(worldOf(S[P().at] || S[0]));
    const html = V[st.view](),
      key = st.view + ':' + st.i + ':' + st.p + ':' + (st.L || '');
    // the map is always drawn afresh: it adds elements of its own (the horizon) that an in-place update
    // would mistake for the map itself, leaving a blank map after, say, the last gift was opened there
    if (key === drawn && st.view !== 'map') {
      const t = document.createElement('template');
      t.innerHTML = html;
      morphKids($app, t.content);
    } else $app.innerHTML = html;
    drawn = key;
    if (st.view === 'map') mountMap();
    else if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
    if (st.view === 'surah') showSelectedCheckpoint();
    if (st.view === 'path') showStoneSet(false);
    blendBars();
    if (st.view === 'bag') {
      // keep the chosen category in view in its sideways row
      const tabs = document.getElementById('wtabs'),
        on = tabs && tabs.querySelector('.wtab.on');
      if (on) {
        const r = on.getBoundingClientRect(),
          box = tabs.getBoundingClientRect();
        if (r.left < box.left || r.right > box.right) tabs.scrollLeft += r.left - box.left - (box.width - r.width) / 2;
      }
      scrollCue(tabs); // arrows while there are more categories to either side
    }
    updateFab();
  }
  const V = {};

  /* ---------- SPLASH ---------- */
  V.splash = () => {
    const prof = P(),
      started = totalStars(prof) > 0;
    return `<div class="splash">
    <div class="sp-art">${ART.splash(prof.look, Object.assign(wornOutfit(prof), { sticker: prof.badge }), { night: isNight(), mood: prof.lost.length ? 'sad' : '' })}</div>
    <div class="sp-top">
      <button class="verchip ${upd.available ? 'ready' : ''}" data-act="updates" aria-label="Version and updates">v${VERSION}${upd.available ? ' · Update ✨' : ''}</button>
      <span class="sp-tr">${FS_OK && !STANDALONE ? `<button class="icon-btn" data-act="fs" aria-label="${fsNow() ? 'Exit fullscreen' : 'Fullscreen'}">${fsNow() ? ICON.fsOut : ICON.fsIn}</button>` : ''}<button class="icon-btn" data-act="settings" aria-label="Grown-up corner">${ICON.gear}</button></span>
    </div>
    <div class="sp-bottom">
      <h1 class="sp-title">Little Hafiz Quest</h1>
      <p class="sp-sub">Juz ‘Amma by heart · 37 sūrahs to the summit</p>
      <button class="btn gold sp-begin" data-act="begin">${started ? 'Continue the quest ▶' : 'Begin ▶'}</button>
      ${
        noExplorers()
          ? '<button class="pchip" data-act="newprof"><span class="phead">➕</span>Add explorer<small>to start</small></button>'
          : `<button class="pchip exbtn" data-act="explorers" aria-label="Explorers: switch, add, share and sync"><span class="phead">${explorer({ view: 'front', cls: 'mini' })}</span><span class="exb-tx"><b>${prof.name ? esc(prof.name) : 'Explorer'}</b><small>Explorers · switch, add, share &amp; sync</small></span><span class="exb-go">›</span></button>`
      }
    </div>
    ${justUpdated ? `<div class="updnote"><b>✨ Updated to v${VERSION}</b>${notesHTML(VERSION, updatedFrom)}<button class="updx" data-act="updok" aria-label="Close">✕</button></div>` : ''}
  </div>`;
  };

  /* ---------- THE SUMMIT: every sūrah once / three stars each / every star ---------- */
  V.summit = () => {
    const prof = P(),
      f = st.feats || [];
    const best = f.includes('all') ? 'all' : f.includes('three') ? 'three' : 'once';
    const title = { once: 'You reached the summit!', three: 'Three stars in every sūrah!', all: 'Every single star!' }[best];
    const sub = {
      once: 'A star in every sūrah of Juz ‘Amma. MāshāAllāh!',
      three: 'You climbed the whole mountain with three stars in every sūrah. MāshāAllāh!',
      all: 'You collected every star in Juz ‘Amma. That is truly amazing. MāshāAllāh!',
    }[best];
    const gifts = f.map((k) => `<span class="sgift">${itemPic(FEAT_ITEM[k].id)}<small>${itemName(FEAT_ITEM[k].id)}</small></span>`).join('');
    return `<div class="splash summit">
    <div class="sp-art">${ART.splash(prof.look, Object.assign(wornOutfit(prof), { sticker: prof.badge }), { night: isNight(), climb: true, still: reduceMotion })}</div>
    <div class="sm-card ${reduceMotion ? 'now' : ''}">
      <h2>🏔️ ${title}</h2>
      <p>${sub}</p>
      <div class="sgifts">${gifts}${f.includes('once') ? `<span class="sgift">${ART.sticker('star')}<small>Every treasure and sticker</small></span>` : ''}</div>
      <button class="btn gold wide" data-act="summitok">🎁 Open your gifts!</button>
    </div>
  </div>`;
  };

  /* ---------- MAKE YOUR EXPLORER ---------- */
  /* Name, then three clearly separate groups: skin tone (little faces), hair style, and hair or hijab
     color (little heads wearing that color), so it is obvious which picker changes what. */
  const SWATCH_SKIN = '#f6c49c';
  function swatchArt(kind, c) {
    const ink = 'stroke="#2b2340" stroke-width="2.4" stroke-linejoin="round"';
    const face = (sk) =>
      `<circle cx="20" cy="22" r="13" fill="${sk}" ${ink}/><circle cx="15.5" cy="22" r="1.8" fill="#2b2340"/><circle cx="24.5" cy="22" r="1.8" fill="#2b2340"/><path d="M16.5 27q3.5 3 7 0" fill="none" ${ink}/>`;
    let m;
    if (kind === 'hijab') m = `<path d="M5 34C3 16 10 6 20 6s17 10 15 28Z" fill="${c}" ${ink}/><ellipse cx="20" cy="22" rx="9.5" ry="10" fill="${SWATCH_SKIN}" ${ink}/><circle cx="16.6" cy="22" r="1.6" fill="#2b2340"/><circle cx="23.4" cy="22" r="1.6" fill="#2b2340"/>`;
    else if (kind === 'tee') m = `<path d="M7 13L15 7Q20 10 25 7L33 13L29 19L26 17V34H14V17L11 19Z" fill="${c}" ${ink}/>`;
    else if (kind === 'legs') m = `<path d="M11 6H29L31 34H23.5L20 17L16.5 34H9Z" fill="${c}" ${ink}/>`;
    else m = face(SWATCH_SKIN) + `<path d="M6.5 22C5 12 11 6 20 6s15 6 13.5 16c-2-5-4-6-6-7q-3 3-7.5 0q-4.5 3-7.5 0c-2 1-4 2-6 7Z" fill="${c}" ${ink}/>`;
    return `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">${m}</svg>`;
  }
  function lookControls(prof) {
    const L = prof.look;
    const sw = (k, list, kind, label) =>
      `<div class="swatches">${list.map((c, j) => `<button class="swatch2 ${L[k] === j ? 'on' : ''}" data-act="look" data-k="${k}" data-v="${j}" aria-label="${label} ${j + 1}" aria-pressed="${L[k] === j}">${swatchArt(kind, c)}</button>`).join('')}</div>`;
    const hairs = ART.LOOKS.hairFor[ART.isGirl(L) ? 'girl' : 'boy']
      .map(
        (h) =>
          `<button class="hairpick ${L.hair === h ? 'on' : ''}" data-act="look" data-k="hair" data-v="${h}" aria-label="${h}" aria-pressed="${L.hair === h}">${ART.explorer(Object.assign({}, L, { hair: h }), {}, { view: 'front', cls: 'mini' })}</button>`,
      )
      .join('');
    // faces: the explorer's own face (with their hair), the way hair styles are picked, so it is choosing a
    // character rather than a color
    const faces = ART.LOOKS.skin
      .map(
        (_, j) =>
          `<button class="hairpick ${L.skin === j ? 'on' : ''}" data-act="look" data-k="skin" data-v="${j}" aria-label="Skin tone ${j + 1}" aria-pressed="${L.skin === j}">${ART.explorer(Object.assign({}, L, { skin: j }), {}, { view: 'front', cls: 'mini' })}</button>`,
      )
      .join('');
    const hij = L.hair === 'hijab';
    return `<div class="lookbox">
      <label class="lk"><span>Name</span><input id="exname" class="namein" maxlength="16" autocomplete="off" placeholder="Your name" value="${esc(prof.name)}"></label>
      <div class="lkgroup"><div class="lkh">🧒 Boy or girl</div><div class="kidpick">${[
        ['boy', '👦 Boy'],
        ['girl', '👧 Girl'],
      ]
        .map(([v, t]) => `<button class="btn small ${(ART.isGirl(L) ? 'girl' : 'boy') === v ? 'on' : ''}" data-act="look" data-k="kid" data-v="${v}" aria-pressed="${(ART.isGirl(L) ? 'girl' : 'boy') === v}">${t}</button>`)
        .join('')}</div></div>
      <div class="lkgroup"><div class="lkh">🙂 Face</div><div class="hairs">${faces}</div></div>
      <div class="lkgroup"><div class="lkh">💇 Hair style</div><div class="hairs">${hairs}</div></div>
      <div class="lkgroup"><div class="lkh">🎨 ${hij ? 'Hijab color' : 'Hair color'}</div>${hij ? sw('hijabColor', ART.LOOKS.hijabColor, 'hijab', 'Hijab color') : sw('hairColor', ART.LOOKS.hairColor, 'hair', 'Hair color')}</div>
      <div class="lkgroup"><div class="lkh">👕 Comfy shirt</div>${sw('tee', ART.TEES, 'tee', 'Shirt color')}</div>
      <div class="lkgroup"><div class="lkh">👖 Comfy pants</div>${sw('legs', ART.LEGS, 'legs', 'Pants color')}</div>
    </div>`;
  }
  V.create = () => {
    const prof = P();
    return `<div class="screen">
    <div class="h1c">${st.first ? 'Make your explorer!' : 'Change your explorer'}</div>
    <div class="wd-stage">${explorer({ view: 'front' })}</div>
    ${lookControls(prof)}
    <div class="row">${P().made ? '' : '<button class="btn wide" data-act="cancelnew">Cancel</button>'}<button class="btn gold wide" data-act="made">${st.first ? "Let's go! ▶" : 'Done ✓'}</button></div>
  </div>`;
  };

  /* ---------- THE QUEST MAP ---------- */
  function surahStatus(i) {
    const s = S[i],
      prof = P();
    return {
      stars: surahStars(s),
      max: surahMax(s),
      done: surahDone(s),
      gold: surahStars(s) >= surahMax(s),
      started: surahStars(s) > 0,
      gift: false,
      lost: prof.lost.filter((x) => x.n === s.n).map((x) => x.id),
      fix: prof.fix.includes(s.n),
    };
  }
  function suggestIdx() {
    const i = S.findIndex((s) => !surahStars(s)); // one star is enough to move on
    return i < 0 ? S.length - 1 : i;
  }
  V.map = () => {
    const prof = P();
    return `<div class="mapscr">
    <div class="hud">
      <button class="icon-btn" data-act="home" aria-label="Back to the start">${ICON.home}</button>
      <button class="hud-stars hud-sur" data-act="progress" data-t="surahs" aria-label="Sūrahs done: ${doneSurahs()} of ${S.length}">📖 <b>${doneSurahs()}</b><small>/${S.length}</small></button>
      <button class="hud-stars" data-act="progress" data-t="stars" aria-label="Stars: ${totalStars()} of ${MAX_STARS}">⭐ <b>${totalStars()}</b><small>/${MAX_STARS}</small></button>
      ${giftIcon(prof)}
      <button class="icon-btn hud-bag hud-me" data-act="bag" aria-label="My explorer: dress up, collection and achievements"><span class="phead">${explorer({ cls: 'mini' })}</span>${prof.fresh.length ? NEWDOT : ''}</button>
    </div>
    ${heroReady(prof) && prefs.stranger ? '<button class="btn small chalbtn" data-act="challenge" aria-label="Challenge the Stranger">⚔️ Challenge</button>' : ''}
    <div id="map" class="mroot"></div>
  </div>`;
  };
  function mountMap() {
    if (mapCtl) {
      mapCtl.destroy(); // re-drawing the map (after a gift, a setting…) replaces the old one
      document.body.classList.remove('busy'); // and ends any walk on it
    }
    const prof = P();
    const reached = Math.max(prof.at, ...S.map((s, i) => (surahStars(s) > 0 ? i : 0)));
    mapCtl = MAP.mount(document.getElementById('map'), {
      surahs: S,
      worlds: WORLDS,
      art: ART,
      night: isNight(),
      current: prof.at,
      reached,
      suggest: suggestIdx(),
      status: surahStatus,
      explorerSVG: () => explorer({ view: 'front' }),
      // everyone else on this phone, standing in the world of the sūrah they're on
      others: store.profiles
        .filter((p) => p.id !== store.cur && p.made)
        .map((p) => ({ id: p.id, name: p.name ? esc(p.name) : 'Explorer', svg: explorer({ view: 'front' }, p), wi: Math.max(0, worldOf(S[p.at] || S[0])) })),
      worldIcon: (wi) => WORLD_ICON[wi],
      // what the Stranger throws in each world (so the explorer can dress for it)
      worldThrows: (wi) => (prefs.stranger ? worldThrowIcons(wi) : ''),
      onWorld: (wi) => {
        const w = ART.WORLDS[wi];
        setTopColor(isNight() && w.dim ? w.dim.sky[0] : w.sky[0]); // the status bar follows the world in view
      },
      worldProgress: (wi) => {
        const list = S.filter((s) => worldOf(s) === wi);
        const done = list.filter((s) => surahDone(s)).length;
        // green: every sūrah memorized; golden: every star in every sūrah
        return { frac: done / list.length, done: done === list.length, gold: list.every((s) => surahStars(s) >= surahMax(s)) };
      },
    });
  }
  // a sūrah counts as done once it has at least one star
  const doneSurahs = (prof) => S.filter((s) => surahStars(s, prof) > 0).length;
  /* The progress view (tap the counters at the top of the map): every sūrah with its stars; tap one to go there. */
  function showProgress(tab) {
    const prof = P(),
      m = document.getElementById('modal');
    const rows = S.map((s, i) => {
      const got = surahStars(s),
        max = surahMax(s),
        fix = prof.fix.includes(s.n);
      const right =
        tab === 'stars'
          ? `<span class="pgbar"><i style="width:${Math.round((got / max) * 100)}%"></i></span><span class="pgst">${got}/${max} ⭐</span>`
          : `<span class="pgok ${got ? 'on' : ''}">${got ? '✓' : ''}</span>`;
      const t = prof.stime[s.n];
      return `<button class="pgrow ${got ? 'done' : ''}" data-act="jump" data-i="${i}"><span class="pn">${s.n}</span><span class="pgname">${s.name}${fix ? ' <span class="pgfix" title="Needs fixing">💔</span>' : ''}<small>${s.icon} ${s.meaning}${t >= 30 ? ` · ⏱️ ${fmtTime(t)}` : ''}</small></span>${right}</button>`;
    }).join('');
    const fixes = prof.fix.length ? `<p class="saveinfo center">💔 ${prof.fix.length === 1 ? 'One sūrah needs' : prof.fix.length + ' sūrahs need'} a little fixing: tap it to play a review game there.</p>` : '';
    m.innerHTML = `<div class="card progcard">
      <div class="pgtabs"><button class="${tab !== 'stars' ? 'on' : ''}" data-act="progress" data-t="surahs">📖 Sūrahs <b>${doneSurahs()}/${S.length}</b></button><button class="${tab === 'stars' ? 'on' : ''}" data-act="progress" data-t="stars">⭐ Stars <b>${totalStars()}/${MAX_STARS}</b></button></div>
      <p class="saveinfo center">${tab === 'stars' ? 'Every star in every sūrah. Tap a sūrah to go there.' : 'A sūrah is done with at least one star. Tap one to go there.'} ⏱️ ${fmtTime(prof.time || 0)} learning in all.</p>${fixes}
      <div class="pglist">${rows}</div>
      <div class="row"><button class="btn wide" data-act="cno">Close</button></div></div>`;
    m.classList.add('show');
    const list = m.querySelector('.pglist'),
      cur = list && list.children[prof.at];
    if (cur) list.scrollTop = Math.max(0, cur.offsetTop - list.clientHeight / 2);
  }
  /* go to sūrah i from anywhere: the map, the explorer walks in, then its next lesson starts */
  function jumpTo(i) {
    hideModal();
    const walk = () =>
      enterSurah(i, () => {
        const next = $app.querySelector('.qstep.next');
        if (next) setTimeout(() => st.view === 'surah' && next.isConnected && next.click(), 650);
      });
    if (st.view === 'map' && mapCtl) walk();
    else {
      go('map');
      // only if the child is still on the map with nothing open on top (a gift, say)
      setTimeout(() => st.view === 'map' && !document.getElementById('modal').classList.contains('show') && walk(), 450);
    }
  }
  function enterSurah(i, then) {
    const prof = P();
    if (!mapCtl) {
      prof.at = i;
      save();
      openSurah(i);
      if (then) then();
      return;
    }
    const ctl = mapCtl;
    sfx.tap();
    document.body.classList.add('busy');
    // taps wait while the explorer walks in, but never for long: if the walk is cut short (the map redrawn),
    // the game must not stay deaf to taps
    const guard = setTimeout(() => document.body.classList.remove('busy'), 4000);
    ctl.walkTo(i, () => {
      prof.at = i;
      save();
      ctl.zoomInto(i, () => {
        clearTimeout(guard);
        document.body.classList.remove('busy');
        openSurah(i);
        if (then) then();
      });
    });
  }
  /* the Bismillah moon on a sūrah's page breathes each time the sūrah is entered, until it is tapped */
  let bismSaid = null;
  function openSurah(i) {
    const s = S[i],
      r = P().prog[s.n];
    bismSaid = null;
    let p = 0;
    if (multi(s)) {
      const sug = s.P.findIndex((_, q) => !(r && r.parts[q] && r.parts[q].path));
      p = sug < 0 ? 'all' : sug;
    }
    go('surah', { i, p, enter: true });
  }

  /* ---------- SŪRAH: checkpoint trail + quest steps ---------- */
  function stepsFor(s, p) {
    const r = P().prog[s.n];
    if (p === 'all') {
      const got = (r && r.all) || 0;
      const ready = bigReady(s);
      return [
        { key: 'pathpick', ico: '🐸', t: 'Stepping Stones · whole sūrah', d: 'Every part in one go, from the pictures', done: !!got, stars: [got ? 1 : 0, 1], review: true },
        {
          key: ready ? 'order' : 'biglocked',
          ico: '🧩',
          t: 'Big Puzzle · whole sūrah',
          d: ready ? "Fit every checkpoint's puzzle together" : "Finish the Picture Puzzle in every checkpoint first",
          done: !!(r && r.big),
          stars: [0, 0],
          review: true,
          locked: !ready,
        },
      ];
    }
    const x = (r && r.parts[p]) || blank();
    const beads = `<span class="beads-ico" style="color:${WCOL[5]}">${WCOL.slice(0, 6)
      .map((c) => `<i style="background:${c}"></i>`)
      .join('')}</span>`;
    return [
      { key: 'learn', ico: '👀', t: 'Look & Repeat', d: 'See the picture, hear the āyah, say it 3 times', done: !!x.learn, stars: [x.learn, 1] },
      { key: 'words', ico: beads, t: 'Word Steps', d: 'Build each āyah word by word', done: !!x.words, stars: [x.words, 1] },
      { key: 'pathpick', ico: '🐸', t: 'Stepping Stones', d: 'Say each āyah from its picture; hints help', done: !!x.path, stars: [x.path ? 1 : 0, 1], review: true },
      { key: 'order', ico: '🧩', t: 'Picture Puzzle', d: 'Fit the pieces together in order', done: !!x.order, stars: [x.order, 1], review: true },
    ];
  }
  function checkpointTrail(s) {
    const r = P().prog[s.n];
    const cps = s.P.map((P, p) => {
      const x = r && r.parts[p];
      const done = !!(x && x.path),
        got = partStars(x);
      return `<button class="cpf ${st.p === p ? 'sel' : ''} ${done ? 'done' : ''}" data-act="part" data-p="${p}">
        <span class="cpflag">${ART.flag(done ? '#2fbf71' : st.p === p ? '#ff9f1c' : '#b9b1dc')}</span>
        <b>${p + 1}</b><small>āyāt ${P.from + 1}–${P.to + 1}</small><span class="cpst">⭐ ${got}/4</span></button>`;
    });
    const allGot = (r && r.all) || 0;
    cps.push(`<button class="cpf summit ${st.p === 'all' ? 'sel' : ''} ${allGot ? 'done' : ''}" data-act="part" data-p="all">
      <span class="cpflag">🏁</span><b>All</b><small>whole sūrah</small><span class="cpst">${starRow(allGot ? 1 : 0, 1)}</span></button>`);
    // one row that scrolls sideways; faded edges and a bouncing arrow show there is more
    return `<div class="h2">🚩 Checkpoints <small>One part at a time, then the whole sūrah · swipe for more</small></div><div class="cpwrap"><div class="cptrail" id="cptrail">${cps.join('<i class="cpline"></i>')}</div><button class="cpmore cpless" data-act="cpscroll" data-d="-1" aria-label="Earlier checkpoints">‹</button><button class="cpmore" data-act="cpscroll" data-d="1" aria-label="More checkpoints">›</button></div>`;
  }
  /* keep the chosen checkpoint in view, and show the "more" cue only while there is more to swipe to */
  // a sideways row: its wrapper shows ‹ › arrows while there is more to see that way
  function scrollCue(tr) {
    if (!tr) return;
    const cue = () => {
      const w = tr.parentNode;
      w.classList.toggle('more-r', tr.scrollLeft + tr.clientWidth < tr.scrollWidth - 4);
      w.classList.toggle('more-l', tr.scrollLeft > 4);
    };
    cue();
    if (!tr.dataset.cue) {
      tr.dataset.cue = 1;
      tr.addEventListener('scroll', cue, { passive: true });
    }
  }
  function showSelectedCheckpoint() {
    const tr = document.getElementById('cptrail');
    if (!tr) return;
    const sel = tr.querySelector('.cpf.sel');
    if (sel) tr.scrollLeft = Math.max(0, sel.offsetLeft - (tr.clientWidth - sel.offsetWidth) / 2);
    scrollCue(tr);
  }
  V.surah = () => {
    const s = S[st.i],
      wi = worldOf(s);
    const done = surahDone(s);
    const p = st.p;
    const steps = stepsFor(s, p);
    const nextIdx = steps.findIndex((x) => !x.done);
    let stepsHTML = '',
      reviewShown = false;
    steps.forEach((x, j) => {
      if (x.review && !reviewShown) {
        reviewShown = true;
        stepsHTML += `<div class="qsep"><span>Review games</span>${prefs.hearts && learned() ? `<small>${ART.heart(true).repeat(maxHearts(P()))} careful, ${maxHearts(P())} hearts!</small>` : ''}</div>`;
      }
      const isNext = j === nextIdx;
      stepsHTML += `<button class="qstep ${x.done ? 'done' : ''} ${isNext && !x.locked ? 'next' : ''} ${x.locked ? 'locked' : ''}" data-act="${x.key}" ${p === 'all' ? 'data-p="all"' : ''}>
        <span class="qn">${x.done ? '✓' : j + 1}</span><span class="qico">${x.ico}</span>
        <span class="qtx"><b>${x.t}</b><small>${x.d}</small><span class="st">${starRow(x.stars[0], x.stars[1])}</span></span>
        ${isNext && !x.locked ? '<span class="qgo">Start ▶</span>' : x.locked ? '<span class="qgo lock">🔒</span>' : ''}</button>`;
    });
    return `<div class="screen ${st.enter ? 'zoomin' : ''}" style="${cv(s.color)}">
    ${bar(`${s.n}. ${s.name}`, `World ${wi + 1} · ${WORLDS[wi].name}`, 'map')}
    <div class="hero"><button class="bookbtn" data-act="mushaf" aria-label="Read the whole sūrah">📖<small>Read</small></button><div class="hero-icon bob">${s.icon}</div><div class="hero-ar">سُورَةُ ${s.ar}</div>
      <div class="hero-en">${s.meaning} · ${s.ayat.length} āyāt${multi(s) ? ` · ${s.P.length} checkpoints` : ''}</div>
      <div class="hero-st ${done ? 'done' : ''}">${done ? '✓ Memorized! MāshāAllāh' : `⭐ ${surahStars(s)} / ${surahMax(s)} stars`}</div></div>
    ${lostAt(s.n).length ? `<div class="lostnote">${lostAt(s.n).map((x) => `<span class="lostit">${itemPic(x.id)}</span>`).join('')}<span>Your <b>${lostAt(s.n).map((x) => itemName(x.id)).join(', ')}</b> fell off here! Finish a review game to get it back.</span></div>` : ''}
    ${multi(s) ? checkpointTrail(s) : ''}
    <div class="h2 qhead2"><span>${p === 'all' ? '🏁 The whole sūrah' : multi(s) ? `🧭 Part ${p + 1}: your quest` : '🧭 Your quest'}<small>${nextIdx < 0 ? 'All done here! Play any game again to revise.' : 'Pick a step to start'}</small></span>
      <button class="bismbtn ${bismSaid === s.n ? '' : 'breathe'}" data-act="bism" aria-label="Say Bismillah first">${ICON.moon}<small>Bismillah</small></button></div>
    <div class="qsteps">${stepsHTML}</div>
    <div class="tip"><div class="tip-h">💡 Tip for grown-ups</div><div class="tip-b">${s.pattern}</div>${s.toy ? `<div class="tip-toy">${toyBtn(s)}<span>Tap the ${s.toy[0]} together with your child each time you hear it.</span></div>` : ''}</div>
  </div>`;
  };

  /* ---------- LOOK & REPEAT ---------- */
  V.learn = () => {
    const s = S[st.i],
      c = ctx(),
      k = st.a,
      a = s.ayat[k];
    let body = '';
    if (st.phase === 'chain') {
      const L = chainList(),
        cur = s.ayat[L[Math.min(st.chain, L.length - 1)]];
      body = `
      ${coach(`🔗 <b>Chain time!</b> Say from āyah ${L[0] + 1} all the way to āyah ${k + 1}.${prefs.actions ? ' Do the actions too!' : ''}`, '🦉', toyBtn(s))}
      <div class="chain">${L.map((x, j) => `<button class="link ${j < st.chain ? 'lit' : j === st.chain ? 'cur' : ''} ${!c.all && st.p > 0 && j === 0 ? 'bridge' : ''}" data-act="chainstep" data-j="${j}" aria-label="Āyah ${x + 1}${j < st.chain ? ', said: tap to go back to it' : ''}"><span class="num">${x + 1}</span>${pics(s.ayat[x])}</button>`).join('')}</div>
      ${prefs.actions ? `<div style="text-align:center">${gest(cur)}</div>` : ''}
      <details class="adult"><summary>👁️ Grown-up check</summary><div class="ar sm" lang="ar">${cur.ar}</div></details>
      <div class="row"><button class="btn go wide" data-act="chainstep">✅ Said it! Next</button></div>`;
    } else {
      const blur = st.phase === 'alone' && !st.peek;
      body = `
      <div class="card lcard">
        <div class="lchead"><span class="lctags">${tag(s, k)}</span><span class="lcbtns">${speedChip()}${loopBtn()}</span></div>
        ${sceneHTML(a)}
        ${gest(a)}
        ${arHTML(s, a, k, { blur, quiet: true })}
      </div>`;
      if (st.phase === 'repeat') {
        const n = st.popped.filter(Boolean).length;
        body += `
        ${coach(`📖 Grown-up reads · 🧒 you repeat!<br><span class="sub">Pop a bubble each time you say it: ${3 - n} to go!</span>`, '🦉', toyBtn(s))}
        <div class="bubbles">${st.popped.map((p, b) => (p ? '<span class="bubble popped">⭐</span>' : `<button class="bubble" data-act="pop" data-b="${b}" aria-label="Pop bubble">Say!</button>`)).join('')}</div>`;
      } else {
        body += `
        ${coach(`🙈 Now say it with <b>just the picture</b>!${prefs.actions ? ' Do the action to help you remember.' : ''}`, '🦉', toyBtn(s))}
        <div class="row">
          <button class="btn wide" data-act="peek">${st.peek ? '🙈 Hide' : '👀 Peek'}</button>
          <button class="btn go wide" data-act="saidit">⭐ Said it!</button>
        </div>`;
      }
    }
    return `<div class="screen" style="${cv(s.color)}">
    ${bar('Look & Repeat', `${s.name} · āyah ${k + 1} of ${s.ayat.length}`, 'surah')}
    ${dots(c, k, [...(st.saidA || []), ...(st.savedA || [])])}
    ${body}
  </div>`;
  };

  /* ---------- THE MUṢḤAF: the whole sūrah to read, for children who can read Arabic ---------- */
  /* Hold an āyah to color its words in the same order as Word Steps; tap anywhere else to clear the colors.
     Listen plays the whole sūrah, or only the chosen āyah; the loop button repeats it. */
  V.mushaf = () => {
    const s = S[st.i];
    const ayat = s.ayat
      .map((a, k) => {
        const sel = st.sel === k;
        const words = wordsOf(a.ar)
          .map((w, j) => (sel ? `<span class="mw" style="${wv(WCOL[j % WCOL.length])}">${w}</span>` : w))
          .join(' ');
        return `<span class="mayah ${sel ? 'sel' : ''}" data-k="${k}">${words} <span class="mnum">﴿${toArNum(k + 1)}﴾</span></span>`;
      })
      .join(' ');
    const focus = st.sel != null && st.focus ? focusCard(s, st.sel) : '';
    return `<div class="screen mushafscr" style="${cv(s.color)}" data-act="mclear">
    ${bar(`📖 ${s.name}`, `${s.ayat.length} āyāt · ${st.sel === -1 ? 'Bismillah chosen' : st.sel != null ? `āyah ${st.sel + 1} chosen` : 'the whole sūrah'}`, 'surah')}
    <div class="mtools"><span>${st.sel != null ? (st.focus ? 'Listen plays this āyah. Tap anywhere to close.' : '<b>Tap the āyah again</b> to look closer. Tap anywhere else to clear the colors.') : '<b>Hold an āyah</b> to color its words, like Word Steps.'}</span></div>
    <div class="card mushaf ${focus ? 'focusing' : ''}">
      <div class="mtitle" lang="ar">سُورَةُ ${s.ar}</div>
      <div class="mbism" lang="ar" dir="rtl"><span class="mayah ${st.sel === -1 ? 'sel' : ''}" data-k="-1">${wordsOf(BISM)
        .map((w, j) => (st.sel === -1 ? `<span class="mw" style="${wv(WCOL[j % WCOL.length])}">${w}</span>` : w))
        .join(' ')}</span></div>
      <div class="mtext" lang="ar" dir="rtl">${ayat}</div>
    </div>
    ${focus}
  </div>
  <div class="mfloat">${loopBtn()}${speedChip()}</div>`;
  };
  /* one āyah up close: its colored words, with the transliteration over each and the meaning under each
     (as the settings say), and the simple meaning of the whole āyah */
  function focusCard(s, k) {
    const a = k === -1 ? { ar: BISM, kid: 'In the name of Allah, the Most Kind, the Most Merciful' } : s.ayat[k];
    const words = wordsOf(a.ar)
      .map((w, j) => {
        const ln = wordLines(s.n, k, j);
        return `<span class="fword" style="${wv(WCOL[j % WCOL.length])}">${ln.above}<span class="fwar" lang="ar">${w}</span>${ln.below}</span>`;
      })
      .join('');
    return `<div class="mfocus" role="dialog" aria-label="${k === -1 ? 'Bismillah' : 'Āyah ' + (k + 1)}"><div class="mfcard">
      <div class="mfhead"><span class="ayah-tag">${k === -1 ? '<span class="num">🌙</span>Bismillah' : `<span class="num">${k + 1}</span>Āyah ${k + 1}`}</span><span class="mfbtns">${prefs.translit || prefs.wordmean ? '<button class="mfx" data-act="wordset" aria-label="Word meaning and transliteration settings">⚙️</button>' : ''}<button class="mfx" data-act="mclear" aria-label="Close">✕</button></span></div>
      <div class="mfwords" dir="rtl">${words}</div>
      ${prefs.meaning ? `<div class="mean">💬 ${a.kid}</div>` : ''}
      ${!prefs.translit && !prefs.wordmean ? '<div class="mfhint"><span>See how each word sounds and what it means: switch on transliteration and word meanings.</span><button class="icon-btn sm" data-act="wordset" aria-label="Open the word settings">⚙️</button></div>' : ''}
    </div></div>`;
  }
  // hold an āyah (about half a second) to choose it
  let hold = null;
  document.addEventListener('pointerdown', (e) => {
    if (st.view !== 'mushaf') return;
    const el = e.target.closest('.mayah');
    if (!el) return;
    clearTimeout(hold && hold.t);
    hold = {
      x: e.clientX,
      y: e.clientY,
      fired: false,
      t: setTimeout(() => {
        hold.fired = true;
        st.sel = +el.dataset.k;
        st.focus = false;
        sfx.pop();
        render();
      }, 450),
    };
  });
  document.addEventListener(
    'pointermove',
    (e) => {
      if (hold && !hold.fired && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) {
        clearTimeout(hold.t);
        hold = null;
      }
    },
    { passive: true },
  );
  ['pointerup', 'pointercancel'].forEach((ev) =>
    document.addEventListener(ev, () => {
      if (hold && !hold.fired) {
        clearTimeout(hold.t);
        hold = null;
      }
    }),
  );
  document.addEventListener('contextmenu', (e) => {
    if (st.view === 'mushaf' && e.target.closest('.mushaf')) e.preventDefault(); // a long press chooses an āyah
  });

  /* ---------- each word's transliteration and meaning (words.json: the Quranic Arabic Corpus) ---------- */
  let WORDS = null,
    wordsLoading = null;
  function loadWords() {
    if (WORDS || wordsLoading) return;
    wordsLoading = fetch('words.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && j.surahs) WORDS = j.surahs;
        if (['words', 'mushaf'].includes(st.view)) render();
      })
      .catch(() => {})
      .then(() => (wordsLoading = null));
  }
  const BISM_WORDS = [["bis'mi", 'In (the) name'], ['l-lahi', '(of) Allah'], ['l-raḥmāni', 'the Most Gracious'], ['l-raḥīmi', 'the Most Merciful']]; // Quranic Arabic Corpus 1:1
  const wordInfo = (n, k, j) => (k === -1 ? BISM_WORDS[j] : WORDS && WORDS[n] && WORDS[n][k] && WORDS[n][k][j]) || ['', ''];
  // the lines over and under a word: transliteration above, meaning below (as the settings say)
  function wordLines(n, k, j) {
    const [tr, en] = wordInfo(n, k, j);
    return {
      above: prefs.translit && tr ? `<span class="wtl">${esc(tr)}</span>` : '',
      below: prefs.wordmean && en ? `<span class="wen">${esc(en)}</span>` : '',
    };
  }

  /* ---------- WORD STEPS (tap a word to hear just that word) ---------- */
  /* Every word sits in a box exactly as wide as the word, in practice and from memory alike (a hidden word
     still takes its room, with its number on top), so each colored box stays in the same place. */
  const wbox = (w, j, cls, attrs, ln) =>
    `<${attrs ? 'button' : 'span'} class="wbox ${cls}" style="${wv(WCOL[j % WCOL.length])}" ${attrs || ''}>${ln ? ln.above : ''}<span class="wtx" lang="ar">${w}</span>${ln ? ln.below : ''}<span class="wnum">${j + 1}</span></${attrs ? 'button' : 'span'}>`;
  V.words = () => {
    const s = S[st.i],
      c = ctx(),
      k = st.a,
      a = s.ayat[k],
      W = wordsOf(a.ar),
      n = W.length;
    const col = (j) => WCOL[j % WCOL.length];
    const track = `<div class="wlabel">Āyah tracker</div><div class="wtrack">${range(c)
      .map((x) => `<button class="${x === k ? 'cur' : st.doneA.includes(x) || (st.savedA || []).includes(x) ? 'done' : ''}" data-act="wjump" data-k="${x}">${x + 1}<small>${toArNum(x + 1)}</small></button>`)
      .join('')}</div>`;
    const beads = `<div class="beads" aria-label="Word ${Math.min(st.w, n)} of ${n}">${W.map((_, j) => {
      const on = st.phase === 'build' ? j < st.w : st.shown.includes(j);
      const cur = st.phase === 'build' && j === st.w - 1;
      return `<button class="bead ${on ? 'on' : ''} ${cur ? 'cur' : ''}" style="${wv(col(j))}" data-act="wbead" data-j="${j}" aria-label="Word ${j + 1}"></button>`;
    }).join('')}</div>`;
    let stage, controls, note;
    if (st.phase === 'build') {
      stage = `<div class="wflow">${W.map((w, j) =>
        j < st.w
          ? wbox(w, j, `word ${j === st.w - 1 ? 'new' : ''}`, `data-act="sayw" data-n="${s.n}" data-k="${k}" data-w="${j}"`, wordLines(s.n, k, j))
          : wbox(w, j, 'word ph', '', wordLines(s.n, k, j)),
      ).join('')}</div>`;
      note =
        st.w === 1
          ? 'Grown-up reads the first word. Child repeats it. <b>Tap a word to hear it.</b>'
          : `Grown-up reads from the first word up to the new word. Child repeats all ${st.w} words. <b>Tap any word to hear it.</b>`;
      controls = `<button class="btn wide" data-act="wprev" ${st.w <= 1 ? 'disabled' : ''}>‹ Back</button>
      ${st.w < n ? `<button class="btn go wide" data-act="wnext">Next word ›</button>` : `<button class="btn go wide" data-act="wrecall">Say it all ›</button>`}`;
    } else {
      const all = st.shown.length === n;
      stage = `<div class="wflow">${W.map((w, j) =>
        st.shown.includes(j)
          ? wbox(w, j, 'wtile shown', `data-act="sayw" data-n="${s.n}" data-k="${k}" data-w="${j}"`, wordLines(s.n, k, j))
          : wbox(w, j, 'wtile', `data-act="wshow" data-j="${j}" aria-label="Word ${j + 1}"`, wordLines(s.n, k, j)),
      ).join('')}</div>`;
      note = all ? 'Every word in its place. Well done!' : 'Child says the whole āyah from memory. Grown-up taps each tile as the word is said.';
      const last = nextTodo(c, k, [...st.doneA, k]) < 0;
      controls = all
        ? `<button class="btn wide" data-act="whide">Again</button><button class="btn go wide" data-act="wdone">${last ? 'Finish part ›' : 'Next āyah ›'}</button>`
        : `<button class="btn wide" data-act="wbuild">‹ Practice</button><button class="btn go wide" data-act="wreveal">Show next word</button>`;
    }
    return `<div class="screen" style="${cv(s.color)}">
    ${bar('Word Steps', `${s.name} · āyah ${k + 1} of ${s.ayat.length}`, 'surah')}
    ${track}
    <div class="wlabel" style="margin-top:6px">Word order</div>
    ${beads}
    <div class="wstage"><div class="lchead"><div class="wpic"><span class="num">${k + 1}</span>${pics(a)}<b>${a.hook}</b></div><span class="lcbtns">${speedChip()}${loopBtn()}</span></div>${stage}
      <div class="wcount">${st.phase === 'build' ? `Word ${st.w} of ${n}` : `${st.shown.length} of ${n} words`}</div></div>
    <div class="wnote">${note}</div>
    <div class="row">${controls}</div>
  </div>`;
  };

  /* ---------- STEPPING STONES ---------- */
  /* Clues for Stepping Stones. It starts with the picture (L 2; the old levels 1 and 3 are gone since v2.4.3),
     and the 💡 hint shows one more word at a time, then the full āyah to hear. */
  function pathClues(s, k, L, h) {
    const W = wordsOf(s.ayat[k].ar);
    const picAt = L === 3 ? 1 : 0; // hint number that shows the picture
    const pic = h >= picAt;
    const words = Math.max(0, Math.min(W.length, (L === 1 ? 1 : 0) + h - picAt));
    return { pic, words, W, full: words >= W.length, steps: picAt + W.length - (L === 1 ? 1 : 0) };
  }
  /* The stones, at most two rows at a time: a long run is split into sets of STONES_PER that swipe sideways
     (dots below jump between sets). After the last stone of a set, the frog hops on to the next set. */
  const STONES_PER = 10;
  function stonesHTML(idx, wi) {
    const stone = (x, j) =>
      j === st.k
        ? `<button class="stone cur" data-j="${j}" data-act="hop" aria-label="Hop to the next stone"><span class="stbg">${ART.stone(wi)}</span><span class="frog">${ART.frog()}</span></button>`
        : `<span class="stone ${j < st.k ? 'done' : ''}" data-j="${j}"><span class="stbg">${ART.stone(wi)}</span><b>${j < st.k ? '✓' : x + 1}</b></span>`;
    const set = (from) => {
      const xs = idx.slice(from, from + STONES_PER);
      return `<div class="stones" style="--cols:${Math.min(5, xs.length)}">${xs.map((x, q) => stone(x, from + q)).join('')}</div>`;
    };
    if (idx.length <= STONES_PER) return set(0);
    const sets = [];
    for (let j = 0; j < idx.length; j += STONES_PER) sets.push(j);
    const cur = Math.floor(st.k / STONES_PER);
    return `<div class="stsets" id="stsets">${sets.map((j) => `<div class="stset">${set(j)}</div>`).join('')}</div>
      <div class="stdots">${sets.map((j, q) => `<button class="${q === cur ? 'on' : ''}" data-act="stset" data-q="${q}" aria-label="Āyāt ${idx[j] + 1} to ${idx[Math.min(idx.length, j + STONES_PER) - 1] + 1}"></button>`).join('')}</div>`;
  }
  /* Where the stones lie, in each world: a pond with grassy banks, a forest stream, a lagoon on the beach,
     a river through the canyon, a starlit pool, the open sky with clouds, an icy river between snowbanks.
     A few of the world's own things stand on the banks. */
  const STREAMS = [
    { water: ['#86d9f2', '#3aa5d8'], props: ['meadow-flower-pink', 'meadow-grass', 'meadow-bush', 'meadow-flower-yellow'] },
    { water: ['#7fd0c4', '#2f8f86'], props: ['forest-fern', 'forest-mushroom', 'forest-pine', 'forest-berries'] },
    { water: ['#7ff0ef', '#1fb6cc'], bank: ['#ffe9b0', '#f2c477'], props: ['sands-palm', 'sands-shell', 'sands-crab', 'sands-starfish'] },
    { water: ['#79c4ec', '#2f80c8'], bank: ['#f2a65e', '#c8642e'], props: ['canyon-cactus', 'canyon-flower', 'canyon-mesa', 'canyon-lizard'] },
    { water: ['#5a4bb4', '#2a2270'], bank: ['#7d66c2', '#4f3f8c'], props: ['starry-mushroom', 'starry-crystal', 'starry-lantern', 'starry-star'], stars: true },
    { water: ['#eef5ff', '#c5d6ff'], bank: ['#ffffff', '#dfe6ff'], props: ['sky-balloon', 'sky-kite', 'sky-rainbow', 'sky-cloud'], sky: true },
    { water: ['#bfe8ff', '#7fc0ea'], bank: ['#ffffff', '#d4e6f6'], props: ['peak-pine', 'peak-rock', 'peak-snowman', 'peak-pine'], ice: true },
  ];
  function streamBack(wi) {
    const W = ART.WORLDS[wi],
      night = isNight(),
      sc = STREAMS[wi],
      g = sc.bank || W.ground;
    const dim = (c) => (night ? mixHex(c, '#151a45', 0.45) : c);
    const id = `stw${wi}${night ? 'n' : ''}`;
    // ripples on water; wisps in the sky; glints on ice; stars in the starlit pool
    const marks = sc.sky
      ? '<path d="M40 96q20-8 40 0M250 130q24-9 48 0M150 70q16-6 32 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>'
      : sc.stars
        ? [[40, 80], [120, 120], [200, 76], [300, 112], [360, 90], [90, 140], [260, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff6c9"/>`).join('')
        : `<path d="M30 90q14-6 28 0M120 130q16-7 32 0M230 84q14-6 28 0M320 128q14-6 28 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="${sc.ice ? 0.9 : 0.55}"/>`;
    const bank = (top) =>
      top
        ? `<path d="M0 0H400V30C340 44 300 24 240 34S120 48 60 32 10 38 0 36Z" fill="${dim(g[0])}"/><path d="M0 36C10 38 30 34 60 32S180 46 240 34 340 44 400 30V38C340 52 300 32 240 42S120 56 60 40 10 46 0 44Z" fill="${dim(g[1])}" opacity=".7"/>`
        : `<path d="M0 200H400V166C340 154 290 172 230 162S110 152 60 166 10 160 0 162Z" fill="${dim(g[0])}"/><path d="M0 162C10 160 20 166 60 166S170 152 230 162 340 154 400 166V172C340 162 290 180 230 170S110 160 60 174 10 168 0 170Z" fill="${dim(g[1])}" opacity=".7"/>`;
    const props = [
      [5, 'top', 46],
      [90, 'top', 40],
      [8, 'bot', 42],
      [92, 'bot', 50],
    ]
      .map(([left, at, size], j) => {
        const svg = ART.props[sc.props[j]] || '';
        const tall = /viewBox="0 0 100 150"/.test(svg);
        return svg ? `<span class="stprop ${at}" style="left:${left}%;width:${size}px;height:${tall ? size * 1.5 : size}px">${svg}</span>` : '';
      })
      .join('');
    return `<div class="stback" aria-hidden="true"><svg viewBox="0 0 400 200" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dim(sc.water[0])}"/><stop offset="1" stop-color="${dim(sc.water[1])}"/></linearGradient></defs><rect width="400" height="200" fill="url(#${id})"/>${marks}${bank(true)}${bank(false)}</svg>${props}</div>`;
  }
  /* keep the frog's set in view (only when it changes, so a child can look around), and the dots in step */
  function showStoneSet(smooth) {
    const el = document.getElementById('stsets');
    if (!el) return;
    const q = Math.floor(st.k / STONES_PER);
    if (el._q !== q) {
      el._q = q;
      el.scrollTo({ left: q * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    }
    const dots = () => {
      const at = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      el.nextElementSibling.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === at));
    };
    dots();
    if (!el._watch) {
      el._watch = true;
      el.addEventListener('scroll', dots, { passive: true });
    }
  }
  V.path = () => {
    const s = S[st.i],
      c = ctx(),
      idx = range(c),
      k = idx[st.k],
      a = s.ayat[k],
      L = st.L,
      wi = worldOf(s);
    const cl = pathClues(s, k, L, st.hint);
    const prev = st.k > 0 ? s.ayat[idx[st.k - 1]] : null;
    const shown = cl.full
      ? arHTML(s, a, k, { label: '💡 The whole āyah · tap to hear it', sm: true })
      : cl.words
        ? `<div class="first-word" lang="ar">${cl.W.slice(0, cl.words).join(' ')} …</div>`
        : '';
    return `<div class="screen" style="${cv(s.color)}">
    ${bar('Stepping Stones', `${s.name}${c.all ? ' · whole sūrah' : multi(s) ? ' · ' + partLabel(s, st.p) : ''}`, 'surah')}
    ${heartsBar()}
    <div class="stream w${wi}">${streamBack(wi)}${stonesHTML(idx, wi)}</div>
    <div class="row pathbtns">
      ${heartsOn() ? '<button class="btn wide" data-act="oops">🙈 Not quite</button>' : ''}
      <button class="btn go wide" data-act="hop">✅ Said it!</button>
    </div>
    <div class="card">
      <div class="lchead"><span class="lctags">${cl.pic ? tag(s, k) : `<span class="ayah-tag"><span class="num">${k + 1}</span>Āyah ${k + 1}</span>`}</span><span class="lcbtns">${speedChip()}${loopBtn()}</span></div>
      ${cl.pic ? sceneHTML(a) : `<div class="mystery-q">?</div>`}
      ${cl.pic ? gest(a) : ''}
      ${shown}
      ${cl.full ? '' : '<button class="hintbtn" data-act="hint" aria-label="A hint: one more word">💡 Hint</button>'}
    </div>
    ${coach(prev ? `What comes after ${pics(prev)}? Say <b>āyah ${k + 1}</b>, then tap the frog!` : `Say <b>āyah ${k + 1}</b>, then tap the frog to hop!`, `<span class="frogico">${ART.frog()}</span>`)}
  </div>`;
  };

  /* ---------- PICTURE PUZZLE: a jigsaw ---------- */
  /* Each āyah is a jigsaw piece with its picture. The edges interlock, so a piece only fits in its own place:
     left to right, row by row (or right to left, a Grown-up Corner choice). In the whole sūrah ("Big Puzzle"),
     each checkpoint becomes one big piece, and the big pieces fit together the same way. */
  const PZ_M = 24; // room around a 100-unit piece for its knobs
  const PZ_FILL = ['#ffd9e4', '#d5efff', '#ddf7d2', '#fff0c2', '#e8dcff', '#ffe2c8'];
  function seeded(n) {
    let a = n >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* The board: n pieces in `cols` columns, each piece's outline path (100 units a side, rounded corners,
     round knobs and holes that differ in size and place from edge to edge) and its cell. */
  const PZ_R = 9; // corner rounding
  function jigsaw(n, cols, seed, rtl) {
    const rnd = seeded(seed),
      rows = Math.ceil(n / cols);
    const at = (r, c) => {
      const j = r * cols + (rtl ? cols - 1 - c : c);
      return r >= 0 && c >= 0 && c < cols && j < n ? j : -1;
    };
    const E = {};
    const edge = (key) =>
      E[key] ||
      (E[key] = { d: rnd() < 0.5 ? 1 : -1, a: 0.4 + rnd() * 0.2, nw: 0.055 + rnd() * 0.025, hw: 0.11 + rnd() * 0.035, h: 0.17 + rnd() * 0.05 });
    // one side, from corner (x0,y0) to corner (x1,y1); out: +1 knob outwards, -1 hole, 0 straight
    const side = (x0, y0, x1, y1, e, out) => {
      const dx = x1 - x0,
        dy = y1 - y0,
        end = `L${x1 - (dx / 100) * PZ_R} ${y1 - (dy / 100) * PZ_R}`;
      if (!e || !out) return end;
      const a = out === e.d ? e.a : 1 - e.a, // the same spot seen from either piece
        { nw, hw, h } = e;
      const pt = (u, v) => `${(x0 + u * dx + v * out * dy).toFixed(1)} ${(y0 + u * dy - v * out * dx).toFixed(1)}`;
      // a neck that opens into a round head
      return (
        `L${pt(a - nw, 0)}C${pt(a - nw, h * 0.3)} ${pt(a - hw, h * 0.38)} ${pt(a - hw, h * 0.66)}` +
        `C${pt(a - hw, h * 1.06)} ${pt(a + hw, h * 1.06)} ${pt(a + hw, h * 0.66)}C${pt(a + hw, h * 0.38)} ${pt(a + nw, h * 0.3)} ${pt(a + nw, 0)}` +
        end
      );
    };
    const R = PZ_R;
    const cells = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const j = at(r, c);
        if (j < 0) continue;
        const up = at(r - 1, c) >= 0 ? edge(`v${r - 1},${c}`) : null,
          right = at(r, c + 1) >= 0 ? edge(`h${r},${c}`) : null,
          down = at(r + 1, c) >= 0 ? edge(`v${r},${c}`) : null,
          left = at(r, c - 1) >= 0 ? edge(`h${r},${c - 1}`) : null;
        const path =
          `M${R} 0` +
          side(0, 0, 100, 0, up, up ? -up.d : 0) +
          `Q100 0 100 ${R}` +
          side(100, 0, 100, 100, right, right ? right.d : 0) +
          `Q100 100 ${100 - R} 100` +
          side(100, 100, 0, 100, down, down ? down.d : 0) +
          `Q0 100 0 ${100 - R}` +
          side(0, 100, 0, 0, left, left ? -left.d : 0) +
          `Q0 0 ${R} 0Z`;
        cells[j] = { r, c, path };
      }
    return { cols, rows, cells, W: cols * 100 + 2 * PZ_M, H: rows * 100 + 2 * PZ_M };
  }
  const pieceSVG = (path, fill) =>
    `<svg class="pz-svg" viewBox="${-PZ_M} ${-PZ_M} ${100 + 2 * PZ_M} ${100 + 2 * PZ_M}" aria-hidden="true"><path d="${path}" fill="${fill}"/></svg>`;
  /* what the puzzle is made of: āyāt (a checkpoint, or a short sūrah) or, for the Big Puzzle, checkpoints */
  /* The Big Puzzle is the biggest puzzle of the sūrah: a long one (6 checkpoints or more) has a piece for
     each checkpoint; a shorter one is cut into about 8–12 even pieces of 1–3 āyāt (a sūrah of 9 āyāt: 9 pieces),
     so it is never just two or three pieces. */
  function bigGroups(s) {
    if (s.P.length >= 6) return s.P.map((P) => range(P));
    const N = s.ayat.length,
      n = Math.ceil(N / Math.ceil(N / 12)),
      out = [];
    for (let j = 0, k = 0; j < n; j++) {
      const size = Math.floor(N / n) + (j < N % n ? 1 : 0);
      out.push(range({ from: k, to: k + size - 1 }));
      k += size;
    }
    return out;
  }
  const groupLabel = (ks) => (ks.length === 1 ? String(ks[0] + 1) : `${ks[0] + 1}–${ks[ks.length - 1] + 1}`);
  function puzzleItems() {
    const s = S[st.i];
    // the pictures sit in the middle of the piece, clear of the holes (a third picture goes on a second row)
    const fit = (a) => `<span class="pics pzpics n${a.scene.length}">${a.scene.map((e) => `<span class="e">${e}</span>`).join('')}</span>`;
    if (st.p === 'all')
      return bigGroups(s).map((ks) =>
        ks.length === 1
          ? { html: fit(s.ayat[ks[0]]), say: ks, label: `āyah ${ks[0] + 1}` }
          : {
              html: `<span class="pzgroup"><span class="gm">${ks.map((k) => s.ayat[k].scene[0]).join('')}</span><b>${groupLabel(ks)}</b></span>`,
              say: ks,
              label: `āyāt ${groupLabel(ks)}`,
            },
      );
    return range(ctx()).map((k) => ({ html: fit(s.ayat[k]), say: [k], label: `āyah ${k + 1}`, ar: s.ayat[k].ar }));
  }
  V.order = () => {
    const s = S[st.i],
      big = st.p === 'all',
      items = puzzleItems(),
      n = items.length;
    const J = jigsaw(n, n <= 4 ? 2 : 3, s.n * 10 + (big ? 9 : st.p), prefs.pzrtl);
    const pct = (v, of) => ((v / of) * 100).toFixed(3) + '%';
    const box = (c, r, pad) => `left:${pct(c * 100 + pad, J.W)};top:${pct(r * 100 + pad, J.H)};width:${pct(100 + 2 * (PZ_M - pad), J.W)};height:${pct(100 + 2 * (PZ_M - pad), J.H)}`;
    const outlines = J.cells
      .map((cl, j) => (st.placed[j] ? '' : `<g data-j="${j}" transform="translate(${cl.c * 100} ${cl.r * 100})"><path class="pz-hole" d="${cl.path}"/><text x="50" y="62" text-anchor="middle">${big ? groupLabel(items[j].say) : range(ctx())[j] + 1}</text></g>`))
      .join('');
    const saying = st.say != null ? items[st.say] : null;
    const slots = J.cells
      .map((cl, j) =>
        st.placed[j]
          ? `<button class="pzp" style="${box(cl.c, cl.r, 0)}" data-act="pzsay" data-j="${j}" aria-label="Hear ${items[j].label}">${pieceSVG(cl.path, PZ_FILL[j % PZ_FILL.length])}<span class="pzbody">${items[j].html}</span></button>`
          : `<button class="slot pzslot ${st.sel != null ? 'ready' : ''}" style="${box(cl.c, cl.r, PZ_M)}" data-act="slot" data-j="${j}" aria-label="Place for ${items[j].label}"></button>`,
      )
      .join('');
    const left = st.deck.filter((j) => !st.placed[j]);
    const full = !left.length;
    return `<div class="screen" style="${cv(s.color)}">
    ${bar(big ? 'Big Puzzle' : 'Picture Puzzle', `${s.name}${big ? ' · whole sūrah' : multi(s) ? ' · ' + partLabel(s, st.p) : ''}`, 'surah')}
    ${heartsBar()}
    ${coach(
      full
        ? 'All in place! 🎉'
        : st.sel != null
          ? 'Now tap the place where it fits!'
          : saying
            ? `🗣️ <b>Say ${saying.label}!</b>${!big && prefs.actions ? ` ${s.ayat[saying.say[0]].gesture}` : ''} Then the next piece.`
            : big
              ? s.P.length >= 6
                ? 'Each checkpoint is a big piece. <b>Drag</b> them together in order!'
                : 'The whole sūrah in one puzzle. <b>Drag</b> every piece into its place!'
              : '<b>Drag</b> each piece to where it fits, and say that āyah! Each piece fits in only one place.',
      '🧩',
    )}
    <div class="pzboard ${full ? 'full' : ''}" style="aspect-ratio:${J.W}/${J.H}">
      <svg class="pz-holes" viewBox="${-PZ_M} ${-PZ_M} ${J.W} ${J.H}" aria-hidden="true">${outlines}</svg>
      ${slots}
    </div>
    <div class="deck pzdeck">${left.map((j) => `<div class="pcard pzt ${st.sel === j ? 'sel' : ''}" data-k="${j}" role="button" aria-label="Puzzle piece">${pieceSVG(J.cells[j].path, PZ_FILL[j % PZ_FILL.length])}<span class="pzbody">${items[j].html}</span></div>`).join('')}</div>
    ${saying && !big ? `<details class="adult"><summary>👁️ Grown-up check · ${saying.label}</summary><div class="ar sm" lang="ar">${s.ayat[saying.say[0]].ar}</div></details>` : ''}
  </div>`;
  };

  /* ---------- DONE ---------- */
  /* the waiting gifts: a small gift box that rattles, with how many are waiting */
  const giftArt = (g, open) => ART.gift({ tier: giftTier(g), open: !!open, kind: g.k === 'i' ? 'item' : 'sticker' });
  function giftIcon(prof, cls) {
    const n = prof.pending.length;
    if (!n) return '';
    return `<button class="icon-btn giftico ${cls || ''}" data-act="opengift" aria-label="${n} gift${n > 1 ? 's' : ''} to open"><span class="rattle">${giftArt(prof.pending[0])}</span><span class="badge">${n}</span></button>`;
  }
  function nextPrizeNote(prof) {
    const nx = nextPrize(prof);
    if (!nx) return '';
    const left = nx.track - totalStars(prof),
      prev = TRACK.filter((it) => it.track <= totalStars(prof)).slice(-1)[0],
      from = prev ? prev.track : 0;
    const pct = Math.round(((totalStars(prof) - from) / (nx.track - from)) * 100);
    return `<div class="nextprize"><span class="np-sil">${ART.silhouette(nx.id, prof.look)}</span><span><b>${left} more star${left > 1 ? 's' : ''}</b> to your next prize!<i class="np-bar"><i style="width:${pct}%"></i></i></span></div>`;
  }
  function giftTier(g) {
    if (!g) return 1;
    return g.k === 'i' ? Math.max(1, ITEM[g.id].tier || 1) : 1;
  }
  V.done = () => {
    const s = S[st.i];
    const plain = st.plain; // Word Steps keeps its celebration emoji-free
    const nst = st.stars == null ? 1 : st.stars; // the Big Puzzle gives no star
    const stars = plain ? `<span class="tstar">★</span>`.repeat(nst) : '<span>⭐</span>'.repeat(nst);
    const prof = P();
    // a recovered item flies back onto the sad explorer, who then smiles (and shines when nothing else is lost)
    const found =
      st.found && st.found.length
        ? (() => {
            const without = Object.assign(wornOutfit(prof), { sticker: prof.badge });
            st.found.forEach((id) => {
              if (without[ITEM[id].slot] === id) delete without[ITEM[id].slot];
            });
            const fly = st.found.map((id, k) => `<span class="rv-fly" style="animation-delay:${0.35 + k * 0.25}s">${itemPic(id)}</span>`).join('');
            return `<div class="found shine"><span class="recov"><span class="rv-sad">${ART.explorer(prof.look, without, { view: 'front', mood: 'sad' })}</span><span class="rv-happy">${explorer({ view: 'front', mood: prof.lost.length ? 'none' : 'shine' })}</span>${fly}</span><span>You got your <b>${st.found.map((id) => itemName(id)).join(' and ')}</b> back!${prof.lost.length ? '' : ' Your explorer is shining again!'}</span></div>`;
          })()
        : '';
    const world = st.world
      ? `<div class="worlddone"><b>🌍 World ${st.world.wi + 1} complete!</b><span>${esc(WORLDS[st.world.wi].name)}: a star in every sūrah.</span>${st.world.heart ? `<span class="hup">${ART.heart(true)} +1 heart! You now have ${st.world.hearts} hearts in review games.</span>` : ''}</div>`
      : '';
    const g = prof.pending[0];
    return `<div class="screen donescr" style="${cv(s.color)}">
    <div class="dtop">
    ${plain ? `<div class="medal"><span>★</span></div>` : `<div class="big">${st.big || '🎉'}</div>`}
    <h2>MāshāAllāh!</h2>
    <p>${st.msg}</p>
    <div class="trophy-stars">${stars}</div>
    </div>
    <div class="dbody">
    ${st.allStars ? `<div class="memo gold">🌟 Every star in <b>${s.name}</b>! A golden treasure is waiting for you.</div>` : ''}
    ${found}
    ${world}
    ${st.cpGift ? `<div class="memo">🚩 Checkpoint crossed! A little gift for you.</div>` : ''}
    ${st.prizes ? `<div class="memo">⭐ ${totalStars()} stars! ${st.prizes > 1 ? st.prizes + ' prizes' : 'A prize'} for you.</div>` : ''}
    ${st.badge ? `<div class="memo gold">🏅 ${st.badge}! A special badge for you.</div>` : ''}
    ${st.rides ? `<div class="memo gold">🚀 A whole world all golden! A special ride is waiting for you.</div>` : ''}
    ${nextPrizeNote(prof)}
    ${g ? `<button class="giftbtn dgift" data-act="opengift"><span class="rattle">${giftArt(g)}</span>${prof.pending.length > 1 ? `<span class="badge">${prof.pending.length}</span>` : ''}<b>${prof.pending.length > 1 ? prof.pending.length + ' gifts' : 'A gift'} for you!</b><small>Tap to open</small></button>` : ''}
    <div class="row drow">
      ${st.nextAct ? `<button class="btn go wide" data-act="${st.nextAct}" ${st.nextP != null ? `data-p="${st.nextP}"` : ''}>${st.nextLabel}</button>` : ''}
      <button class="btn wide" data-act="back" data-to="surah">🧭 Back to ${s.name}</button>
    </div>
    <div class="row"><button class="btn small" data-act="back" data-to="map">🗺️ Map</button>${g ? '<button class="btn small" data-act="savefile">💾 Save progress</button>' : ''}</div>
    </div>
  </div>`;
  };

  /* ---------- MY EXPLORER (wardrobe + collection) ---------- */
  /* newest win first: position in prof.got (higher = newer), -1 if never won */
  const gotAt = (prof, key) => prof.got.indexOf(key);
  function itemCell(it, prof, worn) {
    const owned = starter(it) || prof.items.includes(it.id);
    const lost = prof.lost.find((x) => x.id === it.id);
    const on = worn[it.slot] === it.id || (!worn[it.slot] && wornByDefault(it));
    if (lost)
      return `<button class="icell lost" data-act="goto" data-i="${BYN[lost.n].idx}"><span class="iart">${itemPic(it.id)}</span><span class="lostbadge">${ART.lostMarker()}</span><small>Lost at ${BYN[lost.n].name}!</small></button>`;
    if (owned)
      return `<button class="icell t${it.tier || 0} ${it.gold ? 'gold' : ''} ${on ? 'on' : ''}" data-act="equip" data-id="${it.id}" aria-pressed="${on}"><span class="iart">${itemPic(it.id)}</span><small>${itemName(it.id)}</small>${prefs.stranger && blocksOf(it.id).length ? `<span class="iblk" aria-label="Blocks ${blocksOf(it.id).map((k) => THROW[k].name).join(', ')}">${blocksOf(it.id).map((k) => THROW[k].ic).join('')}</span>` : ''}${prof.fresh.includes('i:' + it.id) ? NEWDOT : ''}</button>`;
    return `<div class="icell locked ${it.gold || it.wgold ? 'goldlock' : ''}"><span class="iart">${ART.silhouette(it.id, P().look)}</span><small>${it.wgold ? `World ${it.wgold} all golden` : it.quest ? 'Stand up to the Stranger' : it.feat ? FEAT_HINT[it.feat] : it.drop ? 'A surprise gift' : it.track ? `At ${it.track} ⭐` : it.gold ? `Every star in ${BYN[it.from].name}` : `A star in ${BYN[it.from].name}`}</small></div>`;
  }
  function stickerCell(id, prof) {
    const on = prof.badge === id;
    return `<button class="scell ${on ? 'on' : ''}" data-act="stick" data-id="${id}" aria-pressed="${on}">${ART.sticker(id)}<small>${STICKER[id].name}</small>${prof.fresh.includes('s:' + id) ? NEWDOT : ''}</button>`;
  }
  /* My Explorer: the explorer always stays in view. Only the bottom part changes: a row of categories
     (a dot marks the ones with something new) and that category's things, newest first, in a row that
     scrolls sideways. */
  V.bag = () => {
    const prof = P(),
      tab = st.tab || 'hat',
      worn = wornOutfit(prof);
    const tabs = [...SLOTS.filter((t) => t !== 'hijab' || kidOf(prof) === 'girl'), 'stickers']
      .map((t) => {
        const ic = t === 'stickers' ? '⭐' : t === 'stick' ? STICK_IC : SLOT_INFO[t][0];
        const nm = t === 'stickers' ? 'Stickers' : SLOT_INFO[t][1];
        const isNew = prof.fresh.some((k) => (t === 'stickers' ? k[0] === 's' : k[0] === 'i' && ITEM[k.slice(2)].slot === t));
        return `<button class="wtab ${tab === t ? 'on' : ''} ${isNew ? 'hasnew' : ''}" data-act="tab" data-t="${t}"><span>${ic}</span><small>${nm}</small>${isNew ? NEWDOT : ''}</button>`;
      })
      .join('');
    let body;
    if (tab === 'look') body = `<div class="wscroll-v">${lookControls(prof)}</div>`;
    else if (tab === 'stickers') {
      const mine = prof.stickers.slice().sort((a, b) => gotAt(prof, 's:' + b) - gotAt(prof, 's:' + a));
      const locked = ART.STICKERS.filter((x) => !prof.stickers.includes(x.id));
      const badges = ART.BADGES.map((b) => (prof.stickers.includes(b.id) ? stickerCell(b.id, prof) : `<div class="scell locked badge"><span class="q">🏅</span><small>At ${b.stars} ⭐</small></div>`)).join('');
      body = `<div class="wrow">${mine.filter((id) => !STICKER[id].stars).map((id) => stickerCell(id, prof)).join('')}${locked.map(() => `<div class="scell locked"><span class="q">?</span><small>A gift to win</small></div>`).join('')}${badges}</div>
      <p class="wnote2">${mine.length ? 'Tap a sticker to stick it on. Tap again to take it off.' : 'Finish games to win stickers.'} ${prof.stickers.filter((id) => !STICKER[id].stars).length} of ${ART.STICKERS.length} stickers · 🏅 a badge every 100 stars</p>`;
    } else {
      // won things newest first, then the starting clothes, then the ones still to find
      const list = ITEMS.filter((it) => it.slot === tab && forKid(it, prof) && (!it.gold || prof.items.includes(it.id) || prof.items.includes(it.base)));
      const won = list.filter((it) => !starter(it) && prof.items.includes(it.id)).sort((a, b) => gotAt(prof, 'i:' + b.id) - gotAt(prof, 'i:' + a.id));
      const rank = (it) => (starter(it) ? 0 : it.drop ? 1500 : it.track ? 2000 + it.track : 1000); // to find: sūrah treasures, surprises, the star track
      const rest = list.filter((it) => !won.includes(it)).sort((a, b) => rank(a) - rank(b));
      body = `<div class="wrow">${[...won, ...rest].map((it) => itemCell(it, prof, worn)).join('')}</div><p class="wnote2">${SLOT_INFO[tab][1]} · tap to wear, tap again to take off${nextPrize(prof) ? ` · next prize at ${nextPrize(prof).track} ⭐` : ''}</p>`;
    }
    const fancy = Object.values(worn).some((id) => !starter(ITEM[id])) || prof.badge;
    const comfy = prof.stash
      ? `<button class="wd-side wd-comfy on" data-act="comfy" aria-label="Put my things back on">✨<small>Back</small></button>`
      : `<button class="wd-side wd-comfy" data-act="comfy" ${fancy ? '' : 'disabled'} aria-label="Just comfy clothes">👕<small>Comfy</small></button>`;
    return `<div class="screen bagscr">
    ${bar('My Explorer', prof.name ? esc(prof.name) : 'Dress up and collect', 'map', giftIcon(prof, 'inbar') + `<button class="mebtn ${tab === 'look' ? 'on' : ''}" data-act="tab" data-t="${tab === 'look' ? 'hat' : 'look'}" aria-label="Change my name and how I look" aria-pressed="${tab === 'look'}">${tab === 'look' ? '✓ Done' : '✏️ My look'}</button>`)}
    <div class="wd-stage"><button class="wd-ex" data-act="exmove" aria-label="Tap your explorer">${explorer({ view: st.backView ? 'back' : 'front' })}</button>${comfy}<button class="wd-side wd-turn" data-act="turn" aria-label="Turn around">↻<small>Turn</small></button><button class="wd-side wd-show" data-act="show" aria-label="My achievements">🏆<small>Awards</small></button></div>
    <div class="wtwrap"><div class="wtabs" id="wtabs">${tabs}</div><button class="cpmore cpless" data-act="wtscroll" data-d="-1" aria-label="Earlier categories">‹</button><button class="cpmore" data-act="wtscroll" data-d="1" aria-label="More categories">›</button></div>
    <div class="wbody">${body}</div>
  </div>`;
  };

  // My Explorer: swipe left or right on the explorer to turn them around
  let swipe = null;
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (st.view !== 'bag' || !e.target.closest || !e.target.closest('.wd-stage')) return;
      swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerup',
    (e) => {
      const sw0 = swipe;
      swipe = null;
      if (!sw0 || st.view !== 'bag') return;
      const dx = e.clientX - sw0.x,
        dy = e.clientY - sw0.y;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - sw0.t < 800) {
        sfx.whoosh();
        st.backView = !st.backView;
        swiped = Date.now();
        render();
      }
    },
    { passive: true },
  );
  let swiped = 0;

  /* ---------- MY ACHIEVEMENTS: the explorer in their world, with what they've done ---------- */
  function achievements(prof) {
    let ayat = 0;
    S.forEach((s) => {
      const r = prof.prog[s.n];
      s.P.forEach((P0, p) => {
        const x = r && r.parts[p];
        if (!x) return;
        if (x.learn) ayat += P0.to - P0.from + 1;
        else for (let b = x.la; b; b >>= 1) ayat += b & 1;
      });
    });
    return {
      stars: totalStars(prof),
      surahs: doneSurahs(prof),
      memorized: S.filter((s) => surahDone(s, prof)).length,
      ayat,
      allAyat: S.reduce((t, s) => t + s.ayat.length, 0),
      items: prof.items.length,
      badges: prof.stickers.filter((id) => STICKER[id].stars).length,
      time: prof.time || 0,
    };
  }
  function fmtTime(sec) {
    const m = Math.round(sec / 60);
    if (m < 1) return sec > 0 ? 'under a minute' : 'not yet';
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
  }
  const ACH_ROWS = (a) => [
    ['⭐', `${a.stars}`, `of ${MAX_STARS} stars`],
    ['📖', `${a.surahs}`, `of ${S.length} sūrahs started`],
    ['🏆', `${a.memorized}`, 'sūrahs memorized'],
    ['🗣️', `${a.ayat}`, `of ${a.allAyat} āyāt learned`],
    ['🎁', `${a.items}`, 'treasures found'],
    ['🏅', `${a.badges}`, a.badges === 1 ? 'star badge' : 'star badges'],
    ['⏱️', fmtTime(a.time), 'spent learning'],
  ];
  V.show = () => {
    const prof = P(),
      a = achievements(prof);
    return `<div class="screen showscr">
    ${bar('My Achievements', prof.name ? esc(prof.name) : 'Explorer', 'bag')}
    <div class="show-stage"><button class="wd-ex" data-act="exmove" aria-label="Tap your explorer">${explorer({ view: 'front' })}</button></div>
    <div class="achgrid">${ACH_ROWS(a)
      .map(([ic, big, sub]) => `<div class="ach"><span class="ach-ic">${ic}</span><b>${big}</b><small>${sub}</small></div>`)
      .join('')}</div>
    <div class="row"><button class="btn go wide" data-act="share">📤 Share</button></div>
    <p class="saveinfo center">Learning time counts while the game is open and being used. It's kept on this device only.</p>
  </div>`;
  };
  /* Share: the achievements page drawn as a picture (an SVG drawn into a canvas), handed to the phone's share
     sheet, or downloaded where sharing files isn't possible. Nothing is uploaded anywhere. */
  let fontData = null;
  function fontURL() {
    if (fontData) return Promise.resolve(fontData);
    return fetch('fonts/baloo-2-latin.woff2')
      .then((r) => r.blob())
      .then((b) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res((fontData = fr.result)); fr.readAsDataURL(b); }))
      .catch(() => '');
  }
  async function shareCard() {
    const prof = P(),
      a = achievements(prof),
      wi = worldOf(S[prof.at] || S[0]),
      W = ART.WORLDS[wi];
    const font = await fontURL();
    const X = 1080,
      Y = 1350;
    const props = (ART.PROPS_BY_WORLD[wi] || [])
      .filter((n) => n !== 'peak-summit')
      .slice(0, 5)
      .map((n, j) => {
        const sv = ART.props[n] || '';
        const tall = /viewBox="0 0 100 150"/.test(sv),
          w = [150, 110, 130, 160, 100][j],
          h = tall ? w * 1.5 : w,
          x = [40, 250, 690, 880, 560][j];
        return sv.replace('<svg ', `<svg x="${x}" y="${720 - h}" width="${w}" height="${h}" `);
      })
      .join('');
    const ex = explorer({ view: 'front' }).replace('<svg ', '<svg x="345" y="180" width="400" height="600" ');
    const rows = ACH_ROWS(a);
    const cells = rows
      .map(([ic, big, sub], j) => {
        const col = j % 2,
          row = Math.floor(j / 2),
          x = 80 + col * 470,
          y = 790 + row * 110;
        return `<g transform="translate(${x} ${y})"><rect width="450" height="96" rx="28" fill="#ffffff" fill-opacity=".92"/><text x="30" y="64" font-size="46">${ic}</text><text x="100" y="52" font-size="40" font-weight="800" fill="#2b2340">${esc(big)}</text><text x="100" y="82" font-size="24" font-weight="700" fill="#6b6385">${esc(sub)}</text></g>`;
      })
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${X}" height="${Y}" viewBox="0 0 ${X} ${Y}">
      <style>${font ? `@font-face{font-family:'Baloo 2';src:url(${font}) format('woff2');font-weight:400 800}` : ''}text{font-family:'Baloo 2',ui-rounded,system-ui,sans-serif}</style>
      ${ART.defs().replace(/^<svg[^>]*>|<\/svg>$/g, '')}
      <defs><linearGradient id="shsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W.sky[0]}"/><stop offset="1" stop-color="${W.sky[1]}"/></linearGradient></defs>
      <rect width="${X}" height="${Y}" fill="url(#shsky)"/>
      <path d="M0 700C220 650 420 690 600 680S900 650 1080 690V${Y}H0Z" fill="${W.ground[0]}"/><path d="M0 760C260 730 520 770 760 750S980 740 1080 760V${Y}H0Z" fill="${W.ground[1]}"/>
      ${props}
      <ellipse cx="540" cy="762" rx="100" ry="15" fill="#2b2340" opacity=".15"/>
      ${ex}
      <text x="540" y="96" text-anchor="middle" font-size="64" font-weight="800" fill="#2b2340">${esc(prof.name || 'Explorer')}</text>
      <text x="540" y="146" text-anchor="middle" font-size="30" font-weight="700" fill="#2b2340" opacity=".75">Little Hafiz Quest · Juz ‘Amma by heart</text>
      ${cells}
      <text x="540" y="1318" text-anchor="middle" font-size="24" font-weight="700" fill="#2b2340" opacity=".7">${esc(location.host + location.pathname.replace(/[^/]*$/, ''))}</text>
    </svg>`;
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    const cv2 = document.createElement('canvas');
    cv2.width = X;
    cv2.height = Y;
    cv2.getContext('2d').drawImage(img, 0, 0, X, Y);
    const blob = await new Promise((res) => cv2.toBlob(res, 'image/png'));
    const name = `${(prof.name || 'explorer').replace(/[^\w-]+/g, '-')}-little-hafiz-quest.png`;
    card = { blob, name, file: new File([blob], name, { type: 'image/png' }), url: cv2.toDataURL('image/png') };
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [card.file] }));
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card sharecard"><img class="shareimg" src="${card.url}" alt="${esc(prof.name || 'My explorer')} on Little Hafiz Quest">
      <p class="saveinfo center">Share it with family, or save the picture. On a phone you can also press and hold the picture to save it to your photos.</p>
      <div class="row">${canShare ? '<button class="btn go wide" data-act="sharego">📤 Share</button>' : ''}<button class="btn wide ${canShare ? '' : 'go'}" data-act="sharesave">⬇️ Save picture</button></div>
      <div class="row"><button class="btn small" data-act="cno">Close</button></div></div>`;
    m.classList.add('show');
  }
  let card = null; // the last picture made for sharing
  async function shareGo() {
    if (!card) return;
    try {
      await navigator.share({ files: [card.file], title: 'Little Hafiz Quest', text: `${P().name || 'My explorer'} on Little Hafiz Quest` });
    } catch (e) {} // the share sheet was closed
  }
  function shareSave() {
    if (!card) return;
    const u = URL.createObjectURL(card.blob);
    const aEl = document.createElement('a');
    aEl.href = u;
    aEl.download = card.name;
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast('Picture saved to your downloads');
  }

  /* ---------- EXPLORERS: switch, add, share & sync, back up, start again ---------- */
  /* On the start screen, outside the quest. Remove and Reset need a press and hold (the border fills up). */
  const holdBtn = (act, label, data, tip) =>
    `<button class="btn small danger holdbtn" data-hold="${act}" ${data || ''} data-tip="${tip}"><svg class="holdring" aria-hidden="true"><rect width="100%" height="100%" rx="14" pathLength="100"/></svg>${label}</button>`;
  // an explorer's stars and sūrahs, as on the map
  const exStats = (p) => `<small class="exstats"><span aria-label="stars">⭐ ${totalStars(p)}</span><span aria-label="sūrahs">📖 ${doneSurahs(p)}</span></small>`;
  V.explorers = () => {
    const prof = P(),
      nm = prof.name ? esc(prof.name) : 'this explorer';
    const rows = store.profiles
      .map((p) => {
        const on = p.id === store.cur;
        return `<div class="exrow ${on ? 'on' : ''}"><button class="exsel" data-act="pickprof" data-id="${p.id}" aria-pressed="${on}"><span class="phead">${explorer({ view: 'front', cls: 'mini' }, p)}</span><span><b>${p.name ? esc(p.name) : 'Explorer'}</b>${exStats(p)}</span></button>
          <button class="btn small" data-act="editlook" data-id="${p.id}" aria-label="Change look">✏️</button>${holdBtn('delprof', 'Remove', `data-id="${p.id}"`, `Press and hold to remove ${p.name ? esc(p.name) : 'this explorer'}`)}</div>`;
      })
      .join('');
    return `<div class="screen exscr">
    ${bar('Explorers', noExplorers() ? 'Add one for each child (or grown-up)' : `${store.profiles.length} on this phone`, 'splash')}
    <div class="sheet">
      <h3>🧒 Your explorers</h3>
      ${rows}
      ${store.profiles.length < MAX_EXPLORERS ? '<div class="setrow" style="justify-content:center"><button class="btn small" data-act="newprof">➕ Add explorer</button></div>' : `<p class="saveinfo center">${MAX_EXPLORERS} explorers is the most for one phone.</p>`}
    </div>
    ${
      noExplorers()
        ? ''
        : `<div class="sheet">
      <h3>👨‍👩‍👧 Family sync · ${nm}</h3>
      <p class="saveinfo">Practicing on more than one phone? Share ${nm}'s progress with a link or QR code, and the other phone adds it to theirs. Nothing is stored online.</p>
      <div class="row"><button class="btn go wide" data-act="syncshare">📤 Share progress</button></div>
      <div class="row"><button class="btn wide" data-act="syncpaste">📋 Paste from family</button></div>
    </div>`
    }
    ${noExplorers() ? `<div class="sheet"><h3>👨‍👩‍👧 Family sync</h3><div class="setrow" style="justify-content:center"><button class="btn small" data-act="syncpaste">📋 Paste from family</button></div></div>` : ''}
    <div class="sheet">
      <h3>💾 Backup</h3>
      <p class="saveinfo">A file with every explorer on this phone, in case its storage is cleared. Load it back any time.</p>
      <div class="setrow" style="justify-content:center;gap:10px"><button class="btn small" data-act="savefile" ${noExplorers() ? 'disabled' : ''}>💾 Save progress</button><button class="btn small" data-act="loadfile">📂 Load progress</button><input type="file" id="loadfile" accept=".json,application/json" hidden></div>
    </div>
    ${
      noExplorers()
        ? ''
        : `<div class="sheet">
      <h3>🔄 Start again · ${nm}</h3>
      <p class="saveinfo">One sūrah, or every star. Treasures already found stay. Resets stay on this phone (a sync can bring stars back from another phone).</p>
      <div class="setrow"><select class="selbox" id="resetSel" style="max-width:none;flex:1">${S.map((s, i) => `<option value="${i}">${s.n}. ${s.name} (⭐ ${surahStars(s)})</option>`).join('')}</select>
        ${holdBtn('resetone', 'Reset', '', 'Press and hold to reset this sūrah')}</div>
      <div class="setrow" style="justify-content:center">${holdBtn('reset', '🔄 Reset every star', '', `Press and hold to reset all of ${nm}'s stars`)}</div>
    </div>`
    }
  </div>`;
  };
  // press and hold: the border fills up, then the action happens
  const HOLD_MS = 1600;
  let holding = null;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('[data-hold]');
    if (!b) return;
    b._fired = false;
    b.classList.add('holding');
    holding = { b, t: setTimeout(() => {
      b._fired = true;
      b.classList.remove('holding');
      holding = null;
      runHold(b);
    }, HOLD_MS) };
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    document.addEventListener(
      ev,
      (e) => {
        if (!holding || (ev === 'pointerleave' && e.target !== holding.b)) return; // only leaving the button itself
        clearTimeout(holding.t);
        holding.b.classList.remove('holding');
        holding = null;
      },
      true,
    ),
  );
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('[data-hold]')) e.preventDefault(); // a long press is the hold, not a menu
  });
  function runHold(b) {
    const act = b.dataset.hold;
    if (act === 'delprof') {
      const p = store.profiles.find((x) => x.id === b.dataset.id);
      if (!p) return;
      store.profiles = store.profiles.filter((x) => x.id !== p.id);
      if (store.cur === p.id) store.cur = store.profiles.length ? store.profiles[0].id : '';
      nobody = null;
      save(true);
      toast(`${p.name || 'The explorer'} was removed`);
    } else if (act === 'resetone') {
      const x = S[+document.getElementById('resetSel').value];
      delete P().prog[x.n];
      save();
      toast(`${x.name} reset ✨`);
    } else if (act === 'reset') {
      P().prog = {};
      P().lost = [];
      save();
      toast('All stars reset ✨');
    }
    sfx.boop();
    render();
  }

  /* ---------- FAMILY SYNC: one explorer, as a link or a QR code (js/sync.js) ---------- */
  const SYNC = window.LHQ_SYNC;
  const syncCtx = () => ({ surahs: S, items: ITEMS, stickers: [...ART.STICKERS, ...ART.BADGES], looks: ART.LOOKS, slots: SLOTS });
  const appURL = () => location.origin + location.pathname.replace(/index\.html$/, '');
  function qrSVG(text) {
    const q = window.qrcode(0, 'L');
    q.addData(text, 'Byte');
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg class="qrsvg" viewBox="-4 -4 ${n + 8} ${n + 8}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  V.syncshare = () => {
    const prof = P(),
      nm = prof.name ? esc(prof.name) : 'Explorer';
    return `<div class="screen">
    ${bar('Share progress', nm, 'explorers')}
    <div class="sheet syncsheet">
      <div class="syncwho"><span class="phead">${explorer({ view: 'front', cls: 'mini' })}</span><span><b>${nm}</b>${exStats(prof)}</span></div>
      ${st.link ? `<div class="qrbox">${qrSVG(st.link)}</div>` : '<div class="qrbox wait">Making the code…</div>'}
      <p class="saveinfo center">Point the other phone's camera at the QR code, or send the link. Opening it adds ${nm}'s progress to that phone.</p>
      <div class="row"><button class="btn go wide" data-act="synclink" ${st.link ? '' : 'disabled'}>📤 Share</button><button class="btn wide" data-act="synccopy" ${st.link ? '' : 'disabled'}>📋 Copy</button></div>
      <p class="saveinfo center small">The link holds ${nm}'s progress (stars, treasures and look). It isn't stored anywhere online.</p>
    </div>
  </div>`;
  };
  function openShare() {
    go('syncshare', { link: '' });
    SYNC.encode(P(), syncCtx())
      .then((code) => {
        if (st.view === 'syncshare') {
          st.link = `${appURL()}#sync=${code}`;
          render();
        }
      })
      .catch(() => toast("The code couldn't be made on this phone."));
  }
  function copyText(t, done) {
    const ok = () => toast(done || 'Copied');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => prompt('Copy this:', t));
    else prompt('Copy this:', t);
  }
  /* receiving: from a link (#sync=…) or pasted */
  const codeIn = (text) => {
    const m = String(text || '').match(/sync=([A-Za-z0-9_-]{8,})/) || String(text || '').trim().match(/^([A-Za-z0-9_-]{16,})$/);
    return m ? m[1] : '';
  };
  let incoming = null; // { from (cleaned explorer), link, target }
  function openSync(code, link) {
    SYNC.decode(code, syncCtx())
      .then((raw) => {
        const from = cleanProfile(raw);
        if (!from) throw new Error('bad');
        from.made = true;
        const match = store.profiles.find((p) => p.id === from.id) || store.profiles.find((p) => p.name && p.name === from.name);
        incoming = { from, link, sameThings: raw.sameThings, noColors: raw.look.tee == null, target: match ? match.id : store.profiles.length ? '' : 'new' };
        showSync();
      })
      .catch((e) => toast(e && e.message === 'nozip' ? 'This browser is too old to read it. Please update the browser.' : "That progress link didn't work. Ask for a new one."));
  }
  const thingsOf = (p) => p.items.length + p.stickers.length;
  function preview(target) {
    const from = incoming.from;
    if (target === 'new') return { stars: totalStars(from), plus: totalStars(from), things: thingsOf(from) };
    const into = store.profiles.find((p) => p.id === target);
    const copy = JSON.parse(JSON.stringify(into));
    mergeInto(copy, from);
    return { stars: totalStars(copy), plus: totalStars(copy) - totalStars(into), things: thingsOf(copy) - thingsOf(into) };
  }
  function showSync() {
    const m = document.getElementById('modal'),
      from = incoming.from,
      nm = from.name ? esc(from.name) : 'An explorer';
    const choices = [...store.profiles.map((p) => [p.id, p.name ? esc(p.name) : 'Explorer', p]), ...(store.profiles.length < MAX_EXPLORERS ? [['new', '➕ New explorer', null]] : [])];
    const pick = incoming.target;
    const pv = pick ? preview(pick) : null;
    m.innerHTML = `<div class="card synccard">
      <div class="syncwho big"><span class="phead">${ART.explorer(from.look, Object.assign({}, from.outfit, { sticker: from.badge }), { view: 'front', cls: 'mini' })}</span><span><b>Sync ${nm}'s progress?</b><small>⭐ ${totalStars(from)} stars from another phone</small></span></div>
      ${store.profiles.length ? `<p class="saveinfo">Which explorer on this phone is ${nm}?</p><div class="synclist">${choices.map(([id, label, p]) => `<button class="syncopt ${pick === id ? 'on' : ''}" data-act="synctarget" data-id="${id}">${p ? `<span class="phead">${explorer({ view: 'front', cls: 'mini' }, p)}</span>` : ''}<span>${label}${p ? `<small>⭐ ${totalStars(p)}</small>` : ''}</span></button>`).join('')}</div>` : ''}
      ${pv ? `<p class="syncsum">${pick === 'new' ? `A new explorer with ⭐ ${pv.stars} stars` : pv.plus > 0 || pv.things > 0 ? `+${pv.plus} star${pv.plus === 1 ? '' : 's'} · ${pv.things} new treasure${pv.things === 1 ? '' : 's'} · ⭐ ${pv.stars} in all` : 'Already up to date: nothing new'}</p>` : ''}
      ${!incoming.sameThings ? '<p class="saveinfo">The two phones are on different versions: treasures won from stars come along; update both phones to bring the rest.</p>' : ''}
      ${incoming.link && !STANDALONE ? `<p class="saveinfo">Using the game from your Home Screen? <button class="linkbtn" data-act="synccopyin">Copy this</button>, open the game there, and tap <b>Paste from family</b>.</p>` : ''}
      <div class="row"><button class="btn wide" data-act="cno">Not now</button><button class="btn go wide" data-act="syncdo" ${pick ? '' : 'disabled'}>✨ Sync</button></div></div>`;
    m.classList.add('show');
  }
  /* the best of both phones: stars and āyāt practiced, every treasure and sticker; the most recently used
     phone's look, outfit and lost things; the higher learning time */
  function mergeInto(into, from) {
    const newer = (from.touched || 0) > (into.touched || 0);
    for (const n in from.prog) mergeProg(into, n, from.prog[n]);
    from.items.forEach((id) => {
      if (!into.items.includes(id)) {
        into.items.push(id);
        gotIt(into, 'i:' + id);
      }
    });
    from.stickers.forEach((id) => {
      if (!into.stickers.includes(id)) {
        into.stickers.push(id);
        gotIt(into, 's:' + id);
      }
    });
    if (newer) {
      if (from.name) into.name = from.name;
      // (a link from a phone before v2.5.3 has no shirt and pants colors: keep this phone's)
      into.look = Object.assign({}, from.look, incoming && incoming.noColors ? { tee: into.look.tee, legs: into.look.legs } : {});
      into.outfit = Object.assign({}, from.outfit);
      into.badge = from.badge;
      into.lost = from.lost.filter((x) => into.items.includes(x.id));
      into.fix = from.fix.slice();
    }
    ['wdone', 'feats', 'cpg'].forEach((k) => (into[k] = [...new Set([...into[k], ...from[k]])]));
    into.time = Math.max(into.time || 0, from.time || 0);
    for (const n in from.stime) into.stime[n] = Math.max(into.stime[n] || 0, from.stime[n]);
    into.touched = Math.max(into.touched || 0, from.touched || 0);
    into.pending = into.pending.filter((g) => (g.k === 'i' ? !into.items.includes(g.id) : !into.stickers.includes(g.id)));
    S.forEach((s) => giveSurahGift(s, into));
    giveTrackPrizes(into);
    giveStarBadges(into);
    giveWorldRides(into);
  }
  function doSync() {
    const from = incoming.from;
    let into;
    if (incoming.target === 'new') {
      if (store.profiles.some((p) => p.id === from.id)) from.id = newProfile().id;
      if (incoming.noColors) Object.assign(from.look, starterColors(store.profiles));
      store.profiles.push(from);
      into = from;
      S.forEach((s) => giveSurahGift(s, into));
      giveTrackPrizes(into);
      giveStarBadges(into);
      giveWorldRides(into);
    } else {
      into = store.profiles.find((p) => p.id === incoming.target);
      const before = { stars: totalStars(into), things: thingsOf(into) };
      mergeInto(into, from);
      // next time the two phones recognize this explorer by itself
      if (into.id !== from.id && !store.profiles.some((p) => p.id === from.id)) {
        if (store.cur === into.id) store.cur = from.id;
        into.id = from.id;
      }
      into._gain = { stars: totalStars(into) - before.stars, things: thingsOf(into) - before.things };
    }
    store.cur = into.id;
    const gain = into._gain || { stars: totalStars(into), things: thingsOf(into) };
    delete into._gain;
    save(true);
    incoming = null;
    sfx.win();
    // done: say so, and get out of the way
    hideModal();
    const nm = into.name || 'Your explorer';
    toast(`✨ ${nm} is up to date${gain.stars > 0 || gain.things > 0 ? ` · +${gain.stars} ⭐${gain.things ? ` · ${gain.things} new treasure${gain.things === 1 ? '' : 's'}` : ''}` : ''}`);
    render();
  }
  function showPaste() {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card synccard"><h3>📋 Paste from family</h3>
      <p class="saveinfo">Paste the progress link another phone shared with you.</p>
      <textarea id="pastebox" class="pastebox" rows="3" placeholder="https://…#sync=…" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      <div class="row">${navigator.clipboard && navigator.clipboard.readText ? '<button class="btn wide" data-act="pastein">📋 Paste</button>' : ''}<button class="btn go wide" data-act="pastego">Next ›</button></div>
      <div class="row"><button class="btn small" data-act="cno">Cancel</button></div></div>`;
    m.classList.add('show');
  }

  /* ================= updates ================= */
  /* A new version downloads in the background (sw.js) and waits. The start screen and the Grown-up Corner
     offer it; Update switches over and reloads. A family can wait, but a week after this phone first saw the
     update it is applied the next time the game is back on the start screen or the map (never mid-lesson).
     Checked when the game opens and whenever it comes back to the screen (at most every 15 minutes). */
  const UPD_SEEN = 'lhq_upd_seen', // when this phone first saw a waiting update
    VER_SEEN = 'lhq_ver'; // the version this phone last ran (to say "Updated to …")
  const vnum = (v) => String(v || '0').split('.').reduce((t, x) => t * 1000 + (parseInt(x, 10) || 0), 0);
  let swReg = null,
    updWanted = false,
    lastCheck = 0,
    changelog = null;
  const upd = { available: false, ready: false, version: '' };
  let justUpdated = false,
    updatedFrom = ''; // the version this phone ran before, so the note can list everything since
  try {
    const seenV = localStorage.getItem(VER_SEEN);
    justUpdated = !!seenV && vnum(seenV) < vnum(VERSION);
    if (justUpdated) updatedFrom = seenV;
    if (!seenV) localStorage.setItem(VER_SEEN, VERSION);
  } catch (e) {}
  function loadChangelog() {
    return fetch('changelog.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && Array.isArray(j.versions)) changelog = j;
        return changelog;
      })
      .catch(() => changelog);
  }
  // the notes of version `to`, or of every version after `from` up to `to` (newest first; a note repeated in
  // an older version, like "Small visual tweaks", is listed once)
  function notesHTML(to, from) {
    if (!changelog) return '';
    const list = changelog.versions
      .filter((x) => x.notes && x.notes.length && (from ? vnum(x.v) > vnum(from) && vnum(x.v) <= vnum(to) : x.v === to))
      .sort((a, b) => vnum(b.v) - vnum(a.v));
    if (!list.length) return '';
    const seen = new Set();
    const ul = (notes) => `<ul>${notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
    const body =
      list.length === 1
        ? ul(list[0].notes)
        : list
            .map((x) => {
              const fresh = x.notes.filter((t) => !seen.has(t));
              fresh.forEach((t) => seen.add(t));
              return fresh.length ? `<div class="wnv">v${esc(x.v)}</div>${ul(fresh)}` : '';
            })
            .join('');
    return `<details class="whatsnew"><summary>What's new${list.length > 1 ? ` since v${esc(from)}` : ''}</summary>${body}</details>`;
  }
  function updatesHTML() {
    const status = upd.available
      ? `<b>${upd.version ? 'v' + esc(upd.version) : 'A new version'} is ready.</b> Update now, or keep playing; it updates by itself within a week.`
      : `You have v${VERSION}${changelog ? ', the latest' : ''}.`;
    return `<div class="updbox"><p class="saveinfo">${status}</p>${upd.available ? notesHTML(upd.version, VERSION) : notesHTML(VERSION)}
      <div class="row">${upd.available ? '<button class="btn go wide" data-act="updnow">✨ Update now</button>' : '<button class="btn wide" data-act="updcheck">🔄 Check for updates</button>'}</div></div>`;
  }
  function showUpdates() {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card updcard"><button class="cardx" data-act="cno" aria-label="Close">✕</button><h3>🧭 Version</h3>${updatesHTML()}</div>`;
    m.classList.add('show');
  }
  function refreshUpdateUI() {
    if (st.view === 'splash' || st.view === 'settings') render();
    const card = document.querySelector('#modal.show .updcard');
    if (card) showUpdates();
  }
  function checkUpdates(manual) {
    lastCheck = Date.now();
    if (swReg) swReg.update().catch(() => {});
    return loadChangelog().then((j) => {
      if (j && vnum(j.latest) > vnum(VERSION)) {
        upd.available = true;
        upd.version = j.latest;
      }
      if (manual && !upd.available) toast(j ? `You have the latest version (v${VERSION})` : "Couldn't check: no internet?");
      refreshUpdateUI();
      maybeForce();
    });
  }
  function markReady() {
    upd.ready = true;
    upd.available = true;
    if (!upd.version && changelog && vnum(changelog.latest) > vnum(VERSION)) upd.version = changelog.latest;
    try {
      if (!localStorage.getItem(UPD_SEEN)) localStorage.setItem(UPD_SEEN, String(Date.now()));
    } catch (e) {}
    if (updWanted) applyUpdate();
    refreshUpdateUI();
    maybeForce();
  }
  function applyUpdate() {
    updWanted = true;
    try {
      localStorage.removeItem(UPD_SEEN);
    } catch (e) {}
    if (swReg && swReg.waiting) swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else if (!swReg) location.reload();
    else {
      toast('Downloading the update…');
      swReg.update().catch(() => {});
    }
  }
  // a week after it was first offered, an update applies itself at a calm moment
  function maybeForce() {
    if (!upd.ready || updWanted || !['splash', 'map'].includes(st.view)) return;
    let since = 0;
    try {
      since = +localStorage.getItem(UPD_SEEN) || 0;
    } catch (e) {}
    if (since && Date.now() - since > 7 * 86400000) applyUpdate();
  }
  function registerOffline() {
    if (!OFFLINE_OK) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('sw.js')
        .then((reg) => {
          swReg = reg;
          if (reg.waiting && navigator.serviceWorker.controller) markReady();
          reg.addEventListener('updatefound', () => {
            const w = reg.installing;
            if (w)
              w.addEventListener('statechange', () => {
                if (w.state === 'installed' && navigator.serviceWorker.controller) markReady();
              });
          });
          checkUpdates(false);
        })
        .catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updWanted) location.reload(); // the new version took over: start it
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (Date.now() - lastCheck > 15 * 60000) checkUpdates(false);
      else maybeForce();
    });
  }

  /* ---------- GROWN-UP CORNER ---------- */
  // recitation speed: a slider with a stop for each speed (tap a label to jump to it)
  const speedLabel = (v) => v + '×';
  const speedSlider = () =>
    `<div class="speed"><input type="range" id="speed" min="0" max="${SPEEDS.length - 1}" step="1" value="${SPEEDS.indexOf(prefs.speed)}" aria-label="Recitation speed" aria-valuetext="${prefs.speed} times">
      <div class="speedticks">${SPEEDS.map((v) => `<button class="${v === prefs.speed ? 'on' : ''}" data-act="set" data-k="speed" data-v="${v}">${speedLabel(v)}</button>`).join('')}</div></div>`;
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'speed') return;
    prefs.speed = SPEEDS[+e.target.value] || 1;
    player.playbackRate = prefs.speed;
    e.target.setAttribute('aria-valuetext', prefs.speed + ' times');
    document.querySelectorAll('.speedticks button').forEach((b) => b.classList.toggle('on', +b.dataset.v === prefs.speed));
    document.querySelectorAll('.speedchip').forEach((c) => (c.outerHTML = speedChip()));
    save();
  });
  V.settings = () => {
    const tg = (k, t, d) =>
      `<button class="toggle ${st.flash && st.flash.includes(k) ? 'flash' : ''}" data-act="tog" data-k="${k}"><span>${t}<small>${d}</small></span><span class="sw ${prefs[k] ? 'on' : ''}"></span></button>`;
    const seg = (k, opts) =>
      `<span class="seg">${opts.map(([v, l]) => `<button class="${prefs[k] === v ? 'on' : ''}" data-act="set" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</span>`;
    const recs = RECITERS.map(
      (r) =>
        `<div class="recrow ${r.id === prefs.reciter ? 'on' : ''}"><button class="recpick" data-act="reciter" data-id="${r.id}"><span class="rdot"></span><span>${esc(r.name)}<small>${esc(r.note)}${r.mb ? ` · ${r.mb} MB` : ''}</small></span></button><button class="icon-btn sm" data-act="sample" data-id="${r.id}" aria-label="Hear a sample">${ICON.play}</button></div>`,
    ).join('');
    return `<div class="screen">
    ${bar('Grown-up Corner', `Settings · v${VERSION}`, st.ret ? 'ret' : 'splash', `<button class="icon-btn helpbtn" data-act="help" aria-label="About Little Hafiz Quest: sources and disclaimer">${INFO_ICON}</button>`)}
    <button class="btn wide howbtn" data-act="howto">📘 How to use it</button>
    <div class="sheet">
      <h3>🎨 Look</h3>
      ${fsSheet()}
      <div class="setrow"><span>Theme<small>Dim is gentle for bedtime</small></span>${seg('theme', [
        ['auto', 'Auto'],
        ['light', 'Light'],
        ['dim', 'Dim'],
      ])}</div>
      ${tg('meaning', 'Show simple meaning', 'A kid-friendly sentence under each āyah')}
      ${tg('wordmean', 'Show word meanings', 'The meaning of each word, in Word Steps and Read (📖). From the Quranic Arabic Corpus')}
      ${tg('translit', 'Show transliteration', "Latin letters, for helpers who can't read Arabic: under each āyah, and over each word in Word Steps and Read")}
      ${tg('actions', 'Show the actions', 'The “Do it” movement for each āyah. Switch off for more room on screen')}
    </div>
    <div class="sheet">
      <h3>🔊 Sounds</h3>
      ${tg('audio', 'Listen button', 'The orange button at the top plays the reciter')}
      <div class="setrow col"><span>Reciter<small>Tap ▶ to hear a sample</small></span><div class="recs">${recs}</div></div>
      <div class="setrow col ${st.flash && st.flash.includes('speed') ? 'flash' : ''}"><span>Recitation speed<small>Slower helps with a new āyah; the loop button repeats it</small></span>${speedSlider()}</div>
      ${tg('sfx', 'Nature sounds', 'Soft water drops, birdsong and a breeze as you play. Quieter while the reciter plays')}
    </div>
    <div class="sheet">
      <h3>❤️ Game</h3>
      ${tg('hearts', 'Hearts in review games', 'Three hearts, plus one for each finished world (up to 5). Losing them all drops an item, which comes back after trying again')}
      <div class="setrow"><span>Chain the āyāt<small>In Look &amp; Repeat, say them all from the first one: after every new āyah, or every few</small></span>${seg('chain', [
        [1, 'Each'],
        [3, '3'],
        [4, '4'],
        [5, '5'],
      ])}</div>
      ${tg('stranger', 'The Stranger', 'Now and then, between sūrahs, a stranger on the map asks 3 questions from a memorized sūrah')}
      ${tg('pzrtl', 'Puzzle from right to left', 'The Picture Puzzle fills from the right, like reading Arabic. Off: left to right, row by row')}
    </div>
    ${offlineSheet()}
    <div class="sheet">
      <h3>🧭 Version</h3>
      ${updatesHTML()}
    </div>
  </div>`;
  };

  /* ================= offline (service worker + saved recitations) ================= */
  const OFFLINE_OK = 'serviceWorker' in navigator && 'caches' in window && /^https?:$/.test(location.protocol);
  const AUDIO_CACHE = 'lhq2-audio'; // must match sw.js
  const audioFiles = (id) => {
    const T = TIM[id];
    const nums = T ? Object.keys(T) : ['1', ...S.map((s) => String(s.n))];
    return [`audio/${id}/timings.json`, ...nums.map((n) => `audio/${id}/${pad(+n)}.mp3`)];
  };
  let offline = { saved: null, busy: false, done: 0, id: '' };
  function countSavedAudio(id) {
    if (!OFFLINE_OK) return Promise.resolve(0);
    return caches
      .open(AUDIO_CACHE)
      .then((c) => Promise.all(audioFiles(id).map((u) => c.match(new URL(u, location.href).href))))
      .then((list) => list.filter(Boolean).length)
      .catch(() => 0);
  }
  function saveAllAudio() {
    if (!OFFLINE_OK || offline.busy) return;
    const id = reciter().id;
    offline.busy = true;
    offline.done = 0;
    offline.id = id;
    render();
    loadTimings(id)
      .catch(() => null)
      .then(() => caches.open(AUDIO_CACHE))
      .then(async (cache) => {
        const files = audioFiles(id);
        for (const u of files) {
          const href = new URL(u, location.href).href;
          if (!(await cache.match(href))) {
            const res = await fetch(href, { cache: 'no-cache' });
            if (!res.ok || res.status !== 200) throw new Error('download failed');
            await cache.put(href, res);
          }
          offline.done++;
          const el = document.getElementById('offlineProgress');
          if (el) el.textContent = `${offline.done} of ${files.length}`;
        }
      })
      .then(() => {
        offline.busy = false;
        offline.saved = audioFiles(id).length;
        toast('All recitations saved for offline use ✨');
        if (st.view === 'settings') render();
      })
      .catch(() => {
        offline.busy = false;
        offline.saved = null;
        toast('Saving stopped. Check the internet connection and try again.');
        if (st.view === 'settings') render();
      });
  }
  function offlineSheet() {
    if (!OFFLINE_OK) return `<div class="sheet"><h3>⬇️ Download recitations</h3><p class="saveinfo">Open the game from its web link to save the recitations on this device.</p></div>`;
    const r = reciter();
    if (offline.id !== r.id) {
      offline.id = r.id;
      offline.saved = null;
    }
    if (offline.saved == null && !offline.busy)
      countSavedAudio(r.id).then((n) => {
        offline.saved = n;
        if (st.view === 'settings' && !offline.busy) render();
      });
    const total = audioFiles(r.id).length,
      n = offline.saved || 0;
    const status = offline.busy
      ? `Saving… <b id="offlineProgress">${offline.done} of ${total}</b>`
      : n >= total
        ? `All of ${esc(r.name)}'s recitations are saved on this device. Everything works without internet.`
        : `${n} of ${total} files saved for ${esc(r.name)}. Each sūrah downloads the first time it plays; save them all now to use the game without internet.`;
    return `<div class="sheet"><h3>⬇️ Download recitations</h3>
    <p class="saveinfo">${status}</p>
    ${offline.busy || n >= total ? '' : `<div class="setrow" style="justify-content:center"><button class="btn small" data-act="saveaudio">⬇️ Save all recitations${r.mb ? ` (${r.mb} MB)` : ''}</button></div>`}
  </div>`;
  }

  /* ================= fullscreen ================= */
  /* Hides the browser's address bar where the browser allows it (Android, iPad, computers). iPhone Safari
     doesn't let pages go fullscreen; there, Add to Home Screen gives the same. The choice is remembered and
     comes back with the next tap after the game opens; leaving fullscreen with the phone's own controls
     (back, swipe, Esc) switches it off. */
  const docEl = document.documentElement;
  const fsNow = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const FS_OK = !!(docEl.requestFullscreen || docEl.webkitRequestFullscreen) && document.fullscreenEnabled !== false && document.webkitFullscreenEnabled !== false;
  const STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) || navigator.standalone === true;
  let fsLeaving = false;
  function enterFs() {
    if (!FS_OK || fsNow()) return;
    try {
      const r = docEl.requestFullscreen ? docEl.requestFullscreen({ navigationUI: 'hide' }) : docEl.webkitRequestFullscreen();
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  }
  function exitFs() {
    if (!fsNow()) return;
    fsLeaving = true;
    try {
      const r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen();
      if (r && r.catch) r.catch(() => {});
    } catch (e) {}
  }
  function onFsChange() {
    if (!fsNow() && !fsLeaving && prefs.fullscreen) {
      prefs.fullscreen = false; // left with the phone's own controls
      save();
    }
    fsLeaving = false;
    if (st.view === 'settings' || st.view === 'splash') render();
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  // fullscreen needs a tap: when it was chosen before, the first tap brings it back
  document.addEventListener('pointerup', () => {
    if (prefs.fullscreen && !fsNow()) enterFs();
  });
  function fsSheet() {
    if (STANDALONE) return '<div class="setrow"><span>Fullscreen<small>Playing from the Home Screen: there is no address bar to hide</small></span></div>';
    if (!FS_OK)
      return '<div class="setrow"><span>Fullscreen<small>This browser can\'t hide its address bar for websites. On iPhone: tap Share, then <b>Add to Home Screen</b>, and play from that icon.</small></span></div>';
    const on = fsNow();
    return `<div class="setrow"><span>Fullscreen<small>Hides the address bar. Exit with this button or your device's back / swipe</small></span><button class="btn small" data-act="fs">${on ? ICON.fsOut + ' Exit' : ICON.fsIn + ' Fullscreen'}</button></div>`;
  }

  /* ================= actions ================= */
  function finish(extra) {
    const s = S[st.i];
    const prof = P();
    const giftsBefore = prof.pending.length,
      newStar = st.starsBefore != null && totalStars(prof) > st.starsBefore;
    // lost items at this sūrah come back after finishing a review game here
    if (['path', 'order'].includes(st.view)) {
      prof.fix = prof.fix.filter((n) => n !== s.n);
      const back = prof.lost.filter((x) => x.n === s.n).map((x) => x.id);
      if (back.length) {
        prof.lost = prof.lost.filter((x) => x.n !== s.n);
        extra.found = back;
      }
      // stickers the Stranger took here come back too, and he returns for a rematch
      prof.lostSt.filter((x) => x.n === s.n).forEach((x) => prof.stickers.includes(x.id) || prof.stickers.push(x.id));
      prof.lostSt = prof.lostSt.filter((x) => x.n !== s.n);
      if (prof.rematch.includes(s.n) && !prof.rematchReady.includes(s.n)) {
        prof.rematchReady.push(s.n);
        prof.strangerAt = 0; // he comes back right away
      }
    }
    // memorized = Stepping Stones level 3 (the whole sūrah, for one with checkpoints)
    if (st.view === 'path' && (!multi(s) || st.p === 'all') && surahDone(s)) extra.memorized = true;
    const given = giveSurahGift(s);
    if (given === 'gold' || given === 'both') extra.allStars = true;
    // a world with a star in every sūrah: celebrate once, and it brings an extra heart (up to 5)
    const wi = worldOf(s);
    if (!prof.wdone.includes(wi) && worldDone(wi, prof)) {
      const before = Math.min(5, 3 + WORLDS.filter((_, w) => w !== wi && worldDone(w, prof)).length);
      prof.wdone.push(wi);
      extra.world = { wi, heart: maxHearts(prof) > before, hearts: maxHearts(prof) };
    }
    // crossing a checkpoint's stepping stones for the first time: a small gift (a sticker)
    if (st.view === 'path' && multi(s) && st.p !== 'all' && giveCheckpointGift(s, st.p)) extra.cpGift = true;
    giveDailyGift();
    extra.prizes = giveTrackPrizes(prof);
    extra.badge = giveStarBadges(prof);
    extra.rides = giveWorldRides(prof);
    if ((newStar || extra.firstTime) && prof.pending.length === giftsBefore && giveLevelGift(prof)) extra.levelGift = true;
    // the summit milestones for the whole Juz
    const feats = Object.keys(FEAT_TEST).filter((f) => !prof.feats.includes(f) && FEAT_TEST[f](prof));
    feats.forEach((f) => {
      prof.feats.push(f);
      if (f === 'once') {
        // everything unlocked at once: every sticker, and every treasure still waiting in a gift box
        ART.STICKERS.forEach((x) => {
          if (!prof.stickers.includes(x.id)) {
            prof.stickers.push(x.id);
            gotIt(prof, 's:' + x.id);
          }
        });
        prof.pending
          .filter((g) => g.k === 'i' && !ITEM[g.id].feat)
          .forEach((g) => {
            if (!prof.items.includes(g.id)) prof.items.push(g.id);
            gotIt(prof, 'i:' + g.id);
          });
        prof.pending = prof.pending.filter((g) => g.k !== 'i' || ITEM[g.id].feat);
      }
      const it = FEAT_ITEM[f];
      if (!prof.items.includes(it.id) && !prof.pending.some((g) => g.id === it.id)) prof.pending.push({ k: 'i', id: it.id });
    });
    if (feats.length) prof.pending = prof.pending.filter((g) => g.k !== 's' || !prof.stickers.includes(g.id));
    // a checkpoint of a long sūrah: on to the next checkpoint (or the whole sūrah), not the next game
    if (multi(s) && st.p !== 'all' && GAMES.includes(st.view)) {
      Object.assign(extra, nextSuggestion(s, st.p));
    }
    save();
    stopAudio();
    const done = Object.assign({ i: st.i, p: st.p }, extra);
    if (feats.length) {
      go('summit', { i: st.i, feats, after: done });
      return;
    }
    if (extra.plain) bigParty(['★', '✦', '●']);
    else bigParty();
    go('done', done);
  }
  /* prizes on the star track: everything up to the explorer's star count goes into the gift box */
  function giveTrackPrizes(prof) {
    const t = totalStars(prof);
    let n = 0;
    TRACK.forEach((it) => {
      if (it.track > t || !forKid(it, prof) || prof.items.includes(it.id) || prof.pending.some((g) => g.id === it.id)) return;
      prof.pending.push({ k: 'i', id: it.id });
      n++;
    });
    return n;
  }
  /* a toy ride for each world made fully golden (every star in every sūrah of it), grander further up */
  const RIDES = ITEMS.filter((it) => it.wgold).sort((a, b) => a.wgold - b.wgold);
  const worldGold = (wi, prof) => worldSurahs(wi).every((s) => surahStars(s, prof) >= surahMax(s));
  function giveWorldRides(prof) {
    let n = 0;
    RIDES.forEach((it) => {
      if (!worldGold(it.wgold - 1, prof) || hasOrWaits(it, prof)) return;
      prof.pending.push({ k: 'i', id: it.id });
      n++;
    });
    return n;
  }
  /* a star badge for every 100 stars (100 stars, 200 stars …) */
  function giveStarBadges(prof) {
    const t = totalStars(prof);
    let got = '';
    ART.BADGES.forEach((b) => {
      if (b.stars > t || prof.stickers.includes(b.id) || prof.pending.some((g) => g.id === b.id)) return;
      prof.pending.push({ k: 's', id: b.id });
      got = b.name;
    });
    return got;
  }
  const nextPrize = (prof) => TRACK.find((it) => it.track > totalStars(prof) && !hasOrWaits(it, prof) && forKid(it, prof)) || null;
  const hasOrWaits = (it, prof) => prof.items.includes(it.id) || prof.pending.some((g) => g.id === it.id);
  /* Every level finished for the first time brings a gift. When nothing else came with it: a sticker not
     collected yet, or once there are none left, the next prize on the star track, early. */
  function giveLevelGift(prof) {
    if (giveSurprise(prof, true)) return true;
    const early = TRACK.find((it) => forKid(it, prof) && !hasOrWaits(it, prof));
    if (!early) return false;
    prof.pending.push({ k: 'i', id: early.id });
    return true;
  }
  function giveCheckpointGift(s, p) {
    const prof = P(),
      key = s.n + ':' + p;
    if (prof.cpg.includes(key)) return false;
    prof.cpg.push(key);
    const have = new Set([...prof.stickers, ...prof.pending.filter((g) => g.k === 's').map((g) => g.id)]);
    const left = ART.STICKERS.filter((x) => !have.has(x.id));
    if (!left.length) return false;
    prof.pending.push({ k: 's', id: left[(Math.random() * left.length) | 0].id, m: 1 });
    return true;
  }
  let pendingYes = null;
  function askConfirm(msg, yesLabel, onYes) {
    pendingYes = onYes;
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card"><div class="h2" style="margin:6px 0 4px;text-align:center">${msg}</div>
    <p class="saveinfo" style="text-align:center">This can't be undone.</p>
    <div class="row"><button class="btn wide" data-act="cno">Cancel</button><button class="btn wide danger" data-act="cyes">${yesLabel}</button></div></div>`;
    m.classList.add('show');
  }
  /* How to use it: the tips, the disclaimer, and where to report a problem */
  const REPO = 'https://github.com/akramali/little-hafiz-quest';
  const INFO_ICON =
    '<svg class="infoic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="7.6" r="1.5" fill="currentColor"/><path d="M12 11.2v6.2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  /* ℹ️ About: who made it, the disclaimer, where everything comes from */
  function showHelp() {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card infocard"><button class="cardx" data-act="cno" aria-label="Close">✕</button>
      <h3>Little Hafiz Quest <small>v${VERSION}</small></h3>
      <p class="made">Developed with <span class="heart" aria-label="love">❤️</span> for little learners and their families. Free and open source: no ads, no accounts, nothing to buy. Progress stays on your phone.</p>
      <div class="notice" role="note">
        <p><b>⚠️ Please check</b> the Qur'an text and recitation against a trusted muṣḥaf or teacher. They come from public sources and may still have mistakes.</p>
        <p>🖼️ The pictures are memory hooks, not images of the meaning.</p>
        <p>💬 The simple meanings are written for young children; see a full tafsīr for detail.</p>
      </div>
      <h4>📚 Sources</h4>
      <ul class="srcs">
        <li><b>Qur'an text</b> (Uthmani): ${ext('https://quranenc.com', 'The Noble Qur\'an Encyclopedia')}, via ${ext('https://github.com/risan/quran-json', 'quran-json')} (CC BY-SA 4.0)</li>
        <li><b>Recitation</b>: Alafasy, Al-Husary, Al-Minshawi and Abdul Basit, from ${ext('https://everyayah.com', 'EveryAyah.com')}</li>
        <li><b>Word timings</b>: ${ext('https://quran.com', 'Quran.com')}</li>
        <li><b>Word-by-word meanings and transliteration</b>: the ${ext('https://corpus.quran.com', 'Quranic Arabic Corpus')} (GNU GPL v3), via the ${ext('https://api-docs.quran.com', 'Quran.com API')}</li>
        <li><b>Simple meanings, memory cues and āyah transliterations</b>: written for this game</li>
        <li><b>Fonts</b>: Amiri Quran and Baloo 2 (SIL Open Font License)</li>
      </ul>
      <h4>🛠️ Open source</h4>
      <div class="infolinks">
        <a class="btn small" href="${REPO}" target="_blank" rel="noopener">💻 The code on GitHub</a>
        <a class="btn small" href="${REPO}/issues" target="_blank" rel="noopener">🐞 Report a problem or idea</a>
      </div>
    </div>`;
    m.classList.add('show');
    m.querySelector('.infocard').scrollTop = 0;
  }
  /* 📘 How to use it: one tip at a time, each with its icon */
  const BEADS_IC = `<span class="beads-ico tiny" aria-hidden="true">${WCOL.slice(0, 3)
    .map((c) => `<i style="background:${c}"></i>`)
    .join('')}</span>`;
  function showHowTo() {
    const tip = (ic, title, body) => `<li><span class="tipic" aria-hidden="true">${ic}</span><div><b>${title}</b>${body}</div></li>`;
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card infocard howcard"><button class="cardx" data-act="cno" aria-label="Close">✕</button>
      <h3>📘 How to use it</h3>
      <ol class="howto">
        ${tip('🧭', 'Pick a step', `<p>Each sūrah has a quest: 👀 <b>Look &amp; Repeat</b>, then ${BEADS_IC} <b>Word Steps</b>.</p><p>Then two review games: 🐸 <b>Stepping Stones</b> and 🧩 <b>Picture Puzzle</b>. A sūrah is memorized ✓ once its Stepping Stones is done.</p>`)}
        ${tip('🚩', 'One checkpoint at a time', '<p>Long sūrahs come in parts of a few āyāt. Finish each part, then the 🏁 whole sūrah.</p>')}
        ${tip('🎁', 'Gifts to win', '<p>The first finish of every level wins a gift.</p><ul><li>⭐ One star wins the sūrah\'s treasure, and is enough to move on.</li><li>🌟 Every star in a sūrah wins its golden edition.</li><li>🚩 Each checkpoint crossed, and every few stars, win a little prize.</li><li>🏅 Every 100 stars wins a star badge.</li></ul>')}
        ${tip('⛰️', 'The summit', '<p>A star in every sūrah: the explorer climbs the mountain and wins every treasure, every sticker and the Summit cloak.</p><p>👑 Three stars everywhere: the Hafiz crown. Every single star: the Golden hoopoe.</p>')}
        ${tip('🔁', 'Revise any time', '<p>Tap a sūrah on the map, or the 📖 / ⭐ counters at the top of the map to see them all.</p><p>In review games, tap <b>Not quite</b> after a mistake. A 💔 on the map shows where the hearts ran out.</p>')}
        ${tip('🔊', 'Listen and read', '<p>The orange <b>Listen</b> button plays the reciter; the loop button repeats it.</p><p>📖 <b>Read</b> shows the whole sūrah: hold an āyah to color its words, then tap it again to look closer.</p>')}
        ${tip('👨‍👩‍👧', 'Explorers', '<p>On the start screen, under <b>Continue the quest</b>: switch explorers, share progress with another phone, or save a backup.</p>')}
        ${tip('⏱️', '5–10 minutes a day is plenty', '<p>Stop while it\'s still fun. Recite it again at bedtime or in ṣalāh.</p>')}
      </ol>
    </div>`;
    m.classList.add('show');
    m.querySelector('.howcard').scrollTop = 0;
  }
  function showBism() {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card bismcard">
    <div style="font-size:54px" class="bob">🌙</div>
    <div class="ar-label">Begin every sūrah with</div>
    <div class="ar" lang="ar">${BISM}</div>
    ${prefs.translit ? '<div class="tr">Bismillāhir-raḥmānir-raḥīm</div>' : ''}
    ${prefs.meaning ? '<div class="mean">💬 In the name of Allah, the Most Kind, the Most Merciful</div>' : ''}
    <div class="row"><button class="btn small" data-act="bismplay">🔊 Hear it</button><button class="btn go" data-act="closemodal">Bismillah! ✨</button></div>
  </div>`;
    m.classList.add('show');
  }
  /* open the first waiting gift: a wobbling box, tap, it pops open */
  function popGift() {
    const prof = P(),
      g = prof.pending.shift();
    if (!g) return;
    let art, name, sub, wear;
    if (g.k === 'i') {
      const it = ITEM[g.id];
      if (!prof.items.includes(g.id)) prof.items.push(g.id);
      gotIt(prof, 'i:' + g.id);
      art = itemPic(g.id);
      name = itemName(g.id);
      sub = it.wgold
        ? `For making World ${it.wgold}, ${WORLDS[it.wgold - 1].name}, all golden: every star in every sūrah! Climb aboard!`
        : it.quest
          ? 'For standing up to the Stranger with the Qur’an in your heart. A true hero!'
          : it.feat
        ? FEAT_WHY[it.feat]
        : it.drop
          ? 'A surprise for all your hard work!'
          : it.track
          ? totalStars(prof) < it.track
            ? `An early prize from the star track, for all your hard work!`
            : `A prize for collecting ${it.track} stars!`
          : TIER_LABEL[it.tier || 1] + ` From ${BYN[it.from].name}.`;
      wear = true;
    } else {
      if (!prof.stickers.includes(g.id)) prof.stickers.push(g.id);
      gotIt(prof, 's:' + g.id);
      art = ART.sticker(g.id);
      const badge = STICKER[g.id].stars;
      name = badge ? `${STICKER[g.id].name} badge` : STICKER[g.id].name + ' sticker';
      sub = badge ? `For collecting ${badge} stars! MāshāAllāh! Stick it on your explorer to show it off.` : 'Stick it on your explorer, or keep it in your sticker book.';
    }
    save();
    sfx.open();
    const m = document.getElementById('modal');
    m.classList.add('show');
    const more = prof.pending.length;
    m.innerHTML = `<div class="card giftcard open"><div class="grays"></div><div class="gopen">${ART.gift({ tier: giftTier(g), open: true, kind: g.k === 'i' ? 'item' : 'sticker' })}</div>
      <div class="gitem">${art}</div><h3>${name}</h3><p class="saveinfo">${sub}</p>
      <div class="row">${wear ? `<button class="btn go wide" data-act="wear" data-id="${g.id}">👕 Wear it!</button>` : `<button class="btn go wide" data-act="stick" data-id="${g.id}" data-from="gift">⭐ Stick it on!</button>`}<button class="btn wide" data-act="giftok">${more ? `🎁 Next gift (${more})` : 'Yay! ✨'}</button></div></div>`;
    setTimeout(() => burstAt(m.querySelector('.gitem'), 26, ['🎉', '⭐', '✨', '🎈']), 120);
  }
  function nextSuggestion(s, p) {
    if (p === 'all') return {};
    if (multi(s) && p + 1 < s.P.length) return { nextAct: 'part', nextP: p + 1, nextLabel: `Next checkpoint 🚩 ${p + 2}` };
    if (multi(s)) return { nextAct: 'part', nextP: 'all', nextLabel: '🏁 The whole sūrah' };
    return {};
  }
  function startPath() {
    sfx.tap();
    go('path', { i: st.i, p: st.p != null ? st.p : 0, L: 2, k: 0, hint: 0, hints: 0, hearts: maxHearts(P()), maxH: maxHearts(P()) });
  }
  function startOrder() {
    sfx.tap();
    const s = S[st.i];
    const p = st.p === 'all' && multi(s) ? 'all' : pnum(st.p);
    st.p = p;
    const n = p === 'all' ? bigGroups(s).length : range(ctx()).length;
    const order = range({ from: 0, to: n - 1 });
    let deck = shuffle(order);
    while (n > 1 && deck.every((v, j) => v === order[j])) deck = shuffle(order);
    go('order', { i: st.i, p, deck, placed: {}, say: null, sel: null, hearts: maxHearts(P()), maxH: maxHearts(P()) });
  }
  /* the Big Puzzle opens once every checkpoint's Picture Puzzle is done */
  const bigReady = (s) => multi(s) && s.P.every((_, p) => P().prog[s.n] && P().prog[s.n].parts[p] && P().prog[s.n].parts[p].order);
  function toSurah() {
    go('surah', { i: st.i, p: st.p == null ? 0 : st.p });
  }

  /* ---------- a progress file: save every explorer to a file, load them back ---------- */
  const FILE_APP = 'little-hafiz-quest';
  function saveFile() {
    save();
    const data = JSON.stringify({ app: FILE_APP, v: 2, version: VERSION, saved: new Date().toISOString(), store }, null, 1);
    const name = `little-hafiz-quest-progress-${today()}.json`;
    const u = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const aEl = document.createElement('a');
    aEl.href = u;
    aEl.download = name;
    document.body.appendChild(aEl);
    aEl.click();
    aEl.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast(`Saved ${name}`);
  }
  function loadFile(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      let o = null;
      try {
        o = JSON.parse(fr.result);
      } catch (e) {}
      if (!o || o.app !== FILE_APP || !o.store || typeof o.store !== 'object') {
        toast("That isn't a Little Hafiz Quest progress file.");
        return;
      }
      const next = cleanStore(o.store);
      if (!next.profiles.length) {
        toast('There are no explorers in that file.');
        return;
      }
      const names = next.profiles.map((p) => (p.name ? esc(p.name) : 'Explorer')).join(', ');
      askConfirm(`Load ${next.profiles.length === 1 ? 'this explorer' : next.profiles.length + ' explorers'} from the file (${names})? It replaces every explorer on this device.`, 'Load', () => {
        store = next;
        store.profiles.forEach((prof) => {
          S.forEach((s) => giveSurahGift(s, prof));
          giveTrackPrizes(prof);
          giveStarBadges(prof);
          giveWorldRides(prof);
        });
        prefs = store.prefs;
        nobody = null;
        save();
        applyTheme();
        render();
        toast('Progress loaded ✨');
      });
    };
    fr.readAsText(file);
  }
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'loadfile') {
      loadFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    }
  });

  /* ---------- learning time (for grown-ups) ---------- */
  /* Counted while the game is on screen and has been touched in the last few minutes (or the reciter is
     playing): a 5-second check, nothing running in the background, saved now and then and when the page
     is hidden. Kept per explorer, and per sūrah while inside one. */
  const TIME_IDLE = 180000,
    TIME_VIEWS = ['surah', 'learn', 'words', 'path', 'order', 'mushaf', 'done'];
  let lastTouch = Date.now(),
    lastTick = Date.now(),
    unsavedTime = 0;
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => (lastTouch = Date.now()), { capture: true, passive: true }));
  function tickTime() {
    const now = Date.now(),
      dt = Math.min(now - lastTick, 15000) / 1000; // never a long gap (a phone asleep doesn't count)
    lastTick = now;
    if (document.hidden || noExplorers() || !P().made) return;
    if (now - lastTouch > TIME_IDLE && player.paused) return;
    const prof = P();
    prof.time = (prof.time || 0) + dt;
    if (st.i != null && S[st.i] && TIME_VIEWS.includes(st.view)) prof.stime[S[st.i].n] = (prof.stime[S[st.i].n] || 0) + dt;
    unsavedTime += dt;
    if (unsavedTime >= 30) {
      unsavedTime = 0;
      save();
    }
  }
  setInterval(tickTime, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      lastTick = Math.max(lastTick, Date.now() - 5000);
      if (unsavedTime) save();
    } else lastTick = Date.now(); // back again: start counting from now
  });
  window.addEventListener('pagehide', () => {
    if (unsavedTime) save();
  });

  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'exname') {
      P().name = e.target.value.replace(/[\u0000-\u001f<>]/g, '').slice(0, 16);
      save();
    }
  });

  document.addEventListener('click', (e) => {
    // the open list of worlds closes with a tap anywhere outside it
    const rl = document.querySelector('.wrail.open:not(.closing)');
    if (rl && !e.target.closest('.wrail')) {
      closeRail(rl);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const m = document.getElementById('modal');
    if (e.target === m) {
      if (m.querySelector('.dropcard')) return; // must press "Try again"
      if (m.querySelector('.strmeet')) return; // the Stranger waits for an answer: I'm ready or Not now
      if (m.querySelector('.dlcard.busy')) return; // downloading
      if (dlAnswer) stopAudio(); // a download question left unanswered: don't download
      pendingYes = null;
      const gift = m.querySelector('.giftcard');
      hideModal();
      if (gift) render(); // a gift opened (or not): the gift buttons on the page show what's still waiting
      return;
    }
    if (document.body.classList.contains('busy') && !e.target.closest('#modal')) return; // the explorer is walking (a gift or card on top still works)
    const hb = e.target.closest('[data-hold]');
    if (hb) {
      if (!hb._fired) toast(hb.dataset.tip || 'Press and hold');
      hb._fired = false;
      return;
    }
    if (!window.PointerEvent && st.view === 'order') {
      const pc = e.target.closest('.pcard');
      if (pc) {
        const k = +pc.dataset.k;
        sfx.tap();
        st.sel = st.sel === k ? null : k;
        render();
        return;
      }
    }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act,
      s = S[st.i];
    switch (act) {
      /* splash, explorers, map */
      case 'begin': {
        sfx.chime();
        if (noExplorers()) {
          // the very first time (or after removing everyone): make an explorer first
          const p = newProfile();
          store.profiles.push(p);
          store.cur = p.id;
          save();
          go('create', { first: true });
          break;
        }
        const prof = P();
        if (!prof.made) {
          go('create', { first: true });
          break;
        }
        const sp = $app.querySelector('.splash');
        if (sp && !reduceMotion) {
          sp.classList.add('leaving');
          setTimeout(() => go('map'), 520);
        } else go('map');
        break;
      }
      case 'home':
        sfx.tap();
        go('splash');
        break;
      case 'explorers':
        sfx.tap();
        go('explorers');
        break;
      case 'pickprof': {
        sfx.tap();
        store.cur = b.dataset.id;
        save(true);
        hideModal();
        render();
        break;
      }
      case 'editlook':
        sfx.tap();
        store.cur = b.dataset.id;
        save(true);
        go('create', { back: 'explorers' });
        break;
      case 'syncshare':
        sfx.tap();
        openShare();
        break;
      case 'synclink':
        if (!st.link) break;
        sfx.tap();
        if (navigator.share) navigator.share({ title: 'Little Hafiz Quest', text: `${P().name || 'Our explorer'}'s progress on Little Hafiz Quest: open it to sync`, url: st.link }).catch(() => {});
        else copyText(st.link, 'Link copied: paste it in a message');
        break;
      case 'synccopy':
        sfx.tap();
        if (st.link) copyText(st.link, 'Link copied: paste it in a message');
        break;
      case 'syncpaste':
        sfx.tap();
        showPaste();
        break;
      case 'pastein':
        navigator.clipboard
          .readText()
          .then((t) => {
            const box = document.getElementById('pastebox');
            if (box) box.value = t;
          })
          .catch(() => toast('Press and hold in the box, then Paste'));
        break;
      case 'pastego': {
        const code = codeIn((document.getElementById('pastebox') || {}).value);
        if (!code) {
          toast("That doesn't look like a progress link");
          break;
        }
        hideModal();
        openSync(code, '');
        break;
      }
      case 'synctarget':
        sfx.tap();
        incoming.target = b.dataset.id;
        showSync();
        break;
      case 'syncdo':
        if (incoming && incoming.target) doSync();
        break;
      case 'synccopyin':
        if (incoming && incoming.link) copyText(incoming.link, 'Copied: now open the game from your Home Screen and tap Paste from family');
        break;
      case 'updates':
        sfx.tap();
        showUpdates();
        if (!upd.available && Date.now() - lastCheck > 60000) checkUpdates(false);
        break;
      case 'updcheck':
        sfx.tap();
        checkUpdates(true);
        break;
      case 'updnow':
        sfx.chime();
        applyUpdate();
        break;
      case 'updok':
        sfx.tap();
        justUpdated = false;
        try {
          localStorage.setItem(VER_SEEN, VERSION);
        } catch (e) {}
        render();
        break;
      case 'newprof': {
        sfx.tap();
        if (store.profiles.length >= MAX_EXPLORERS) break;
        const p = newProfile();
        Object.assign(p.look, starterColors(store.profiles));
        store.profiles.push(p);
        store.cur = p.id;
        save();
        hideModal();
        go('create', { first: true });
        break;
      }
      case 'look': {
        sfx.tap();
        const L = P().look,
          k = b.dataset.k;
        L[k] = k === 'hair' || k === 'kid' ? b.dataset.v : +b.dataset.v;
        if (k === 'kid') {
          // each kind of explorer has their own hair styles; things for the other kind wait unopened no more
          const prof = P(),
            mine = ART.LOOKS.hairFor[L.kid];
          if (!mine.includes(L.hair)) L.hair = mine[0];
          prof.pending = prof.pending.filter((g) => g.k !== 'i' || forKid(ITEM[g.id], prof));
          giveTrackPrizes(prof);
        }
        save();
        const y = scrollY;
        render();
        scrollTo(0, y);
        break;
      }
      case 'cancelnew': {
        // leave "make your explorer" without keeping the new, unfinished explorer
        sfx.tap();
        const p = P();
        if (!p.made) {
          store.profiles = store.profiles.filter((x) => x.id !== p.id);
          store.cur = store.profiles.length ? store.profiles[0].id : '';
          save();
        }
        go('splash');
        break;
      }
      case 'made': {
        sfx.chime();
        P().made = true;
        save();
        if (st.back === 'explorers') go('explorers');
        else go(st.first ? 'map' : 'bag', st.first ? {} : { tab: 'look' });
        break;
      }
      case 'surah':
        if (st.view === 'map') enterSurah(+b.dataset.i);
        else openSurah(+b.dataset.i);
        break;
      case 'goto':
        sfx.tap();
        P().at = +b.dataset.i;
        save();
        go('map');
        break;
      case 'world': {
        if (mapCtl) mapCtl.scrollToWorld(+b.dataset.w);
        closeRail();
        break;
      }
      case 'worlds': {
        // the world-map button opens (or closes) the list of worlds
        sfx.tap();
        const rl = b.closest('.wrail'),
          open = !rl.classList.contains('open') || rl.classList.contains('closing');
        if (open) {
          rl.classList.remove('closing');
          rl.classList.add('open');
          b.setAttribute('aria-expanded', 'true');
        } else closeRail(rl);
        break;
      }
      case 'bag':
        sfx.tap();
        go('bag', { tab: 'hat' });
        break;
      case 'tab': {
        sfx.tap();
        st.tab = b.dataset.t;
        render();
        const row = $app.querySelector('.wrow, .wscroll-v');
        if (row) row.scrollTo(0, 0);
        break;
      }
      case 'turn':
        sfx.tap();
        st.backView = !st.backView;
        render();
        break;
      case 'equip': {
        const id = b.dataset.id,
          it = ITEM[id];
        if (!it) break;
        sfx.pop();
        P().stash = null;
        const o = P().outfit;
        if (wornByDefault(it) || o[it.slot] === id) delete o[it.slot];
        else o[it.slot] = id;
        save();
        const y = scrollY;
        render();
        scrollTo(0, y);
        burstAt($app.querySelector('.wd-stage'), 10, ['✨', '⭐']);
        break;
      }
      case 'stick': {
        // put a sticker on the explorer's shirt (tap the one already on to take it off)
        const id = b.dataset.id,
          prof = P();
        if (!STICKER[id] || !prof.stickers.includes(id)) break;
        sfx.pop();
        prof.stash = null;
        prof.badge = prof.badge === id && b.dataset.from !== 'gift' ? '' : id;
        save();
        if (b.dataset.from === 'gift') {
          if (st.view === 'stranger') {
            hideModal();
            go('map');
          } else if (prof.pending.length) {
            // more gifts: back to the screen they were opened from, to tap the next one
            hideModal();
            render();
          } else {
            hideModal();
            go('bag', { tab: 'stickers' });
            burstAt($app.querySelector('.wd-stage'), 12, ['⭐', '✨']);
          }
          break;
        }
        const y = scrollY;
        render();
        scrollTo(0, y);
        burstAt($app.querySelector('.wd-stage'), 10, ['⭐', '✨']);
        break;
      }
      case 'comfy': {
        // swap between just the comfy clothes and everything the explorer was wearing
        sfx.pop();
        const prof = P();
        if (prof.stash) {
          prof.outfit = Object.assign({}, prof.stash.outfit);
          prof.badge = prof.stash.badge;
          prof.stash = null;
        } else {
          prof.stash = { outfit: Object.assign({}, prof.outfit), badge: prof.badge };
          prof.outfit = {};
          prof.badge = '';
        }
        save();
        render();
        burstAt($app.querySelector('.wd-stage'), 10, ['✨', '⭐']);
        break;
      }
      case 'opengift':
        // one tap: the gift opens and shows what's inside
        if (P().pending.length) popGift();
        break;
      case 'progress':
        sfx.tap();
        showProgress(b.dataset.t);
        break;
      case 'jump':
        sfx.tap();
        jumpTo(+b.dataset.i);
        break;
      case 'poke':
        poke(b);
        break;
      case 'pal': {
        // another explorer on this phone: they do a move and say who they are
        const p = palOf(b);
        if (!p) break;
        explorerMove(b.querySelector('svg.ex'), p);
        sayOnMap(b, `${p.name || 'Explorer'} · ⭐ ${totalStars(p)}`, 3200);
        break;
      }
      case 'exmove':
        if (Date.now() - swiped < 400) break; // that was a swipe, not a tap
        explorerMove(b.querySelector('svg.ex'));
        break;
      case 'summitok': {
        const after = st.after;
        go('done', after);
        bigParty();
        break;
      }
      case 'wear': {
        const it = ITEM[b.dataset.id];
        if (it) {
          P().outfit[it.slot] = it.id;
          save();
        }
        sfx.chime();
        hideModal();
        if (st.view === 'stranger') go('map'); // the Stranger's gift: on to the world
        else if (P().pending.length) render(); // more gifts: back to where they were opened
        else go('bag', { tab: it ? it.slot : 'hat' });
        break;
      }
      case 'giftok':
        // Yay / Next gift: back to the screen the gift was opened from (from the Stranger: on to the world)
        sfx.tap();
        hideModal();
        if (st.view === 'stranger') go('map');
        else render();
        break;
      case 'fs':
        sfx.tap();
        if (fsNow()) {
          prefs.fullscreen = false;
          save();
          exitFs();
        } else {
          prefs.fullscreen = true;
          save();
          enterFs();
        }
        break;

      /* sūrah */
      case 'part':
        sfx.tap();
        if (st.view !== 'surah') {
          go('surah', { i: st.i, p: b.dataset.p === 'all' ? 'all' : +b.dataset.p });
          break;
        }
        st.p = b.dataset.p === 'all' ? 'all' : +b.dataset.p;
        st.enter = false;
        render();
        break;
      case 'show':
        sfx.tap();
        go('show');
        break;
      case 'share':
        sfx.tap();
        b.disabled = true;
        shareCard()
          .catch(() => toast("The picture couldn't be made on this device."))
          .then(() => (b.disabled = false));
        break;
      case 'sharego':
        sfx.tap();
        shareGo();
        break;
      case 'sharesave':
        sfx.tap();
        shareSave();
        break;
      case 'savefile':
        sfx.tap();
        saveFile();
        break;
      case 'loadfile':
        sfx.tap();
        document.getElementById('loadfile').click();
        break;
      case 'cpscroll':
      case 'wtscroll': {
        const tr = document.getElementById(act === 'wtscroll' ? 'wtabs' : 'cptrail');
        if (tr) tr.scrollBy({ left: +b.dataset.d * tr.clientWidth * 0.7, behavior: 'smooth' });
        break;
      }
      case 'toy': {
        const kind = s && s.toy ? s.toy[1] : 'chime';
        (sfx[kind] || sfx.chime)();
        burstAt(b, 8, [s && s.toy ? s.toy[0] : '✨', '✨']);
        wobble(b);
        break;
      }
      case 'back': {
        sfx.tap();
        stopAudio();
        const to = b.dataset.to;
        if (to === 'map') go('map');
        else if (to === 'splash') go('splash');
        else if (to === 'bag') go('bag', { tab: 'hat' });
        else if (to === 'explorers') go('explorers');
        else if (to === 'ret' && st.ret) go(st.ret.view, st.ret);
        else toSurah();
        break;
      }
      case 'bism':
        sfx.tap();
        if (s) bismSaid = s.n;
        b.classList.remove('breathe');
        showBism();
        break;
      case 'help':
        sfx.tap();
        showHelp();
        break;
      case 'howto':
        sfx.tap();
        showHowTo();
        break;
      case 'bismplay':
        playList([[1, 1]], { once: true });
        break;
      case 'closemodal':
        sfx.chime();
        hideModal();
        stopAudio();
        break;
      case 'settings':
        sfx.tap();
        go('settings');
        break;
      case 'speedpop':
        sfx.tap();
        showSpeed();
        break;
      case 'wordset': {
        // from the Read focus card: straight to the word switches, and back to the same āyah after
        sfx.tap();
        go('settings', { ret: Object.assign({}, st), flash: ['wordmean', 'translit'] });
        const t = document.querySelector('[data-act=tog][data-k=wordmean]');
        if (t) t.scrollIntoView({ block: 'center' });
        break;
      }
      case 'tog':
        prefs[b.dataset.k] = !prefs[b.dataset.k];
        save();
        if (prefs.translit || prefs.wordmean) loadWords();
        sfx.tap();
        if (b.dataset.k === 'audio') stopAudio();
        render();
        break;
      case 'set': {
        const k = b.dataset.k;
        prefs[k] = k === 'speed' || k === 'chain' ? +b.dataset.v : b.dataset.v;
        if (k === 'chain') prefs.chainSet = true;
        if (k === 'speed') player.playbackRate = prefs.speed;
        save();
        sfx.tap();
        if (k === 'theme') applyTheme();
        render();
        if (k === 'speed' && document.querySelector('#modal.show .speedcard')) showSpeed(); // the quick picker stays open
        break;
      }
      case 'reciter':
        sfx.tap();
        stopAudio();
        prefs.reciter = b.dataset.id;
        save();
        loadTimings(prefs.reciter).catch(() => {});
        render();
        break;
      case 'sample':
        if (RECITERS.some((r) => r.id === b.dataset.id)) playList([[1, 1]], { once: true, reciter: b.dataset.id });
        break;
      case 'saveaudio':
        saveAllAudio();
        break;
      case 'cyes': {
        const f = pendingYes;
        pendingYes = null;
        hideModal();
        if (f) f();
        break;
      }
      case 'cno':
        pendingYes = null;
        hideModal();
        break;
      case 'challenge':
        sfx.tap();
        if (heroReady(P())) meetStranger(true);
        break;
      case 'strface':
        hideModal();
        startStranger();
        break;
      case 'strrun':
        sfx.tap();
        hideModal();
        break;
      case 'strgo':
        sfx.tap();
        st.phase = 'ask';
        render();
        break;
      case 'strans':
        strangerAnswer(b.dataset.ok === '1');
        break;
      case 'strdone':
        sfx.tap();
        go('map');
        break;
      case 'retry': {
        hideModal();
        const r = pendingRestart;
        pendingRestart = null;
        if (r) restartActivity(r);
        break;
      }

      /* listening */
      case 'fab': {
        if (playing) {
          stopAudio();
          break;
        }
        const t = fabTarget();
        if (t) playList(t.items, t.loop ? { loop: loopN } : null);
        break;
      }
      case 'mushaf':
        sfx.tap();
        if (prefs.translit || prefs.wordmean) loadWords();
        go('mushaf', { i: st.i, p: st.p, sel: null });
        break;
      case 'mclear':
        if (hold && hold.fired) {
          hold = null; // the click that ends a long press
          break;
        }
        if (st.sel != null && !st.focus && e.target.closest('.mayah.sel')) {
          // the colored āyah tapped again: look at it up close
          sfx.pop();
          st.focus = true;
          loadWords();
          render();
          break;
        }
        if (st.sel != null) {
          const card = st.focus && !reduceMotion && document.querySelector('.mfcard');
          if (card) {
            // the card shrinks away the way it came, and the page unblurs, then the colors go
            if (card._closing) break;
            card._closing = true;
            sfx.tap();
            const mu = document.querySelector('.mushaf.focusing');
            if (mu) mu.classList.remove('focusing');
            card.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.2)', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = () => {
              if (!card.isConnected || st.view !== 'mushaf') return; // something else happened meanwhile
              st.sel = null;
              st.focus = false;
              render();
            };
            break;
          }
          st.sel = null;
          st.focus = false;
          render();
        }
        break;
      case 'loop':
        sfx.tap();
        loopN = LOOPS[(LOOPS.indexOf(loopN) + 1) % LOOPS.length];
        if (playing && loopRun) {
          // keep playing: the count starts again at the new number, the āyah playing now being the first
          // (between two āyāt nothing is playing: the rest of this pass starts with the next one)
          const at = loopRun.played % loopRun.per;
          queue = loopRun.items.slice(at + (curSeg ? 1 : 0));
          for (let r = 1; r < loopN; r++) queue.push(...loopRun.items);
          loopRun.total = loopN;
          loopRun.played = at;
        } else if (playing) stopAudio();
        drawLoops();
        break;
      case 'dlyes':
      case 'dlno': {
        const f = dlAnswer;
        dlAnswer = null;
        if (act === 'dlno') hideModal();
        else m.querySelector('.dlcard').classList.add('busy');
        if (f) f(act === 'dlyes');
        break;
      }
      case 'say':
        playList([[+b.dataset.n, +b.dataset.k + 1]]);
        break;
      case 'sayw':
        playList([[+b.dataset.n, +b.dataset.k + 1, +b.dataset.w]]);
        wobble(b);
        break;

      /* look & repeat */
      case 'learn': {
        sfx.tap();
        let a = b.dataset.a != null ? +b.dataset.a : null,
          p = st.p;
        if (a != null) p = partOf(s, a);
        else p = pnum(p);
        const r = startRun(s, p, 'la');
        if (a == null) a = r.first;
        go('learn', { i: st.i, p, a, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0, saidA: r.run, savedA: r.saved });
        break;
      }
      case 'pop': {
        const bi = +b.dataset.b;
        if (st.popped[bi]) break;
        sfx.pop();
        burstAt(b, 12, ['💧', '✨', '⭐']);
        st.popped[bi] = true;
        render();
        if (st.popped.every(Boolean))
          setTimeout(() => {
            if (st.view !== 'learn') return;
            sfx.chime();
            st.phase = 'alone';
            st.peek = false;
            render();
          }, 650);
        break;
      }
      case 'peek':
        sfx.tap();
        st.peek = !st.peek;
        render();
        break;
      case 'saidit': {
        sfx.chime();
        burstAt(b, 20);
        setTimeout(() => {
          if (chainNow()) {
            st.phase = 'chain';
            st.chain = 0;
            render();
          } else learnNext();
        }, 450);
        break;
      }
      case 'ljump': {
        const k = +b.dataset.k;
        if (k === st.a) break;
        sfx.tap();
        Object.assign(st, { a: k, phase: 'repeat', popped: [false, false, false], peek: false, chain: 0 });
        render(true);
        break;
      }
      case 'chainstep': {
        const L = chainList();
        if (st.chain >= L.length) break;
        // tap a link already said: go back to it (it and the ones after it are to be said again)
        if (b.dataset.j != null && +b.dataset.j < st.chain) {
          sfx.boop();
          st.chain = +b.dataset.j;
          const wasPlaying = playing;
          render();
          if (wasPlaying) {
            // Listen was helping: carry on from the āyah gone back to
            stopAudio();
            const t = fabTarget();
            if (t) playList(t.items);
          }
          break;
        }
        sfx.tap();
        st.chain++;
        render();
        const lit = $app.querySelectorAll('.link.lit');
        burstAt(lit[lit.length - 1], 8);
        if (st.chain >= L.length) {
          sfx.chime();
          setTimeout(learnNext, 700);
        }
        break;
      }

      /* word steps */
      case 'words': {
        sfx.tap();
        if (prefs.translit || prefs.wordmean) loadWords();
        const p = pnum(st.p),
          r = startRun(s, p, 'wa');
        go('words', { i: st.i, p, a: r.first, w: 1, phase: 'build', shown: [], doneA: r.run, savedA: r.saved });
        break;
      }
      case 'wnext':
        sfx.tap();
        st.w++;
        render();
        break;
      case 'wprev':
        sfx.tap();
        st.w = Math.max(1, st.w - 1);
        render();
        break;
      case 'wbead': {
        const j = +b.dataset.j;
        sfx.tap();
        if (st.phase === 'build') st.w = j + 1;
        else if (!st.shown.includes(j)) st.shown.push(j);
        render();
        break;
      }
      case 'wrecall':
        sfx.chime();
        st.phase = 'recall';
        st.shown = [];
        render();
        break;
      case 'wbuild':
        sfx.tap();
        st.phase = 'build';
        st.w = 1;
        render();
        break;
      case 'whide':
        sfx.tap();
        st.shown = [];
        render();
        break;
      case 'wshow': {
        const j = +b.dataset.j;
        if (!st.shown.includes(j)) {
          st.shown.push(j);
          sfx.pop();
          render();
          checkWordsAll();
        }
        break;
      }
      case 'wreveal': {
        const n = wordsOf(s.ayat[st.a].ar).length;
        for (let j = 0; j < n; j++)
          if (!st.shown.includes(j)) {
            st.shown.push(j);
            break;
          }
        sfx.pop();
        render();
        checkWordsAll();
        break;
      }
      case 'wjump':
        sfx.tap();
        st.a = +b.dataset.k;
        st.w = 1;
        st.phase = 'build';
        st.shown = [];
        render(true);
        break;
      case 'wdone': {
        const c = ctx();
        if (!st.doneA.includes(st.a)) st.doneA.push(st.a);
        markAyah(s, pnum(st.p), 'wa', st.a);
        const nx = nextTodo(c, st.a, st.doneA);
        if (nx >= 0) {
          sfx.chime();
          st.a = nx;
          st.w = 1;
          st.phase = 'build';
          st.shown = [];
          render(true);
        } else {
          partRec(s.n, st.p).words = 1;
          save();
          finish({
            plain: true,
            msg: `Every word of ${multi(s) ? partLabel(s, st.p).toLowerCase() + ' of ' : ''}${s.name}, in order!`,
            stars: 1,
            nextAct: 'pathpick',
            nextLabel: 'Stepping Stones ›',
          });
        }
        break;
      }

      /* stepping stones */
      case 'pathpick':
        // Stepping Stones starts straight away (from the pictures)
        st.p = b.dataset.p === 'all' ? 'all' : b.dataset.p != null ? +b.dataset.p : st.p != null ? st.p : 0;
        startPath();
        break;
      case 'hint':
        sfx.tap();
        if (pathClues(s, range(ctx())[st.k], st.L, st.hint).full) break;
        st.hint++;
        st.hints++;
        render();
        break;
      case 'oops':
        // a mistake: lose a heart and show one more clue
        if (loseHeart() && st.hearts > 0) {
          const cl = pathClues(S[st.i], range(ctx())[st.k], st.L, st.hint);
          if (!cl.full) {
            st.hint++;
            st.hints++;
          }
          setTimeout(() => {
            if (st.view === 'path' && st.hearts > 0) render();
          }, 500);
        }
        break;
      case 'hop':
        hopFrog();
        break;
      case 'stset': {
        const el = document.getElementById('stsets');
        if (el) el.scrollTo({ left: +b.dataset.q * el.clientWidth, behavior: 'smooth' });
        break;
      }

      /* puzzle */
      case 'order':
        startOrder();
        break;
      case 'biglocked':
        sfx.boop();
        wobble(b);
        toast('Finish the Picture Puzzle in every checkpoint first. Then they all fit together here!');
        break;
      case 'slot':
        if (st.sel != null) tryPlace(st.sel, +b.dataset.j, b);
        break;
      case 'pzsay': {
        const it = puzzleItems()[+b.dataset.j];
        if (it) playList(it.say.map((k) => [s.n, k + 1]));
        break;
      }

    }
  });

  function learnNext() {
    const s = S[st.i],
      c = ctx();
    if (!st.saidA.includes(st.a)) st.saidA.push(st.a);
    markAyah(s, pnum(st.p), 'la', st.a);
    const nx = nextTodo(c, st.a, st.saidA);
    if (nx >= 0) {
      st.a = nx;
      st.phase = 'repeat';
      st.popped = [false, false, false];
      st.peek = false;
      st.chain = 0;
      render(true);
    } else {
      partRec(s.n, st.p).learn = 1;
      save();
      finish({
        big: s.icon,
        msg: `You said ${multi(s) ? partLabel(s, st.p).toLowerCase() + ' of ' : 'all of '}${s.name} with the pictures!`,
        stars: 1,
        nextAct: 'words',
        nextLabel: 'Next: Word Steps ›',
      });
    }
  }
  function checkWordsAll() {
    const n = wordsOf(S[st.i].ayat[st.a].ar).length;
    if (st.shown.length === n) {
      sfx.chime();
      burstAt($app.querySelector('.wstage'), 18, ['★', '✦', '●']);
    }
  }

  /* The explorer's moves in My Explorer: tap them (or wait 15 seconds) and they do one of these. Some use what
     they are wearing (tip the hat, check the watch, raise the shield, tap the stick, play with the buddy);
     those come up more often when there is something to play with. */
  const MOVES = {
    giggle: { run: () => sfx.giggle() },
    twirl: { run: () => sfx.whoosh(), front: true },
    jump: { run: () => sfx.hop() },
    wave: { run: () => sfx.chime(), front: true, noShield: true },
    dance: { run: () => sfx.dance() },
    spin: { run: () => sfx.whoosh(), noPet: true },
    look: { run: () => sfx.chime(), front: true }, // looks around
    march: { run: () => sfx.hop() },
    pethop: { run: () => sfx.pop(), needs: 'pet' },
    petrun: { run: () => sfx.rustle(), needs: 'pet' }, // the buddy runs a lap and comes back
    hattip: { run: () => sfx.chime(), needs: 'hat', front: true },
    watch: { run: () => sfx.tap(), needs: 'watch', front: true },
    stomp: { run: () => [0, 380].forEach((t) => setTimeout(sfx.boop, t)), needs: 'stick', front: true },
    shield: { run: () => sfx.boop(), needs: 'shield', front: true },
    cape: { run: () => sfx.whoosh(), needs: 'cape', front: true },
    glasses: { run: () => sfx.tap(), needs: 'glasses', front: true },
  };
  let lastMove = '';
  function explorerMove(svg, prof, quiet) {
    if (!svg || reduceMotion) return;
    const back = svg.classList.contains('ex-back'),
      worn = wornOutfit(prof);
    const can = Object.keys(MOVES).filter((k) => {
      const m = MOVES[k];
      return k !== lastMove && !(m.needs && !worn[m.needs]) && !(m.noPet && worn.pet) && !(m.noShield && worn.shield) && !(back && m.front);
    });
    const own = can.filter((k) => MOVES[k].needs);
    const pool = own.length && Math.random() < 0.45 ? own : can; // playing with their things, often
    const k = pool[(Math.random() * pool.length) | 0];
    if (!k) return;
    lastMove = k;
    Object.keys(MOVES).forEach((x) => svg.classList.remove('mv-' + x));
    void svg.getBoundingClientRect();
    svg.classList.add('mv-' + k);
    if (!quiet) MOVES[k].run();
    clearTimeout(svg._mv);
    svg._mv = setTimeout(() => svg.classList.remove('mv-' + k), 1700);
    if (k === 'giggle') burstAt(svg, 5, ['😄', '✨']);
    if (k === 'hattip') burstAt(svg, 4, ['✨', '💫']);
  }
  setInterval(() => {
    if (st.view !== 'bag' || document.hidden || document.getElementById('modal').classList.contains('show')) return;
    explorerMove($app.querySelector('.wd-ex svg.ex'));
  }, 15000);

  /* Tap the world: animals hop, plants shake, houses and other things bounce, the explorer jumps for joy. */
  const ANIMAL = /sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat|starfish|snowman/,
    PLANT = /tree|pine|oak|bush|grass|flower|fern|palm|cactus|mushroom|berries|crystal/;
  function poke(el) {
    const k = el.dataset.k || '';
    // on the start screen the explorer has a few moves of their own
    const spMoves = ['joy', 'spin', 'dance', 'hops'];
    const kind =
      k === 'explorer'
        ? el.closest('.lhq-splash')
          ? spMoves.filter((x) => x !== el._last)[(Math.random() * 3) | 0]
          : 'joy'
        : k === 'flag'
          ? 'flag'
          : k === 'cloud'
            ? 'puff'
            : ANIMAL.test(k)
              ? 'hop'
              : PLANT.test(k)
                ? 'shake'
                : 'bounce';
    el._last = kind;
    // tap an animal on the map a few times in a row: it runs away, peeks back in, then comes home
    if (kind === 'hop' && el.classList.contains('mprop')) {
      const now = Date.now();
      el._taps = (el._taps || []).filter((t) => now - t < 2500).concat(now);
      if (el._away || el._busy) return; // already running off, or on its way to a fruit
      if (el._taps.length >= 3 && runAway(el)) return;
    }
    el.classList.remove('poke-joy', 'poke-puff', 'poke-hop', 'poke-shake', 'poke-bounce', 'poke-spin', 'poke-dance', 'poke-hops', 'poke-flag');
    void el.getBoundingClientRect();
    el.classList.add('poke-' + kind);
    clearTimeout(el._pk);
    el._pk = setTimeout(() => el.classList.remove('poke-' + kind), kind === 'flag' ? 1600 : 1100);
    const set = { joy: ['⭐', '✨', '💛'], spin: ['✨', '⭐'], dance: ['🎵', '✨'], hops: ['⭐', '✨'], flag: ['🎉', '⭐', '✨'], puff: ['☁️', '✨'], hop: ['💕', '✨'], shake: ['🍃', '🌸'], bounce: ['✨', '⭐'] }[kind];
    burstAt(el, kind === 'joy' || kind === 'flag' ? 10 : 5, set);
    if (kind === 'shake' && FRUIT_OF[k] && el.classList.contains('mprop')) dropFruit(el);
    // tap a windmill, a cottage, a lighthouse, a flag… a few times in a row: it gets excited
    if (kind === 'bounce' && el.classList.contains('mprop')) {
      const now = Date.now();
      el._taps = (el._taps || []).filter((t) => now - t < 2500).concat(now);
      if (el._taps.length >= 3) {
        el._taps = [];
        excite(el);
      }
    }
    ({ joy: sfx.hop, spin: sfx.whoosh, dance: sfx.dance, hops: sfx.hop, flag: sfx.win, puff: sfx.whoosh, hop: sfx.pop, shake: sfx.rustle, bounce: sfx.tap })[kind]();
  }

  /* A windmill spins fast, a chimney puffs more smoke, a lighthouse beam whirls, flags flap: everything that
     moves in the picture speeds up, then slows back down over a few seconds. Animals nearby scurry off and
     creep back as it calms down. */
  function excite(el) {
    const anims = el.getAnimations({ subtree: true }).filter((x) => x instanceof CSSAnimation);
    if (!anims.length || reduceMotion) return;
    sfx.whoosh();
    burstAt(el, 8, /cottage|cabin|igloo/.test(el.dataset.k) ? ['💨', '☁️'] : ['✨', '💨', '⭐']);
    const T = 6000,
      t0 = performance.now();
    clearInterval(el._ex);
    el._ex = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / T),
        rate = 1 + 5 * (1 - f) * (1 - f); // 6× at first, easing back to normal
      anims.forEach((x) => x.updatePlaybackRate ? x.updatePlaybackRate(rate) : (x.playbackRate = rate));
      if (f >= 1 || !el.isConnected) clearInterval(el._ex);
    }, 120);
    // the animals nearby, in the same world, scurry away and slowly come back
    const ex = +el.dataset.x,
      ey = +el.dataset.y;
    [...el.parentNode.querySelectorAll('.mprop')]
      .filter((a) => EATER.test(a.dataset.k) && !a._away && !a._busy && a.dataset.w === el.dataset.w && Math.hypot(+a.dataset.x - ex, +a.dataset.y - ey) < 240)
      .forEach((a) => scurry(a, ex, ey, T));
  }
  function scurry(a, fx, fy, T) {
    const who = a.firstElementChild;
    if (!who || !who.animate) return;
    a._busy = true;
    const strolls = who.getAnimations().filter((x) => x instanceof CSSAnimation);
    strolls.forEach((x) => x.pause());
    const cs = getComputedStyle(who).transform,
      m0 = cs && cs !== 'none' ? new DOMMatrixReadOnly(cs) : new DOMMatrixReadOnly(),
      x0 = m0.m41,
      face0 = m0.a < 0 ? -1 : 1;
    const ax = +a.dataset.x,
      dir = ax >= fx ? 1 : -1, // away from the noise
      far = dir * (70 + Math.random() * 40),
      nat = ART.FACE_LEFT.includes(a.dataset.k) ? -1 : 1,
      at = (offset, x, y, face) => ({ offset, transform: `translate(${x.toFixed(1)}px, ${y}px) scaleX(${face})` });
    const run = who.animate(
      [at(0, x0, 0, face0), at(0.03, x0 + far * 0.3, -8, dir * nat), at(0.06, x0 + far * 0.65, 0, dir * nat), at(0.09, x0 + far, -6, dir * nat), at(0.12, x0 + far, 0, dir * nat), at(0.55, x0 + far, 0, -dir * nat), at(0.75, x0 + far * 0.5, 0, -dir * nat), at(0.98, x0, 0, -dir * nat), at(1, x0, 0, face0)],
      { duration: T + 1500 },
    );
    run.onfinish = run.oncancel = () => {
      strolls.forEach((x) => x.play());
      a._busy = false;
    };
  }

  /* ---------- the other explorers on the map: standing in their own world, doing their own thing ---------- */
  // a speech bubble over someone on the map, for a moment. Another explorer carries theirs along as they walk
  // (it sits inside what moves); the explorer by their sūrah gets one on the map above them.
  function sayOnMap(el, text, ms) {
    const layer = el.parentNode;
    if (!layer || !mapCtl) return;
    const b = document.createElement('div');
    b.className = 'mbubble';
    b.textContent = text;
    let done;
    if (el.classList.contains('mpal')) {
      const old = el.querySelector('.mbubble');
      if (old) old.remove();
      el.firstElementChild.appendChild(b);
      el.style.zIndex = 7; // over the scenery in front
      done = () => {
        b.remove();
        if (!el.querySelector('.mbubble')) el.style.zIndex = '';
      };
    } else {
      b.classList.add('onmap');
      b.dataset.x = (el.offsetLeft + el.offsetWidth / 2).toFixed(1);
      b.dataset.y = el.dataset.y;
      b.style.left = b.dataset.x + 'px';
      b.style.top = el.offsetTop - 6 + 'px';
      layer.appendChild(b);
      mapCtl.track(b);
      const ctl = mapCtl;
      done = () => {
        ctl.untrack(b);
        b.remove();
      };
    }
    setTimeout(() => {
      b.classList.add('bye');
      setTimeout(done, 400);
    }, ms || 2400);
  }
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 90 && r.top < innerHeight - 40 && r.right > 0 && r.left < innerWidth;
  };
  const palOf = (el) => store.profiles.find((p) => p.id === el.dataset.id);
  const palsBusy = new WeakSet();
  // walk a little way (inside .mpal-in, as the map moves the outer element), then call back
  function palWalk(el, dx, dy, then) {
    const who = el.firstElementChild,
      steps = Math.max(2, Math.round(Math.hypot(dx, dy) / 22)),
      frames = [];
    for (let i = 0; i <= steps; i++) frames.push({ transform: `translate(${((dx * i) / steps).toFixed(1)}px, ${((dy * i) / steps + (i % 2 ? -4 : 0)).toFixed(1)}px)` });
    const a = who.animate(frames, { duration: Math.max(600, Math.hypot(dx, dy) * 14), fill: 'forwards' });
    a.onfinish = () => then && then(a);
    return a;
  }
  // a wave hello (the explorer by their sūrah waves too)
  function wave(el) {
    const svg = el && el.querySelector('svg.ex');
    if (!svg || reduceMotion) return;
    Object.keys(MOVES).forEach((x) => svg.classList.remove('mv-' + x));
    void svg.getBoundingClientRect();
    svg.classList.add('mv-wave');
    clearTimeout(svg._mv);
    svg._mv = setTimeout(() => svg.classList.remove('mv-wave'), 1700);
  }
  function palIdle() {
    if (st.view !== 'map' || document.hidden || reduceMotion || document.getElementById('modal').classList.contains('show')) return;
    const layer = document.querySelector('#map .mlayer');
    if (!layer) return;
    const pals = [...layer.querySelectorAll('.mpal')].filter((el) => onScreen(el) && !palsBusy.has(el));
    if (!pals.length) return;
    const el = pals[(Math.random() * pals.length) | 0],
      x = +el.dataset.x,
      y = +el.dataset.y,
      w = el.dataset.w;
    // someone close by? say salām (the explorer by their sūrah counts too)
    const near = [...layer.querySelectorAll('.mpal, .mex')].filter((o) => o !== el && onScreen(o) && Math.hypot(+o.dataset.x - x, +o.dataset.y - y) < 170);
    const r = Math.random();
    if (near.length && r < 0.45 && Date.now() - (el._hi || 0) > 20000) {
      const o = near[(Math.random() * near.length) | 0];
      el._hi = o._hi = Date.now();
      wave(el);
      if (Math.random() < 0.5) {
        // salām, and the answer
        sayOnMap(el, 'As-salāmu ʿalaykum! 👋');
        setTimeout(() => o.isConnected && (wave(o), sayOnMap(o, 'Wa ʿalaykumu s-salām! 😊')), 1300);
      } else {
        // or just a wave back
        sayOnMap(el, '👋', 1600);
        setTimeout(() => o.isConnected && (wave(o), sayOnMap(o, '👋', 1600)), 900);
      }
      return;
    }
    if (r < 0.75) {
      // go and play with something nearby in the same world: shake a tree, pat an animal, poke a thing
      const things = [...layer.querySelectorAll('.mprop')].filter((t) => t.dataset.w === w && !t._away && !t._busy && Math.hypot(+t.dataset.x - x, +t.dataset.y - y) < 150);
      const t = things[(Math.random() * things.length) | 0];
      if (t) {
        palsBusy.add(el);
        const side = +t.dataset.x > x ? -1 : 1,
          dx = +t.dataset.x + side * (t.offsetWidth / 2 + 16) - x,
          dy = +t.dataset.y - y;
        const go1 = palWalk(el, dx, dy, () => {
          poke(t);
          setTimeout(() => {
            const back = el.firstElementChild.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: Math.max(600, Math.hypot(dx, dy) * 14) });
            go1.cancel();
            back.onfinish = () => palsBusy.delete(el);
          }, 1600);
        });
        return;
      }
    }
    explorerMove(el.querySelector('svg.ex'), palOf(el), true);
  }
  setInterval(palIdle, 3200);

  /* Tap a fruit tree, a berry bush, a pine or a cactus on the map: a fruit drops beside it, and the nearest
     animal runs over, eats it in three bites, and goes back to where it was. */
  const FRUIT_OF = {
    'meadow-tree': 'apple',
    'forest-bigtree': 'apple',
    'meadow-bush': 'cherry',
    'forest-berries': 'blueberry',
    'forest-oak': 'acorn',
    'forest-pine': 'pinecone',
    'peak-pine': 'pinecone',
    'sands-palm': 'coconut',
    'canyon-cactus': 'pear',
  };
  const EATER = /sheep|rabbit|fox|owl|deer|squirrel|crab|turtle|camel|lizard|goat/;
  function dropFruit(tree) {
    const layer = tree.parentNode;
    if (!layer || !mapCtl || reduceMotion || layer.querySelectorAll('.mfruit').length >= 4) return;
    const tx = +tree.dataset.x,
      ty = +tree.dataset.y;
    // the nearest animal that isn't busy, not too far away
    const near = [...layer.querySelectorAll('.mprop')]
      .filter((a) => EATER.test(a.dataset.k) && !a._away && !a._busy && a.dataset.w === tree.dataset.w) // animals stay in their own world
      .map((a) => ({ a, d: Math.hypot(+a.dataset.x - tx, +a.dataset.y - ty) }))
      .filter((o) => o.d < 520)
      .sort((p, q) => p.d - q.d)[0];
    const side = near ? (+near.a.dataset.x < tx ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
    const fx = tx + side * (tree.offsetWidth * 0.32 + 12),
      fy = ty + 2;
    const f = document.createElement('div');
    f.className = 'mfruit';
    f.dataset.x = fx.toFixed(1);
    f.dataset.y = fy.toFixed(1);
    f.style.left = (fx - 12).toFixed(1) + 'px';
    f.style.top = (fy - 24).toFixed(1) + 'px';
    f.innerHTML = `<div class="mf-in">${ART.fruit(FRUIT_OF[tree.dataset.k])}</div>`;
    // at its depth among the scenery (drawn back to front): what stands in front of it is drawn over it
    const scene = [...layer.querySelectorAll('.mprop, .mpal')],
      front = scene.find((el) => +el.dataset.y > fy);
    if (front) layer.insertBefore(f, front);
    else if (scene.length) scene[scene.length - 1].after(f);
    else layer.appendChild(f);
    mapCtl.track(f);
    const ctl = mapCtl,
      gone = () => {
        ctl.untrack(f);
        f.remove();
      };
    if (near) near.a._busy = true; // spoken for, before the fruit lands
    // falls from the branches, with a little bounce
    const fall = f.firstElementChild.animate(
      [
        { transform: `translateY(${-Math.round(tree.offsetHeight * 0.55)}px) rotate(-30deg)`, easing: 'cubic-bezier(.5,0,1,1)' },
        { transform: 'translateY(0) rotate(0)', offset: 0.7, easing: 'ease-out' },
        { transform: 'translateY(-8px) rotate(8deg)', offset: 0.85, easing: 'ease-in' },
        { transform: 'translateY(0) rotate(0)' },
      ],
      { duration: 700 },
    );
    fall.onfinish = () => {
      if (!f.isConnected) return;
      sfx.pop();
      if (near && near.a.isConnected) comeEat(near.a, f, gone);
      else
        setTimeout(() => {
          // nobody hungry nearby: it fades away after a while
          const fade = f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, delay: 2400, fill: 'forwards' });
          fade.onfinish = gone;
        }, 0);
    };
  }
  function comeEat(a, f, gone) {
    const who = a.firstElementChild; // the map moves the prop itself while scrolling, so animate what's inside
    a._busy = true;
    // a walker may be mid-stroll: pause its stroll and start from where it is
    const strolls = who.getAnimations().filter((x) => x instanceof CSSAnimation);
    strolls.forEach((x) => x.pause());
    const cs = getComputedStyle(who).transform,
      m0 = cs && cs !== 'none' ? new DOMMatrixReadOnly(cs) : new DOMMatrixReadOnly(),
      x0 = m0.m41,
      face0 = (m0.a < 0 ? -1 : 1) * (ART.FACE_LEFT.includes(a.dataset.k) ? -1 : 1);
    const ar = a.getBoundingClientRect(),
      fr = f.getBoundingClientRect(),
      k = ar.width / (a.offsetWidth || ar.width) || 1, // things near the horizon are drawn smaller
      feet = ar.left + ar.width / 2 + x0 * k,
      dir = fr.left + fr.width / 2 > feet ? 1 : -1,
      x1 = (fr.left + fr.width / 2 - dir * ar.width * 0.36 - (ar.left + ar.width / 2)) / k, // beside the fruit, facing it
      y1 = (fr.bottom - ar.bottom) / k;
    const flies = /owl/.test(a.dataset.k),
      nat = ART.FACE_LEFT.includes(a.dataset.k) ? -1 : 1; // which way the picture faces
    // face: +1 to look right, -1 to look left (the picture is mirrored as needed)
    const pos = (x, y, face, extra) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scaleX(${face * nat})${extra || ''}`;
    const trip = (xa, ya, xb, yb, face) => {
      const dist = Math.hypot(xb - xa, yb - ya) * k,
        steps = Math.max(2, Math.round(dist / 34)),
        frames = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps,
          lift = flies ? -Math.sin(t * Math.PI) * 46 : i % 2 ? -8 : 0;
        frames.push({ transform: pos(xa + (xb - xa) * t, ya + (yb - ya) * t + lift, face) });
      }
      return who.animate(frames, { duration: Math.max(700, Math.min(2600, dist / 0.3)), fill: 'forwards' });
    };
    const anims = [];
    const done = () => {
      anims.forEach((x) => x.cancel());
      strolls.forEach((x) => x.play());
      a._busy = false;
    };
    sfx.whoosh();
    const go1 = trip(x0, 0, x1, y1, dir);
    anims.push(go1);
    go1.onfinish = () => {
      if (!a.isConnected || !f.isConnected) return done();
      // three bites
      const munch = who.animate(
        [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: pos(x1, y1 + (i % 2 ? 3 : 0), dir, ` rotate(${i % 2 ? 6 * dir : 0}deg)`) })),
        { duration: 1500, fill: 'forwards' },
      );
      anims.push(munch);
      const bite = f.firstElementChild.animate(
        [
          { transform: 'scale(1)', opacity: 1, easing: 'steps(1)' },
          { transform: 'scale(.72)', offset: 0.3, easing: 'steps(1)' },
          { transform: 'scale(.45)', offset: 0.62, easing: 'steps(1)' },
          { transform: 'scale(.2)', opacity: 1, offset: 0.9 },
          { transform: 'scale(0)', opacity: 0 },
        ],
        { duration: 1500, fill: 'forwards' },
      );
      [0, 450, 930].forEach((t) => setTimeout(() => f.isConnected && (sfx.tap(), burstAt(f, 2, ['✨'])), t));
      bite.onfinish = () => {
        gone();
        burstAt(a, 4, ['💕', '✨']);
        const back = trip(x1, y1, x0, 0, -dir);
        anims.push(back);
        back.onfinish = () => {
          const settle = who.animate([{ transform: pos(x0, 0, face0) }, { transform: pos(x0, 0, face0) }], { duration: 120, fill: 'forwards' });
          anims.push(settle);
          settle.onfinish = done;
        };
      };
    };
  }

  function runAway(el) {
    const who = el.firstElementChild; // the map moves the prop itself while scrolling, so animate what's inside
    if (!who || !who.animate || reduceMotion) return false;
    el._away = true;
    el._taps = [];
    const r = el.getBoundingClientRect(),
      k = r.width / (el.offsetWidth || r.width) || 1, // things near the horizon are drawn smaller
      dir = r.left + r.width / 2 < innerWidth / 2 ? -1 : 1, // off the nearest side
      out = (dir > 0 ? innerWidth - r.left + 30 : -(r.right + 30)) / k,
      peek = (dir > 0 ? innerWidth - r.left - r.width * 0.55 : -r.left - r.width * 0.45) / k;
    const at = (offset, x, y) => ({ offset, transform: `translate(${Math.round(x)}px, ${y || 0}px)` });
    const run = who.animate(
      [
        at(0, 0),
        at(0.05, out * 0.18, -16),
        at(0.1, out * 0.4),
        at(0.15, out * 0.66, -12),
        at(0.2, out),
        at(0.42, out), // gone…
        at(0.5, peek), // …peeks in from the edge
        at(0.55, peek, -5),
        at(0.6, peek),
        at(0.65, peek, -5),
        at(0.7, peek),
        at(0.92, 0), // and comes home
        at(0.96, 0, -10),
        at(1, 0),
      ],
      { duration: 5600 },
    );
    sfx.whoosh();
    const t = setTimeout(() => sfx.pop(), 5600 * 0.5);
    run.onfinish = run.oncancel = () => {
      clearTimeout(t);
      el._away = false;
      if (el.isConnected) burstAt(el, 5, ['💕', '✨']);
    };
    return true;
  }

  /* frog hop: animate from the current stone to the next one, then advance */
  function hopFrog() {
    if (st.hopping) return;
    const s = S[st.i],
      idx = range(ctx());
    const cur = $app.querySelector('.stone.cur'),
      next = $app.querySelector(`.stone[data-j="${st.k + 1}"]`),
      sets = document.getElementById('stsets'),
      turn = sets && next && Math.floor((st.k + 1) / STONES_PER) !== Math.floor(st.k / STONES_PER); // on to the next set
    if (sets && Math.round(sets.scrollLeft / sets.clientWidth) !== sets._q) sets.scrollTo({ left: sets._q * sets.clientWidth }); // back to the frog
    st.hopping = true;
    sfx.hop();
    const advance = () => {
      st.hopping = false;
      if (st.k + 1 >= idx.length) {
        sfx.splash();
        const all = st.p === 'all';
        if (all) rec(s.n).all = 3; // stored as 3 so saves from older versions read the same
        else partRec(s.n, st.p).path = 3;
        save();
        const where = all ? `the whole of ${s.name}` : multi(s) ? `${partLabel(s, st.p).toLowerCase()} of ${s.name}` : s.name;
        finish({
          big: '🐸',
          msg: `You hopped across ${where}, from the pictures!` + (st.hints ? ` (${st.hints} little help${st.hints > 1 ? 's' : ''})` : ' No help needed!'),
          stars: 1,
          ...(all ? {} : { nextAct: 'order', nextLabel: 'Picture Puzzle 🧩' }),
        });
      } else {
        st.k++;
        st.hint = 0;
        render();
        if (turn) burstAt($app.querySelector('.stone.cur'), 8, ['💦', '💧', '✨']);
      }
    };
    if (!cur || reduceMotion || !Element.prototype.animate) {
      setTimeout(advance, 120);
      return;
    }
    const a = cur.getBoundingClientRect(),
      edge = turn ? sets.getBoundingClientRect() : null;
    const target = turn
      ? { left: edge.right - a.width, top: a.top - 10, width: a.width, height: a.height } // off the edge, as the next set slides in
      : next
        ? next.getBoundingClientRect()
        : { left: a.left + 70, top: a.top + 40, width: a.width, height: a.height };
    if (turn) {
      sets._q = Math.floor((st.k + 1) / STONES_PER);
      sets.scrollTo({ left: sets._q * sets.clientWidth, behavior: 'smooth' });
    }
    const f = document.createElement('div');
    f.className = 'flyfrog';
    f.innerHTML = ART.frog();
    f.style.left = a.left + a.width / 2 + 'px';
    f.style.top = a.top + a.height / 2 + 'px';
    document.body.appendChild(f);
    cur.classList.add('empty');
    const dx = target.left + target.width / 2 - (a.left + a.width / 2),
      dy = target.top + target.height / 2 - (a.top + a.height / 2);
    const anim = f.animate(
      [
        { transform: 'translate(-50%,-60%) translate(0px,0px) scale(1) rotate(0deg)' },
        { transform: 'translate(-50%,-60%) translate(' + Math.round(dx / 2) + 'px,' + Math.round(dy / 2 - 70) + 'px) scale(1.35) rotate(-12deg)' },
        { transform: 'translate(-50%,-60%) translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px) scale(1) rotate(0deg)' },
      ],
      { duration: 520, easing: 'ease-in-out' },
    );
    let landed = false;
    setTimeout(() => {
      if (!landed) {
        landed = true;
        f.remove();
        advance();
      }
    }, 900); // safety net if onfinish never fires
    anim.onfinish = () => {
      if (landed) return;
      landed = true;
      f.remove();
      if (!turn) burst(target.left + target.width / 2, target.top + target.height / 2, 8, ['💦', '💧', '✨']);
      advance();
    };
  }

  /* ================= THE STRANGER =================
     Once the game has been open 10 minutes, every 10 minutes there is a 1 in 3 chance that, on the map, a hooded
     stranger blocks the path and asks 3 questions from one memorized sūrah: what comes after an āyah, or
     finish an āyah. No Listen, no hints: a grown-up taps "Said it!" or "Not quite".
     Every miss costs something. He throws what his world has (two kinds per world, shown on its sign), and
     what the explorer wears decides what happens:
       - something worn that blocks that throw takes the hit: ordinary gear falls itself; golden or hero gear
         holds (the next thing on the list falls instead), except in a golden sūrah, where it falls too;
       - nothing that blocks it: the explorer is hurt, and the next thing on the list falls.
     The list: worn things (not golden) best first, then other things owned, then one sticker, then golden
     things only when nothing else is left (golden ones too, in a golden sūrah). Star badges and the comfy
     starter clothes are never taken. Everything falls at that sūrah, until a review game there wins it all back;
     then he comes back for a rematch. All three right: safe, and a small gift (a special one in a rematch).
     After the summit, wins earn the hero armor, shield and sword; with all three, the map has a ⚔️ Challenge
     button to face him any time. The Grown-up Corner can switch him off. */
  const APP_OPENED = Date.now();
  const STRANGER_EVERY = 10 * 60000; // one chance in each 10 minutes
  let strangerRoll = APP_OPENED; // one roll in each 10-minute window
  // he can also turn up while you stay on the map (the 10 minutes count from opening the game, wherever you are)
  setInterval(() => !document.hidden && st.view === 'map' && maybeStranger(), 30000);
  const HERO = ['hero-armor', 'hero-shield', 'hero-sword'];
  const heroReady = (prof) => HERO.every((id) => prof.items.includes(id));
  const memorizedList = (prof) => S.filter((s) => surahDone(s, prof));
  function maybeStranger() {
    const prof = P(),
      m = document.getElementById('modal');
    if (!prefs.stranger || st.view !== 'map' || m.classList.contains('show') || document.body.classList.contains('busy') || noExplorers() || !prof.made) return;
    // a rematch comes as soon as the things are back; after "Not now", again after the usual 10 minutes
    if (prof.rematchReady.length) return Date.now() - prof.strangerAt > STRANGER_EVERY ? meetStranger(false, true) : undefined;
    if (!memorizedList(prof).length) return;
    if (window.__strangerNow) return meetStranger(false); // tests only: skip the waiting and the chance
    if (Date.now() - strangerRoll < STRANGER_EVERY) return;
    strangerRoll = Date.now();
    if (Math.random() < 1 / 3) meetStranger(false);
  }
  function meetStranger(anytime, rematch) {
    const prof = P(),
      free = memorizedList(prof).filter((x) => !prof.fix.includes(x.n)); // not where things are already waiting
    const s = rematch ? BYN[prof.rematchReady[0]] : free[(Math.random() * free.length) | 0];
    if (!s) return;
    prof.strangerAt = Date.now();
    save();
    strangerPlan = { i: S.indexOf(s), anytime: !!anytime, rematch: !!rematch };
    sfx.whoosh();
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card strmeet"><div class="strart">${ART.stranger(rematch ? 'happy' : '')}</div>
      <h3>${rematch ? 'The Stranger is back!' : anytime ? 'You call the Stranger…' : 'A stranger blocks the path!'}</h3>
      <p class="strsay">“${rematch ? `You found your things. Now show me <b>${s.name}</b> is truly in your heart!` : `Show me what you know of <b>${s.name}</b>. Three questions… no help!`}”</p>
      <div class="row"><button class="btn go wide" data-act="strface">⚔️ I'm ready!</button><button class="btn wide" data-act="strrun">🏃 Not now</button></div></div>`;
    m.classList.add('show');
  }
  let strangerPlan = null;

  /* the throws, what blocks them, and what each world has */
  const THROW = {
    rock: { ic: '🪨', name: 'a rock', slots: ['shield', 'pet'] },
    wind: { ic: '💨', name: 'a gust of wind', slots: ['cape', 'top'] },
    water: { ic: '💧', name: 'a splash of water', slots: ['shoes'] },
    acorn: { ic: '🌰', name: 'a shower of acorns', slots: ['hat', 'hijab'] },
    sand: { ic: '✨', name: 'a swirl of sand', slots: ['glasses'] },
    vines: { ic: '🌿', name: 'a tangle of vines', slots: ['stick'] },
  };
  const WORLD_THROWS = [['rock', 'acorn'], ['vines', 'acorn'], ['sand', 'water'], ['rock', 'sand'], ['wind', 'sand'], ['wind', 'water'], ['wind', 'acorn']];
  // the same throw, as each world has it
  const THROW_AS = { 4: { sand: 'a swirl of stardust' }, 5: { water: 'a burst of rain' }, 6: { acorn: 'a shower of hailstones' } };
  const throwName = (k, wi) => (THROW_AS[wi] && THROW_AS[wi][k]) || THROW[k].name;
  const worldThrowIcons = (wi) => (WORLD_THROWS[wi] || []).map((k) => THROW[k].ic).join(' ');
  const JACKETS = /jacket|coat|hoodie|cloak|suit|vest|armor/;
  const RIDE_PET = /rocket|car|plane|train|boat|truck|helicopter/;
  const animalBuddy = (id) => !!id && ITEM[id] && ITEM[id].slot === 'pet' && !ITEM[id].wgold && !RIDE_PET.test(id);
  // special things block more (a future item only needs its list here)
  const EXTRA_BLOCKS = { 'hero-sword': ['rock'], 'hafiz-crown': ['sand'], 'hero-armor': Object.keys(THROW) };
  // what an item blocks: by its kind, plus any extras (the comfy starter things block nothing)
  function blocksOf(id) {
    const it = ITEM[id];
    if (!it || starter(it)) return [];
    const out = Object.keys(THROW).filter((k) => THROW[k].slots.includes(it.slot) && (it.slot !== 'pet' || animalBuddy(id)) && (it.slot !== 'top' || JACKETS.test(id)));
    (EXTRA_BLOCKS[id] || []).forEach((k) => out.includes(k) || out.push(k));
    return out;
  }
  const isGolden = (id) => !!ITEM[id] && (!!ITEM[id].gold || ITEM[id].tier >= 4);
  // the explorer's move when a thing blocks
  const MOVE_FOR = { shield: 'shield', pet: 'pethop', cape: 'cape', top: 'look', shoes: 'march', hat: 'hattip', hijab: 'look', glasses: 'glasses', stick: 'stomp' };
  const defendMove = (id) => (id === 'hero-armor' ? 'jump' : MOVE_FOR[ITEM[id].slot] || 'jump');
  /* What happens when a throw comes: { blocker, hurt, falls: {k:'i'|'s', id} | null } */
  function strikeFor(kind, prof, goldSurah) {
    const worn = Object.values(wornOutfit(prof)).filter((id) => !isLost(id, prof));
    const cands = worn.filter((id) => blocksOf(id).includes(kind));
    const blocker = cands.find((id) => !isGolden(id)) || cands[0] || null;
    const falls = blocker && (!isGolden(blocker) || goldSurah) ? { k: 'i', id: blocker } : nextToFall(prof, goldSurah, blocker);
    return { blocker, hurt: !blocker, falls };
  }
  function nextToFall(prof, goldSurah, keep) {
    const worn = Object.values(wornOutfit(prof));
    const rank = (id) => (ITEM[id].tier || 0) * 10000 + Math.max(0, gotAt(prof, 'i:' + id));
    const canGo = (id) => ITEM[id] && !starter(ITEM[id]) && !isLost(id, prof) && id !== keep;
    const ok = (id) => canGo(id) && (goldSurah || !isGolden(id));
    const best = (list) => list.filter(ok).sort((a, b) => rank(b) - rank(a))[0];
    const w = best(worn) || best(prof.items);
    if (w) return { k: 'i', id: w };
    const stk = (prof.badge && STICKER[prof.badge] && !STICKER[prof.badge].stars ? prof.badge : '') || prof.stickers.filter((id) => !STICKER[id].stars).slice(-1)[0];
    if (stk) return { k: 's', id: stk };
    // nothing else left: golden things too (worn first), and last of all the one protecting
    const g = [...worn, ...prof.items].find(canGo) || (keep && canGo2(keep) ? keep : null);
    return g ? { k: 'i', id: g } : null;
    function canGo2(id) {
      return ITEM[id] && !starter(ITEM[id]) && !isLost(id, prof);
    }
  }
  // it falls at the sūrah (saved at once), until a review game there wins it back
  function dropThing(prof, f, n) {
    if (f.k === 'i') prof.lost.push({ id: f.id, n });
    else {
      prof.stickers = prof.stickers.filter((x) => x !== f.id);
      if (prof.badge === f.id) prof.badge = '';
      prof.lostSt.push({ id: f.id, n });
    }
    if (!prof.fix.includes(n)) prof.fix.push(n);
    if (!prof.rematch.includes(n)) prof.rematch.push(n);
    prof.rematchReady = prof.rematchReady.filter((x) => x !== n);
    save();
  }
  const thingPic = (f) => (f.k === 'i' ? itemPic(f.id) : ART.sticker(f.id));
  const thingName = (f) => (f.k === 'i' ? itemName(f.id) : STICKER[f.id].name + ' sticker');

  function strangerQuestions(s) {
    const A = s.ayat.length,
      ks = shuffle(range({ from: 0, to: A - 1 })),
      wt = WORLD_THROWS[worldOf(s)] || ['rock'],
      qs = [];
    const pick = () => wt[(Math.random() * wt.length) | 0];
    for (const k of ks) {
      if (qs.length === 3) break;
      const words = wordsOf(s.ayat[k].ar);
      const canNext = k < A - 1,
        canFinish = words.length >= 4;
      if (!canNext && !canFinish) continue;
      const kind = canNext && (!canFinish || Math.random() < 0.5) ? 'next' : 'finish';
      qs.push({ k, kind, cut: kind === 'finish' ? Math.ceil(words.length / 2) : 0, throw: pick() });
    }
    while (qs.length < 3) qs.push(Object.assign({}, qs[qs.length % Math.max(1, qs.length)] || { k: 0, kind: 'finish', cut: 1 }, { throw: pick() }));
    return qs;
  }
  function startStranger() {
    const p = strangerPlan;
    if (!p) return;
    stopAudio();
    go('stranger', { i: p.i, p: 0, qs: strangerQuestions(S[p.i]), q: 0, marks: [], hurt: false, fallen: [], phase: 'intro', anytime: p.anytime, rematch: p.rematch, result: null, ack: '' });
  }
  const ACKS = ['Hmm… right!', 'Well remembered!', 'You know it!', 'Correct… impressive!', 'Right again!'];
  V.stranger = () => {
    const s = S[st.i],
      prof = P(),
      q = st.qs[st.q],
      sad = st.hurt || st.fallen.length > 0;
    const dots = st.qs.map((_, j) => `<span class="strdot ${st.marks[j] === true ? 'ok' : st.marks[j] === false ? 'bad' : j === st.q && st.phase === 'ask' ? 'cur' : ''}">${st.marks[j] === true ? '✓' : st.marks[j] === false ? '✗' : j + 1}</span>`).join('');
    let say, panel;
    if (st.phase === 'intro') {
      say = `I'll ask you three things about <b>${s.name}</b>. Get them right, and I'll be on my way!`;
      panel = `<div class="row"><button class="btn go wide" data-act="strgo">Ask me! ⚔️</button></div>`;
    } else if (st.phase === 'end') {
      const r = st.result,
        g = r.win && prof.pending[0];
      say = r.say;
      panel = `<div class="strend">${r.html}${g ? `<button class="giftbtn dgift" data-act="opengift"><span class="rattle">${giftArt(g)}</span><b>A gift for you!</b><small>Tap to open</small></button>` : ''}</div><div class="row"><button class="btn ${g ? '' : 'go'} wide" data-act="strdone">🗺️ Back to the map</button></div>`;
    } else {
      const a = s.ayat[q.k],
        words = wordsOf(a.ar);
      const shown = q.kind === 'finish' ? words.slice(0, q.cut).join(' ') + ' …' : a.ar;
      const answer = q.kind === 'finish' ? a.ar : s.ayat[q.k + 1].ar;
      say = st.ack || (q.kind === 'next' ? `Āyah ${q.k + 1} of ${s.name}… <b>what comes after it?</b>` : `<b>Finish this āyah</b> of ${s.name}!`);
      panel = `<div class="card strq">
        <div class="ar-label">📖 Grown-up reads the question</div>
        <div class="ar sm" lang="ar">${shown}</div>
        ${q.kind === 'next' ? `<div class="strpics">${a.scene.join(' ')}</div>` : ''}
        <details class="adult"><summary>👁️ Grown-up check (the answer)</summary><div class="ar sm" lang="ar">${answer}</div></details>
      </div>
      <div class="row"><button class="btn wide" data-act="strans" data-ok="0" ${st.phase !== 'ask' ? 'disabled' : ''}>🙈 Not quite</button><button class="btn go wide" data-act="strans" data-ok="1" ${st.phase !== 'ask' ? 'disabled' : ''}>✅ Said it!</button></div>`;
    }
    const ground = st.fallen
      .filter((f) => !f.ran)
      .map((f, j) => `<span class="strfallen" style="--j:${j}">${thingPic(f)}</span>`)
      .join('');
    // they stand on a patch of the world's own ground
    const W0 = ART.WORLDS[worldOf(s)],
      gr = (isNight() && W0.dim ? W0.dim : W0).ground;
    return `<div class="screen strscr" style="${cv(s.color)};--pg0:${gr[0]};--pg1:${gr[1]}">
    <div class="strtop"><span class="strtitle">⚔️ The Stranger · ${s.name}</span><span class="strdots">${dots}</span></div>
    <div class="arena">
      <div class="strbubble ${st.ack ? 'ack' : ''}">${say}</div>
      <div class="foe"><div class="strfig">${ART.stranger(st.phase === 'end' && st.result.win ? 'happy' : st.foeHit ? 'hit' : '')}</div><i class="plat"></i></div>
      <div class="me"><div class="mefig">${explorer({ view: 'front', mood: sad ? 'sad' : undefined })}</div>${st.hurt ? '<i class="plaster"></i>' : ''}<i class="plat"></i></div>
      <div class="strground">${ground}</div>
    </div>
    ${panel}
  </div>`;
  };
  function strangerAnswer(right) {
    if (st.view !== 'stranger' || st.phase !== 'ask') return;
    const q = st.qs[st.q],
      s = S[st.i];
    st.marks[st.q] = right;
    st.phase = 'anim';
    const next = () => {
      if (st.view !== 'stranger') return;
      st.foeHit = false;
      st.ack = '';
      if (st.q < 2) {
        st.q++;
        st.phase = 'ask';
        render();
      } else endStranger();
    };
    if (right) {
      // he staggers, and says so
      sfx.chime();
      st.foeHit = true;
      st.ack = ACKS[(Math.random() * ACKS.length) | 0];
      render();
      burstAt(document.querySelector('.strfig'), 10, ['✨', '⭐']);
      setTimeout(next, 1500);
      return;
    }
    render();
    const prof = P(),
      wi = worldOf(s),
      strike = strikeFor(q.throw, prof, surahStars(s) >= surahMax(s));
    const arena = document.querySelector('.arena'),
      foe = document.querySelector('.strfig'),
      me = document.querySelector('.mefig'),
      meBox = me.parentNode;
    const A = arena.getBoundingClientRect(),
      a = (foe.querySelector('svg') || foe).getBoundingClientRect(), // the drawings (their boxes are only wrappers)
      b = (me.querySelector('svg') || me).getBoundingClientRect();
    const P0 = { x: a.left - A.left + a.width * 0.3, y: a.top - A.top + a.height * 0.45 }, // his hand
      head = { x: b.left - A.left + b.width * 0.5, y: b.top - A.top + b.height * 0.22 },
      chest = { x: b.left - A.left + b.width * 0.55, y: b.top - A.top + b.height * 0.45 },
      feet = { x: b.left - A.left + b.width * 0.5, y: b.top - A.top + b.height * 0.9 };
    const bit = (txt, at, size) => {
      const e = document.createElement('span');
      e.className = 'strproj';
      e.textContent = txt;
      e.style.fontSize = (size || 40) + 'px';
      e.style.left = at.x + 'px';
      e.style.top = at.y + 'px';
      arena.appendChild(e);
      return e;
    };
    const fly = (e, frames, ms, delay, ease) => {
      const f = e.animate(frames, { duration: ms, delay: delay || 0, easing: ease || 'ease-in', fill: 'both' });
      f.onfinish = () => e.remove();
      return f;
    };
    const tr = (from, to, dx, dy, extra) => `translate(${(to.x - from.x) + (dx || 0)}px, ${(to.y - from.y) + (dy || 0)}px)${extra || ''}`;
    foe.classList.add('throwing');
    setTimeout(() => foe.classList.remove('throwing'), 500);
    sfx.whoosh();
    // the throw: returns how long until it lands
    let ms;
    if (q.throw === 'rock') {
      const r = bit('🪨', P0, 44);
      fly(r, [{ transform: 'translate(0,0) rotate(0) scale(.7)' }, { transform: tr(P0, chest, -(chest.x - P0.x) / 2, -(chest.y - P0.y) / 2 - 90, ' rotate(360deg) scale(1.15)') }, { transform: tr(P0, chest, 0, 0, ' rotate(720deg)') }], 1200, 350);
      ms = 1550;
    } else if (q.throw === 'wind') {
      ['💨', '🍃', '💨', '🍂', '💨', '🍃'].forEach((t, j) => {
        const yo = (j % 3) * 22 - 22;
        fly(bit(t, P0, 30 + (j % 3) * 8), [{ transform: `translate(0, ${yo}px)`, opacity: 0 }, { transform: tr(P0, chest, -(chest.x - P0.x) / 2, yo - (chest.y - P0.y) / 2), opacity: 1, offset: 0.4 }, { transform: tr(P0, chest, -140, yo + 20), opacity: 0 }], 1700, j * 160, 'ease-in-out');
      });
      ms = 1500;
    } else if (q.throw === 'water') {
      ['💧', '💧', '🌊', '💧', '💧'].forEach((t, j) => {
        const xo = (j - 2) * 18;
        fly(bit(t, P0, t === '🌊' ? 46 : 30), [{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: tr(P0, feet, xo - (feet.x - P0.x) / 2, -(feet.y - P0.y) / 2 - 80, ' scale(1)'), opacity: 1, offset: 0.45 }, { transform: tr(P0, feet, xo, 0, ' scale(1.1)'), opacity: 0.2 }], 1300, 300 + j * 90);
      });
      ms = 1700;
    } else if (q.throw === 'acorn') {
      // tossed up high, they rain down on the explorer's head
      fly(bit('🌰', P0, 30), [{ transform: 'translate(0,0)' }, { transform: 'translate(-10px,-220px)', opacity: 0 }], 500, 0, 'ease-out');
      [-34, -10, 14, 36, 0].forEach((xo, j) => {
        const top = { x: head.x + xo, y: -40 };
        fly(bit('🌰', top, 28), [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { transform: `translate(0, ${head.y + 40}px) rotate(200deg)`, opacity: 1 }], 900, 500 + j * 120);
      });
      ms = 1700;
    } else if (q.throw === 'sand') {
      // a glittering swirl that blows at the eyes
      [0, 1, 2, 3, 4, 5, 6].forEach((j) => {
        const frames = [];
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          frames.push({ transform: `translate(${(head.x - P0.x) * t + Math.sin(t * 9 + j) * 14}px, ${(head.y - P0.y) * t + Math.cos(t * 9 + j) * 14}px) scale(${0.6 + t * 0.6})`, opacity: i === 6 ? 0.3 : 1 });
        }
        fly(bit(j % 2 ? '✨' : '·', P0, j % 2 ? 26 : 34), frames, 1400, j * 90, 'linear');
      });
      ms = 1700;
    } else {
      // vines creep along the ground to the explorer's feet
      const g0 = { x: P0.x, y: feet.y };
      [0, 1, 2, 3].forEach((j) => {
        fly(bit('🌿', g0, 30), [{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { transform: tr(g0, feet, 30 - j * 6, -4, ' scale(1.1) rotate(-20deg)'), opacity: 1 }], 1500, j * 140, 'ease-out');
      });
      ms = 1900;
    }
    // defend just before it lands
    if (strike.blocker)
      setTimeout(() => {
        const svg = me.querySelector('svg.ex'),
          mv = defendMove(strike.blocker);
        if (svg && !reduceMotion) {
          svg.classList.add('mv-' + mv);
          setTimeout(() => svg.classList.remove('mv-' + mv), 1700);
        }
      }, ms - 450);
    setTimeout(() => {
      if (st.view !== 'stranger') return;
      const note = document.createElement('div');
      note.className = 'strnote';
      const f = strike.falls,
        held = strike.blocker && f && f.id !== strike.blocker;
      if (strike.blocker) {
        sfx.boop();
        burstAt(me, 8, ['✨', '💥']);
      } else {
        // hurt: knocked back, dizzy, a plaster
        sfx.pop();
        st.hurt = true;
        meBox.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-26px) rotate(-8deg)' }, { transform: 'translateX(0)' }], { duration: 700, easing: 'ease-out' });
        if (!meBox.querySelector('.plaster')) meBox.insertAdjacentHTML('beforeend', '<i class="plaster"></i>');
        const dz = document.createElement('span');
        dz.className = 'dizzy';
        dz.textContent = '💫';
        meBox.appendChild(dz);
        setTimeout(() => dz.remove(), 1800);
      }
      if (f) dropThing(prof, f, s.n);
      const name = f ? thingName(f) : '';
      const ran = f && f.k === 'i' && animalBuddy(f.id) && f.id === strike.blocker;
      note.innerHTML = !f
        ? `<b>Ouch! ${throwName(q.throw, wi)}! There's nothing left for him to knock off.</b>`
        : ran
          ? `${thingPic(f)}<b>Your ${name} jumped in the way, and ran off!</b>`
          : strike.blocker && !held
            ? `${thingPic(f)}<b>Your ${name} took the hit, and fell!</b>`
            : held
              ? `${thingPic(f)}<b>Your ${itemName(strike.blocker)} held! But your ${name} fell.</b>`
              : `${thingPic(f)}<b>Ouch! Hit by ${throwName(q.throw, wi)}. Your ${name} fell!</b>`;
      arena.appendChild(note);
      me.innerHTML = explorer({ view: 'front', mood: 'sad' }); // without what fell
      if (f) {
        // what fell flies off: a buddy runs away, anything else tumbles to the ground between them
        const it = document.createElement('span');
        it.className = 'strtumble';
        it.innerHTML = thingPic(f);
        it.style.left = chest.x - 20 + 'px';
        it.style.top = chest.y - 20 + 'px';
        arena.appendChild(it);
        const j = st.fallen.filter((x) => !x.ran).length,
          gx = A.width * 0.38 + j * 34,
          gy = A.height - 40;
        st.fallen.push(Object.assign({ ran }, f)); // recorded now; the picture lands when the tumble ends
        const anim = ran
          ? it.animate([0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: `translate(${-i * 40}px, ${i % 2 ? -14 : 0}px) scaleX(-1)` })), { duration: 1100, fill: 'forwards' })
          : it.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${(gx - chest.x) / 2}px, -70px) rotate(220deg)` }, { transform: `translate(${gx - chest.x + 20}px, ${gy - chest.y + 20}px) rotate(380deg)` }], { duration: 900, easing: 'ease-in', fill: 'forwards' });
        anim.onfinish = () => {
          it.remove();
          const gr = arena.querySelector('.strground');
          if (gr && !ran && !gr.querySelector(`.strfallen[style="--j:${j}"]`)) gr.insertAdjacentHTML('beforeend', `<span class="strfallen" style="--j:${j}">${thingPic(f)}</span>`);
        };
      }
      setTimeout(next, 2300);
    }, ms);
  }
  // "Your cap and boots fell. Your ladybug ran off."
  function strangerLoss(fell) {
    const and = (l) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1] : l[0]);
    const fallen = fell.filter((f) => !f.ran).map(thingName),
      ran = fell.filter((f) => f.ran).map(thingName);
    return (fallen.length ? `Your ${and(fallen)} fell. ` : '') + (ran.length ? `Your ${and(ran)} ran off. ` : '');
  }
  function endStranger() {
    const s = S[st.i],
      prof = P(),
      right = st.marks.filter(Boolean).length;
    let r;
    if (right === 3) {
      // all three: safe, and a gift (a rematch or a hero win: a special one)
      let gift = '';
      const nextHero = prof.feats.includes('once') ? HERO.map((id) => ITEM[id]).find((it) => !hasOrWaits(it, prof)) : null;
      if (nextHero) {
        prof.pending.push({ k: 'i', id: nextHero.id });
        gift = `the <b>${nextHero.name}</b>`;
      } else if (st.rematch ? giveSurprise(prof) || giveLevelGift(prof) : giveLevelGift(prof)) gift = st.rematch ? 'a special gift' : 'a little gift';
      if (st.rematch) {
        prof.rematch = prof.rematch.filter((n) => n !== s.n);
        prof.rematchReady = prof.rematchReady.filter((n) => n !== s.n);
      }
      save();
      sfx.win();
      r = { win: true, say: 'Good job! The Qur’an is safe in your heart. I’ll be on my way…', html: `<p class="memo gold">🏆 All three right!${gift ? ` He left ${gift} for you.` : ''}</p>` };
    } else {
      const fell = st.fallen;
      sfx.boop();
      r = {
        win: false,
        took: fell.length,
        say: right ? `${right} out of 3… Practice ${s.name} some more!` : 'Hmm… you need to practice this one!',
        html: fell.length
          ? `<p class="memo">💔 ${strangerLoss(fell)} ${fell.length > 1 ? 'They are' : 'It is'} waiting at <b>${s.name}</b>: finish a review game there to win ${fell.length > 1 ? 'them' : 'it'} back. Then he'll come back for a rematch!</p>`
          : `<p class="memo">He walks away. There was nothing left for him to knock off, but practice <b>${s.name}</b> again!</p>`,
      };
    }
    st.phase = 'end';
    st.result = r;
    render();
  }

  /* puzzle: drag & drop (plus tap a piece, then tap its place) */
  let drag = null;
  function tryPlace(k, j, slotEl) {
    const s = S[st.i],
      items = puzzleItems(),
      big = st.p === 'all';
    // twin āyāt (the same words) may swap places
    if (!st.placed[j] && (k === j || (!big && items[k].ar === items[j].ar))) {
      if (k !== j) st.deck = st.deck.map((x) => (x === j ? k : x === k ? j : x));
      st.placed[j] = true;
      st.say = j;
      st.sel = null;
      sfx.chime();
      render();
      burstAt($app.querySelector(`.pzp[data-j="${j}"]`), 14);
      if (Object.keys(st.placed).length === items.length) {
        const r = rec(s.n),
          first = big && !r.big;
        if (big) r.big = 1;
        else partRec(s.n, st.p).order = 1;
        save();
        setTimeout(() => {
          if (st.view === 'order')
            finish(
              big
                ? { big: '🧩', msg: `You fit all of ${s.name} together, every checkpoint in order!`, stars: 0, firstTime: first }
                : {
                    big: '🧩',
                    msg: `You put ${multi(s) ? partLabel(s, st.p).toLowerCase() + ' of ' : 'all of '}${s.name} in order!`,
                    stars: 1,
                  },
            );
        }, 1500);
      }
    } else {
      // it doesn't fit: the outline of that place blinks red and the piece wiggles back in the pile
      sfx.boop();
      if (st.sel != null) {
        st.sel = null;
        render();
      }
      const hole = $app.querySelector(`.pz-holes g[data-j="${j}"]`),
        piece = $app.querySelector(`.pcard[data-k="${k}"]`);
      if (hole) {
        hole.classList.remove('bad');
        void hole.getBoundingClientRect();
        hole.classList.add('bad');
        setTimeout(() => hole.classList.remove('bad'), 900);
      }
      wobble(piece);
      loseHeart();
    }
  }
  function slotAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest('.slot:not(.filled)');
  }
  // the copy of a piece that follows the finger: never left behind (a second finger, a lost touch, a new screen)
  const sweepGhosts = () => document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
  document.addEventListener('pointerdown', (e) => {
    if (st.view !== 'order' || drag) return; // one piece at a time: a second finger is ignored
    const c = e.target.closest('.pcard');
    if (!c) return;
    e.preventDefault();
    sweepGhosts();
    const r = c.getBoundingClientRect();
    drag = { id: e.pointerId, el: c, k: +c.dataset.k, x0: e.clientX, y0: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, moved: false, ghost: null };
  });
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      if (!drag.moved) {
        drag.moved = true;
        sfx.tap();
        const g = drag.el.cloneNode(true);
        g.classList.add('drag-ghost');
        g.classList.remove('sel');
        g.style.width = drag.el.offsetWidth + 'px';
        g.style.margin = '0';
        document.body.appendChild(g);
        drag.ghost = g;
        drag.el.classList.add('lifted');
      }
      drag.ghost.style.left = e.clientX - drag.offX + 'px';
      drag.ghost.style.top = e.clientY - drag.offY + 'px';
      const slot = slotAt(e.clientX, e.clientY);
      $app.querySelectorAll('.slot.over').forEach((x) => {
        if (x !== slot) x.classList.remove('over');
      });
      if (slot) slot.classList.add('over');
    },
    { passive: true },
  );
  function endDrag(e, cancel) {
    if (!drag || (e && e.pointerId != null && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    sweepGhosts();
    d.el.classList.remove('lifted');
    $app.querySelectorAll('.slot.over').forEach((x) => x.classList.remove('over'));
    if (cancel) return;
    if (!d.moved) {
      sfx.tap();
      st.sel = st.sel === d.k ? null : d.k;
      render();
      return;
    }
    const slot = slotAt(e.clientX, e.clientY);
    if (slot) tryPlace(d.k, +slot.dataset.j, slot);
  }
  document.addEventListener('pointerup', (e) => endDrag(e, false));
  document.addEventListener('pointercancel', (e) => endDrag(e, true));
  // the app goes to the background mid-drag: drop the piece back
  addEventListener('blur', () => endDrag(null, true));
  document.addEventListener('visibilitychange', () => document.hidden && endDrag(null, true));

  /* follow the device's light/dark setting while on "Auto" */
  if (darkMQ && darkMQ.addEventListener)
    darkMQ.addEventListener('change', () => {
      if (prefs.theme === 'auto' && st.view !== 'map') render();
    });

  /* ================= start ================= */
  const linkCode = codeIn(location.hash);
  if (linkCode) {
    try {
      history.replaceState(null, '', location.pathname + location.search); // the code stays out of the address bar
    } catch (e) {}
  }
  loadAll();
  applyTheme();
  if (prefs.translit || prefs.wordmean) loadWords();
  document.getElementById('defs').innerHTML = ART.defs();
  render();
  loadReciters().then(() => loadTimings(reciter().id).catch(() => {}));
  registerOffline();
  if (linkCode) setTimeout(() => openSync(linkCode, `${appURL()}#sync=${linkCode}`), 400);
  if (justUpdated) loadChangelog().then(() => st.view === 'splash' && render());
  window.__lhq = { st: () => st, store: () => store, go, player, stranger: { strikeFor, blocksOf, WORLD_THROWS, maybe: maybeStranger }, markNow, fabTarget }; // for testing in the browser console
})();
