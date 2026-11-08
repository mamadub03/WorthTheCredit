# AI-GENERATED (Claude Code, Claude Opus 5.5): WorthTheCredit logo generator. See docs/ai-contributions.md.
"""WorthTheCredit logo: final geometry and lockups, as outlined SVG.

The mark is a W drawn as two checks. The left half (ink) is a check mirrored:
the student who took the course. The right half (orange) is a check: you.
Your check rises higher than theirs, because the match is personal.

Strokes are emitted as filled outlines (each segment a stadium: two lines and
two exact arcs, all clockwise), so the files need no stroke support and
scale cleanly. Overlapping subpaths union under the default nonzero rule.
"""
from __future__ import annotations

import math

from wtc_type import FRAUNCES, INTER, Run, on_circle, fmt

INK, MUTED, CREAM, BORDER, SURFACE = "#1c1917", "#57534e", "#faf7f2", "#e7e0d6", "#ffffff"
ORANGE = "#c2410c"        # FE1's --accent: light backgrounds
ORANGE_DARK = "#f97316"   # on ink and dark backgrounds

# Mark geometry on a 100 grid: centerline points and stroke width.
P = [(13.0, 31.0), (31.5, 83.0), (49.0, 51.5), (66.5, 83.0), (89.0, 12.0)]
SW = 15.0
GAP = 2.4  # knockout between the two checks where the orange crosses the ink

# Outline bounds of the mark (ink extents) on the 100 grid
XMIN = min(x for x, _ in P) - SW / 2
XMAX = max(x for x, _ in P) + SW / 2
YMIN = min(y for _, y in P) - SW / 2
YMAX = max(y for _, y in P) + SW / 2


def stadium(a, b, r) -> str:
    """Clockwise outline of a segment a-b with round caps of radius r (y down)."""
    (x0, y0), (x1, y1) = a, b
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    nx, ny = -dy / L * r, dx / L * r  # left normal (screen), scaled
    # go along the right side a->b, arc around b, back along the left side, arc around a
    p1 = (x0 - nx, y0 - ny)
    p2 = (x1 - nx, y1 - ny)
    p3 = (x1 + nx, y1 + ny)
    p4 = (x0 + nx, y0 + ny)
    f = fmt
    d = (f"M{f(p1[0])} {f(p1[1])} L{f(p2[0])} {f(p2[1])} "
         f"A{f(r)} {f(r)} 0 0 1 {f(p3[0])} {f(p3[1])} "
         f"L{f(p4[0])} {f(p4[1])} A{f(r)} {f(r)} 0 0 1 {f(p1[0])} {f(p1[1])} Z")
    # make sure it is clockwise on screen: check signed area of the polygon p1..p4
    pts = [p1, p2, p3, p4]
    area = sum(pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1] for i in range(4))
    if area < 0:  # flip by tracing the other way
        d = (f"M{f(p4[0])} {f(p4[1])} L{f(p3[0])} {f(p3[1])} "
             f"A{f(r)} {f(r)} 0 0 1 {f(p2[0])} {f(p2[1])} "
             f"L{f(p1[0])} {f(p1[1])} A{f(r)} {f(r)} 0 0 1 {f(p4[0])} {f(p4[1])} Z")
    return d


def _xf(pt, s, ox, oy):
    return (ox + pt[0] * s, oy + pt[1] * s)


def _ink_knocked(pts, r, g) -> str:
    """Ink half minus a channel around the orange's first stroke, as plain path data.

    Computed as real geometry (no SVG mask) so the files work in favicons,
    Figma, Illustrator and CSS masks alike. Arcs are sampled at 128 steps per
    circle, which stays within a twentieth of a pixel at 2000 px.
    """
    from shapely.geometry import LineString
    ink = LineString(pts[0:3]).buffer(r, quad_segs=32, cap_style="round", join_style="round")
    cut = LineString(pts[2:4]).buffer(r + g, quad_segs=32, cap_style="round", join_style="round")
    shape = ink.difference(cut)
    geoms = getattr(shape, "geoms", [shape])
    out = []
    for poly in geoms:
        for ring in [poly.exterior, *poly.interiors]:
            c = list(ring.coords)[:-1]
            out.append("M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in c) + " Z")
    return " ".join(out)


def mark_paths(ink=INK, hot=ORANGE, s=1.0, ox=0.0, oy=0.0, knockout=True, cls=False, uid="k"):
    """SVG elements for the mark, scaled by s and offset so grid (0,0) lands at (ox, oy).

    knockout=True cuts a GAP channel out of the ink where the orange check
    crosses it, so the two checks read as two layers even in one color.
    """
    pts = [_xf(p, s, ox, oy) for p in P]
    r = SW / 2 * s
    if knockout:
        left = _ink_knocked(pts, r, GAP * s)
    else:
        left = stadium(pts[0], pts[1], r) + " " + stadium(pts[1], pts[2], r)
    right = stadium(pts[2], pts[3], r) + " " + stadium(pts[3], pts[4], r)
    ink_attr = 'class="ink"' if cls else f'fill="{ink}"'
    hot_attr = 'class="hot"' if cls else f'fill="{hot}"'
    return f'<path {ink_attr} d="{left}"/><path {hot_attr} d="{right}"/>'


def mark_svg(size=None, ink=INK, hot=ORANGE, pad=0.0, knockout=True, tile=None, tile_border=None,
             tile_scale=0.70, label="worth the cRedIT", uid="k", extra_style="", tile_rx=22.5):
    """Square mark SVG (viewBox 0 0 100 100), centered on its ink box."""
    inner = ""
    if tile:
        inner += f'<rect width="100" height="100" rx="{tile_rx}" fill="{tile}"/>'
        if tile_border:
            inner += (f'<rect x="0.75" y="0.75" width="98.5" height="98.5" rx="21.75" fill="none" '
                      f'stroke="{tile_border}" stroke-width="1.5"/>')
        s = tile_scale
    else:
        s = (100 - 2 * pad) / max(XMAX - XMIN, YMAX - YMIN)
    w, h = (XMAX - XMIN) * s, (YMAX - YMIN) * s
    ox = (100 - w) / 2 - XMIN * s
    oy = (100 - h) / 2 - YMIN * s
    inner += mark_paths(ink, hot, s, ox, oy, knockout=knockout, uid=uid)
    wh = f'width="{size}" height="{size}" ' if size else ""
    return (f'<svg {wh}viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="{label}" style="{extra_style}">{inner}</svg>')


def favicon_svg(knockout=False):
    """Adaptive favicon: ink swaps to cream when the browser is dark."""
    s = 100 / max(XMAX - XMIN, YMAX - YMIN)
    w, h = (XMAX - XMIN) * s, (YMAX - YMIN) * s
    ox = (100 - w) / 2 - XMIN * s
    oy = (100 - h) / 2 - YMIN * s
    body = mark_paths(s=s, ox=ox, oy=oy, knockout=knockout, cls=True, uid="fk")
    style = (f"<style>.ink{{fill:{INK}}}.hot{{fill:{ORANGE}}}"
             f"@media (prefers-color-scheme:dark){{.ink{{fill:{CREAM}}}.hot{{fill:{ORANGE_DARK}}}}}</style>")
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{style}{body}</svg>'


# ---------------- wordmark ----------------
WORD = "worth the cRedIT"
HOT_IDX = (11, 14, 15)  # R, I, T


def word_run(size, ink=INK, hot=ORANGE, text=WORD, hot_idx=HOT_IDX, tracking=-0.006, kern=None):
    if kern is None and text == WORD:
        kern = {5: -0.03, 9: -0.03}  # logotype word spaces, a touch tighter than text
    return Run(text, path=FRAUNCES, size=size, tracking=tracking, kern=kern,
               colors={i: hot for i in hot_idx}, default=ink)


def lockup_h(size=100, ink=INK, hot=ORANGE, bg=None, mark_k=1.42, gap=0.36, pad=0.22, knockout=True,
             uid="kh", label="worth the cRedIT", kern=None):
    """Horizontal lockup: mark (height = mark_k x cap height) + one-line wordmark.

    The mark's base sits on the baseline; its top rises above the cap height.
    Returns (svg, w, h).
    """
    r = word_run(size, ink, hot, kern=kern)
    x0, y0, x1, y1 = r.bounds
    cap = r.cap
    mh = cap * mark_k
    s = mh / (YMAX - YMIN)
    p = size * pad
    top_ink = max(mh, y1)
    base = p + top_ink
    mx = p - XMIN * s
    my = base - YMAX * s + cap * 0.02  # round valley overshoots the baseline, like the o and e
    mw = (XMAX - XMIN) * s
    tx = p + mw + size * gap - x0
    W = tx + x1 + p
    H = base - y0 + p
    inner = (f'<rect width="{fmt(W)}" height="{fmt(H)}" fill="{bg}"/>' if bg else "")
    inner += mark_paths(ink, hot, s, mx, my, knockout=knockout, uid=uid) + r.paths(tx, base)
    svg = (f'<svg viewBox="0 0 {fmt(W)} {fmt(H)}" xmlns="http://www.w3.org/2000/svg" role="img" '
           f'aria-label="{label}">{inner}</svg>')
    return svg, W, H


def lockup_stack(size=200, ink=INK, hot=ORANGE, bg=None, knockout=True, uid="ks", mark_k=1.5, pad=0.2):
    big = Run("cRedIT", path=FRAUNCES, size=size, tracking=-0.012, colors={1: hot, 4: hot, 5: hot}, default=ink)
    small = Run("worth the", path=FRAUNCES, size=size * 0.36, tracking=0.0, kern={5: -0.03}, default=ink)
    bx0, by0, bx1, by1 = big.bounds
    sx0, sy0, sx1, sy1 = small.bounds
    mh = big.cap * mark_k
    s = mh / (YMAX - YMIN)
    p = size * pad
    W = (bx1 - bx0) + 2 * p
    cx = W / 2
    y = p
    mark = mark_paths(ink, hot, s, cx - (XMIN + XMAX) / 2 * s, y - YMIN * s, knockout=knockout, uid=uid)
    y += mh + size * 0.15
    s_base = y + sy1
    big_base = s_base - sy0 + size * 0.05 + by1
    H = big_base - by0 + p
    inner = (f'<rect width="{fmt(W)}" height="{fmt(H)}" fill="{bg}"/>' if bg else "")
    inner += mark + small.paths(cx - (sx0 + sx1) / 2, s_base) + big.paths(p - bx0, big_base)
    svg = (f'<svg viewBox="0 0 {fmt(W)} {fmt(H)}" xmlns="http://www.w3.org/2000/svg" role="img" '
           f'aria-label="worth the cRedIT">{inner}</svg>')
    return svg, W, H


def seal_svg(bg=CREAM, ring=INK, hot=ORANGE, top="WORTH THE CREDIT", bottom="BY STUDENTS, FOR STUDENTS",
             uid="kseal", size=None):
    cx = cy = 100
    inner = f'<circle cx="{cx}" cy="{cy}" r="97" fill="{bg}"/>'
    inner += f'<circle cx="{cx}" cy="{cy}" r="92.5" fill="none" stroke="{ring}" stroke-width="2.6"/>'
    inner += f'<circle cx="{cx}" cy="{cy}" r="61.5" fill="none" stroke="{ring}" stroke-width="1.4"/>'
    t, tsweep = on_circle(top, cx, cy, 70.5, 0, 16.0, path=INTER, axes={"wght": 700, "opsz": 32},
                          tracking=0.16, color=ring)
    b, bsweep = on_circle(bottom, cx, cy, 82.5, 180, 11.0, path=INTER, axes={"wght": 650, "opsz": 32},
                          tracking=0.13, color=ring, bottom=True)
    inner += t + b
    for ang in (-90, 90):
        th = math.radians(ang)
        inner += (f'<circle cx="{fmt(cx + 76.5 * math.sin(th))}" cy="{fmt(cy - 76.5 * math.cos(th))}" '
                  f'r="2.7" fill="{hot}"/>')
    s = 0.74
    w, h = (XMAX - XMIN) * s, (YMAX - YMIN) * s
    inner += mark_paths(ring, hot, s, cx - w / 2 - XMIN * s, cy - h / 2 - YMIN * s + 1.0, uid=uid)
    wh = f'width="{size}" height="{size}" ' if size else ""
    return (f'<svg {wh}viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" '
            f'aria-label="worth the credit seal">{inner}</svg>'), (tsweep, bsweep)
