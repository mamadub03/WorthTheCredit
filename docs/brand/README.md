# worth the cRedIT: logo

Proposed by FE2 (Rameen) for the team to approve. Design canvas with every variant and the earlier directions: https://claude.ai/artifact/QaiuKSDLiGiMM155133TYe (Rameen shares it from its Share menu).

## The idea

The mark is a W made of two checks. The ink half is a check mirrored: a student who took the course. The orange half is a check: you, matched to your goals. Your check rises higher than theirs, because a course with a lower Community Worth Score can still be your strongest personal match. Together they spell Worth, and the W can sit next to every Worth Score in the app.

The wordmark keeps the pun from the first round: RIT hides in cRedIT. It is set in Fraunces Bold, with R, I and T in the app's accent. One typeface and one color carry the pun, so it reads as a wink rather than as RIT's own logo.

## Colors

| Use | Hex | Source |
|---|---|---|
| Ink | `#1c1917` | FE1's `--text` (#33) |
| Orange on light | `#c2410c` | FE1's `--accent` (#33) |
| Cream ground | `#faf7f2` | FE1's `--bg` (#33) |
| Orange on dark | `#f97316` | new, only for dark backgrounds |

## Files

- `svg/wtc-logo-horizontal.svg`: the primary lockup (mark + wordmark). `-on-dark`, `-mono-ink` and `-mono-white` versions beside it.
- `svg/wtc-logo-stacked.svg` and `-on-dark`: the masthead lockup for slides, the README and Devpost.
- `svg/wtc-mark.svg`, `-on-dark`, `-mono-ink`, `-mono-white`: the W alone.
- `svg/favicon.svg`: adapts to the browser theme (ink becomes cream in dark tabs). No gap between the checks at this size.
- `svg/wtc-app-icon.svg` (ink tile, the primary icon), `-cream`, `-orange`.
- `svg/wtc-seal.svg`: sticker and social avatar ("WORTH THE CREDIT / BY STUDENTS, FOR STUDENTS").
- `png/`: `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180), `icon-192.png` and `icon-512.png` (full bleed, safe for maskable), 2x PNGs of the lockups, the mark at 512, the app icon and seal at 1024, and `og-image.png` (1200 x 630, link previews).

All text is outlined, so no file needs a font installed.

## Wiring it into the frontend

`frontend/index.html`, `frontend/public/` and the header belong to FE1 (Grace), so this is a suggestion, not a change. Copy `svg/favicon.svg`, `png/favicon.ico`, `png/apple-touch-icon.png` and `png/og-image.png` into `frontend/public/`, then:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:image" content="/og-image.png" />
```

In the header, use `svg/wtc-logo-horizontal.svg` as an `<img>` about 24 px tall with `alt="worth the cRedIT"`. Below about 360 px of header width, the mark alone works.

## Rules

- Clear space: the height of the wordmark's lowercase c on every side; for the mark alone, a quarter of its width.
- Minimum size: lockup 120 px wide on screen, mark 16 px.
- Keep R, I and T in orange and everything else in ink (or cream on dark). Don't retype the wordmark in live text; use the files.
- On dark backgrounds use the `-on-dark` files. Don't stretch, rotate or outline the logo.

## Regenerating

`source/` builds every file from one geometry definition (`wtc_logo.py`: the five points and stroke of the W). It needs Python with `fonttools`, `uharfbuzz` and `shapely`, Fraunces Bold and Inter (both SIL Open Font License; set `WTC_FRAUNCES` and `WTC_INTER` if they aren't in `~/Library/Fonts`), and Google Chrome for the PNGs (`WTC_CHROME` for another path). From `docs/brand/source/`:

```bash
python3 build.py out && python3 render_pngs.py out /tmp/wtc-render
```
