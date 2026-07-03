# Design system

The visual layer is a small, disciplined design system: **design tokens** (themes) +
**components** + **archetype templates**. "Premium" here means real CSS — gradients, grid,
icons, pills, shadows — printed to A4 by headless Chromium, not a flat text dump.

## Principles

- **Colorful but sober.** Deep, saturated accents (gold, emerald, teal, crimson) on clean
  white space. Rich, never neon. One accent family per resume.
- **Hierarchy first.** A strong name, a one-line role, a data-driven metric strip, then
  scannable sections with consistent rules and iconography.
- **Print-perfect.** A4 page size, mm units, `break-inside: avoid` on sections,
  `print-background` on. Two pages for executives, one for freshers, up to four for academics.
- **Data-driven.** No hard-coded numbers. The metric strip is mined from the profile
  (`deriveMetrics`) or supplied via the `metrics` field.

## Themes (`scripts/lib/themes.js`)

Each theme is a token set consumed as CSS custom properties (`--accent`, `--side-from`,
`--ink`, …). Nine ship today:

| Key | Feel | Default for |
|-----|------|-------------|
| `midnight-gold` | navy + warm gold | executive |
| `royal-emerald` | emerald + antique gold | executive alt |
| `sapphire-teal` | sapphire + teal | general |
| `burgundy-rose` | wine + rose gold | distinguished |
| `graphite-azure` | charcoal + electric azure | technical |
| `plum-coral` | plum + coral | creative |
| `teal-sunrise` | teal + warm orange | fresher |
| `academic-navy` | navy + restrained crimson | academic |
| `slate-mono` | monochrome | ATS / print-safe |

Add one by dropping a new entry in `THEMES` (copy a token set, swap the hexes, set
`accentRGB` to the accent's `r,g,b`). Then `--theme <key>` uses it anywhere.

## Templates (`scripts/lib/templates/`)

- `_components.js` — shared base CSS, inline SVG icon set, pills, contact block, the doc shell.
- `executive.js` — two-column, monogram sidebar, metric strip, venture timeline, product
  cards, "Earlier Career" strip. CEO-grade.
- `academic.js` — slim rail + single CV column, serif headings, numbered publications,
  grants/teaching/presentations.
- `fresher.js` — hero band, strengths spotlight, leveled skill bars, projects grid, timeline
  internships. Built to stand out in a stack.
- `general.js` — clean two-column; also serves the `technical` variant (skills matrix + tech
  tags).
- `index.js` — archetype → template registry, plus the ATS plain-text exporter.

Templates are pure functions: `render(profile, { theme, classification }) → htmlString`. They
never touch the filesystem or the browser, which keeps them trivial to test and re-skin.

## Fonts

A robust system stack (`Inter → Segoe UI → Helvetica Neue → Liberation Sans`) for body, and a
serif stack (`Georgia → Liberation Serif → Times`) for academic headings. No network fonts, so
rendering is deterministic and offline-safe.

## Re-skinning checklist

1. Pick or add a theme (`--list-themes`).
2. `--theme <key>` on the build command, or set a per-archetype default in
   `ARCHETYPE_THEME`.
3. Structural tweaks (column widths, spacing) live in each template's `css` string.
