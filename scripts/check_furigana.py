#!/usr/bin/env python3
"""Memeriksa furigana {漢字|かな} di materi content/ dengan MeCab (alat bantu penulis, opsional).

Butuh:  pip install fugashi unidic-lite
Jalankan: python3 scripts/check_furigana.py [file ...]
Melaporkan:
  - kanji yang belum diberi furigana
  - bacaan furigana yang berbeda dari bacaan MeCab (perlu dicek manual;
    MeCab juga bisa salah, misalnya angka atau kata yang bacaannya bergantung konteks)
"""
import os
import re
import sys

import fugashi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUBY = re.compile(r'\{([^|}]+)\|([^}]+)\}')
KANJI = re.compile(r'[\u3400-\u9fff\uf900-\ufaff々〆ヶ]')
# Bacaan yang sama-sama benar (MeCab sering memilih bentuk lain)
OK_ALT = {
    '私': {'わたし', 'わたくし'},
    '日本': {'にほん', 'にっぽん'},
    '何': {'なに', 'なん'},
    '今日': {'きょう', 'こんにち'},
    '一日': {'いちにち', 'ついたち'},
    '方': {'かた', 'ほう'},
    '後': {'あと', 'ご', 'のち', 'うしろ'},
    '中': {'なか', 'ちゅう', 'じゅう'},
    '上手': {'じょうず', 'うわて'},
    '下手': {'へた', 'したて'},
    '大人': {'おとな', 'たいじん'},
    '昨日': {'きのう', 'さくじつ'},
    '明日': {'あした', 'あす', 'みょうにち'},
    '一人': {'ひとり', 'いちにん'},
    '二人': {'ふたり', 'ににん'},
    '白髪': {'しらが', 'はくはつ'},
    '日本語': {'にほんご'},
    '日本人': {'にほんじん'},
    '富士山': {'ふじさん'},
    '辛い': {'からい', 'つらい'},
    '辛く': {'からく', 'つらく'},
    '何時': {'なんじ', 'いつ'},
    '国': {'くに', 'こく'},
    '誕生日': {'たんじょうび'},
    '四月': {'しがつ'},
    '下': {'した', 'もと', 'しも'},
}
# Pola yang hampir selalu kesalahan MeCab: 〜曜日 (び), angka + 時/歳/分
OK_RE = [
    (re.compile(r'曜日$'), lambda exp, got: exp.endswith('ようび') and got.endswith('ようひ')),
    (re.compile(r'^[一二三四五六七八九十百千]+[時歳分]$'), lambda exp, got: True),
]

tagger = fugashi.Tagger()


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


def norm(s):
    return re.sub(r'[^\u3041-\u3096ー]', '', hira(s))


def segments(text):
    """[(teks, bacaan atau None)], bacaan hanya untuk grup ruby."""
    out, last = [], 0
    for m in RUBY.finditer(text):
        if m.start() > last:
            out.append((text[last:m.start()], None))
        out.append((m.group(1), m.group(2)))
        last = m.end()
    if last < len(text):
        out.append((text[last:], None))
    return out


def check_sentence(raw):
    """Kembalikan daftar masalah untuk satu kalimat (sudah tanpa penanda +/~ dan spasi)."""
    probs = []
    segs = segments(raw)
    plain = ''.join(t for t, _ in segs)
    # kanji tanpa furigana
    for t, r in segs:
        if r is None and KANJI.search(t):
            probs.append(f'tanpa furigana: {t}')
    # peta posisi -> (indeks grup ruby atau -1)
    owner, pos, ruby = [], 0, []
    for t, r in segs:
        if r is None:
            owner += [-1] * len(t)
        else:
            owner += [len(ruby)] * len(t)
            ruby.append((pos, pos + len(t), t, r))
        pos += len(t)
    toks, p = [], 0
    for w in tagger(plain):
        s = plain.find(w.surface, p)
        if s < 0:
            continue
        kana = w.feature.kana if w.feature.kana and w.feature.kana != '*' else w.surface
        toks.append((s, s + len(w.surface), kana))
        p = s + len(w.surface)
    # batas klaster = batas token MeCab yang tidak jatuh di tengah grup ruby
    bounds = {0, len(plain)}
    for s, e, _ in toks:
        for b in (s, e):
            if b == 0 or b == len(plain) or owner[b - 1] == -1 or owner[b - 1] != owner[b]:
                bounds.add(b)
    bounds = sorted(bounds)
    for a, b in zip(bounds, bounds[1:]):
        groups = [g for g in ruby if g[0] >= a and g[1] <= b]
        if not groups:
            continue
        exp, i = '', a
        while i < b:
            g = next((g for g in ruby if g[0] == i), None)
            if g:
                exp += g[3]
                i = g[1]
            else:
                exp += plain[i]
                i += 1
        got = ''.join(k for s, e, k in toks if s >= a and e <= b)
        if norm(exp) == norm(got):
            continue
        word = plain[a:b]
        if any(word == w and norm(exp) in alts for w, alts in OK_ALT.items()):
            continue
        if any(rx.search(word) and ok(norm(exp), norm(got)) for rx, ok in OK_RE):
            continue
        probs.append(f'{word}: furigana={norm(exp)} mecab={norm(got)}')
    return probs


def sentences(path):
    """Ambil teks Jepang dari file materi (cerita / tata bahasa)."""
    for no, ln in enumerate(open(path, encoding='utf-8'), 1):
        s = ln.strip()
        if not s or s.startswith('#') or s == '--' or s.startswith(('q:', 'pola:', 'info:', 'opts:')):
            continue
        if s.startswith('ex:'):
            s = s[3:]
        jp = s.split('||')[0]
        toks = [t[1:] if t[:1] in '+~' else t for t in jp.split()]
        if toks and toks[0].startswith('@'):
            toks = toks[1:]
        yield no, ''.join(toks)


def main():
    files = sys.argv[1:] or [os.path.join(ROOT, 'content', f) for f in ('cerita.txt', 'cerita_panjang.txt', 'tata_bahasa.txt')]
    total = 0
    for f in files:
        if not os.path.exists(f):
            continue
        for no, text in sentences(f):
            for pr in check_sentence(text):
                total += 1
                print(f'{os.path.basename(f)}:{no}: {pr}')
    print(f'{total} catatan')


if __name__ == '__main__':
    main()
