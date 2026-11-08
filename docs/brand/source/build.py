# AI-GENERATED (Claude Code, Claude Opus 5.5): WorthTheCredit logo generator. See docs/ai-contributions.md.
"""Build the WorthTheCredit logo pack: SVG masters, a PNG job list, and a preview sheet."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import wtc_logo as L  # noqa: E402
from wtc_type import INTER, Run, fmt  # noqa: E402

PACK = Path(sys.argv[1])
SVG, PNG = PACK / "svg", PACK / "png"
SVG.mkdir(parents=True, exist_ok=True)
PNG.mkdir(parents=True, exist_ok=True)
INK, CREAM, OR, ORD, BORDER = L.INK, L.CREAM, L.ORANGE, L.ORANGE_DARK, L.BORDER
WHITE = "#ffffff"

files = {}


def put(name, svg):
    """Write an export: drop empty attributes and give the file an intrinsic size,
    so slides, design tools and a bare <img> open it at a sensible size.
    Lockups keep their drawn size; square marks, icons and the seal open at 512 px.
    favicon.svg stays size-free, as browsers expect."""
    svg = svg.replace(' style=""', "", 1)
    root = svg.split(">", 1)[0]
    if name != "favicon.svg" and ' width="' not in root:
        vw, vh = (float(v) for v in re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', root).groups())
        if abs(vw - vh) < 1e-6:
            vw = vh = 512
        svg = svg.replace("<svg ", f'<svg width="{fmt(vw)}" height="{fmt(vh)}" ', 1)
    (SVG / name).write_text(svg + "\n")
    files[name] = svg


# Lockups
h, hw, hh = L.lockup_h(uid="h")
put("wtc-logo-horizontal.svg", h)
put("wtc-logo-horizontal-on-dark.svg", L.lockup_h(ink=CREAM, hot=ORD, uid="hd")[0])
put("wtc-logo-horizontal-mono-ink.svg", L.lockup_h(ink=INK, hot=INK, uid="hm")[0])
put("wtc-logo-horizontal-mono-white.svg", L.lockup_h(ink=WHITE, hot=WHITE, uid="hw")[0])
st, sw_, sh_ = L.lockup_stack(uid="s")
put("wtc-logo-stacked.svg", st)
put("wtc-logo-stacked-on-dark.svg", L.lockup_stack(ink=CREAM, hot=ORD, uid="sd")[0])

# Mark
put("wtc-mark.svg", L.mark_svg(uid="m"))
put("wtc-mark-on-dark.svg", L.mark_svg(ink=CREAM, hot=ORD, uid="md"))
put("wtc-mark-mono-ink.svg", L.mark_svg(ink=INK, hot=INK, uid="mm"))
put("wtc-mark-mono-white.svg", L.mark_svg(ink=WHITE, hot=WHITE, uid="mw"))

# Icons
put("wtc-app-icon.svg", L.mark_svg(tile=INK, ink=CREAM, hot=ORD, uid="ai"))
put("wtc-app-icon-cream.svg", L.mark_svg(tile=CREAM, tile_border=BORDER, uid="ac"))
put("wtc-app-icon-orange.svg", L.mark_svg(tile=OR, ink=INK, hot=CREAM, uid="ao"))
put("favicon.svg", L.favicon_svg())
seal, _ = L.seal_svg(uid="se")
put("wtc-seal.svg", seal)

# Platform icons: full-bleed squares (the OS rounds or masks them)
full_touch = L.mark_svg(tile=INK, ink=CREAM, hot=ORD, tile_rx=0, tile_scale=0.70, knockout=True, uid="t1")
full_mask = L.mark_svg(tile=INK, ink=CREAM, hot=ORD, tile_rx=0, tile_scale=0.62, knockout=True, uid="t2")
ico_tile = L.mark_svg(tile=INK, ink=CREAM, hot=ORD, tile_rx=22.5, tile_scale=0.80, knockout=False, uid="t3")

# Social card, 1200x630: horizontal lockup + the app's own meta description
lock = L.lockup_h(size=84, uid="og", pad=0.0)
lw, lh = lock[1], lock[2]
sub = Run("AI-powered, crowdsourced RIT course discovery.", path=INTER, axes={"wght": 500, "opsz": 32},
          size=30, tracking=-0.005, default="#57534e")
sx0, sy0, sx1, sy1 = sub.bounds
og_w, og_h = 1200, 630
gap = 64  # lockup bottom to subtitle baseline
block = lh + gap
lx = (og_w - lw) / 2
ly = (og_h - 14 - block) / 2  # centered above the accent band
sub_x = (og_w - (sx1 - sx0)) / 2 - sx0
inner_lock = lock[0].split(">", 1)[1].rsplit("</svg>", 1)[0]
og = (f'<svg viewBox="0 0 {og_w} {og_h}" width="{og_w}" height="{og_h}" xmlns="http://www.w3.org/2000/svg">'
      f'<rect width="{og_w}" height="{og_h}" fill="{CREAM}"/>'
      f'<g transform="translate({fmt(lx)} {fmt(ly)})">{inner_lock}</g>'
      f'{sub.paths(sub_x, ly + lh + gap)}'
      f'<rect x="0" y="{og_h - 14}" width="{og_w}" height="14" fill="{OR}"/></svg>')
(SVG / "og-image.svg").write_text(og + "\n")

# PNG jobs: (out name, svg markup or file, width, height, transparent)
jobs = [
    ("wtc-logo-horizontal@2x.png", "wtc-logo-horizontal.svg", 1200, round(1200 * hh / hw), True),
    ("wtc-logo-horizontal-on-dark@2x.png", "wtc-logo-horizontal-on-dark.svg", 1200, round(1200 * hh / hw), True),
    ("wtc-logo-stacked@2x.png", "wtc-logo-stacked.svg", 900, round(900 * sh_ / sw_), True),
    ("wtc-mark-512.png", "wtc-mark.svg", 512, 512, True),
    ("wtc-mark-on-dark-512.png", "wtc-mark-on-dark.svg", 512, 512, True),
    ("wtc-app-icon-1024.png", "wtc-app-icon.svg", 1024, 1024, True),
    ("wtc-seal-1024.png", "wtc-seal.svg", 1024, 1024, True),
    ("og-image.png", "og-image.svg", 1200, 630, False),
]
(SVG / "_touch.svg").write_text(full_touch)
(SVG / "_mask.svg").write_text(full_mask)
(SVG / "_ico.svg").write_text(ico_tile)
jobs += [("apple-touch-icon.png", "_touch.svg", 180, 180, False),
         ("icon-192.png", "_mask.svg", 192, 192, False),
         ("icon-512.png", "_mask.svg", 512, 512, False),
         ("_ico-16.png", "_ico.svg", 16, 16, True),
         ("_ico-32.png", "_ico.svg", 32, 32, True),
         ("_ico-48.png", "_ico.svg", 48, 48, True)]
(PACK / "_jobs.json").write_text(json.dumps(jobs))
print(json.dumps({k: len(v) for k, v in files.items()}, indent=0))
print("lockup h", round(hw, 1), round(hh, 1), "stack", round(sw_, 1), round(sh_, 1))
