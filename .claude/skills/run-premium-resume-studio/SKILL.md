---
name: run-premium-resume-studio
description: >-
  Build, render, and visually QA a Premium Resume Studio résumé. Use to run,
  launch, build, render, screenshot, preview, or score a resume/CV from this
  repo, to check a design looks CEO-grade, or to verify a change to the
  renderer/templates/council. Drives the CLI with driver.mjs, which renders the
  chosen design, auto-fits it, writes a PNG of every A4 page to look at, and
  prints the Model Council score.
---

# Run Premium Resume Studio

This project is a **CLI/library** (Node + Playwright/Chromium) that turns a JSON
profile into a designed PDF résumé, picking one of **138 designs** by context.
The interesting surface is the *rendered page*, so the driver renders it and
writes a **PNG of every page you can actually look at** — that's how you verify
quality and that the structure changed, not just the color.

Paths below are relative to the repo root. The driver self-locates the repo, so
you can run it from anywhere.

## Prerequisites (once)

```bash
./install.sh          # installs Playwright + reuses the container's Chromium
```
If Chromium is already provisioned (e.g. `/opt/pw-browsers`), `install.sh` reuses
it; `scripts/lib/browser.js` finds it, no download.

## Run (agent path) — render + screenshot + score

```bash
node .claude/skills/run-premium-resume-studio/driver.mjs --profile profile/sourabh.json
```
Writes to `.claude/skills/run-premium-resume-studio/out/`:
- `resume.pdf`
- `resume-p1.png`, `resume-p2.png`, … — **one PNG per A4 page — open these and look**
- `summary.json` — design chosen, page count, council score + persona scores

Prints, e.g.:
```
Design : #7 Graphite Azure Executive  [executive · graphite-azure · sans]
Pages  : 2   Fit: fill 1.87
Council: 88.6/100  PASS   (Executive 85 · ATS 91 · Domain 86 · Design 97 · Hiring 87)
Look   : …/out/resume-p1.png  …/out/resume-p2.png
```

### Prove the design actually changes (not just recolored)

```bash
node .claude/skills/run-premium-resume-studio/driver.mjs --variant 1 --out /tmp/v1   # executive (left sidebar)
node .claude/skills/run-premium-resume-studio/driver.mjs --variant 2 --out /tmp/v2   # header-band (top hero)
node .claude/skills/run-premium-resume-studio/driver.mjs --variant 3 --out /tmp/v3   # sidebar-right
node .claude/skills/run-premium-resume-studio/driver.mjs --variant 4 --out /tmp/v4   # single column
```
Consecutive variants are different **layout families** (structure), then cycle
palettes/typography. Open the PNGs side by side to confirm.

### Driver options

```
--profile <path>   profile JSON            (default: profile/sourabh.json)
--context "<text>" steer design from the user's words ("minimalist", "bold navy one-pager")
--design <id|n>    force a catalog design  (e.g. --design header-band-ocean-coral-sans)
--variant <n>      Nth structurally-different design (1 = best fit)
--random           random on-brand design
--archetype <key>  override archetype
--out <dir>        output dir              (default: <skill>/out)
--scale <n>        screenshot device scale (default 1.4)
```

## Direct invocation (the product CLI)

The driver wraps `scripts/build_resume.js`, which is the real entry point and
also emits DOCX/ODT/ATS:

```bash
node scripts/build_resume.js --profile profile/sourabh.json --out out.pdf --all
node scripts/build_resume.js --list-designs        # all 138
node scripts/lib/council.js  --profile profile/sourabh.json   # score only
```

## Test

```bash
node -e "for(const m of ['helpers','themes','classify','council','fit','design/catalog','design/select']) require('./scripts/lib/'+m); console.log('modules OK')"
```

## Gotchas (things that actually bit me)

- **Screenshots below the fold need a tall viewport.** Playwright `clip` only
  captures within the viewport, so per-page clips at `y=1122.5` return "0 height"
  until you `setViewportSize({height: fullContentHeight})`. The driver does this
  after measuring the fitted `.sheet` height.
- **A4 = 1122.5px at 96 dpi.** Page count is `ceil((contentHeight-6)/1122.5)`; the
  `-6`/`<4` guards avoid a blank trailing page from sub-pixel rounding.
- **PDF rasterizers choke on this CSS.** `pdfjs-dist` throws on the sidebar
  gradient/tiling patterns (`Unsupported ShadingType`), so the driver screenshots
  the **rendered HTML** (Chromium handles the gradients) rather than the PDF.
- **Auto-fit runs before screenshotting**, so the PNGs match the PDF: content is
  densified onto fewer pages or spacing expanded to fill — no blank tail.
- **`--score-only` still writes DOCX/ODT** in `build_resume.js` (they don't need
  Chromium); only the PDF is skipped.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `playwright module not found` | run `./install.sh` |
| `Executable doesn't exist … chromium_headless_shell-XXXX` | version drift — `scripts/lib/browser.js` finds the installed build; ensure `PLAYWRIGHT_BROWSERS_PATH` points at it (`/opt/pw-browsers`) |
| `Cannot take screenshot with 0 height` | you're clipping below the viewport — grow it to full content height first (the driver already does) |
| Blank/short last PNG | rounding tail; the driver skips pages with `<4px` remaining |
