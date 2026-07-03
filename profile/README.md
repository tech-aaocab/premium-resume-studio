# Profile JSON schema

The Studio reads one JSON file and drives everything from it — classification, rendering, and
scoring. Only `identity.name` is required; every other field is optional and lights up a
section when present. Validate against `schema.json`.

## Top-level fields

| Field | Type | Used by |
|-------|------|---------|
| `identity` | object | **required** — name, contact, headline, links |
| `summary` | `{ short, long }` | lede / summary callout |
| `career_objective` | string | header tag (exec) · objective (fresher) |
| `personal_brand_statement` | string | fallback summary |
| `metrics` | `[{ value, label }]` | hero metric strip (else auto-derived) |
| `current_roles` | array of roles | experience / venture timeline |
| `past_roles` | array of roles | "Earlier Career" strip (exec) |
| `appointments` | array of roles | academic appointments |
| `internships` | array of roles | fresher experience |
| `projects` | `[{ name, description, tech[] }]` | fresher / technical project grid |
| `core_competencies` | `{ group: [skill…] }` | sidebar pill groups |
| `skills` | `[{ name, level }]` or `{ group:[…] }` | fresher skill bars / tech matrix |
| `education` | `[{ degree, field, institution, year, score }]` | education section |
| `certifications` | `[{ name, year, score }]` | certifications |
| `publications` | `[{ authors, title, venue, year }]` | academic (numbered) |
| `grants` `teaching` `conferences` `affiliations` | arrays | academic sections |
| `products_conceptualised` | `[{ name, type, scope[] }]` | product cards (exec) |
| `achievements` | `[string]` | achievements grid |
| `awards` | array | awards |
| `memberships` `languages` `open_to` `interests` | arrays | sidebar / footer |
| `_provenance` | object | research audit trail (not rendered, not scored) |

## identity

```json
{
  "name": "Sourabh Bhaumik",
  "headline": "Founder & CEO | IT Services, Field Operations & AI Transformation",
  "location": "Kolkata, West Bengal, India",
  "email": "you@example.com",
  "phone": "+91 98xxx xxxxx",
  "linkedin": "linkedin.com/in/yourhandle",
  "website": "yoursite.com",
  "github": "github.com/you",
  "portfolio": "you.dev"
}
```

## roles (current_roles / past_roles / internships / appointments)

```json
{
  "company": "Company Name",
  "title": "Founder & CEO",
  "dates": "2009 – Present",
  "location": "City, Country",
  "industry": "IT services · field operations",
  "highlights": [
    "Founded and scaled … to ₹10 Cr+ …",   // quantify + start with a strong verb
    "Grew a ~150-strong team across …"
  ]
}
```

## metrics (hero strip)

Give the strip explicitly, or omit it and the Studio mines standout numbers from your
achievements, roles, and certifications:

```json
"metrics": [
  { "value": "₹10 Cr+", "label": "Turnover built" },
  { "value": "15+ yrs", "label": "Founding & operating" }
]
```

## _provenance (research audit trail)

Keeps the profile honest without polluting the rendered resume. Not shown on the PDF and not
counted by the credibility score:

```json
"_provenance": {
  "confirmed_by_research": ["LinkedIn linkedin.com/in/… (handle matches email)"],
  "needs_user_confirmation": ["Exact job title", "Founding year", "Award wording"]
}
```

## Example

See `sourabh.json` (executive), `../examples/fresher-sample.json`, and
`../examples/academic-sample.json` for complete, filled-out profiles.
