# AI-GENERATED (Claude Code, Claude Opus 5.5): WorthTheCredit logo generator. See docs/ai-contributions.md.
"""Outline text to SVG paths (harfbuzz shaping + fontTools outlines).

Everything a logo needs to be font-independent: each glyph becomes a <path>,
colored per character, positioned with the font's own kerning.
"""
from __future__ import annotations

import io
import math
import os

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# Font files (SIL Open Font License). Override with WTC_FRAUNCES / WTC_INTER.
FRAUNCES = os.path.expanduser(os.environ.get("WTC_FRAUNCES", "~/Library/Fonts/Fraunces-Bold.ttf"))
INTER = os.path.expanduser(os.environ.get("WTC_INTER", "~/Library/Fonts/Inter[opsz,wght].ttf"))

_cache: dict = {}


def load(path: str, axes: dict | None = None):
    key = (path, tuple(sorted((axes or {}).items())))
    if key in _cache:
        return _cache[key]
    tt = TTFont(path)
    if axes and "fvar" in tt:
        tt = instantiateVariableFont(tt, axes, updateFontNames=False)
    buf = io.BytesIO()
    tt.save(buf)
    data = buf.getvalue()
    tt = TTFont(io.BytesIO(data))
    hbf = hb.Font(hb.Face(data))
    _cache[key] = (tt, hbf)
    return tt, hbf


def fmt(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Run:
    """One line of text in one font, outlined.

    tracking is in em; kern maps a character index to extra space (em) added
    after that character, for hand-kerning a wordmark.
    """

    def __init__(self, text, path=FRAUNCES, size=100.0, axes=None,
                 tracking=0.0, kern=None, colors=None, default="#1c1917",
                 features=None):
        self.text = text
        self.size = size
        self.tt, hbf = load(path, axes)
        upm = self.tt["head"].unitsPerEm
        self.scale = size / upm
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(hbf, buf, features or {"kern": True, "liga": False})
        order = self.tt.getGlyphOrder()
        self.glyphs = []  # (glyphName, x_px, y_px, charIndex)
        x = 0.0
        n = len(buf.glyph_infos)
        for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
            g = order[info.codepoint]
            self.glyphs.append((g, x + pos.x_offset * self.scale, pos.y_offset * self.scale, info.cluster))
            x += pos.x_advance * self.scale
            if i < n - 1:
                x += tracking * size
                if kern and info.cluster in kern:
                    x += kern[info.cluster] * size
        self.advance = x
        self.colors = colors or {}
        self.default = default
        gs = self.tt.getGlyphSet()
        # ink bounds (px, y up) across glyphs
        bp = BoundsPen(gs)
        for g, gx, gy, _ in self.glyphs:
            tp = TransformPen(bp, (self.scale, 0, 0, self.scale, gx, gy))
            gs[g].draw(tp)
        self.bounds = bp.bounds or (0, 0, 0, 0)  # xmin, ymin, xmax, ymax (y up)
        os2 = self.tt["OS/2"]
        self.cap = os2.sCapHeight * self.scale
        self.xh = os2.sxHeight * self.scale

    def color_of(self, ci: int) -> str:
        return self.colors.get(ci, self.default)

    def paths(self, x0: float, baseline: float, merge=True) -> str:
        """SVG markup with the run's baseline at (x0, baseline), y down."""
        gs = self.tt.getGlyphSet()
        by_color: dict[str, list[str]] = {}
        for g, gx, gy, ci in self.glyphs:
            pen = SVGPathPen(gs, ntos=fmt)
            tp = TransformPen(pen, (self.scale, 0, 0, -self.scale, x0 + gx, baseline - gy))
            gs[g].draw(tp)
            d = pen.getCommands()
            if d:
                by_color.setdefault(self.color_of(ci), []).append(d)
        if merge:
            return "".join(f'<path fill="{c}" d="{" ".join(ds)}"/>' for c, ds in by_color.items())
        return "".join(f'<path fill="{c}" d="{d}"/>' for c, ds in by_color.items() for d in ds)

    def width_ink(self) -> float:
        return self.bounds[2] - self.bounds[0]


def on_circle(text, cx, cy, r, center_deg, size, path=INTER, axes=None,
              tracking=0.12, color="#1c1917", bottom=False):
    """Set text along a circle, centered on center_deg (0 = top, clockwise).

    Top text (bottom=False): baseline on radius r, letters grow outward,
    reading clockwise. Bottom text (bottom=True): baseline on radius r,
    letters grow inward (toward the center), reading counter-clockwise, so
    both arcs read upright left to right. Returns (svg, sweep_deg).
    """
    run = Run(text, path=path, size=size, axes=axes, tracking=tracking, default=color)
    gs = run.tt.getGlyphSet()
    sweep = math.degrees(run.advance / r)
    sc = run.scale
    out = []
    for g, gx, gy, ci in run.glyphs:
        adv = run.tt["hmtx"][g][0] * sc
        mid = gx + adv / 2
        if not bottom:
            ang = center_deg - sweep / 2 + math.degrees(mid / r)
        else:
            ang = center_deg + sweep / 2 - math.degrees(mid / r)
        th = math.radians(ang)
        c, s = math.cos(th), math.sin(th)
        px, py = cx + r * s, cy - r * c
        if not bottom:
            # advance along clockwise tangent (c, s); glyph up = outward (s, -c)
            a, b, cc, d = c * sc, s * sc, s * sc, -c * sc
        else:
            # advance along counter-clockwise tangent (-c, -s); glyph up = inward (-s, c)
            a, b, cc, d = -c * sc, -s * sc, -s * sc, c * sc
        uc = (adv / 2) / sc  # glyph center, font units
        pen = SVGPathPen(gs, ntos=fmt)
        tp = TransformPen(pen, (a, b, cc, d, px - a * uc, py - b * uc))
        gs[g].draw(tp)
        dd = pen.getCommands()
        if dd:
            out.append(dd)
    return f'<path fill="{color}" d="{" ".join(out)}"/>', sweep
