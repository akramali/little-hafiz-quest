#!/usr/bin/env python3
"""Build words.json: a transliteration and an English meaning for every word of the game's text.

Usage (from the project folder):
    python3 tools/build_words.py

Source: the word-by-word data of the Quranic Arabic Corpus (https://corpus.quran.com, by Kais Dukes,
maintained by the Quran.com team), as served by the Quran.com API (api.quran.com/api/v4). It is shared
under the GNU General Public License v3, on condition that the Quranic Arabic Corpus is clearly named as
the source with a link to https://corpus.quran.com. words.json carries that notice and the same license.

Changes made here: the game splits each āyah into words on spaces and glues a lone pause mark onto the
word before it (js/game.js wordsOf). Where Quran.com's words line up one to one, each game word takes its
word's transliteration and meaning. Where they don't, the words are lined up by their letters (the same
way as tools/build_audio.py) and a game word takes the meanings of every Quran.com word it covers, joined.
Every such āyah is printed. Downloads are cached in ~/.cache/little-hafiz-quest-words.

Only the Python standard library is used.
"""
import difflib
import json
import os
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_audio import ROOT, SURAHS, letters, load_game_text, words_of  # noqa: E402

API = 'https://api.quran.com/api/v4'
CACHE = os.path.join(os.path.expanduser('~'), '.cache', 'little-hafiz-quest-words')
OUT = os.path.join(ROOT, 'words.json')


def get(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'LittleHafizQuest-words-builder/1 (+https://github.com/akramali/little-hafiz-quest)'})
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read()
        json.loads(body)
        with open(path, 'wb') as f:
            f.write(body)
        time.sleep(0.3)  # be kind to the server
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def verses(n):
    out, page = [], 1
    while page:
        url = f'{API}/verses/by_chapter/{n}?words=true&word_fields=text_uthmani&language=en&per_page=50&page={page}'
        data = get(url, os.path.join(CACHE, f'{n:03d}_p{page}.json'))
        out += data['verses']
        page = data.get('pagination', {}).get('next_page')
    return out


def clean(t):
    return ' '.join(str(t or '').split())


def map_words(game, qc):
    """For each game word, the Quran.com word indexes it covers."""
    if len(game) == len(qc):
        return [[k] for k in range(len(game))]
    q_text, q_word = '', []
    for k, w in enumerate(qc):
        lt = letters(w['text_uthmani']) or '?'
        q_text += lt
        q_word += [k] * len(lt)
    g_letters = [letters(w) or '?' for w in game]
    g_text = ''.join(g_letters)
    to_q = [None] * len(g_text)
    for blk in difflib.SequenceMatcher(None, g_text, q_text, autojunk=False).get_matching_blocks():
        for k in range(blk.size):
            to_q[blk.a + k] = blk.b + k
    out, pos = [], 0
    for lt in g_letters:
        ks = sorted({q_word[to_q[k]] for k in range(pos, pos + len(lt)) if to_q[k] is not None})
        out.append(ks)
        pos += len(lt)
    return out


def main():
    game = load_game_text()
    surahs, notes = {}, []
    for n in SURAHS:
        if n == 1:
            continue
        vs = verses(n)
        if len(vs) != len(game[n]):
            sys.exit(f'Sūrah {n}: Quran.com has {len(vs)} āyāt, data.js has {len(game[n])}')
        ayat = []
        for i, v in enumerate(vs):
            qc = [w for w in v['words'] if w.get('char_type_name') == 'word']
            gw = words_of(game[n][i])
            idx = map_words(gw, qc)
            row = []
            for ks in idx:
                tr = ' '.join(clean((qc[k].get('transliteration') or {}).get('text')) for k in ks)
                en = ' '.join(clean((qc[k].get('translation') or {}).get('text')) for k in ks)
                row.append([tr, en])
            if len(gw) != len(qc):
                notes.append(f'{n}:{i + 1}  {len(qc)} Quran.com words → {len(gw)} game words: ' + ' | '.join(f'{g} = {r[1]}' for g, r in zip(gw, row)))
            ayat.append(row)
        surahs[str(n)] = ayat
        print(f'{n:3d}  {len(ayat)} āyāt')
    data = {
        'about': 'A transliteration and an English meaning for each word of the game (js/game.js wordsOf), built by tools/build_words.py.',
        'source': 'Word-by-word data of the Quranic Arabic Corpus (https://corpus.quran.com), by Kais Dukes, maintained by the Quran.com team, via the Quran.com API.',
        'license': 'GNU General Public License v3 (https://www.gnu.org/licenses/gpl-3.0.html). Modified: where the game joins or splits words differently, the meanings of the covered words are joined (see tools/build_words.py).',
        'surahs': surahs,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print(f'\nwords.json: {os.path.getsize(OUT) // 1024} KB')
    if notes:
        print(f'\nĀyāt where the words were lined up by letters ({len(notes)}):')
        print('\n'.join('  ' + x for x in notes))


if __name__ == '__main__':
    main()
