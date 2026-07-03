// Shared, format-agnostic document model for the editable exports (DOCX/ODT).
// Produces an ordered list of blocks from a profile; docx.js and odt.js render
// the same blocks into their respective file formats. Single-column and
// ATS-friendly by design — the fancy two-column look lives in the PDF.

'use strict';

const { first, cleanUrl, deriveMetrics } = require('../helpers');

const val = (v) => (v == null ? '' : String(v));

function contactLine(id) {
  return ['location', 'email', 'phone', 'linkedin', 'website', 'github', 'portfolio']
    .map((k) => (id[k] ? (/^(location|email|phone)$/.test(k) ? id[k] : cleanUrl(id[k])) : null))
    .filter(Boolean)
    .join('  |  ');
}

function roleBlocks(blocks, roles, { compact = false } = {}) {
  for (const r of roles) {
    const dates = first(r.dates, [r.start, r.end].filter(Boolean).join(' – '), r.end, '');
    blocks.push({ t: 'sub', bold: first(r.title, r.role, ''), normal: r.company ? `  ·  ${r.company}` : '', right: val(dates) });
    const meta = [r.location, r.industry].filter(Boolean).join('  ·  ');
    if (meta && !compact) blocks.push({ t: 'p', text: meta, italic: true });
    for (const b of (r.highlights || r.bullets || [])) blocks.push({ t: 'li', text: b });
  }
}

function skillGroups(p) {
  if (p.core_competencies) return Object.entries(p.core_competencies).map(([k, v]) => ({ label: k.replace(/_/g, ' '), items: v }));
  if (p.skills && !Array.isArray(p.skills)) return Object.entries(p.skills).map(([k, v]) => ({ label: k.replace(/_/g, ' '), items: v }));
  if (Array.isArray(p.skills)) return [{ label: '', items: p.skills.map((s) => (typeof s === 'string' ? s : s.name)) }];
  return [];
}

/**
 * Build the ordered block list for a profile.
 * @returns {Array<object>} blocks
 */
function buildBlocks(p, ctx = {}) {
  const id = p.identity || {};
  const arch = ctx.classification?.archetype || 'general';
  const B = [];

  B.push({ t: 'name', text: id.name || '' });
  if (id.headline) B.push({ t: 'title', text: id.headline });
  const c = contactLine(id);
  if (c) B.push({ t: 'contact', text: c });
  B.push({ t: 'rule' });

  const metrics = deriveMetrics(p, 4);
  if (metrics.length) B.push({ t: 'metrics', items: metrics });

  const section = (title) => B.push({ t: 'h', text: title });
  const summary = first(p.summary?.long, p.summary?.short, p.personal_brand_statement);
  const objective = first(p.career_objective, summary);

  if (arch === 'academic') {
    const stmt = first(p.research_statement, summary);
    if (stmt) { section('Research Statement'); B.push({ t: 'p', text: stmt }); }
    if ((p.education || []).length) { section('Education'); roleBlocks(B, p.education.map((e) => ({ title: `${e.degree || ''}${e.field ? `, ${e.field}` : ''}`, company: e.institution, dates: e.year })), { compact: true }); }
    if ((p.appointments || p.current_roles || []).length) { section('Appointments'); roleBlocks(B, p.appointments || p.current_roles); }
    if ((p.publications || []).length) {
      section('Selected Publications');
      for (const pub of p.publications) B.push({ t: 'liNum', text: typeof pub === 'string' ? pub : `${pub.authors || ''} “${pub.title || ''}.” ${pub.venue || ''} ${pub.year || ''}`.trim() });
    }
    if ((p.grants || p.awards || []).length) { section('Grants, Awards & Honors'); for (const g of (p.grants || p.awards)) B.push({ t: 'li', text: typeof g === 'string' ? g : `${g.name || ''} ${g.year ? `(${g.year})` : ''}` }); }
    if ((p.teaching || []).length) { section('Teaching'); roleBlocks(B, p.teaching, { compact: true }); }
    if ((p.conferences || p.presentations || []).length) { section('Presentations'); for (const c2 of (p.conferences || p.presentations)) B.push({ t: 'li', text: typeof c2 === 'string' ? c2 : `${c2.title || ''} — ${c2.venue || ''} ${c2.year || ''}` }); }
  } else if (arch === 'fresher') {
    if (objective) { section('Objective'); B.push({ t: 'p', text: objective }); }
    if ((p.education || []).length) { section('Education'); roleBlocks(B, p.education.map((e) => ({ title: `${e.degree || ''}${e.field ? ` in ${e.field}` : ''}`, company: e.institution, dates: e.year, highlights: (e.score || e.gpa) ? [e.score || e.gpa] : [] })), { compact: true }); }
    const sg = skillGroups(p); if (sg.length) { section('Skills'); B.push({ t: 'skills', groups: sg }); }
    if ((p.projects || []).length) { section('Projects'); for (const pr of p.projects) { B.push({ t: 'sub', bold: pr.name, normal: (pr.tech || pr.stack) ? `  [${(pr.tech || pr.stack).join(', ')}]` : '', right: '' }); const d = first(pr.description, (pr.highlights || [])[0]); if (d) B.push({ t: 'li', text: d }); } }
    if ((p.internships || p.current_roles || []).length) { section('Experience & Internships'); roleBlocks(B, (p.internships || []).concat(p.current_roles || [])); }
    if ((p.achievements || []).concat(p.awards || []).length) { section('Achievements & Awards'); for (const a of (p.achievements || []).concat(p.awards || [])) B.push({ t: 'li', text: typeof a === 'string' ? a : a.name }); }
    if ((p.certifications || []).length) { section('Certifications'); for (const cert of p.certifications) B.push({ t: 'li', text: `${cert.name}${cert.year ? ` (${cert.year})` : ''}${cert.score ? ` — ${cert.score}` : ''}` }); }
  } else {
    // executive / general / technical / creative
    if (summary) { section('Summary'); B.push({ t: 'p', text: summary }); }
    const roles = (p.current_roles || []).concat(p.past_roles || p.experience || []);
    if (roles.length) { section('Experience'); roleBlocks(B, roles); }
    if ((p.products_conceptualised || []).length) { section('Products & Concepts'); for (const pr of p.products_conceptualised) { B.push({ t: 'sub', bold: pr.name, normal: pr.type ? `  —  ${pr.type}` : '', right: '' }); if ((pr.scope || []).length) B.push({ t: 'p', text: pr.scope.join(' · ') }); } }
    if ((p.projects || []).length) { section('Projects'); for (const pr of p.projects) { B.push({ t: 'sub', bold: pr.name, normal: (pr.tech || pr.stack) ? `  [${(pr.tech || pr.stack).join(', ')}]` : '', right: '' }); const d = first(pr.description, (pr.highlights || [])[0]); if (d) B.push({ t: 'li', text: d }); } }
    if ((p.achievements || []).length) { section('Achievements'); for (const a of p.achievements) B.push({ t: 'li', text: a }); }
    const sg = skillGroups(p); if (sg.length) { section('Core Competencies'); B.push({ t: 'skills', groups: sg }); }
    if ((p.education || []).length) { section('Education'); for (const e of p.education) B.push({ t: 'sub', bold: `${e.degree || ''}${e.field ? `, ${e.field}` : ''}`, normal: e.institution ? `  ·  ${e.institution}` : '', right: val(e.year) }); }
    if ((p.certifications || []).length) { section('Certifications'); for (const cert of p.certifications) B.push({ t: 'li', text: `${cert.name}${cert.year ? ` (${cert.year})` : ''}${cert.score ? ` — ${cert.score}` : ''}` }); }
    if ((p.awards || []).length) { section('Awards'); for (const a of p.awards) B.push({ t: 'li', text: typeof a === 'string' ? a : a.name }); }
    if ((p.memberships || []).length) { section('Memberships'); B.push({ t: 'p', text: p.memberships.join('  ·  ') }); }
  }

  if ((p.languages || []).length) { section('Languages'); B.push({ t: 'p', text: p.languages.join('  ·  ') }); }
  if (arch !== 'academic' && (p.interests || []).length) { section('Interests'); B.push({ t: 'p', text: p.interests.join('  ·  ') }); }

  return B;
}

module.exports = { buildBlocks, contactLine };
