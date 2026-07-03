# Premium Resume Studio

A skill that turns a structured JSON profile into a premium, magazine-style
PDF resume. Two-column layout, dark navy sidebar, amber/gold accents,
monogram, stat cards, timeline markers.

## What you get

- A4 PDF, 2 pages, ~135 KB
- Real CSS design (gradients, grid, pill backgrounds, shadows)
- Renders via Playwright + headless Chromium
- Same JSON profile feeds it (no copy-pasting bio into prompts)

## Quick start

```bash
# 1. Install Playwright + Chromium
./install.sh

# 2. Edit your profile
$EDITOR profile/sourabh.json

# 3. Build the PDF
node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf
```

That's it. `output.pdf` is the rendered resume.

## Calling it from an AI agent

### Claude Code / Cursor

Open this folder, ask: "render the profile as a stunning resume".

### Gemini CLI

```bash
gemini extensions install https://github.com/<you>/sourabh-resume-studio
gemini "Build my resume from profile/sourabh.json"
```

### Gemini in AI Studio / gemini.google.com

Paste `SKILL.md` into the system instructions, then ask for a render with
your profile JSON inline.

### GitHub Copilot (VS Code)

Open this folder in VS Code. Copilot will discover the SKILL.md. Ask:
"build the PDF from profile/sourabh.json".

## Customizing the look

Open `scripts/build_stunning_pdf.js`. The `<style>` block has CSS custom
properties for the palette:

- `--navy` / `--amber` — primary palette
- `--cream` — accent text on dark
- `--slate` — body text
- `--hairline` — section dividers

Swap the values to re-skin. The grid layout (`grid-template-columns` on
`.page`) controls sidebar width.

## Profile schema

See `profile/README.md` for the full JSON schema. Minimum required:

```json
{
  "identity": {
    "name": "Your Name",
    "headline": "Your Title",
    "location": "City, Country",
    "email": "you@example.com",
    "phone": "+91 ..."
  },
  "summary": { "long": "..." },
  "current_roles": [
    { "company": "...", "title": "...", "highlights": ["..."] }
  ]
}
```

Optional but used by the design: `core_competencies`, `products_conceptualised`,
`achievements`, `awards`, `memberships`, `interests`, `education`, `certifications`.

## License

MIT. Use it, fork it, ship it.
