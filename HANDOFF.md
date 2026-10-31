# Hand-off: where Little Hafiz Quest stands, and how to carry on

Read this first in a new session. It is kept up to date with every release (see "Release flow" below).
`README.md` is a short public overview (highlights, install, privacy, credits); this file holds the detail.

**Current version:** v2.7.3 (2026-10-31) · **Live:** https://akramali.github.io/little-hafiz-quest/ ·
**Repo:** https://github.com/akramali/little-hafiz-quest (branch `main`; `v1` keeps the retired classic version)

---

## The game in one minute

A static PWA (no build step) that helps children aged ~4–7 memorize Juz ‘Amma (sūrahs 78–114). Each child has
an **explorer** who climbs a map of 7 worlds (Meadow → Forest → Sands → Canyon → Starry Path → Sky → Peak).
Each sūrah has two **quests** (👀 Look & Repeat, Word Steps) and two **review games** (🐸 Stepping Stones,
🧩 Picture Puzzle, plus a Big Puzzle for the whole sūrah), 4 stars per checkpoint. Stars win treasures, golden
editions, star-track prizes, star badges, world rides and surprise gifts to dress the explorer in.
**Your Teacher** (called the Wise Elder in code: `elder`, `prefs.elder`, `.eld*`; shown to players as "Your Teacher" since v2.7.2, simpler for a 5-year-old) walks with the explorer and tests memorized sūrahs with no help; every miss costs something (rules below).

## Where things are

| File | What |
|---|---|
| `js/data.js` | all content: Arabic text, pictures (`scene`), hooks, gestures, simple meanings, checkpoints (`parts`) |
| `js/game.js` | everything else: state, views (`V.<name>`), the click handler (`switch (act)`), gifts, hearts, the Wise Elder |
| `js/art.js` | every drawing as SVG: explorer and outfits, items (`CATALOG`, `TRACK_*`, `DROP_*`, `WORLD_RIDES`), props, worlds, the Wise Elder |
| `js/map.js` | the quest map: path, props placement (back to front, never hidden), other explorers, world rail, walking |
| `js/sync.js`, `js/qrcode.js` | family sync codes (format 2) and QR drawing |
| `js/sounds.js` | Web Audio nature sounds |
| `css/game.css` | all styles; new work is appended in dated `/* ---------- vX.Y.Z ---------- */` sections at the end |
| `sw.js` | service worker; `VERSION` must match `js/game.js` |
| `changelog.json` | in-app "What's new" (shows everything since the version the phone last ran) |
| `words.json` | word-by-word transliteration/meaning (Quranic Arabic Corpus, GPL v3) |
| `tests/` | headless-Chrome tests (`t.sh` by area, `run.sh <case>` for one with its log), screenshots (`shot.sh`, `grid.sh`); a case is one file in `tests/cases/` using `fixture()`, `openGame()`, `ok(label, cond)` |
| `tools/` | `serve.py` (local preview with Range requests), `build_audio.py` (reciter files + word timings from EveryAyah/Quran.com, needs ffmpeg; `--snap-only --all` re-snaps word cuts), `build_words.py` (words.json), `art-gallery.html`, `sound-board.html` |
| `audio/` | `<reciter>/NNN.mp3` one file per sūrah (001 = the Basmalah), `<reciter>/timings.json`, `reciters.json` |

`js/game.js` sections (search for these headings): saving · gifts, collection, lost items · reciters & player ·
hearts · state, scenes & render · SPLASH · SUMMIT · MAKE YOUR EXPLORER · QUEST MAP · SŪRAH · LOOK & REPEAT ·
MUṢḤAF · WORD STEPS · STEPPING STONES · PICTURE PUZZLE · DONE · MY EXPLORER · EXPLORERS · FAMILY SYNC ·
updates · GROWN-UP CORNER · offline · actions · other explorers on the map · THE WISE ELDER · start.

Testing hook: `window.__lhq = { st, store, go, player, elder: { strikeFor, blocksOf, WORLD_THROWS, maybe }, markNow, fabTarget }`.

## Key rules worth knowing before changing things

- **Saved data:** `localStorage.lhq2` = `{ v: 2, cur, profiles: [...], prefs }`, cleaned on load by `cleanProfile` /
  `cleanPrefs` (add any new field there, with a safe default and migration).
- **Backups and family links must bring an explorer back exactly** (the user's rule: no accounts, so these are the
  only safety net). A backup is the whole store as JSON, cleaned by `cleanStore`/`cleanProfile`: **every new profile
  field needs a line there** (default in `newProfile`, validation in `cleanProfile`). The family code (`js/sync.js`)
  carries every field too: the basics (format 2), then an **extras block** (marker `0xA5`, version 1: place on the map,
  greeted, gifts waiting, won order + new dots, comfy-clothes stash, daily/Elder-gift dates, streak, best, today's
  seconds, Elder timer, rematches, stickers he holds, campfires, journal bitmap with its own checksum, completed pages,
  parts' `next`; version 2 (v2.7.2) adds `look.feet`). Phones before v2.7.1 stop reading before it. **A new field = add it to the extras block (bump its
  version) and to `mergeInto`.** `tests/cases/v271.js` round-trips every field through both and fails on any
  difference.
- **Up to 10 explorers**, all shown on the map in the world of the sūrah they're on (`cfg.others` → `js/map.js`).
- **Gifts** (`prof.pending`) open in one tap; Next gift returns to the same screen. Keep the square, rattling gift box.
- **Hearts** apply in review games only once both quests of the part are done. Running out drops the newest item
  at that sūrah (`prof.lost`, 💔 `prof.fix`); finishing a review game there returns everything left there.
- **Worlds:** green when every sūrah is memorized (Stepping Stones done), gold when every star is won. A golden
  world wins its ride (`WORLD_RIDES`, `wgold`).
- **The Wise Elder** (`THE WISE ELDER` section; Grown-up Corner switch `prefs.elder`; called the Stranger, `prefs.stranger`, before v2.6.11, migrated in `cleanPrefs`):
  - only once **3 sūrahs are memorized** (v2.7.0; tapping him on the map works from the first), after 7 min open, one 1-in-3 roll per 7-minute window (`ELDER_EVERY`, and not within 7 min of his last visit,
    `prof.elderAt`), on the map; skips sūrahs with things waiting; rematch per sūrah (`prof.rematch`,
    `prof.rematchReady`) once its things are won back, and it too waits for that roll (never straight after revising).
  - **He roams the map** (v2.6.14) as a pal (`cfg.others` entry `id: 'elder'`, `.mpal.melder`, 84×126): 4 minutes per
    world, up the mountain and back (`elderWorld`, `ELDER_STAY`); walks slowly (`palPace`), says salām to explorers,
    pats animals, strolls; when his time is up he walks off (back in his new world on the next map draw). Tapping
    him (`tapElder`) offers his test any time (`meetElder(true)`, or the rematch if one is ready).
  - **Gift economy:** tests the explorer asks for (tapping him, or the Test button) give one gift a day
    (`prof.elderGift` = the day); later wins that day say "His gift comes once a day". Random visits and rematches
    keep their gifts (the timer and losses limit those).
  - **He walks with you (v2.6.12, "option B"):** he stands beside the explorer (taller), both in the world
    (`eldWorld`: hills, a path running ahead to the right, the world's props; the scenery shifts left a little per
    question, `--walk`). What comes at the explorer comes from the world ahead, not from him. Neutral words: no ⚔️,
    no "Challenge" (the map button says **Test**).
  - 3 questions (what comes after / finish the āyah), no Listen. Right → he smiles (`st.glad`), says one of `ACKS`,
    and they step forward. After a miss his bubble comforts ("Don't worry… it'll wait for you at S").
  - **Soft hurt:** with nothing protecting, the explorer just wobbles and looks sad (no plaster, dizzy or knock-back).
  - **His staff:** at the summit (`'once'`) he gives the explorer his staff (`elder-staff`, stick, tier 4,
    `quest: 'staff'`, `giveStaff`; earlier summit reachers get it on load). From then on `elderArt()` draws him
    without it, hands tucked in his sleeves (`ART.elder(mood, noStaff)`). The all-golden special award stays the
    Golden hoopoe.
  - **Every miss costs something.** Throws per world: `WORLD_THROWS` (🪨💨💧🌰✨🌿), shown on world signs, the world
    list and item cards. What blocks what: `blocksOf(id)` (by slot + `EXTRA_BLOCKS`: hero sword also 🪨, hero armor all,
    Hafiz crown also ✨). Matching ordinary gear takes the hit and falls; an animal buddy runs off; golden/hero gear
    holds (something lesser falls) except in an all-golden sūrah. Unprotected: a wobble + best thing falls.
    Order: worn non-golden → owned non-golden → a sticker → golden. Star badges and comfy starter clothes are never lost.
  - All three right: safe + small gift (special in a rematch; hero gear after the summit, then the **Test** button).
- **What Listen plays** (`fabTarget`): Look & Repeat chain → only the lit āyah (v2.7.3; it used to play the rest of
  the chain); Picture Puzzle → the next piece to place, then the whole once all are in (v2.7.3); the rest as before.
- **Recitation:** `playList` / `stopAudio` hold a screen Wake Lock while playing (`keepAwake`); Read's Listen plays
  `[[1, 1], …]` (the Basmalah file, then the sūrah; each queued item plays from its own sūrah's file, `fileUrls`,
  so a list can span files) and `markNow` scrolls the recited āyah into view.
- **A new explorer** says **Begin the quest** (`begun(prof)`: `greeted`, or any star or item). They have no walking
  stick (`drawnOutfit` passes `stick: 'none'`, which `normOutfit` in art.js draws as nothing) until, on their first
  map, the Wise Elder's welcome (`INTRO`, `maybeIntro`, `showIntro`; 4 short cards) hands it over. Elder switched off:
  they just get the stick.
- **Campfires** (v2.7.0): `prof.fire[n] = [last revised, level]`, `FIRE_DAYS` 1/3/7/14/30. `fireOf` → 3 big, 2 small,
  1 embers (due), 0 out (2× overdue); drawn by `ART.campfire` in each memorized node (`.nfire`). `stokeFire` on any
  game finished in a memorized sūrah or an Elder win: on time → longer next interval, 3× late → shorter. Sūrahs
  memorized before v2.7.0 start lit at level 2.
- **The journal** (v2.7.0; v2.7.2: a book look, `.jbook`/`.jpage`, swipe or tap the tabs to turn pages `turnPage`;
  the map button `.jbtn` sits under the worlds button, the same size; **a tap** on a thing not yet found pops an
  "Add to journal" button `.jchip` for 5 s, which replaced tap-and-hold): one page per world =
  its map things (`PROP_NAME`, every kind is now placed at least once per world by js/map.js; the sea's sailboat is
  its own tappable `.mprop`) + the āyah-picture emoji of its sūrahs (`JOURNAL_EMOJI`: no people, hands, faces, signs or
  square scenes; each listed once under the first sūrah of the journey that has it). Not in `JKEYS`, or already
  found → no button. Not offered in the Teacher's test or the Picture Puzzle. A full page → a surprise gift
  (`prof.jdone`). My Achievements shows journal finds (replacing "sūrahs started").
- **Streak** (v2.7.0): a day counts after a minute of learning in a sūrah (`countDay`, `prof.dayT`); `prof.streak` =
  [last day, days in a row], `prof.best`. Shown in My Achievements (8th box) and on the start screen (2+ days).
- **Map things react:** `poke` → `STONE` things thud (rocks don't move), `BURST` picks what each gives off, `DRIFT`
  things (boat, airship, kite, balloon, cloud, tumbleweed) sail/float/roll away after 3 quick taps and come back.
- **Theme:** "Auto" follows the sun, not the phone's dark mode: `sunDown()` works out today's sunrise/sunset from
  a place guessed from the time zone (`TZ_AT` table of cities, else the clock offset; no location permission, no
  network). JS always sets `data-mode` to `dim` or `light`; re-checked every minute.
- **Stickers are still** (`stillArt` strips the motion classes); buddies drawn from sticker art keep moving.
- **App feel:** `user-select: none` on `html` and a global `contextmenu` block (except inputs and `.shareimg`); the
  viewport keeps pinch-zoom on purpose (the user finds it handy).
- **Starter look:** the face (skin) picker draws faces like the hair picker; comfy shirt/pants come in 4 colors each,
  shoes in 3 (`look.feet`, v2.7.2); girls also get pastel picks (`ART.GIRL_COLORS`: pink shirt, lavender and mint
  pants, pink and lilac shoes). New explorers are given only the classic colors (`starterColors`).
- **Switching explorer:** with more than one, the name under My Explorer and My Achievements is a button
  (`whoBtn` → `showWho`, "Who's playing?", the Explorers page's `.exrow` rows) that switches and stays on the page.

## Release flow (do this every time)

1. Make the change. Keep the user's style: fine-tune and remove rather than add text; no extra lines on busy screens.
2. Bump `VERSION` in **both** `sw.js` and `js/game.js` (patch for fixes/tweaks, minor for big features).
3. Add the version to `changelog.json`: 2–5 short lines about play; cosmetic fixes become "Small visual tweaks".
4. Test: `tests/t.sh <areas touched>` (`tests/t.sh list` shows areas). Add a self-checking case in `tests/cases/`
   for new behavior and tag it in `tests/t.sh`. Full `tests/t.sh all` (~6 min) only for major releases.
   Look at screenshots (`tests/shot.sh view "v=…"`) for anything visual, in light and `theme=dim`.
5. **Update this `HANDOFF.md`** (current version, rules that changed, open items). Keep **`README.md`** a short
   highlights page: touch it only when a headline feature, install step or credit changes (one short bullet, no
   rule details). Retake README screenshots when screens changed:
   `tests/shot.sh readme "shot=<name>" 390 844` (summit needs `VT=14000`), copy into `screenshots/`.
6. Commit "Little Hafiz Quest vX.Y.Z" with a short body and the attribution lines; push.
   - **Push over SSH**: `git push git@github.com:akramali/little-hafiz-quest.git main` (the HTTPS token lacks the
     `workflow` scope, so pushes touching `.github/workflows/` fail over HTTPS).
   - Wait for the Pages run (`gh run watch`) and check `curl -s https://akramali.github.io/little-hafiz-quest/sw.js | grep VERSION`.
7. Stop the test server when done: it runs as `python3 …/tests/server.py` on port 8765. Never `pkill -f` a pattern
   that also appears in your own command line (it kills the shell running it).

## Open items and ideas

- **Never checked on real phones:** the share sheet, the camera reading a QR code, Android link capture, iOS Paste
  from family, iOS update timing, 0.25× playback on iPhone Safari (if muted, make 0.5× the slowest), the screen staying on while reciting (Wake Lock: iOS 16.4+, and in Home Screen apps only on newer iOS), the Wise Elder's
  defend/hurt animations and swipe-to-turn on touch.
- Journal ideas not built yet: a grand prize for the whole journal, a "new thing to find" hint after a sūrah is
  learned.
- Not done (offered): a random starting face for new explorers, so no skin tone is "the default".
- The Wise Elder (called the Stranger, drawn as a hooded figure, until v2.6.11) was a test concept in v2.6.0–2.6.3 and is now part of the game; tune `1 / 3`, `ELDER_EVERY` (7 min),
  `WORLD_THROWS`, `EXTRA_BLOCKS` if play-testing says so.
- Known, accepted test oddities: some buttons covered while a page scrolls, three captions on bright scenery
  (whitelisted in `tests/cases/hit.js` and `contrast.js`).

## History (short)

v2.3–2.4: nature sounds, jigsaw, Read view, awards, files. v2.5.0: family sync, Explorers page, auto-updates,
classic v1 retired, word meanings. v2.5.1–2.5.8: buttons, speed, info/how-to, fruit and animals, all explorers on
the map, chain setting, gift fixes, faces, glasses, Big Puzzle. v2.6.0: golden/green worlds, world rides, speed
button, one-tap gifts, the Wise Elder. v2.6.1–2.6.6: Wise Elder polish, closing animations, stakes (every miss costs,
world throws, protection), battle ground in the world's colors. v2.6.7: the Wise Elder every 10 minutes; speed and loop in Word Steps and Stepping Stones. v2.6.8: Read starts with the Bismillah (āyah -1, word data in `BISM_WORDS`) and follows the recited āyah; the screen stays on while reciting (`keepAwake`, Wake Lock; 99× loops let go after 15 min); full world names in the list. v2.6.9: no text selection or long-press menus (text boxes and the share picture excepted); zoom kept. v2.6.10: My Achievements fits on one screen. v2.6.11: the Stranger becomes the Wise Elder (a kind old man, star staff, woven belt, swaying robe), renamed everywhere. v2.6.12: the Wise Elder walks with you through the world (taller, comforting, soft hurt, neutral "Test" wording), gives his staff at the summit; Read with the Bismillah plays the whole sūrah again. v2.6.13: the Wise Elder every 7 minutes, gentler robe sway, simpler praise; the temporary Elder test button removed. v2.7.3: Listen plays the lit chain āyah / the next puzzle piece; the explorer switcher matches the Explorers page. v2.7.2: "Your Teacher", tap to add to the journal, the journal as a book (swipe pages), its button under the worlds button, pastel comfy colors and shoe colors, switch explorer by the name, journal finds in Achievements. v2.7.1: family links carry every field (extras block); backups verified field by field. v2.7.0: campfires, the journal hunt, streaks, the Wise Elder's welcome and walking stick, Begin the quest, things on the map react (the boat sails off), the Elder's timer after 3 memorized sūrahs. v2.6.14: the Wise Elder roams the map (tap for a test, one gift a day), rematches wait for his timer, Auto theme by sunrise/sunset, still stickers, a new bee, the Version card updates in place. Full detail: `git log` and `changelog.json`.
