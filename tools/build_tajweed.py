#!/usr/bin/env python3
"""Build tajweed.json: tajwīd rule colours for every āyah in the game (v2.13.0).

Source: quran-tajweed by Collin Fair, https://github.com/cpfair/quran-tajweed (CC BY 4.0): rule annotations (rule,
start, end) over the Tanzil Uthmani text, made with rules checked against colour-coded tajwīd muṣḥafs. Fetch:
  https://raw.githubusercontent.com/cpfair/quran-tajweed/master/output/tajweed.hafs.uthmani-pause-sajdah.json
  https://github.com/cpfair/quran-tajweed/files/7281388/quran-uthmani.txt   (the text its offsets count in)

The game's own Arabic (js/data.js) is spelled a little differently (final yā', the silent-letter mark, tatweel, open
tanwīn, small high letters…), so each annotation is moved onto the game's text: both texts are normalised (the
sukūn and tanwīn forms made the same, pause marks left out) and aligned with difflib, character by character.
Every span is then widened to whole letters (a letter with all its marks): colouring a mark apart from its letter
can break the Arabic joining in browsers.

Usage:  python3 -I tools/build_tajweed.py <annotations.json> <quran-uthmani.txt>   (run from the repo folder)
Writes tajweed.json: {"rules": [...], "ayat": {"sūrah:āyah": [[start, end, rule], ...]}}, offsets into the game's
"ar" of that āyah (the Garden's stops by their real sūrah and āyah numbers). Fails if any annotation can't be placed.
"""
import collections
import difflib
import json
import subprocess
import sys
import unicodedata

RULES = ['madd_6', 'madd_muttasil', 'madd_munfasil', 'madd_246', 'madd_2', 'ghunnah', 'idghaam_ghunnah', 'ikhfa', 'ikhfa_shafawi', 'iqlab',
         'idghaam_shafawi', 'qalqalah', 'hamzat_wasl', 'lam_shamsiyyah', 'silent', 'idghaam_no_ghunnah', 'idghaam_mutajanisayn', 'idghaam_mutaqaribayn']
NORM = {0x06E1: 0x0652, 0x08F0: 0x064B, 0x08F1: 0x064C, 0x08F2: 0x064D}
SKIP = set(range(0x06D6, 0x06DD)) | {0x06DE, 0x06E9}

JS = r"""
global.window = {};
require('./js/data.js');
const out = {};
for (const s of window.LHQ_DATA.surahs) {
  if (s.asma) continue; // the 99 Names: not the Qur'an's text
  const sura = s.sura || s.n, from = s.from || 1;
  s.ayat.forEach((a, k) => (out[sura + ':' + (from + k)] = a.ar));
}
process.stdout.write(JSON.stringify(out));
"""


def keyseq(s):
    idx, ks = [], []
    for i, c in enumerate(s):
        o = ord(c)
        if o in SKIP:
            continue
        idx.append(i)
        ks.append(chr(NORM.get(o, o)))
    return idx, ''.join(ks)


def is_mark(c):
    return unicodedata.category(c) in ('Mn', 'Me') or c == 'ـ'  # (a tatweel carries marks too)


def main():
    annf, txtf = sys.argv[1:3]
    lines = {}
    for line in open(txtf, encoding='utf-8'):
        p = line.rstrip('\n').split('|')
        if len(p) == 3:
            lines[p[0] + ':' + p[1]] = p[2]
    ann = {f"{a['surah']}:{a['ayah']}": a['annotations'] for a in json.load(open(annf, encoding='utf-8'))}
    game = json.loads(subprocess.run(['node', '-e', JS], capture_output=True, check=True, text=True).stdout)
    stats = collections.Counter()
    out = {}
    for k, G in game.items():
        s, a = map(int, k.split(':'))
        T, off = lines[k], 0
        if a == 1 and s not in (1, 9):
            # (its Basmalah comes first in this text: four words, spelled differently in places, e.g. 97:1)
            cut = 0
            for _ in range(4):
                cut = T.index(' ', cut) + 1
            T, off = T[cut:], cut
        ti, tk = keyseq(T)
        gi, gk = keyseq(G)
        m = {}
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, tk, gk, autojunk=False).get_opcodes():
            if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
                for x in range(i2 - i1):
                    m[ti[i1 + x]] = gi[j1 + x]
        res = []
        for an in ann[k]:
            st, en = an['start'] - off, an['end'] - off
            if st < 0:
                continue  # (on the Basmalah)
            mp = [m[i] for i in range(st, en) if i in m]
            if not mp:
                stats['unplaced'] += 1
                print('could not place', k, an, file=sys.stderr)
                continue
            stats['placed' if len(mp) == en - st else 'partly'] += 1
            b, e = min(mp), max(mp) + 1
            while b > 0 and is_mark(G[b]):  # whole letters: back to the letter a mark sits on
                b -= 1
            while e < len(G) and is_mark(G[e]):  # and on to its last mark
                e += 1
            res.append([b, e, RULES.index(an['rule'])])
        if res:
            out[k] = sorted(res)
    if stats['unplaced']:
        sys.exit('stopped: %d annotations could not be placed' % stats['unplaced'])
    doc = {
        'about': 'Tajwīd rule colours for the game\'s āyāt (js/game.js, the "Tajwīd colours" setting), built by tools/build_tajweed.py. ayat: "sūrah:āyah" -> [start, end, rule] over that āyah\'s Arabic in js/data.js.',
        'source': 'quran-tajweed by Collin Fair (https://github.com/cpfair/quran-tajweed), CC BY 4.0; realigned to this text and recoloured.',
        'rules': RULES,
        'ayat': out,
    }
    with open('tajweed.json', 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    print('āyāt', len(game), 'with rules', len(out), dict(stats))


main()
