#!/usr/bin/env python3
"""Build the 99 Names of Allah (al-Asmā' al-Ḥusnā) for Little Hafiz Quest's Hidden Garden (stop 207, v2.12.2).

Usage (from the project folder):
    python3 tools/build_names.py audio --ffmpeg PATH   # download the clips, build audio/names-sadiq/207.mp3 + timings.json
    python3 tools/build_names.py words                 # write the names' transliteration and meaning into words.json
    python3 tools/build_names.py data                  # print the ten lines for js/data.js (stop 207's "ayat")
    python3 tools/build_names.py nasheed --src FILE.mp3 --ffmpeg PATH [--words whisper.json]
                                                       # the nasheed (v2.12.3): audio/names-nasheed/207.mp3 + timings.json

The voice: 99 recordings, one per name, by Mohammed Sadiq on Wikimedia Commons
(https://commons.wikimedia.org/wiki/Category:Arabic_pronunciation_of_names_of_God_in_Islam), each under CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/). Each clip is trimmed of its silence, brought to the same level and
joined into one file: 0.25 s silence, line 1 (its names 0.45 s apart), 0.8 s, line 2, … The file (a derivative) is
CC BY-SA 4.0 too. No reciter's recording of the names with a licence to share was found (v2.12.2): if one comes,
build another voice folder the same way and point stop 207's `voice` at it.

Word timings: each clip is one name; a name of two or three words (Mālik-ul-Mulk, Dhul-Jalāli wal-Ikrām) is cut
by its letters (a best guess: there are no published timings).
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
from array import array

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = 'names-sadiq'
N = 207
SR = 44100
# (Arabic, transliteration of each word, meaning for a child): the common list, in the Commons clips' order
NAMES = [
    ('الرَّحْمَٰنُ', 'Ar-Raḥmān', 'the Most Merciful'), ('الرَّحِيمُ', 'Ar-Raḥīm', 'the Most Kind'), ('الْمَلِكُ', 'Al-Malik', 'the King'),
    ('الْقُدُّوسُ', 'Al-Quddūs', 'the Most Pure'), ('السَّلَامُ', 'As-Salām', 'the Source of Peace'), ('الْمُؤْمِنُ', 'Al-Mu’min', 'the Giver of Safety'),
    ('الْمُهَيْمِنُ', 'Al-Muhaymin', 'the One who watches over all'), ('الْعَزِيزُ', 'Al-‘Azīz', 'the Mighty'), ('الْجَبَّارُ', 'Al-Jabbār', 'the One who mends what is broken'),
    ('الْمُتَكَبِّرُ', 'Al-Mutakabbir', 'the Supreme'),
    ('الْخَالِقُ', 'Al-Khāliq', 'the Creator'), ('الْبَارِئُ', 'Al-Bāri’', 'the Maker'), ('الْمُصَوِّرُ', 'Al-Muṣawwir', 'the Shaper'),
    ('الْغَفَّارُ', 'Al-Ghaffār', 'the Ever-Forgiving'), ('الْقَهَّارُ', 'Al-Qahhār', 'the All-Powerful'), ('الْوَهَّابُ', 'Al-Wahhāb', 'the Giver of gifts'),
    ('الرَّزَّاقُ', 'Ar-Razzāq', 'the Provider'), ('الْفَتَّاحُ', 'Al-Fattāḥ', 'the Opener'), ('الْعَلِيمُ', 'Al-‘Alīm', 'the All-Knowing'), ('الْقَابِضُ', 'Al-Qābiḍ', 'the One who holds back'),
    ('الْبَاسِطُ', 'Al-Bāsiṭ', 'the One who gives freely'), ('الْخَافِضُ', 'Al-Khāfiḍ', 'the One who lowers'), ('الرَّافِعُ', 'Ar-Rāfi‘', 'the One who raises'),
    ('الْمُعِزُّ', 'Al-Mu‘izz', 'the Giver of honour'), ('الْمُذِلُّ', 'Al-Mudhill', 'the One who humbles'), ('السَّمِيعُ', 'As-Samī‘', 'the All-Hearing'),
    ('الْبَصِيرُ', 'Al-Baṣīr', 'the All-Seeing'), ('الْحَكَمُ', 'Al-Ḥakam', 'the Judge'), ('الْعَدْلُ', 'Al-‘Adl', 'the Just'), ('اللَّطِيفُ', 'Al-Laṭīf', 'the Gentle'),
    ('الْخَبِيرُ', 'Al-Khabīr', 'the All-Aware'), ('الْحَلِيمُ', 'Al-Ḥalīm', 'the Patient and Calm'), ('الْعَظِيمُ', 'Al-‘Aẓīm', 'the Magnificent'),
    ('الْغَفُورُ', 'Al-Ghafūr', 'the Forgiving'), ('الشَّكُورُ', 'Ash-Shakūr', 'the One who rewards thanks'), ('الْعَلِيُّ', 'Al-‘Aliyy', 'the Most High'),
    ('الْكَبِيرُ', 'Al-Kabīr', 'the Most Great'), ('الْحَفِيظُ', 'Al-Ḥafīẓ', 'the Protector'), ('الْمُقِيتُ', 'Al-Muqīt', 'the Feeder of all'), ('الْحَسِيبُ', 'Al-Ḥasīb', 'the One who counts'),
    ('الْجَلِيلُ', 'Al-Jalīl', 'the Majestic'), ('الْكَرِيمُ', 'Al-Karīm', 'the Generous'), ('الرَّقِيبُ', 'Ar-Raqīb', 'the Watchful'),
    ('الْمُجِيبُ', 'Al-Mujīb', 'the One who answers'), ('الْوَاسِعُ', 'Al-Wāsi‘', 'the Vast'), ('الْحَكِيمُ', 'Al-Ḥakīm', 'the Wise'),
    ('الْوَدُودُ', 'Al-Wadūd', 'the Loving'), ('الْمَجِيدُ', 'Al-Majīd', 'the Glorious'), ('الْبَاعِثُ', 'Al-Bā‘ith', 'the One who brings back to life'), ('الشَّهِيدُ', 'Ash-Shahīd', 'the Witness'),
    ('الْحَقُّ', 'Al-Ḥaqq', 'the Truth'), ('الْوَكِيلُ', 'Al-Wakīl', 'the One we rely on'), ('الْقَوِيُّ', 'Al-Qawiyy', 'the Strong'),
    ('الْمَتِينُ', 'Al-Matīn', 'the Firm'), ('الْوَلِيُّ', 'Al-Waliyy', 'the Friend and Helper'), ('الْحَمِيدُ', 'Al-Ḥamīd', 'the Praiseworthy'),
    ('الْمُحْصِي', 'Al-Muḥṣī', 'the One who counts everything'), ('الْمُبْدِئُ', 'Al-Mubdi’', 'the One who begins'), ('الْمُعِيدُ', 'Al-Mu‘īd', 'the One who brings back'), ('الْمُحْيِي', 'Al-Muḥyī', 'the Giver of life'),
    ('الْمُمِيتُ', 'Al-Mumīt', 'the Taker of life'), ('الْحَيُّ', 'Al-Ḥayy', 'the Ever-Living'), ('الْقَيُّومُ', 'Al-Qayyūm', 'the One who keeps all going'),
    ('الْوَاجِدُ', 'Al-Wājid', 'the One who has everything'), ('الْمَاجِدُ', 'Al-Mājid', 'the Noble'), ('الْوَاحِدُ', 'Al-Wāḥid', 'the One'),
    ('الْأَحَدُ', 'Al-Aḥad', 'the Only One'), ('الصَّمَدُ', 'Aṣ-Ṣamad', 'the One all need'), ('الْقَادِرُ', 'Al-Qādir', 'the Able'), ('الْمُقْتَدِرُ', 'Al-Muqtadir', 'the All-Capable'),
    ('الْمُقَدِّمُ', 'Al-Muqaddim', 'the One who brings forward'), ('الْمُؤَخِّرُ', 'Al-Mu’akhkhir', 'the One who puts back'), ('الْأَوَّلُ', 'Al-Awwal', 'the First'),
    ('الْآخِرُ', 'Al-Ākhir', 'the Last'), ('الظَّاهِرُ', 'Aẓ-Ẓāhir', 'the One shown by all He made'), ('الْبَاطِنُ', 'Al-Bāṭin', 'the Unseen'),
    ('الْوَالِي', 'Al-Wālī', 'the One in charge'), ('الْمُتَعَالِي', 'Al-Muta‘ālī', 'the Most Exalted'), ('الْبَرُّ', 'Al-Barr', 'the Source of all good'), ('التَّوَّابُ', 'At-Tawwāb', 'the One who accepts us back'),
    ('الْمُنْتَقِمُ', 'Al-Muntaqim', 'the One who brings justice'), ('الْعَفُوُّ', 'Al-‘Afuww', 'the Pardoner'), ('الرَّءُوفُ', 'Ar-Ra’ūf', 'the Most Tender'),
    ('مَالِكُ الْمُلْكِ', 'Mālik ul-Mulk', 'the Owner of all kingdoms'), ('ذُو الْجَلَالِ وَالْإِكْرَامِ', 'Dhul Jalāli wal-Ikrām', 'the Lord of majesty and honour'),
    ('الْمُقْسِطُ', 'Al-Muqsiṭ', 'the Fair'), ('الْجَامِعُ', 'Al-Jāmi‘', 'the Gatherer'), ('الْغَنِيُّ', 'Al-Ghaniyy', 'the One who needs nothing'),
    ('الْمُغْنِي', 'Al-Mughnī', 'the One who makes rich'), ('الْمَانِعُ', 'Al-Māni‘', 'the One who holds harm back'),
    ('الضَّارُّ', 'Aḍ-Ḍārr', 'the One who allows hardship'), ('النَّافِعُ', 'An-Nāfi‘', 'the Giver of good'), ('النُّورُ', 'An-Nūr', 'the Light'),
    ('الْهَادِي', 'Al-Hādī', 'the Guide'), ('الْبَدِيعُ', 'Al-Badī‘', 'the Maker of wonders'), ('الْبَاقِي', 'Al-Bāqī', 'the Everlasting'),
    ('الْوَارِثُ', 'Al-Wārith', 'the One to whom all returns'), ('الرَّشِيدُ', 'Ar-Rashīd', 'the Rightly Guiding'), ('الصَّبُورُ', 'Aṣ-Ṣabūr', 'the Most Patient'),
]
assert len(NAMES) == 99
# the meanings of the words of a name of more than one word
SPLIT_EN = {'Mālik ul-Mulk': ['the Owner', 'of all kingdoms'], 'Dhul Jalāli wal-Ikrām': ['the Lord', 'of majesty', 'and honour']}
LINES = [list(range(i, min(i + 10, 99))) for i in range(0, 99, 10)]  # ten lines: nine of ten names, the last of nine
# each line's pictures, the hook a child remembers it by, and something to do with the hands
LINE_ART = [
    (['💖', '👑', '🕊️'], 'Merciful King of peace', '💖 Hug yourself, then make a crown with your hands'),
    (['🌱', '🎁', '🔓'], 'Creator, Giver, Opener', '🎁 Open your hands like a gift'),
    (['⬆️', '👂', '⚖️'], 'Hears, sees, is fair', '👂 Touch your ear, then point to your eyes'),
    (['⛰️', '🛡️', '🍞'], 'Great, protecting, feeding', '🛡️ Cross your arms like a shield'),
    (['🤲', '🌊', '💕'], 'Generous, loving, answers', '🤲 Raise your hands to ask'),
    (['💪', '🤝', '🔢'], 'Strong friend who counts all', '💪 Show your strong arms'),
    (['💓', '☝️', '♾️'], 'Ever-Living, the One', '☝️ Hold up one finger'),
    (['🥇', '🏁', '🔄'], 'The First and the Last', '👉 Point in front, then behind'),
    (['🧽', '🌍', '💎'], 'Pardons, owns all, needs nothing', '🌍 Draw a big circle in the air'),
    (['💡', '🧭', '⏳'], 'Light, Guide, Patient', '💡 Open your hands like a light'),
]
LETTER = re.compile(r'[ء-يٱ-ۓ]')


def line_data():
    out = []
    for li, idx in enumerate(LINES):
        scene, hook, gesture = LINE_ART[li]
        out.append({'ar': ' '.join(NAMES[i][0] for i in idx), 'tr': ' · '.join(NAMES[i][1] for i in idx),
                    'kid': ', '.join(NAMES[i][2] for i in idx).capitalize(), 'scene': scene, 'hook': hook, 'gesture': gesture,
                    'anim': 'pulse', 'names': [i + 1 for i in idx]})
    return out


def commons_url(fname):
    f = fname.replace(' ', '_')
    h = hashlib.md5(f.encode()).hexdigest()
    return f'https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{urllib.parse.quote(f)}'


def clip_names():
    # the Commons files: 01-ar-rahman.ogg … 99-as-sabur.ogg (three with a space after the number)
    slugs = ('ar-rahman ar-rahim al-malik al-quddus as-salam al-mumin al-muhaymin al-aziz al-jabbar al-mutakabbir al-khaliq al-bari al-musawwir '
             'al-ghaffar al-qahhar al-wahhab ar-razzaq al-fattah al-alim al-qabid al-basit al-khafid ar-rafi al-muizz al-mudhill as-sami al-basir al-hakam '
             'al-adl al-latif al-khabir al-halim al-azim al-ghafur ash-shakur al-ali al-kabir al-hafiz al-muqit al-hasib al-jalil al-karim ar-raqib al-mujib '
             'al-wasi al-hakim al-wadud al-majid al-baith ash-shahid al-haqq al-wakil al-qawi al-matin al-wali al-hamid al-muhsi al-mubdi al-muid al-muhyi '
             'al-mumit al-hayy al-qayyum al-wajid al-majid al-wahid al-ahad as-samad al-qadir al-muqtadir al-muqaddim al-muakhkhir al-awwal al-akhir az-zahir '
             'al-batin al-wali al-mutaali al-barr at-tawwab al-muntaqim al-afuw ar-rauf malik-ul-mulk dhul-jalaal-wal-ikraam al-muqsit al-jame al-ghani '
             'al-mughni al-mani ad-darr an-nafi an-nur al-hadi al-badi al-baqi al-warith ar-rashid as-sabur').split()
    assert len(slugs) == 99
    return [f'{i + 1:02d}{" " if i + 1 in (37, 42, 49) else "-"}{s}.ogg' for i, s in enumerate(slugs)]


def pcm_of(ffmpeg, path):
    raw = subprocess.run([ffmpeg, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True, capture_output=True).stdout
    a = array('h'); a.frombytes(raw)
    return a


def trimmed(a, thr=0.02):
    """the clip without its silence before and after (a little kept at each end), brought to -3 dBFS"""
    peak = max(1, max(abs(x) for x in a))
    lim = peak * thr
    i = next((j for j, x in enumerate(a) if abs(x) > lim), 0)
    k = len(a) - next((j for j, x in enumerate(reversed(a)) if abs(x) > lim), 0)
    i, k = max(0, i - int(0.03 * SR)), min(len(a), k + int(0.06 * SR))
    g = (32767 * 0.708) / peak
    return array('h', (max(-32767, min(32767, int(x * g))) for x in a[i:k]))


def build_audio(ffmpeg, cache):
    os.makedirs(cache, exist_ok=True)
    names = clip_names()
    clips = []
    for fname in names:
        dst = os.path.join(cache, fname.replace(' ', '_'))
        for attempt in range(200):  # (politely: a pause between files, and waiting as long as Wikimedia asks us to)
            if os.path.isfile(dst):
                break
            req = urllib.request.Request(commons_url(fname), headers={'User-Agent': 'LittleHafizQuest-build/1.0 (offline children\'s game asset build)'})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    body = r.read()
                with open(dst, 'wb') as f:
                    f.write(body)
                time.sleep(3)
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
                time.sleep(max(int(e.headers.get('Retry-After') or 0), min(300, 15 * (attempt + 1))))
            except (urllib.error.URLError, OSError):  # (the network away for a moment: wait and try again)
                time.sleep(60)
        if not os.path.isfile(dst):
            sys.exit(f'{fname}: Wikimedia would not send it; run this again later (what came down is kept)')
        clips.append(trimmed(pcm_of(ffmpeg, dst)))
    sil = lambda s: array('h', bytes(2 * int(s * SR)))
    out = sil(0.25)
    timings = []
    for li, idx in enumerate(LINES):
        if li:
            out.extend(sil(0.8))
        start = len(out) / SR
        words = []
        for q, i in enumerate(idx):
            if q:
                out.extend(sil(0.45))
            s0 = len(out) / SR
            out.extend(clips[i])
            s1 = len(out) / SR
            parts = NAMES[i][0].split()
            if len(parts) == 1:
                words.append([round(s0, 3), round(s1, 3)])
            else:  # (a best guess: the name's words by their letters)
                n = [len(LETTER.findall(p)) for p in parts]
                t = s0
                for c in n:
                    e = t + (s1 - s0) * c / sum(n)
                    words.append([round(t, 3), round(e, 3)])
                    t = e
        timings.append([round(start, 3), round(len(out) / SR, 3), words])
    out.extend(sil(0.3))
    folder = os.path.join(ROOT, 'audio', VOICE)
    os.makedirs(folder, exist_ok=True)
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '48k',
                    os.path.join(folder, f'{N:03d}.mp3')], input=out.tobytes(), check=True)
    with open(os.path.join(folder, 'timings.json'), 'w', encoding='utf-8') as f:
        json.dump({'reciter': VOICE, 'name': 'Mohammed Sadiq (Wikimedia Commons, CC BY-SA 4.0)', 'kbps': 48, 'surahs': {str(N): timings}}, f, ensure_ascii=False)
    print(f'audio/{VOICE}/{N:03d}.mp3: {len(out) / SR:.1f} s, {sum(len(t[2]) for t in timings)} words')


def build_words():
    p = os.path.join(ROOT, 'words.json')
    with open(p, encoding='utf-8') as f:
        d = json.load(f)
    lines = []
    for idx in LINES:
        ws = []
        for i in idx:
            ar, tr, en = NAMES[i]
            parts, trs = ar.split(), tr.split()
            ens = SPLIT_EN.get(tr, [en])
            ws += [[trs[j], ens[j]] for j in range(len(parts))]
        lines.append(ws)
    d['surahs'][str(N)] = lines
    if 'names' not in d['about']:
        d['about'] += ' Stop 207 (the 99 Names of Allah) is the game\'s own (tools/build_names.py).'
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print('words.json: 207 written')


OPENING = 'هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ'  # (He is Allah, there is no god but Him: sung before the names)
NASHEED = 'names-nasheed'
HARAKAT = re.compile(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]')
SOUND = str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ق': 'ك', 'ح': 'ه', 'خ': 'ه', 'ذ': 'ز', 'ظ': 'ز', 'ض': 'د',
                       'ص': 'س', 'ث': 'س', 'ط': 'ت', 'ع': 'ا', 'ء': 'ا', 'ئ': 'ي', 'ؤ': 'و', 'غ': 'ك'})


def bare(w):
    """a word as it sounds, loosely: no marks, similar letters made one, no 'al-' or 'wa-' in front"""
    w = HARAKAT.sub('', w).translate(SOUND)
    for pre in ('وال', 'لل', 'ال', 'و'):
        if w.startswith(pre) and len(w) > len(pre) + 1:
            return w[len(pre):]
    return w


def align(ours, heard):
    """the heard words (in order, with times) matched to ours by a best-scoring alignment that keeps both in order;
    a word of ours with no match gets its time between its neighbours'"""
    from difflib import SequenceMatcher
    sim = lambda a, b: SequenceMatcher(None, bare(a), bare(b)).ratio()
    n, m = len(ours), len(heard)
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = max(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1] + (sim(ours[i - 1], heard[j - 1][2]) - 0.35))
    i, j, at = n, m, [None] * n
    while i and j:
        if D[i][j] == D[i - 1][j - 1] + (sim(ours[i - 1], heard[j - 1][2]) - 0.35):
            at[i - 1] = j - 1; i -= 1; j -= 1
        elif D[i][j] == D[i - 1][j]:
            i -= 1
        else:
            j -= 1
    return at


def build_nasheed(ffmpeg, src, words_json):
    # what Whisper heard, with times (faster-whisper, run here if no file is given)
    if words_json and os.path.isfile(words_json):
        heard = json.load(open(words_json, encoding='utf-8'))
    else:
        import numpy as np
        from faster_whisper import WhisperModel
        raw = subprocess.run([ffmpeg, '-v', 'error', '-i', src, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], check=True, capture_output=True).stdout
        segs, _ = WhisperModel('medium', device='cpu', compute_type='int8').transcribe(np.frombuffer(raw, np.int16).astype(np.float32) / 32768, language='ar', word_timestamps=True, beam_size=5,
                                                                                   initial_prompt=OPENING + ' ' + ' '.join(x[0] for x in NAMES[:10]))
        heard = [[w.start, w.end, w.word.strip(), w.probability] for s in segs for w in (s.words or [])]
    ours = OPENING.split() + [w for x in NAMES for w in x[0].split()]
    at = align(ours, heard)
    starts = [heard[j][0] if j is not None else None for j in at]
    for k in range(len(ours)):  # (unmatched: between the neighbours)
        if starts[k] is None:
            a = max([q for q in range(k) if starts[q] is not None], default=None)
            b = min([q for q in range(k + 1, len(ours)) if starts[q] is not None], default=None)
            sa, sb = starts[a] if a is not None else 0, starts[b] if b is not None else heard[-1][1]
            span = (b if b is not None else len(ours)) - (a if a is not None else -1)
            starts[k] = sa + (sb - sa) * (k - (a if a is not None else -1)) / span
    last_end = heard[at[-1]][1] if at[-1] is not None else starts[-1] + 1.5
    ends = [starts[k + 1] - 0.03 for k in range(len(ours) - 1)] + [last_end + 0.25]
    lead = max(0.0, starts[0] - 0.4)  # (the silence before it is cut off)
    t = lambda x: round(x - lead + 0.25, 3)
    no = len(OPENING.split())
    lines, k = [], no
    for idx in LINES:
        cnt = sum(len(NAMES[i][0].split()) for i in idx)
        ws = [[t(starts[q]), t(ends[q])] for q in range(k, k + cnt)]
        lines.append([ws[0][0], ws[-1][1], ws])
        k += cnt
    opening = [[t(starts[q]), t(ends[q])] for q in range(no)]
    lines.append([opening[0][0], opening[-1][1], opening])  # (the opening, after the ten lines: the game plays it as line 11)
    folder = os.path.join(ROOT, 'audio', NASHEED)
    os.makedirs(folder, exist_ok=True)
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', f'{lead:.3f}', '-i', src, '-af', 'adelay=250|250,loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '48k',
                    os.path.join(folder, f'{N:03d}.mp3')], check=True)
    with open(os.path.join(folder, 'timings.json'), 'w', encoding='utf-8') as f:
        json.dump({'reciter': NASHEED, 'name': 'Nasheed of the 99 Names', 'kbps': 48, 'surahs': {str(N): lines}}, f, ensure_ascii=False)
    miss = [ours[q] for q in range(len(ours)) if at[q] is None]
    print(f'audio/{NASHEED}/{N:03d}.mp3: lines at ' + ', '.join(f'{l[0]:.1f}' for l in lines) + f'; not heard (placed between): {" ".join(miss) or "none"}')


if __name__ == '__main__':
    import urllib.parse
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('what', choices=['audio', 'words', 'data', 'nasheed'])
    ap.add_argument('--src', help='the nasheed recording (nasheed)')
    ap.add_argument('--words', help='its words with times from faster-whisper, as JSON (nasheed; made here if missing)')
    ap.add_argument('--ffmpeg', default=os.environ.get('FFMPEG', 'ffmpeg'))
    ap.add_argument('--cache', default=os.environ.get('LHQ_AUDIO_CACHE', os.path.expanduser('~/.cache/little-hafiz-quest-audio/names')))
    a = ap.parse_args()
    if a.what == 'audio':
        build_audio(a.ffmpeg, a.cache)
    elif a.what == 'nasheed':
        build_nasheed(a.ffmpeg, a.src, a.words)
    elif a.what == 'words':
        build_words()
    else:
        for x in line_data():
            print('        ' + json.dumps(x, ensure_ascii=False) + ',')
