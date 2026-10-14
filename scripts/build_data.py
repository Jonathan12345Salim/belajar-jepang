#!/usr/bin/env python3
"""Membangun file data aplikasi (public/data/*.json).

Sumber data terbuka (diunduh otomatis ke scripts/.cache/):
  - KANJIDIC2 (EDRDG, CC BY-SA 4.0) melalui davidluzgouveia/kanji-data (MIT):
    arti, bacaan, jumlah goresan, level JLPT (daftar Jonathan Waller).
  - Daftar kosakata JLPT: jamsinclair/open-anki-jlpt-decks (MIT, berbasis tanos.co.uk).
  - KanjiVG (Ulrich Apel, CC BY-SA 3.0): urutan goresan kana & kanji.

Konten buatan sendiri (bahasa Indonesia) ada di folder content/.
Jalankan:  python3 scripts/build_data.py
"""
import csv
import gzip
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'scripts', '.cache')
OUT = os.path.join(ROOT, 'public', 'data')
CONTENT = os.path.join(ROOT, 'content')

KD = 'https://raw.githubusercontent.com/davidluzgouveia/kanji-data/00fd7079c3890f430759536f91aa5e854ec0ca4f/kanji.json'
VOC = 'https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/1ad66734417aca9dbcca6b2d5ee440cb13ab3ba0/src/n{}.csv'
KVG = 'https://github.com/KanjiVG/kanjivg/releases/download/r20260714/kanjivg-20260714.xml.gz'
SOURCES = {'kanji.json': KD, 'kanjivg.xml.gz': KVG}
for _n in range(1, 6):
    SOURCES[f'n{_n}.csv'] = VOC.format(_n)

KVG_NS = '{http://kanjivg.tagaini.net}'
LEVELS = [5, 4, 3, 2, 1]


def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('  unduh', SOURCES[name])
        urllib.request.urlretrieve(SOURCES[name], path)
    return path


def read_lines(name):
    path = os.path.join(CONTENT, name)
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as f:
        return [ln.rstrip('\n') for ln in f]


def data_lines(name):
    """Baris data tanpa komentar (#) dan baris kosong."""
    return [ln for ln in read_lines(name) if ln.strip() and not ln.lstrip().startswith('#')]


def to_kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)


def is_kanji(c):
    return '\u4e00' <= c <= '\u9fff' or c == '々'


def write(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  {name}: {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')


# ---------------------------------------------------------------- KanjiVG
def load_kanjivg(wanted):
    """Mengembalikan {karakter: (daftar path goresan, komponen)}."""
    res = {}
    with gzip.open(fetch('kanjivg.xml.gz')) as f:
        tree = ET.parse(f)
    for k in tree.getroot():
        kid = k.get('id', '')
        m = re.fullmatch(r'kvg:kanji_([0-9a-f]{5})', kid)
        if not m:
            continue  # lewati varian (Kaisho, dsb.)
        ch = chr(int(m.group(1), 16))
        if ch not in wanted:
            continue
        paths = [p.get('d') for p in k.iter('path')]
        comps = []
        root = k.find('g')
        if root is not None:
            def collect(g, depth):
                for child in g.findall('g'):
                    el = child.get(KVG_NS + 'element')
                    if el and el != ch:
                        if el not in comps:
                            comps.append(el)
                    elif depth < 1:
                        collect(child, depth + 1)
            collect(root, 0)
        res[ch] = (paths, comps)
    return res


# ---------------------------------------------------------------- Kanji
def build_kanji():
    src = json.load(open(fetch('kanji.json'), encoding='utf-8'))
    ind = {}
    for ln in data_lines('kanji_id.txt'):
        parts = ln.split('|')
        ch = parts[0].strip()
        ind[ch] = {
            'id': [x.strip() for x in parts[1].split(';') if x.strip()] if len(parts) > 1 else [],
            'mn': parts[2].strip() if len(parts) > 2 and parts[2].strip() else None,
        }
    items = []
    for ch, v in src.items():
        lv = v.get('jlpt_new')
        if not lv:
            continue
        en = [m for m in v.get('meanings') or [] if 'radical (no' not in m.lower()]
        item = {
            'c': ch,
            'lv': lv,
            's': v.get('strokes') or 0,
            'on': [to_kata(r) for r in v.get('readings_on') or []],
            'kun': v.get('readings_kun') or [],
            'en': en[:5],
        }
        if v.get('freq'):
            item['f'] = v['freq']
        if v.get('grade'):
            item['g'] = v['grade']
        if ch in ind:
            if ind[ch]['id']:
                item['id'] = ind[ch]['id']
            if ind[ch]['mn']:
                item['mn'] = ind[ch]['mn']
        items.append(item)
    # urutan kurikulum khusus (opsional) per level; spasi memisahkan kelompok pelajaran
    order = {}
    groups = {}
    for ln in data_lines('urutan_kanji.txt'):
        lv, seq = ln.split('|')
        groups[lv.strip()] = seq.split()
        for i, ch in enumerate(seq.replace(' ', '')):
            order[ch] = i
    items.sort(key=lambda x: (-x['lv'], order.get(x['c'], 10000), x.get('f', 9999), x['s']))
    return items, groups


# ---------------------------------------------------------------- Kosakata
NOTE_RE = re.compile(r'\s*\((?:かん)\)')
PAREN_RE = re.compile(r'\s*\(([^)]*)\)\s*')


def norm(s):
    return s.replace('〜', '～').strip()


def variants(s):
    return [x.strip() for x in re.split(r'[;、]', norm(s)) if x.strip()]


def split_note(s):
    """'けっこん (する)' -> ('けっこん', ['する'])"""
    notes = PAREN_RE.findall(s)
    return PAREN_RE.sub('', s).strip(), notes


def build_vocab():
    ind = {}
    for i, ln in enumerate(data_lines('kosakata_id.txt')):
        parts = [p.strip() for p in ln.split('|')]
        if len(parts) >= 3:
            ind[parts[0] + '|' + parts[1]] = {
                'id': parts[2],
                'cat': parts[3] if len(parts) > 3 else '',
                'w': parts[4] if len(parts) > 4 else '',
                'o': i,
            }
    seen = set()
    items = []
    used = set()
    for lv in LEVELS:
        with open(fetch(f'n{lv}.csv'), encoding='utf-8') as f:
            for row in csv.DictReader(f):
                ev = variants(NOTE_RE.sub('', row['expression']))
                rv = variants(NOTE_RE.sub('', row['reading']))
                if not ev or not rv:
                    continue
                w, n1 = split_note(ev[0])
                r, n2 = split_note(rv[0])
                if not w or not r:
                    continue
                key = w + '|' + r
                if key in seen:
                    continue
                seen.add(key)
                meaning = re.sub(r'\s+', ' ', row['meaning']).strip()
                item = {'w': w, 'r': r, 'en': meaning, 'lv': lv}
                notes = []
                for n in n1 + n2:
                    if n not in notes:
                        notes.append(n)
                if notes:
                    item['nt'] = ' '.join('(' + n + ')' for n in notes)
                alt = [x for x in ev[1:] if x != w] + [x for x in rv[1:] if x != r and x not in ev]
                if alt:
                    item['alt'] = alt
                if key in ind:
                    used.add(key)
                    t = ind[key]
                    item['id'] = t['id']
                    if t['cat']:
                        item['cat'] = t['cat']
                    if t['w']:
                        item['w'] = t['w']
                    item['o'] = t['o']
                items.append(item)
    # buang duplikat yang muncul setelah koreksi bentuk tulisan
    final, keys = [], set()
    for it in items:
        k = it['w'] + '|' + it['r']
        if k not in keys:
            keys.add(k)
            final.append(it)
    items[:] = final
    missing = [k for k in ind if k not in used]
    if missing:
        print('  PERINGATAN: terjemahan tanpa pasangan kosakata:', missing[:20], len(missing))
    return items


# ---------------------------------------------------------------- Grammar
def parse_examples(line):
    # ex: token token token || terjemahan || key
    parts = [p.strip() for p in line.split('||')]
    ex = {'t': parts[0].split(), 'id': parts[1] if len(parts) > 1 else ''}
    if len(parts) > 2 and parts[2] != '':
        ex['k'] = int(parts[2])
    if len(parts) > 3 and parts[3]:
        ex['o'] = [o.strip() for o in parts[3].split(',') if o.strip()]
    return ex


def build_grammar():
    items = []
    cur = None
    for ln in read_lines('tata_bahasa.txt'):
        s = ln.strip()
        if not s or (s.startswith('#') and not s.startswith('## ')):
            continue
        if s.startswith('## '):
            gid, lv, title, mean = [p.strip() for p in s[3:].split('|')]
            cur = {'id': gid, 'lv': int(lv), 't': title, 'm': mean, 'p': '', 'x': [], 'ex': [], 'o': []}
            items.append(cur)
        elif s.startswith('pola:'):
            cur['p'] = s[5:].strip()
        elif s.startswith('info:'):
            cur['x'].append(s[5:].strip())
        elif s.startswith('ex:'):
            cur['ex'].append(parse_examples(s[3:]))
        elif s.startswith('opts:'):
            cur['o'] = [o.strip() for o in s[5:].split(',') if o.strip()]
        else:
            raise ValueError('Baris tata bahasa tidak dikenal: ' + s)
    for g in items:
        for ex in g['ex']:
            if 'k' in ex and ex['k'] >= len(ex['t']):
                raise ValueError(f"key di luar token: {g['id']} {ex}")
    return items


# ---------------------------------------------------------------- Cerita
def build_stories():
    items = []
    cur = None
    for ln in read_lines('cerita.txt'):
        s = ln.strip()
        if not s or (s.startswith('#') and not s.startswith('## ')):
            continue
        if s.startswith('## '):
            sid, lv, title, title_id = [p.strip() for p in s[3:].split('|')]
            cur = {'id': sid, 'lv': int(lv), 't': title, 'ti': title_id, 's': [], 'q': []}
            items.append(cur)
        elif s.startswith('q:'):
            parts = [p.strip() for p in s[2:].split('|')]
            opts = [p.lstrip('*') for p in parts[1:]]
            ans = [i for i, p in enumerate(parts[1:]) if p.startswith('*')][0]
            cur['q'].append({'q': parts[0], 'o': opts, 'a': ans})
        else:
            jp, tr = [p.strip() for p in s.split('||')]
            toks = jp.split()
            sent = {'t': toks, 'id': tr}
            if toks and toks[0].startswith('@'):
                sent['sp'] = toks[0][1:]
                sent['t'] = toks[1:]
            cur['s'].append(sent)
    return items


def build_simple(name, keys):
    res = []
    for ln in data_lines(name):
        parts = [p.strip() for p in ln.split('|')]
        res.append({k: parts[i] if i < len(parts) else '' for i, k in enumerate(keys)})
    return res


def main():
    print('Kanji...')
    kanji, kanji_groups = build_kanji()
    print('Kosakata...')
    vocab = build_vocab()
    grammar = build_grammar()
    stories = build_stories()
    radicals = build_simple('radikal.txt', ['c', 'id', 'en', 'ex'])
    kana_mn = {r['c']: r['m'] for r in build_simple('kana_mnemonik.txt', ['c', 'm'])}

    kana_chars = [chr(c) for c in range(0x3041, 0x3097)] + [chr(c) for c in range(0x30A1, 0x30FB)] + ['ー']
    wanted = set(kana_chars) | {k['c'] for k in kanji} | {r['c'] for r in radicals}
    print('KanjiVG...')
    kvg = load_kanjivg(wanted)

    no_strokes = []
    for k in kanji:
        if k['c'] in kvg:
            comps = kvg[k['c']][1]
            if comps:
                k['cp'] = comps
        else:
            no_strokes.append(k['c'])
    if no_strokes:
        print('  tanpa data goresan:', ''.join(no_strokes))

    print('Menulis file...')
    write('kanji.json', kanji)
    write('vocab.json', vocab)
    write('grammar.json', grammar)
    write('stories.json', stories)
    write('radicals.json', radicals)
    write('kana-mn.json', kana_mn)
    write('strokes-kana.json', {c: kvg[c][0] for c in kana_chars if c in kvg})
    for lv in LEVELS:
        write(f'strokes-n{lv}.json', {k['c']: kvg[k['c']][0] for k in kanji if k['lv'] == lv and k['c'] in kvg})
    extra = {r['c']: kvg[r['c']][0] for r in radicals if r['c'] in kvg and r['c'] not in {k['c'] for k in kanji}}
    write('strokes-rad.json', extra)

    stats = {f'n{lv}': {
        'kanji': sum(1 for k in kanji if k['lv'] == lv),
        'kanji_id': sum(1 for k in kanji if k['lv'] == lv and 'id' in k),
        'vocab': sum(1 for v in vocab if v['lv'] == lv),
        'vocab_id': sum(1 for v in vocab if v['lv'] == lv and 'id' in v),
        'grammar': sum(1 for g in grammar if g['lv'] == lv),
        'stories': sum(1 for s in stories if s['lv'] == lv),
    } for lv in LEVELS}
    write('kanji-groups.json', kanji_groups)
    write('meta.json', stats)
    for k, v in stats.items():
        print(' ', k, v)


if __name__ == '__main__':
    main()
