# Little Hafiz Quest: notes for Claude Code

- **Start every session by reading `HANDOFF.md`**: current version, where things are, the game's rules, open items.
- Follow the **Release flow** in `HANDOFF.md` for every change: bump `VERSION` in `sw.js` and `js/game.js`, add short
  play-focused notes to `changelog.json`, test only the areas touched (`tests/t.sh <area>`), and **always update
  `README.md` and `HANDOFF.md`** (and README screenshots when screens change) before committing and pushing.
- Push over SSH: `git push git@github.com:akramali/little-hafiz-quest.git main`.
- Plain HTML/CSS/JS, no build step. Match the surrounding code style; append new CSS in a dated section.
- The user prefers concise in-app text: trim and shrink rather than add lines; keep the square, rattling gift box.
