# Profile JSON schema

The `build_stunning_pdf.js` script reads a JSON file with the structure below.
All fields are optional except `identity.name` and `identity.headline`.

## Top-level

| Field | Type | Notes |
|-------|------|-------|
| `identity` | object | Required. Name, contact, headline. |
| `summary` | object | `{ short, long }`. Used for the lede callout. |
| `current_roles` | array | Ventures/jobs to render in the timeline. |
| `products_conceptualised` | array | Optional. Product cards section. |
| `achievements` | array of strings | Bulleted in the achievements section. |
| `core_competencies` | object | Maps to skill pills in the sidebar. |
| `education` | array | Rendered in the sidebar. |
| `certifications` | array | Rendered in the sidebar. |
| `awards` | array of strings | Bulleted at the bottom. |
| `memberships` | array of strings | Bulleted in the sidebar. |
| `interests` | array of strings | Bulleted under "Personal". |

## identity

```json
{
  "name": "Sourabh Bhaumik",
  "headline": "Founder & CEO | IT Services, Field Operations & AI Transformation",
  "location": "Kolkata, West Bengal, India",
  "email": "you@example.com",
  "phone": "+91 98xxx xxxxx",
  "linkedin": "linkedin.com/in/yourhandle"  // optional
}
```

## current_roles (one per venture)

```json
{
  "company": "Company Name",
  "title": "Co-founder & CEO",
  "highlights": [
    "Achievement 1",
    "Achievement 2"
  ]
}
```

## core_competencies

Keys are sidebar pill groups. The first 5-6 items in each group are rendered.

```json
{
  "business_leadership": ["Entrepreneurship", "Strategy", "..."],
  "operations_management": ["Field ops", "..."],
  "technology_and_ai": ["AI adoption", "Cloud", "..."]
}
```

## products_conceptualised

```json
{
  "name": "FieldConnect",
  "type": "Field operations management",
  "scope": ["Engineer tracking", "Call assignment", "..."]
}
```

## Example

See `sourabh.json` for a complete, filled-out example.
