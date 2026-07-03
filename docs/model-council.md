# The Model Council

The Model Council is the quality gate. It scores a resume **0–100** and the Studio keeps
iterating (research → rewrite → re-render) until the **absolute score ≥ 85**. It has two
layers that agree by design.

## Layer 1 — the deterministic rubric (`scripts/lib/council.js`)

A reproducible, code-based panel. No API calls, no randomness — the same profile always
yields the same score, so improving the content provably moves the number.

Run it:
```bash
node scripts/lib/council.js --profile profile/sourabh.json          # pretty report
node scripts/lib/council.js --profile profile/sourabh.json --json   # machine-readable
```

### Rubric dimensions (weighted)

| Dimension | Weight | What it rewards |
|-----------|:------:|-----------------|
| `impact` | 18 | Bullets carrying a number / % / ₹$ / scale; 3–4 hero metrics |
| `completeness` | 12 | The sections expected for the detected archetype |
| `positioning` | 10 | A sharp, well-sized headline + a summary |
| `actionVerbs` | 10 | Bullets that open with strong verbs; penalizes "responsible for" |
| `atsCoverage` | 10 | Distinct skill keywords + an ATS-safe text export |
| `credibility` | 10 | No leaked placeholders / "pending" / nulls |
| `contactability` | 8 | Email, phone, location + at least one live link |
| `brevity` | 8 | Punchy 8–30-word bullets; penalizes walls of text |
| `designFit` | 8 | Theme matches archetype, data-driven metric strip, page budget |
| `standout` | 4→12 | Distinctiveness (hero, projects, awards). **Weighted up for freshers.** |

The absolute score is the weight-normalized sum. **85** is the pass mark (tune with
`--threshold`).

### Reviewer personas

Five lenses, each a weighted blend of the dimensions above, each returning a score + a
one-line verdict and its weakest link:

- **Executive Recruiter** — impact, positioning, verbs, credibility.
- **ATS Parser Bot** — keyword coverage, completeness, contactability.
- **Domain Expert** — impact, completeness, credibility.
- **Design Critic** — design fit, brevity, standout.
- **Hiring CEO** — impact, standout, positioning, credibility.

### Ranked fixes

Every dimension emits concrete fixes; the council ranks them by `weight × shortfall` so the
**top fix is always the highest-leverage edit**. Apply fixes to the *profile JSON*, then
re-render — never edit the PDF.

## Layer 2 — the qualitative LLM council (you)

The rubric can't judge tone, credibility of a specific claim, or whether a bullet actually
*lands*. So the agent role-plays the same five personas and reads the resume as each:

1. Give each persona the rendered resume and ask: *would you advance this candidate, and
   what's the single weakest thing?*
2. Merge their notes with the rubric's `topFixes`.
3. Rewrite, re-render, re-score.
4. Stop when the rubric clears 85 **and** no persona raises a blocking objection.

The two layers pull the same direction — both reward quantified impact, strong verbs,
completeness, credibility, and archetype-appropriate structure — so passing the rubric and
satisfying the personas converge.

## Worked example

The bundled `profile/sourabh.json` moved from **62.1 → 90.6** across the loop:

| Iteration | Change | Score |
|-----------|--------|:-----:|
| Baseline | raw profile (nulls, "pending", 1/9 quantified, no links) | 62.1 |
| + research | LinkedIn + website added; placeholders resolved | ~80 |
| + rewrite | verbs strengthened, metrics strip, quantified bullets, ATS export | 88.6 |
| + polish | two more bullets quantified honestly | **90.6** |

All five personas ended ≥ 85. See `examples/sourabh-resume.pdf`.
