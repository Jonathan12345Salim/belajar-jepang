#!/usr/bin/env python3
"""Membuat ikon & splash Android dari goresan KanjiVG huruf あ (butuh Pillow).

Jalankan: python3 scripts/make_icons.py
"""
import json
import os
import re

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
RED = (217, 61, 85)
WHITE = (255, 255, 255)

TOKEN = re.compile(r'[MmCcSsLlZz]|-?\d*\.?\d+(?:e-?\d+)?')


def parse(d):
    """Path SVG (M, C, S, L, Z) -> daftar polyline (koordinat 0..109)."""
    toks = TOKEN.findall(d)
    i = 0
    cur = (0.0, 0.0)
    start = cur
    last_ctrl = None
    cmd = None
    lines, pts = [], []

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    def bez(p0, p1, p2, p3, n=24):
        out = []
        for k in range(1, n + 1):
            t = k / n
            mt = 1 - t
            out.append((
                mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
                mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1],
            ))
        return out

    while i < len(toks):
        if re.fullmatch(r'[A-Za-z]', toks[i]):
            cmd = toks[i]
            i += 1
            if cmd in 'Zz':
                pts.append(start)
                cur = start
                continue
        rel = cmd.islower()
        c = cmd.upper()
        ox, oy = cur if rel else (0, 0)
        if c == 'M':
            if pts:
                lines.append(pts)
            cur = (ox + num(), oy + num())
            start = cur
            pts = [cur]
            cmd = 'l' if rel else 'L'
            last_ctrl = None
        elif c == 'L':
            cur = (ox + num(), oy + num())
            pts.append(cur)
            last_ctrl = None
        elif c == 'C':
            p1 = (ox + num(), oy + num())
            p2 = (ox + num(), oy + num())
            p3 = (ox + num(), oy + num())
            pts += bez(cur, p1, p2, p3)
            last_ctrl, cur = p2, p3
        elif c == 'S':
            p1 = (2 * cur[0] - last_ctrl[0], 2 * cur[1] - last_ctrl[1]) if last_ctrl else cur
            p2 = (ox + num(), oy + num())
            p3 = (ox + num(), oy + num())
            pts += bez(cur, p1, p2, p3)
            last_ctrl, cur = p2, p3
        else:
            raise ValueError('perintah path tidak didukung: ' + cmd)
    if pts:
        lines.append(pts)
    return lines


def glyph(paths, size, scale, stroke, color, bg=None, radius=0, ss=4):
    S = size * ss
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    if bg:
        if radius:
            dr.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius * ss, fill=bg)
        else:
            dr.rectangle([0, 0, S, S], fill=bg)
    k = S * scale / 109
    off = (S - 109 * k) / 2
    w = max(1, int(stroke * k))
    for d in paths:
        for line in parse(d):
            p = [(off + x * k, off + y * k) for x, y in line]
            dr.line(p, fill=color, width=w)
            r = w / 2
            for x, y in p:
                dr.ellipse([x - r, y - r, x + r, y + r], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def circle_mask(img):
    S = img.size[0]
    m = Image.new('L', (S * 4, S * 4), 0)
    ImageDraw.Draw(m).ellipse([0, 0, S * 4 - 1, S * 4 - 1], fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m.resize(img.size, Image.LANCZOS))
    return out


def main():
    strokes = json.load(open(os.path.join(ROOT, 'public', 'data', 'strokes-kana.json'), encoding='utf-8'))
    paths = strokes['あ']
    dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for name, f in dens.items():
        d = os.path.join(RES, f'mipmap-{name}')
        legacy = int(48 * f)
        fg = int(108 * f)
        glyph(paths, legacy, 0.78, 7, WHITE, RED, radius=int(legacy * 0.18)).save(os.path.join(d, 'ic_launcher.png'))
        circle_mask(glyph(paths, legacy, 0.72, 7, WHITE, RED)).save(os.path.join(d, 'ic_launcher_round.png'))
        glyph(paths, fg, 0.5, 7, WHITE).save(os.path.join(d, 'ic_launcher_foreground.png'))
    with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w') as fh:
        fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#D93D55</color>\n</resources>\n')
    # layar pembuka: latar merah dengan あ putih di tengah
    for root, _, files in os.walk(RES):
        for fn in files:
            if fn == 'splash.png':
                p = os.path.join(root, fn)
                w, h = Image.open(p).size
                s = min(w, h)
                img = Image.new('RGB', (w, h), RED)
                g = glyph(paths, int(s * 0.42), 0.9, 7, WHITE)
                img.paste(g, ((w - g.size[0]) // 2, (h - g.size[1]) // 2), g)
                img.save(p)
    print('ikon & splash dibuat')


if __name__ == '__main__':
    main()
