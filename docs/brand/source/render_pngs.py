# AI-GENERATED (Claude Code, Claude Opus 5.5): WorthTheCredit logo generator. See docs/ai-contributions.md.
"""Rasterize the pack's PNG jobs with headless Chrome (exact SVG rendering, alpha kept)."""
import json
import os
import subprocess
import sys
from pathlib import Path

PACK = Path(sys.argv[1])
SCRATCH = Path(sys.argv[2])
CHROME = os.environ.get("WTC_CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
jobs = json.loads((PACK / "_jobs.json").read_text())
tmp = SCRATCH / "render-tmp"
tmp.mkdir(parents=True, exist_ok=True)

for out, src, w, h, transparent in jobs:
    page = tmp / (out + ".html")
    bg = "transparent" if transparent else "#ffffff"
    page.write_text(
        f'<!doctype html><html><head><meta charset="utf-8"><style>html,body{{margin:0;background:{bg}}}'
        f'img{{display:block;width:{w}px;height:{h}px}}</style></head>'
        f'<body><img src="file://{PACK / "svg" / src}"></body></html>')
    dest = PACK / "png" / out
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={SCRATCH / 'chrome-prof'}", "--force-device-scale-factor=1",
                    "--default-background-color=00000000", f"--window-size={w},{h}",
                    f"--screenshot={dest}", f"file://{page}"],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    print(out, dest.stat().st_size if dest.exists() else "MISSING")

# favicon.ico from the 16/32/48 renders (ImageMagick), then drop the build temporaries
ico = [PACK / "png" / f"_ico-{n}.png" for n in (16, 32, 48)]
if all(p.exists() for p in ico):
    subprocess.run(["magick", *map(str, ico), str(PACK / "png" / "favicon.ico")], check=False)
    for p in ico:
        p.unlink()
for tmp_svg in ("_touch.svg", "_mask.svg", "_ico.svg"):
    (PACK / "svg" / tmp_svg).unlink(missing_ok=True)
(PACK / "_jobs.json").unlink(missing_ok=True)
