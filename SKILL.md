---
name: premium-resume-studio
description: Generate a premium, magazine-style PDF resume (two-column dark sidebar, gold accents, stat cards, timeline) from a single JSON profile. Trigger when the user asks for a "stunning", "innovative", "premium", "designer", "magazine-style" resume or CV, or wants a resume that stands out from typical submissions. Reads a structured profile JSON, renders an HTML+CSS design via Playwright/Chromium, outputs an A4 PDF. Works with Claude Code, Gemini CLI, Cursor, and any agent that supports the SKILL.md format.
---

# Premium Resume Studio

A reusable skill for generating premium-looking PDF resumes from a structured
JSON profile. The design is a two-column layout with a deep navy sidebar,
gold/amber accents, monogram, stat cards, timeline markers on the ventures,
and product cards. Built with HTML + CSS + Playwright/Chromium, so the
output is real CSS design — gradients, grid, pill backgrounds, shadows.

## When to use

- User asks for a "stunning", "premium", "innovative", "designer", "magazine-style" resume
- User wants a resume that visually stands out from typical submissions
- User has a structured profile (JSON or pasted bio) and wants a PDF
- User wants to re-skin the same data in a different visual style

## Input

A JSON profile with this structure (see `profile/sourabh.json` for a full example):

```json
{
  "identity": { "name", "headline", "location", "email", "phone", "linkedin" },
  "summary": { "short", "long" },
  "current_roles": [
    { "company", "title", "highlights": ["..."] }
  ],
  "products_conceptualised": [
    { "name", "type", "scope": ["..."] }
  ],
  "achievements": ["..."],
  "core_competencies": {
    "business_leadership": ["..."],
    "operations_management": ["..."],
    "technology_and_ai": ["..."]
  },
  "education": [ { "degree", "field", "institution" } ],
  "certifications": [ { "name", "year", "score" } ],
  "awards": ["..."],
  "memberships": ["..."],
  "interests": ["..."]
}
```

## Output

- A4 PDF resume, 2 pages, ~135 KB
- File path configurable (default: `output.pdf`)

## Quick start (Claude Code, Gemini CLI, Cursor)

1. **Install once** (handles Playwright + Chromium):
   ```bash
   ./install.sh
   ```

2. **Edit the profile** in `profile/sourabh.json` (or pass `--profile path/to/other.json`).

3. **Build the PDF**:
   ```bash
   node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf
   ```

4. **Open `output.pdf`.**

## CLI flags

```
--profile <path>   JSON profile to render (default: profile/sourabh.json)
--out <path>       Output PDF path (default: output.pdf)
--html             Also write the rendered HTML for inspection (next to --out)
```

## Design system

The visual identity is set in CSS variables inside `scripts/build_stunning_pdf.js`:

- **Navy** `#0c1f3a` (primary) and `#1f4f8a` (gradient end) — sidebar background
- **Amber** `#f4b860` and `#d68b3c` — accents, monogram, stat highlights
- **Cream** `#fde4be` — accent text on dark backgrounds
- **Slate** `#2a3344` — main body text
- **Hairline** `#e0e6f0` — section dividers

To re-skin, edit the `--navy`, `--amber`, etc. CSS custom properties at the top
of the `<style>` block in `scripts/build_stunning_pdf.js`. The grid layout
(sidebar width, column ratio) is in the `.page` rule.

## Variants

This skill ships one design ("Stunning" — navy + amber, two-column). Other
designs in the same family can be added by:

1. Copying `scripts/build_stunning_pdf.js` to `scripts/build_<name>.js`
2. Swapping the color variables and grid layout
3. Updating the SKILL.md description to mention the new variant

The existing `paramchoudhary/resumeskills` repo has 22 skills for content-side
variants (executive, academic, ATS, etc.). This skill is design-side.

## Files

```
sourabh-resume-studio/
├── SKILL.md                      # this file
├── README.md                     # human overview, Gemini/Claude setup
├── install.sh                    # one-shot Playwright + Chromium setup
├── package.json                  # Node deps
├── profile/
│   ├── README.md                 # profile schema docs
│   └── sourabh.json              # sample profile
├── scripts/
│   └── build_stunning_pdf.js     # the renderer (HTML+CSS+Chromium→PDF)
├── templates/                    # reserved for future HTML templates
├── examples/
│   └── sample-output.pdf         # rendered sample
└── docs/
    └── gemini-integration.md     # how to call from Gemini CLI / web
```

## How to invoke from Gemini

See `docs/gemini-integration.md`. Short version:

- **Gemini CLI** (with the experimental extensions API):
  `gemini extensions install <github-url-of-this-repo>` then
  `gemini "Build my resume from profile/sourabh.json"`.
- **Gemini in AI Studio** or **gemini.google.com**: paste the SKILL.md
  content into a system-instruction block along with the profile JSON.
- **GitHub Copilot / VS Code** with Gemini: open this folder, ask
  Copilot to run the build script.

## Hard rules

- Never invent dates, metrics, employers, or institutions. Use the
  profile data verbatim. The skill flags missing fields as placeholders.
- Re-render whenever the profile JSON changes; do not edit the PDF.
- For external distribution, remove any "pending" placeholder lines
  in the profile before rendering.
