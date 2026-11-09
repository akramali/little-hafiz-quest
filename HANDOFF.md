# Hand-off: where Little Hafiz Quest stands, and how to carry on

Read this first in a new session. It is kept up to date with every release (see "Release flow" below).
`README.md` is a short public overview (highlights, install, privacy, credits); this file holds the detail.

**Current version:** v2.9.2 (2026-11-08) · **Live:** https://akramali.github.io/little-hafiz-quest/ ·
**Repo:** https://github.com/akramali/little-hafiz-quest (branch `main`; `v1` keeps the retired classic version)

---

## The game in one minute

A static PWA (no build step) that helps children aged ~4–7 memorize Juz ‘Amma (sūrahs 78–114). Each child has
an **explorer** who climbs a map of 7 worlds (Meadow → Forest → Sands → Canyon → Starry Path → Sky → Peak).
Each sūrah has two **quests** (👀 Look & Repeat, Word Steps) and two **review games** (🐸 Stepping Stones,
🧩 Picture Puzzle, plus a Big Puzzle for the whole sūrah), 4 stars per checkpoint. Stars win treasures, golden
editions, star-track prizes, star badges, world rides and surprise gifts to dress the explorer in.
**Your Teacher** (called the Wise Elder in the code's own names: `elder`, `meetElder`, `.eld*`; saved as `prefs.teacher`, `prof.teacherAt`, `prof.teacherGift` since v2.8.0; shown to players as "Your Teacher" since v2.7.2, simpler for a 5-year-old) walks with the explorer and tests memorized sūrahs with no help; every miss costs something (rules below).

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

Testing hook: `window.__lhq = { st, store, go, player, elder: { strikeFor, blocksOf, WORLD_THROWS, maybe, world, size, tap }, journal, cleanStore, cleanProfile, syncCtx, openSync, markNow, fabTarget, … }`.
The test fixture's memorized sūrahs have campfires lit two days ago (roaring, but not practised today: the Teacher's round skips those, v2.8.4).

## Key rules worth knowing before changing things

- **Saved data:** `localStorage.lhq2` = `{ v: 2, cur, profiles: [...], prefs }`, cleaned on load by `cleanProfile` /
  `cleanPrefs` (add any new field there, with a safe default and migration).
- **Backups and family links must bring an explorer back exactly** (the user's rule: no accounts, so these are the
  only safety net). A backup is the whole store as JSON, cleaned by `cleanStore`/`cleanProfile`: **every new profile
  field needs a line there** (default in `newProfile`, validation in `cleanProfile`). The family code (`js/sync.js`)
  carries every field too: the basics (format 2), then an **extras block** (marker `0xA5`, version 1: place on the map,
  greeted, gifts waiting, won order + new dots, comfy-clothes stash, daily/Elder-gift dates, streak, best, today's
  seconds, Elder timer, rematches, stickers he holds, campfires, journal bitmap with its own checksum, completed pages,
  parts' `next`; version 2 (v2.7.2) adds `look.feet`, 3 (v2.7.24) the Stranger's visits, 4 (v2.8.4) the game version
  that made the code, `appV`, 5 (v2.9.0) `riddle` and `buddy` as day numbers and counts). Phones before v2.7.1 stop reading before it. **Both phones should run the same
  version** (v2.8.4, `showSync`): a link from a newer version shows ⬆️ Update instead of Sync (`syncupd` → the Version
  card); one from an older version (or with no version: before v2.8.4) says to update the other phone, and offers
  "Sync anyway" (safe: the incoming explorer goes through `cleanProfile`, which tidies what older versions got wrong). **A new field = add it to the extras block (bump its
  version) and to `mergeInto`.** `tests/cases/v271.js` round-trips every field through both and fails on any
  difference.
- **Up to 10 explorers**, all shown on the map in the world of the sūrah they're on (`cfg.others` → `js/map.js`).
- **Surprises are paced** (v2.7.22): the everyday things (`DROPS`, ~160 per explorer since v2.8.4, incl. pattern
  versions) and 40 stickers come at most `6 + pool × stars / 505` (`surpriseRoom`), so they last to the last star; paced: the
  daily gift, first-finish level gifts, checkpoint stickers. Milestones are never held back (`milestone` arg):
  a journal page, 7 days in a row, the Teacher's daily / rematch gift; after every star his tests bring the rest.
  An early star-track prize comes only once every surprise is collected (`giveLevelGift`).
- **Pattern versions** (art.js `DROP_PATTERNS`, `patterned`): a base item's drawing with a hue turn and a pattern
  (dots, stripes, stars, stitching, checks, zigzags) masked to its fills (the pattern box has
  `pointer-events="none"`: a mask hides it from the eye, not from taps; v2.8.0 fixed a gift card it froze); for hats, shoes, bags, capes and shields
  (not sticks/pouches, too thin; not white things). Add one = a line **at the end** of `PAT_BASES` (a pattern and hue
  are picked by position: inserting in the middle would rename saved things). Pants too (v2.8.4): `patternOf` sets
  `pat` and `legOf` lays it over the leg.
- **More to win (v2.8.4):** pants designs with a detail on each leg (`ART[id].leg()`: cargo pockets, a track stripe,
  a knee patch, jogger cuffs; `legOf`), 16 watch faces more (glowing ones have `face.glow`: a breathing halo `.wglow`,
  on the wrist too, and are tier 2), colour versions of thin categories (glasses, capes, sticks, shields, hijabs and
  kufis keep their `for`), and 16 stickers drawn from the map's own props (`propSticker`, shadow removed). Hue turns
  can't recolour white, grey or black things: check a new colour version by eye (`tests/shot.sh`) and name it by
  what it shows. New entries always go at the end of their list.
- **Every sūrah memorized → every design** (v2.8.4, `unlockDesigns`, the user's choice of "designs now, colours
  later"): all everyday-thing and star-track designs (`drop`/`track` without `vof`) and every sticker are theirs at
  once (the done page says so, `st.designs`); their colour and pattern versions (~175) keep coming as gifts (new
  stars, the Teacher's tests) until every one is won. Idempotent, so it also runs on loading and after a sync.
- **How much is left** (v2.8.4, so a child can aim for 100%): My Achievements' 🎁 box reads "N of M things won"
  (`winnable(prof)`: everything for this explorer but the starter clothes, plus the stickers); each My Explorer tab
  says "won N of M".
- **Gifts** (`prof.pending`) open in one tap; Next gift returns to the same screen. Keep the square, rattling gift box.
- **Hearts** (3; a 4th once the Starry Path, world 5, has a star in every sūrah, a 5th with the Sky Kingdom,
  world 6: `HEART_WORLDS`, v2.8.0; before, every world added one) apply in review games only once both quests of the part are done. Running out drops the newest item
  at that sūrah (`prof.lost`, 💔 `prof.fix`); finishing a review game there returns everything left there.
- **Side activities (v2.9.0; reworked in v2.9.1)**, a minute each, always leading back to reciting:
  - **The Teacher's riddles** (v2.9.1: seven a day). `RIDDLES`: two clues for each of the 68 kinds of things on the
    map (136), anywhere on the mountain. Each explorer goes through them in an order of their own (`riddleOrder`, a
    shuffle seeded by their id), seven a day (`riddleAt`, by `dayNumber`), so none repeats in a day and one comes back
    after about three weeks. **A riddle counts only once it's opened**: tap it at the top of the journal (`riddleStrip`;
    its outline pulses now and then, `.jriddle.on`) → off to the map with its clue at the bottom (`riddleBar`,
    `.mriddle`, ✕ to stop; leaving the map closes it). There it's something to find: no tries, a wrong tap does what it
    always does (the journal chip…); only the right thing solves it (`riddleTap`). This answers "random tapping during a
    lesson could solve it": nothing solves a riddle that isn't open. (Kept to the map for now; the same rule would let
    them reach into the sūrahs' pictures later.) Each found: a stamp; the next opens a minute later (`RIDDLE_GAP`);
    every 7 stamps a gift, at most one a day; after seven, "come back tomorrow". The journal button has a dot while one
    waits (`riddleOpen`). `prof.riddle` = [day, stamps, done that day, the next opens at (ms), the day's gift given].
    Works with the Teacher switched off too (a toast instead of his card).
  - **My Tree** (v2.9.1, replacing v2.9.0's plant at every stop): one tree for the whole journey, a reminder of the
    tree in Jannah for learning the Qur'an, on a full screen of its own (`V.tree`, the **My Tree** button under the
    journal's, `.tbtn`). `ART.tree` draws it from the explorer's numbers, the same shape every visit (seeded by their
    id): it grows as one plant from a seed to a big full tree (`treeInfo().size`: āyāt learned 30%, green sūrahs
    30%, golden sūrahs 40%, so every sūrah golden is 100%; practice adds up to 15% on top, sooner growth, never past
    100%; `ART.tree` eases it into growth `t = size^0.7`): a seedling is only a few small leaves from the mound's
    top; the stem shows from about 1.5% and rises (tall and slim for long, side shoots early so the leaves spread out),
    side branches bud at their own times, each with its own length, angle and bend, shaded wood with darker branches
    behind, its outline round and uneven; blossoms from size 0.2, fruit from 0.3 (`TREE_STAGE`); it sways a little in
    the wind (`.tsway`) and very rarely a leaf drifts down (`.tfall`).
  - **Leaves** (v2.9.2): every leaf grows from wood: twigs off the young branches (`sprout`, alternating sides,
    longer as the crown fills) carry them, each pointing away from its twig and leaning a little to the light (none
    sideways). They are picked mostly evenly (`spread`: no bunch, no bare patch, not a grid), as many as the crown
    has room for (`fill`: a seedling just a few, airy from 55%, thick again near 100%); the rest are the darker leaves
    behind (on their own twigs, filling the gaps between the light ones, coming in from about 15%). Leaf size grows:
    small on a seedling, 80% at 40%, full from 60%, each a little its own size. The old wood drops its leaves bit by
    bit from the inside out (`bare`: the stem, then the limbs from ~30%, then their branches), never a whole layer at
    once. Wood colour (`woodC`): green when thin and young, brown as it thickens and the tree ages (all brown near
    100%), a limb shading from its foot's colour to its tip's, a twig the colour of the wood it grows from; limbs are
    drawn outer first so each comes out from under the edge of the one it grows on (no end showing). Fruit grows with
    the tree (70% to 115%), each a little its own size, a few bigger.
    Blossoms: one a sūrah memorized (its own colour; tap: its name). Fruit spread evenly over the crown (never in a
    bunch), from practice (`prof.grow` = [points, day, sūrahs that day]: finishing any game in a sūrah grows it once
    a day, `growTree`), up to 32, more kinds as it grows (`FRUIT_TYPES`: dates, figs, olives, pomegranates, grapes,
    apples, oranges). No birds or squirrels in the branches (they looked like they floated); now and then a squirrel
    scampers across the ground dropping a fruit a hungry buddy can eat (`.tsq`, `.tfruit.ground`). What grew since the last visit pops in (`localStorage.lhq_tree_<id>`). No penalties, no stickers
    on it (tried, too busy). Shaped over many rounds with the user (examples: a picture-book tree; "like a real plant
    grows"); `tests/cases` has no picture check, so look at the stages after any change: a throwaway case that sets
    `window.__treeSize` (also sets the āyāt and sūrahs to match) and opens the tree, shot at 0–100% in 5% steps (and
    0–10% in 0.5% steps for the seedling), side by side in a grid.
  - **The screen** (v2.9.2): `.treescr` is fixed full-screen (nothing scrolls, `body.v-tree`), the picture
    `viewBox="0 -200 400 900"` with `meet` so the whole scene shows on any screen, the sky (`treeSky`: a sun, a few
    small birds flying and pale clouds by day; a moon, tiny stars, some twinkling, and darker clouds at night) and
    the ground drawn far past the sides; the sun's glow fades into the sky. Far off in the haze (`treeFar`): pale
    mountains, two rows of hills, a smooth winding river (paler far off, its light fading away), round trees and
    grassy clumps, each paler the further back it stands; dim blue at night. A mound of earth in front of the
    sapling's foot shrinks as the trunk thickens; little grass tufts (each blade on its own) at the trunk's foot and
    about the garden, drawn among the buddies by depth (`tufts`). Fully grown, the tree reaches up near the sun and
    moon. Tapping a blossom
    pops its sūrah's name out of it (`flowerTag`, `.tftag`). The header shows āyāt and sūrahs only (the fruit count
    confused: fruit just comes as it grows). No messages about buddies (asleep, hungry, fed): it's plain to see.
  - **The buddies at my tree** (v2.9.1, replacing v2.9.0's buddy care on the map): every pet owned lives around it
    (v2.9.2: up to six on a phone, ten on a bigger screen, `budMax`, chosen when the tree opens, `pickBuds`, the one due
    to be hungry first; spread across the ground in view, `treeView`/`budSpot`, not in neat rows: each its own shift,
    depth and size; every so often one wanders off the edge and another walks in; awake ones shuffle a little, playing
    ones dance, sleeping ones breathe with their 💤 drifting; a tap is a gentle nudge; after eating one walks back
    smoothly; at the bushes one hides in the big or the tall bush, its head over the top, others peek round a bush's
    sides on the same ground, never out from under it: `budSpots`, the bush drawn again over them,
    `ART.treeBushes(size)`; a ground buddy sinks in up to its shoulders, a flier perches on top, the turtle never
    hides (green in the green); none stands on the tree's roots, `ART.treeFoot(size)`: those step to the front row;
    a tap on a hidden one makes it peek out). A flower in the grass for every sūrah memorized, from the first, in up
    to three loose rows, each with a soft shadow where it's planted (tap: its name; the blossoms on the tree are
    decoration). The note under the title changes at
    100% ("fully grown"); fully grown the tree stops just under it. The wind bends it (skew, the top most), a gust now
    and then. The wood is drawn limb by limb (`limbsOf`/`limbPaths`: a branch and the stem carrying on from its tip
    are one smooth tapering shape, so no seams; side branches start inside their parent), the roots outlined only on
    their curves, over the trunk's foot, outlined like the trunk so the two lines meet as one. Three bushes, none at
    first: each comes up in turn (6%, 12%, 20%) and grows with the tree (a big one with pink flowers, a tall one with
    a smaller clump at its side and red berries, a little one with white flowers), all clear of the trunk's roots.
  - **Sounds** (v2.9.2, `js/sounds.js`): a tap is mostly the tiny drip, now and then a twig's tick, a leaf flick or
    (rarely) a tiny chirp; a pop is sometimes two drops. awake, playing or asleep (by the time and a little chance), never sad. Animal buddies get
    hungry one at a time (`pickHungry`, in a steady order; rides just park), only once the tree has fruit: a bubble
    shows the fruit it wants (only kinds growing now); tap that fruit: it falls and the buddy runs over and eats it, fed for the day
    (`treeFruit`; `prof.buddy` = [day, fed that day, feeds in all]). The next is hungry only 30 seconds after one is
    fed (`TREE_NEXT`), staying or coming back. Nothing happens if they aren't fed.
  - **Special days** (`occasion`: Ramadan, Eid al-Fiṭr 1–3 Shawwāl, Eid al-Aḍḥā 10–12 Dhū al-Ḥijjah (both Eids three
    days), by the phone's Umm al-Qurā calendar through `Intl` (`hijri()`), and Fridays; `window.__occasion` overrides
    it in tests): a garland under the top buttons of the start screen, the map and done pages (`festiveBar` from
    `render`, `FESTIVE_VIEWS`; `ART.garland`, `.festive`: fanous lamps, eight-pointed stars (`star8`, as in the Rub el Hizb)
    and little hilals with a big hilal in the middle in Ramadan, bunting with hilals and stars on the Eids, gold stars on
    Fridays), the corners of the start screen and done pages (`ART.festSky`, `.festsky-wrap`: a glowing hilal, swaying
    fanous lamps in Ramadan, small fireworks on the Eids), a greeting toast once a day per phone
    (`localStorage.lhq_greet`), the Teacher's card and the done page greet too (a 🌙 for Ramadan, its own confetti
    `FEST_SET`), and the day's sticker (`ART.SEASONS`): Jumuʿah's once ever; **Ramadan's and each Eid's once per Hijri
    year** (`ramadan-1448`, `eid-1448`, `eid-adha-1448`… for the ten years 1448–1458 AH, the user's choice: that year's colours and the year on a ribbon; after 1458 no more drops, the game goes on working, and a later version can add years),
    given the first time the map is opened during it (any day of the whole month of Ramadan; any of the three days of each Eid), per explorer. A missed one is gone for good: next year brings a different one (a unique sticker to collect every year). Never given at random, never taken by the
    Teacher; the stickers tab shows Jumuʿah's and the next Ramadan and Eids as locked tiles (`nextSeasons`). The
    yearly ones are a bonus, outside "N of M things won".
- **The Summit crown** (An-Naba's treasure, `CROWN_N`) comes once **every sūrah is memorized** (v2.8.4; before, it
  came with An-Naba's first star): `giveSurahGift` holds it back, `finish` checks it after any sūrah, and
  `cleanProfile` takes back a crown (or its golden edition) given too early. Its locked tile says "Every sūrah
  memorized".
- **Worlds:** green when every sūrah is memorized (Stepping Stones done), gold when every star is won. A golden
  world wins its ride (`WORLD_RIDES`, `wgold`).
- **The Wise Elder** (`THE WISE ELDER` section; Grown-up Corner switch `prefs.teacher`: saved as `elder` v2.6.11–v2.7.23 and as `stranger` before v2.6.11 (when the Teacher was called the Stranger); `cleanPrefs` reads every age's name, and a `stranger` key means the new Stranger only in a save that also has `teacher`; migrated in `cleanPrefs`):
  - only once **3 sūrahs are memorized** (v2.7.0; tapping him on the map works from the first), after 7 min open, one 1-in-3 roll per 7-minute window (`ELDER_EVERY`, and not within 7 min of his last visit,
    `prof.teacherAt`), on the map; skips sūrahs with things waiting; rematch per sūrah (`prof.rematch`,
    `prof.rematchReady`) once its things are won back, and it too waits for that roll (never straight after revising).
  - **He roams the map** (v2.6.14) as a pal (`cfg.others` entry `id: 'elder'`, `.mpal.melder`, 84×126): 4 minutes per
    world, up the mountain and back (`elderWorld`, `ELDER_STAY`; the user wants him roaming the whole map, so he's often in another world); walks slowly (`palPace`), says salām to explorers,
    pats animals, strolls; when his time is up he walks off (back in his new world on the next map draw). Tapping
    him (`tapElder`) offers his test any time (`meetElder(true)`, or the rematch if one is ready).
  - **Gift economy:** tests the explorer asks for (tapping him, or the Test button) give one gift a day
    (`prof.teacherGift` = the day); later wins that day say "His gift comes once a day". Random visits and rematches
    keep their gifts (the timer and losses limit those).
  - **He walks with you (v2.6.12, "option B"):** he stands beside the explorer (taller), both in the world
    (`eldWorld`: hills, a path running ahead to the right, the world's props; the scenery shifts left a little per
    question, `--walk`). What comes at the explorer comes from the world ahead, not from him. Neutral words: no ⚔️,
    no "Challenge" (the map button says **Test**).
  - 3 to 7 questions by the sūrah's words (`testSize`: <30 → 3, <50 → 4, <80 → 5, <120 → 6, else 7; v2.8.4), what
    comes after / finish the āyah; **30 s per answer** (`ASK_MS`, `armAsk`, a shrinking bar `.eldtime`; 15 s in
    v2.8.4): no answer = "Not quite" (a hidden page gets a fresh 30 s). The 6–7 question dots are 24 px (`.elddots.many`).
  - **His round for the day** (v2.8.4): a sūrah practised today (`practisedToday`: its campfire stoked today, by a game
    or his test) is skipped, by his visits and by tapping him; with none left he says "every sūrah you know is roaring
    in your heart today" (`teacherBusy`). What he says when there's no test to give is a card (`teacherNote`), not a
    map bubble (it ran off the screen). Right → he smiles (`st.glad`), says one of `ACKS`,
    and they step forward. After a miss his bubble comforts ("Don't worry… it'll wait for you at S").
  - **Soft hurt:** with nothing protecting, the explorer just wobbles and looks sad (no plaster, dizzy or knock-back).
  - **His staff:** at the summit (`'once'`) he gives the explorer his staff (`elder-staff`, stick, tier 4,
    `quest: 'staff'`, `giveStaff`; earlier summit reachers get it on load). From then on `elderArt()` draws him
    without it, hands tucked in his sleeves (`ART.elder(mood, noStaff)`). The all-golden special award stays the
    Golden hoopoe.
  - **Winning back what fell is the gift** (v2.7.21): a review game that returns lost things or held stickers gives
    no daily surprise or level gift on top (`wonBack` in `finish`); prizes for new stars still come.
  - **Every miss costs something.** Throws per world (v2.7.21: apples 🍎 in the Meadow, the acorn kind with its
    own icon/name via `THROW_IC`/`THROW_AS`; ice 🧊 at the Peak, kept off by jackets and `WINTER_HATS` beanie/earflap): `WORLD_THROWS` (🪨💨💧🌰✨🌿), shown on world signs, the world
    list and item cards. What blocks what: `blocksOf(id)` (by slot + `EXTRA_BLOCKS`: hero sword also 🪨, hero armor all,
    Hafiz crown also ✨). Matching ordinary gear takes the hit and falls; an animal buddy runs off; golden/hero gear
    holds (something lesser falls) except in an all-golden sūrah. Unprotected: a wobble + best thing falls.
    Order: worn non-golden → owned non-golden → a sticker → golden. Star badges and comfy starter clothes are never lost.
  - All right: safe + small gift (special in a rematch; hero gear after the summit, then the **Test** button), and the
    campfire burns up to roaring in the result (`fireRise`).
- **Speeds** (`SPEEDS`): 0.5×, 0.75×, 1×, 1.25×, 1.5× (v2.8.4: 0.25× was too slow, a saved 0.25× becomes 0.5×;
  v2.9.0: 2× gone too, a saved 2× becomes 1.5×).
- **Word Steps follows the reciter** (v2.8.4): Listen plays the whole āyah in one go (not chopped), and each word
  lights up as it's recited (`seg.ws` = the āyah's word timings, checked by the 30 ms `segTimer`; `speakWord` puts
  `.speak` on the word's box and bead, showing it even if still hidden). Tapping a word still plays just that word.
- **What Listen plays** (`fabTarget`): Look & Repeat chain → only the lit āyah (v2.7.3; it used to play the rest of
  the chain), with the speed and loop buttons above the chain (`.chainhead`, v2.7.4); the Teacher's test → only
  what the question shows (v2.7.5: the āyah given, or its first `cut` words as one item `[n, k, 0, cut-1]`, a
  word-range item `playNext` understands; Listen sits top right as everywhere, shown only in the ask phase;
  the title says "Test · <sūrah>" with the question dots under it, the pair exactly as tall as Listen, v2.7.7); Picture Puzzle → the next piece to place, then the whole once all are in (v2.7.3); the rest as before.
- **Pop-ups:** a tap outside closes any of them (v2.7.16): the Teacher's card = Not now, out of hearts = Next time
  (back to the sūrah; "Try again" is the explicit choice, `dropNext`), the welcome shows again next map visit.
- **Swiping pages** (v2.7.14; on phones by touch events since v2.7.16, as a browser may cancel pointer events
  once it takes over a gesture; the swipe areas have `touch-action: pan-y pinch-zoom`): one helper, `onSwipe(where, turn)`, for everything with pages: Look & Repeat (the
  āyah card), Word Steps (`.wstage`), the journal (the book), How to play / the welcome (the card; it also has
  ‹ Back from the second card). Stepping Stones swipes its own stones. A new paged screen = one `onSwipe` line.
- **Map speech bubbles** stay on screen (`keepOnScreen` nudges one near an edge back in, v2.7.14).
- **The Stranger** (v2.8.0; gates since v2.8.1; `THE STRANGER` section; `prefs.stranger`; see the Teacher's names
  above). **Never on the map** (the children's safe playground). He keeps the bridges from World 4 up: with every
  sūrah from An-Nās through World 3 memorized (`memorizedUpTo` ≥ 2, counting only unbroken from the start), the
  first time the explorer sets out from the map or the journal for a sūrah in a later world (`go('surah')`, from
  'map'/'journal' only: never on the way back from a game), `strangerGate` sends them to `V.stranger` first, then
  on to that sūrah (`then`). He keeps one gate after each of Worlds 3, 4, 5, 6 (keys 2–5 in `prof.strangers`); gaps
  hold him back; when several are due at once only the latest comes (the earlier ones are kept with it). The scene:
  he stands before that world's border (`eldWorld(s, edge)`: next world's hills, `ART.border`, `ART.bridge`), the
  Teacher beside the explorer; three of the world's elements stop at a glow (`strangerThrow`); nothing lost or won.
  With all 37 memorized, back on the map he comes one last time (key 7, `maybeStranger`): every element
  (`ALL_THROWS`), then he's glad and never comes again. In backups and the family code (extras v3).
- **Stepping Stones' frog** (v2.7.21; v2.8.0: onto the next set, it jumps to where the next stone will be once
  that set has slid in): the last hop lands on the sandy bank at the side (a happy hop, then on);
  "Not quite" makes it slip into the water and climb back (`slipFrog`); "tap me!" is a pill on the stream itself,
  placed over the frog by `placeTap` (the stones scroll sideways and would crop it), hidden when the frog's set is
  swiped away.
- **Lost things on the map** (js/map.js): a sūrah's lost things make one little heap (32 px apart, each a bit over
  the one before, so they read as belonging to that stop), close beside it on the nearest free spot (`lostSpots`):
  never on a stop, its name or campfire, the explorer or another heap; the side away from the explorer first (76 px
  from the stop on the side without a campfire, 106 on the campfire's side); kept 50 px in from the edges (the
  curved-world effect pushes edge things outward). v2.7.9.
- **Recitation:** `playList` / `stopAudio` hold a screen Wake Lock while playing (`keepAwake`); Read's Listen plays
  `[[1, 1], …]` (the Basmalah file, then the sūrah; each queued item plays from its own sūrah's file, `fileUrls`,
  so a list can span files) and `markNow` scrolls the recited āyah into view.
- **A new explorer** says **Begin the quest** (`begun(prof)`: `greeted`, or any star or item). They have no walking
  stick (`drawnOutfit` passes `stick: 'none'`, which `normOutfit` in art.js draws as nothing) until, on their first
  map, the Wise Elder's welcome (`INTRO`, `maybeIntro`, `showIntro`) hands it over. The same cards are **How to
  play** in the Grown-up Corner (`showIntro(0, true)`: closable, ends "Let's play!" without the stick; v2.7.12
  replaced the old "How to use it" tips list). 9 cards: hello, the worlds, the four steps, Listen and Read, gifts
  and dressing up, campfires, the journal, a little every day, the walking stick (welcome only). Elder switched off:
  they just get the stick.
- **Campfires** (v2.7.0; six steps since v2.8.0): `prof.fire[n] = [last practised, (unused)]`; `fireOf` by days
  (`FIRE_STEPS` 3/7/10/14/21): 5 roaring (the strong flame grown bigger, a tall tip and a smaller second tip on its shoulder; embers rising), 4 strong, 3 steady, 2 low,
  1 embers ("time to touch up", cold), 0 out (smoke). Words: `FIRE_WORD`. "Cold" (the Teacher's pick, the
  breathing) = level ≤ 1.
  Drawn by `ART.campfire` in each memorized node (`.nfire`); low and out ones breathe on the map (`fireBreathe`),
  and each shows in the sūrahs list (`.pgfire`, Sūrahs tab only; there each number is ringed gold with every star,
  green once memorized, like the map's stops; the meaning stays whole and the time beside it shows only if it fits). `stokeFire` (any game finished in a memorized sūrah, or passing the
  Teacher's test) sets it to now; a low one relit flares up when the map is back (`relit`, `flareFire`). **The
  stake** (v2.7.21): the Teacher comes on his own regardless, but with a fire low or out his roll is 1 in 2 (else
  1 in 3) and 3 times in 4 he picks a cold one; tapped tests always prefer cold ones. Each
  mistake in the Teacher's test sends it down to **Low** from wherever it was, or **out** if it was low or in
  embers already (`lowFire`, once a test, by where it was before it: `st.fireHit`; v2.7.5–v2.8.4 it was one step a
  miss), and so does running out of hearts in a review game (v2.9.0, `dropItem`). Both show it going down (`fireRise(from, to)`), at the end of the test and on the out-of-hearts card. Finishing a review game there relights it. The sūrah page shows it top
  left, across from Read (`fireChip`: Strong / Burning / Low / Out). Tapping a campfire there or on the map
  (`.nfire` is tappable inside the node) opens `showFire`: how fresh the sūrah is, days until it needs practice,
  and on the map a "Practise now" / "Go there" button (v2.7.6). Sūrahs
  memorized before v2.7.0 start lit at level 2. **Burning up** (v2.8.4, `fireRise(from)`): the done page shows the
  campfire stepping up from where it was to roaring (when it was below roaring, or on a revision), as does a passed
  Teacher's test. **A revision** (a game finished with no new star, `st.noStar`) shows no stars and no "stars to your
  next prize", only the campfire.
- **The journal** (v2.7.0; v2.7.2: a book look, `.jbook`/`.jpage`, swipe or tap the tabs to turn pages `turnPage`;
  the map button `.jbtn` sits under the worlds button, the same size; **a tap** on a thing not yet found pops an
  "Add to journal" button `.jchip` for 5 s, which replaced tap-and-hold): one page per world =
  its map things (`PROP_NAME`, every kind is now placed at least once per world by js/map.js; the sea's sailboat is
  its own tappable `.mprop`; each kind gets its own tries, then a looser spot (which may overlap pictures but
  never hides anyone's feet inside another), so one that doesn't fit never holds up the rest, v2.7.12/v2.7.16) + the āyah-picture emoji of its sūrahs (`JOURNAL_EMOJI`: no people, hands, faces, signs or
  square scenes; each listed once under the first sūrah of the journey that has it). Not in `JKEYS`, or already
  found → no button. Pictures are offered only in Look & Repeat itself (not chain time, Word Steps, Stepping
  Stones, the Puzzle or the Teacher's test; v2.7.23); things only on the map. **Only from a begun checkpoint**
  (v2.8.4, `partBegun`: a star in that checkpoint; the whole of a short sūrah): otherwise the chip says "Finish a step
  here first" (`.jchip.locked`) and adds nothing. Pictures from checkpoints not begun, collected before, are dropped
  on loading (`jEarnable` in `cleanProfile`). A full page → a surprise gift
  (`prof.jdone`). My Achievements shows journal finds (replacing "sūrahs started").
- **Streak** (v2.7.0): a day counts after a minute of learning in a sūrah (`countDay`, `prof.dayT`); `prof.streak` =
  [last day, days in a row], `prof.best`. "Yesterday" is a calendar day (`yesterday()`), never "24 hours ago"
  (the day the clocks change has 23 or 25 hours; v2.8.1 fixed that). Shown as 🏃 "days on the trail" (not a flame: the campfires are the
  fires): a button on the start screen from 1 day, "🏃 4 days" (the number big, "days" small under it; not a
  corner badge, which looked like a notification, v2.7.20) (tap: `showStreak`, the streak and
  the best), and My Achievements' 8th box. Every 7 days in a row brings a little gift (in `countDay`). v2.7.16.
- **Map things react:** `poke` → `STONE` things thud (rocks don't move), `BURST` picks what each gives off, `DRIFT`
  things (boat, airship, kite, balloon, cloud, tumbleweed) sail/float/roll away after 3 quick taps and come back.
- **Theme:** "Auto" follows the sun, not the phone's dark mode: `sunDown()` works out today's sunrise/sunset from
  a place guessed from the time zone (`TZ_AT` table of cities, else the clock offset; no location permission, no
  network). JS always sets `data-mode` to `dim` or `light`; re-checked every minute.
- **Stickers are still** (`stillArt` strips the motion classes); buddies drawn from sticker art keep moving.
- **App feel:** `user-select: none` on `html` and a global `contextmenu` block (except inputs and `.shareimg`); the
  viewport keeps pinch-zoom on purpose (the user finds it handy).
- **Starter look:** the face (skin) picker draws faces like the hair picker; comfy shirt/pants come in 4 colors each,
  shoes in 3 (`look.feet`, v2.7.2), every color for every explorer (v2.7.16; boys and girls differ only in hair,
  hijab and a few awards). New explorers are given one of the classic colors (`starterColors` skips `ART.PASTEL`).
- **Making / changing an explorer** (`V.create`, also the ✏️ on the Explorers page) is laid out like My look in My
  Explorer (v2.7.16): Done / Let's go at the top right, the explorer always in view, only the choices scroll; back
  from a brand-new one leaves without keeping it (`cancelNew`). My look itself shows just the explorer and the
  choices (no categories or side buttons). Since v2.7.17 My Explorer's ✏️ (`editme`, styled as on the Explorers
  page) opens "Change your explorer" (`V.create`, back: bag) instead of the My look tab.
- **Arriving and leaving** (v2.7.17): `arriving` (the screen just left, while the new one is drawn) lets the start
  screen and the map animate in: Home fades the map (`.mapscr.leaving`) and the start screen's picture zooms back out
  (`.splash.returning`, the reverse of Continue's `.leaving`); from elsewhere they fade in (`.arrive`). Screens
  built on `.screen` have their `enter` animation; pop-ups pop in and out (`#modal .card`, `.closing`).
- **Install banner** (v2.7.18; v2.7.19: "Install the game", right under the version and settings buttons, its line
  says where for this device (home screen / Home Screen / computer / Dock), hidden while the update note shows;
  start screen only, never when `STANDALONE`): Chrome/Edge/Samsung Internet's
  `beforeinstallprompt` is kept (`installEvt`) and our banner's Install calls its `prompt()` (one tap); iPhone/iPad
  (`IOS`), Safari on a Mac and Firefox on Android get "How?" → `showInstallSteps` (on iPhone, with the reminder that
  the Home Screen app keeps its own progress: Share progress → Paste from family). ✕ hides it for 30 days
  (`lhq_install_no`). Desktop Firefox can't install, so nothing shows there.
- **The "Updated to …" note** on the start screen closes with a tap anywhere else (`dismissUpdNote`).
- **Switching explorer:** with more than one, the name under My Explorer and My Achievements is a button
  (`whoBtn` → `showWho`, "Who's playing?", the Explorers page's `.exrow` rows) that switches and stays on the page.
  There the explorer's name is the big title and the page name is small under it (v2.7.15).

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

- Side activities brainstormed and not built yet (v2.9.0 built the riddle, the buddy, the garden and special days):
  bedtime sūrah by the campfire, story pages per world, a daily postcard, an echo game, a family challenge.

- **Never checked on real phones:** the share sheet, the camera reading a QR code, Android link capture, iOS Paste
  from family, iOS update timing, the screen staying on while reciting (Wake Lock: iOS 16.4+, and in Home Screen apps only on newer iOS), the Wise Elder's
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
world throws, protection), battle ground in the world's colors. v2.6.7: the Wise Elder every 10 minutes; speed and loop in Word Steps and Stepping Stones. v2.6.8: Read starts with the Bismillah (āyah -1, word data in `BISM_WORDS`) and follows the recited āyah; the screen stays on while reciting (`keepAwake`, Wake Lock; 99× loops let go after 15 min); full world names in the list. v2.6.9: no text selection or long-press menus (text boxes and the share picture excepted); zoom kept. v2.6.10: My Achievements fits on one screen. v2.6.11: the Stranger becomes the Wise Elder (a kind old man, star staff, woven belt, swaying robe), renamed everywhere. v2.6.12: the Wise Elder walks with you through the world (taller, comforting, soft hurt, neutral "Test" wording), gives his staff at the summit; Read with the Bismillah plays the whole sūrah again. v2.6.13: the Wise Elder every 7 minutes, gentler robe sway, simpler praise; the temporary Elder test button removed. v2.9.2: My Tree fills the screen with a whole world (sky, far mountains, hills and a river), grows naturally from a seedling (leaves on twigs, light and dark, sized by age; wood green to brown; bushes and fruit growing with it), more buddies coming and going, flowers show their sūrah, no buddy messages, smooth walk back after eating; the start screen's trail one smooth path with a plain Summit sign. v2.9.1: seven riddles a day from all over the map (opened from the journal, a minute apart, no tries), My Tree (one tree for the whole journey, the buddies around it, fruit to feed them, stickers to hang) replacing the plants at the stops and the buddy care on the map, the Teacher stays near the explorer's world, the 🌰/🍎 throw icon alternates, shorter "your things fell" messages. v2.9.0 (never reached anyone): special days (garlands, greetings, stickers), campfires low or out on mistakes, 30 s per answer, speeds 0.5–1.5×. v2.8.4: the Teacher's test 3–7 questions by length, 15 s per answer, his round stops for the day (in a card), the Summit crown only with every sūrah memorized (early ones taken back), journal pictures only from begun checkpoints (early ones dropped), the campfire burning up to roaring on done pages and after his test, no star shown on a revision, family links carry the version (newer: update first), speeds 0.5–2× with 1.25×, Word Steps lights each word as recited, every design at once with every sūrah memorized, "N of M things won", more pants/watches (glowing ones)/glasses/capes/sticks/shields/hijabs/kufis and 16 new stickers. v2.8.3: the sūrahs list rings each number gold/green, Stars without campfires and with whole meanings. v2.8.2: the roaring campfire redrawn (the strong flame, bigger, with two tips). v2.8.1: the Stranger keeps bridges from World 4 up (never on the map), once per world memorized from the start; the farewell at the end; streaks right on clock-change days. v2.8.0: the Stranger returns (once per world memorized, the Teacher at your side, nothing lost; the last time with the whole Juz), six campfire steps, hearts 4 and 5 from worlds 5 and 6, the frog lands on the next set, patterned gifts no longer freeze their card, saved names `teacher`/`stranger`. v2.7.23: journal pictures only in Look & Repeat. v2.7.22: 50 pattern versions of everyday things, surprises paced to last until every star. v2.7.21: Teacher visits regardless (more for cold fires), winning back = the gift, frog bank/slip, apples and ice, aviator shades redrawn, stickers still to win as tiles. v2.7.20: the streak button reads "🏃 4 days". v2.7.19: the install banner under the top buttons, called Install. v2.7.18: install banner. v2.7.17: Home zooms back out, ✏️ Change your explorer, 🏃 streak, the update note closes on a tap outside. v2.7.16: making an explorer laid out like My look, every color for everyone, tap outside closes any pop-up (out of hearts: Next time), swipes work by touch on phones. v2.7.15: the explorer's name as the title of My Explorer / My Achievements. v2.7.14: swipe and Back in How to play, swipe in Word Steps, map bubbles kept on screen. v2.7.13: campfires over three weeks, low ones breathe, the Teacher visits cold fires, relit fires flare, campfires in the sūrahs list. v2.7.12: How to play = the Teacher's guide cards; every journal thing always on the map. v2.7.11: the welcome covers the four steps, dressing up, campfires and the journal. v2.7.10: install steps brought up to date (iOS 26 Safari: ⋯ → Share → Add to Home Screen, Open as Web App on; Android Chrome: ⋮ → Add to home screen / Install app → Install) in the README and the fullscreen tip. v2.7.9: lost things in a small heap close to their sūrah. v2.7.8: lost things never overlap. v2.7.7: the test's header ("Test · sūrah", dots under it, level with Listen). v2.7.6: tap a campfire for its status; Listen top right in the test. v2.7.5: Listen in the Teacher's test (question only), misses dim the campfire, the campfire on the sūrah page, swipe in Look & Repeat, lost things kept on screen. v2.7.4: speed and loop in chain time. v2.7.3: Listen plays the lit chain āyah / the next puzzle piece; the explorer switcher matches the Explorers page. v2.7.2: "Your Teacher", tap to add to the journal, the journal as a book (swipe pages), its button under the worlds button, pastel comfy colors and shoe colors, switch explorer by the name, journal finds in Achievements. v2.7.1: family links carry every field (extras block); backups verified field by field. v2.7.0: campfires, the journal hunt, streaks, the Wise Elder's welcome and walking stick, Begin the quest, things on the map react (the boat sails off), the Elder's timer after 3 memorized sūrahs. v2.6.14: the Wise Elder roams the map (tap for a test, one gift a day), rematches wait for his timer, Auto theme by sunrise/sunset, still stickers, a new bee, the Version card updates in place. Full detail: `git log` and `changelog.json`.
