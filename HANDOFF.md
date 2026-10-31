# Hand-off: where Little Hafiz Quest stands, and how to carry on

Read this first in a new session. It is kept up to date with every release (see "Release flow" below).
`README.md` is the player- and developer-facing description; this file is the working state.

**Current version:** v2.6.9 (2026-10-31) · **Live:** https://akramali.github.io/little-hafiz-quest/ ·
**Repo:** https://github.com/akramali/little-hafiz-quest (branch `main`; `v1` keeps the retired classic version)

---

## The game in one minute

A static PWA (no build step) that helps children aged ~4–7 memorize Juz ‘Amma (sūrahs 78–114). Each child has
an **explorer** who climbs a map of 7 worlds (Meadow → Forest → Sands → Canyon → Starry Path → Sky → Peak).
Each sūrah has two **quests** (👀 Look & Repeat, Word Steps) and two **review games** (🐸 Stepping Stones,
🧩 Picture Puzzle, plus a Big Puzzle for the whole sūrah), 4 stars per checkpoint. Stars win treasures, golden
editions, star-track prizes, star badges, world rides and surprise gifts to dress the explorer in.
**The Stranger** tests memorized sūrahs on the map with no help; every miss costs something (rules below).

## Where things are

| File | What |
|---|---|
| `js/data.js` | all content: Arabic text, pictures (`scene`), hooks, gestures, simple meanings, checkpoints (`parts`) |
| `js/game.js` | everything else: state, views (`V.<name>`), the click handler (`switch (act)`), gifts, hearts, the Stranger |
| `js/art.js` | every drawing as SVG: explorer and outfits, items (`CATALOG`, `TRACK_*`, `DROP_*`, `WORLD_RIDES`), props, worlds, the Stranger |
| `js/map.js` | the quest map: path, props placement (back to front, never hidden), other explorers, world rail, walking |
| `js/sync.js`, `js/qrcode.js` | family sync codes (format 2) and QR drawing |
| `js/sounds.js` | Web Audio nature sounds |
| `css/game.css` | all styles; new work is appended in dated `/* ---------- vX.Y.Z ---------- */` sections at the end |
| `sw.js` | service worker; `VERSION` must match `js/game.js` |
| `changelog.json` | in-app "What's new" (shows everything since the version the phone last ran) |
| `words.json` | word-by-word transliteration/meaning (Quranic Arabic Corpus, GPL v3) |
| `tests/` | headless-Chrome tests (`t.sh` by area), screenshots (`shot.sh`, `grid.sh`); see README → Tests |

`js/game.js` sections (search for these headings): saving · gifts, collection, lost items · reciters & player ·
hearts · state, scenes & render · SPLASH · SUMMIT · MAKE YOUR EXPLORER · QUEST MAP · SŪRAH · LOOK & REPEAT ·
MUṢḤAF · WORD STEPS · STEPPING STONES · PICTURE PUZZLE · DONE · MY EXPLORER · EXPLORERS · FAMILY SYNC ·
updates · GROWN-UP CORNER · offline · actions · other explorers on the map · THE STRANGER · start.

Testing hook: `window.__lhq = { st, store, go, player, stranger: { strikeFor, blocksOf, WORLD_THROWS, maybe } }`.

## Key rules worth knowing before changing things

- **Saved data:** `localStorage.lhq2` = `{ v: 2, cur, profiles: [...], prefs }`, cleaned on load by `cleanProfile` /
  `cleanPrefs` (add any new field there, with a safe default and migration).
- **Up to 10 explorers**, all shown on the map in the world of the sūrah they're on (`cfg.others` → `js/map.js`).
- **Gifts** (`prof.pending`) open in one tap; Next gift returns to the same screen. Keep the square, rattling gift box.
- **Hearts** apply in review games only once both quests of the part are done. Running out drops the newest item
  at that sūrah (`prof.lost`, 💔 `prof.fix`); finishing a review game there returns everything left there.
- **Worlds:** green when every sūrah is memorized (Stepping Stones done), gold when every star is won. A golden
  world wins its ride (`WORLD_RIDES`, `wgold`).
- **The Stranger** (`THE STRANGER` section; Grown-up Corner switch `prefs.stranger`):
  - after 10 min open, one 1-in-3 roll per 10-minute window (`STRANGER_EVERY`), on the map; skips sūrahs with things waiting;
    rematch per sūrah (`prof.rematch`, `prof.rematchReady`) once its things are won back.
  - 3 questions (what comes after / finish the āyah), no Listen. Right → he staggers and acknowledges.
  - **Every miss costs something.** Throws per world: `WORLD_THROWS` (🪨💨💧🌰✨🌿), shown on world signs, the world
    list and item cards. What blocks what: `blocksOf(id)` (by slot + `EXTRA_BLOCKS`: hero sword also 🪨, hero armor all,
    Hafiz crown also ✨). Matching ordinary gear takes the hit and falls; an animal buddy runs off; golden/hero gear
    holds (something lesser falls) except in an all-golden sūrah. Unprotected: hurt (plaster, dizzy) + best thing falls.
    Order: worn non-golden → owned non-golden → a sticker → golden. Star badges and comfy starter clothes are never lost.
  - All three right: safe + small gift (special in a rematch; hero gear after the summit, then ⚔️ Challenge).
- **Recitation:** `playList` / `stopAudio` hold a screen Wake Lock while playing (`keepAwake`); Read's Listen plays
  `[[1, 1], …]` (the Basmalah file, then the sūrah) and `markNow` scrolls the recited āyah into view.
- **App feel:** `user-select: none` on `html` and a global `contextmenu` block (except inputs and `.shareimg`); the
  viewport keeps pinch-zoom on purpose (the user finds it handy).
- **Starter look:** the face (skin) picker draws faces like the hair picker; comfy shirt/pants come in 4 colors each.

## Release flow (do this every time)

1. Make the change. Keep the user's style: fine-tune and remove rather than add text; no extra lines on busy screens.
2. Bump `VERSION` in **both** `sw.js` and `js/game.js` (patch for fixes/tweaks, minor for big features).
3. Add the version to `changelog.json`: 2–5 short lines about play; cosmetic fixes become "Small visual tweaks".
4. Test: `tests/t.sh <areas touched>` (`tests/t.sh list` shows areas). Add a self-checking case in `tests/cases/`
   for new behavior and tag it in `tests/t.sh`. Full `tests/t.sh all` (~6 min) only for major releases.
   Look at screenshots (`tests/shot.sh view "v=…"`) for anything visual, in light and `theme=dim`.
5. **Update `README.md`** for anything a player or developer would notice, and **update this `HANDOFF.md`**
   (current version, rules that changed, open items). Retake README screenshots when screens changed:
   `tests/shot.sh readme "shot=<name>" 390 844` (summit needs `VT=14000`), copy into `screenshots/`.
6. Commit "Little Hafiz Quest vX.Y.Z" with a short body and the attribution lines; push.
   - **Push over SSH**: `git push git@github.com:akramali/little-hafiz-quest.git main` (the HTTPS token lacks the
     `workflow` scope, so pushes touching `.github/workflows/` fail over HTTPS).
   - Wait for the Pages run (`gh run watch`) and check `curl -s https://akramali.github.io/little-hafiz-quest/sw.js | grep VERSION`.
7. Stop the test server when done: it runs as `python3 …/tests/server.py` on port 8765. Never `pkill -f` a pattern
   that also appears in your own command line (it kills the shell running it).

## Open items and ideas

- **Never checked on real phones:** the share sheet, the camera reading a QR code, Android link capture, iOS Paste
  from family, iOS update timing, 0.25× playback on iPhone Safari (if muted, make 0.5× the slowest), the screen staying on while reciting (Wake Lock: iOS 16.4+, and in Home Screen apps only on newer iOS), the Stranger's
  defend/hurt animations and swipe-to-turn on touch.
- Not done (offered): a random starting face for new explorers, so no skin tone is "the default".
- The Stranger was a test concept in v2.6.0–2.6.3 and is now part of the game; tune `1 / 3`, `STRANGER_EVERY` (10 min),
  `WORLD_THROWS`, `EXTRA_BLOCKS` if play-testing says so.
- Known, accepted test oddities: some buttons covered while a page scrolls, three captions on bright scenery
  (whitelisted in `tests/cases/hit.js` and `contrast.js`).

## History (short)

v2.3–2.4: nature sounds, jigsaw, Read view, awards, files. v2.5.0: family sync, Explorers page, auto-updates,
classic v1 retired, word meanings. v2.5.1–2.5.8: buttons, speed, info/how-to, fruit and animals, all explorers on
the map, chain setting, gift fixes, faces, glasses, Big Puzzle. v2.6.0: golden/green worlds, world rides, speed
button, one-tap gifts, the Stranger. v2.6.1–2.6.6: Stranger polish, closing animations, stakes (every miss costs,
world throws, protection), battle ground in the world's colors. v2.6.7: the Stranger every 10 minutes; speed and loop in Word Steps and Stepping Stones. v2.6.8: Read starts with the Bismillah (āyah -1, word data in `BISM_WORDS`) and follows the recited āyah; the screen stays on while reciting (`keepAwake`, Wake Lock; 99× loops let go after 15 min); full world names in the list. v2.6.9: no text selection or long-press menus (text boxes and the share picture excepted); zoom kept. Full detail: `git log` and `changelog.json`.
