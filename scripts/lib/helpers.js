// Shared helpers for the Premium Resume Studio rendering engine.
// Pure functions — no side effects, no DOM, no Playwright.

'use strict';

/** HTML-escape a value for safe interpolation into markup. */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

/** Initials (max 2 letters) from a full name, for the monogram. */
function initials(name) {
  const parts = String(name || '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[parts.length > 1 ? 1 : 0]?.[0] || '')).toUpperCase();
}

/** Return the first non-empty value among the arguments. */
const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

/** True when the value looks like an unresolved placeholder. */
const PLACEHOLDER_RE = /(pending|tbd|to be confirmed|unknown|xxxx|placeholder|confirm)/i;
const isPlaceholder = (v) => v == null || (typeof v === 'string' && (v.trim() === '' || PLACEHOLDER_RE.test(v)));

/** Strong action verbs that signal impact-oriented bullets. */
const ACTION_VERBS = new Set(
  (
    'led built scaled drove delivered launched founded architected designed created ' +
    'grew increased reduced saved generated managed directed spearheaded established ' +
    'transformed streamlined optimized negotiated secured won closed shipped owned ' +
    'developed implemented deployed orchestrated pioneered mentored coached hired ' +
    'expanded turned accelerated automated engineered produced published presented ' +
    'awarded achieved exceeded raised acquired onboarded coordinated executed initiated ' +
    'championed overhauled consolidated restructured'
  ).split(/\s+/),
);

const WEAK_OPENERS = [
  'responsible for',
  'worked on',
  'helped with',
  'was tasked',
  'duties included',
  'in charge of',
  'assisted with',
  'involved in',
];

/** Does a bullet start with a strong action verb? */
function startsWithActionVerb(text) {
  const w = String(text || '').trim().toLowerCase().split(/[\s,]+/)[0] || '';
  return ACTION_VERBS.has(w.replace(/[^a-z]/g, ''));
}

/** Does a bullet contain a quantified result (number, %, currency, multiplier)? */
const QUANT_RE = /(\d[\d,.]*\s*(%|percent|cr|crore|lakh|million|billion|k\b|mn|bn)|[₹$€£]\s?\d|\b\d{2,}\b|\bx\d|\d+\s?(users?|clients?|states?|projects?|teams?|people|resources?|engineers?|stores?|cities|years?|months?|sites?))/i;
function isQuantified(text) {
  return QUANT_RE.test(String(text || ''));
}

/** Count words in a string. */
const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Mine "hero" metrics out of the profile so the header strip is data-driven
 * (never hard-coded). Prefers an explicit `metrics` array on the profile;
 * otherwise extracts standout numbers from achievements / certifications /
 * roles. Returns at most `max` { value, label } objects.
 */
function deriveMetrics(p, max = 4) {
  if (Array.isArray(p.metrics) && p.metrics.length) {
    return p.metrics.slice(0, max).map((m) =>
      typeof m === 'string' ? { value: m, label: '' } : { value: m.value, label: m.label || '' },
    );
  }

  const out = [];
  const push = (value, label) => {
    if (value && !out.some((o) => o.value === value)) out.push({ value, label });
  };

  // Currency / turnover figures.
  const money = /([₹$€£]\s?\d[\d,.]*\s?(cr|crore|lakh|million|billion|mn|bn|k)?)/i;
  const pct = /(\d[\d,.]*\s?%)/;

  const scan = (text, defaultLabel) => {
    if (!text) return;
    const m = String(text).match(money);
    if (m) push(m[1].replace(/\s+/g, ''), defaultLabel);
    const pc = String(text).match(pct);
    if (pc) push(pc[1].replace(/\s+/g, ''), defaultLabel);
  };

  (p.achievements || []).forEach((a) => scan(a, 'Milestone'));
  (p.current_roles || []).forEach((r) => (r.highlights || []).forEach((h) => scan(h, 'Impact')));
  (p.certifications || []).forEach((c) => c.score && push(String(c.score), (c.name || 'Certification').split('—')[0].trim()));

  // Countable facts.
  if ((p.current_roles || []).length) push(String(p.current_roles.length), 'Ventures led');
  const states = (JSON.stringify(p).match(/pan-india|multiple (indian )?states|multi-state/i));
  if (states) push('Pan-India', 'Service delivery');

  return out.slice(0, max);
}

/** Rough estimate of total years of professional experience from role dates. */
function estimateYears(p) {
  const roles = p.current_roles || [];
  const past = p.past_roles || p.experience || [];
  const all = [...roles, ...past];
  let earliest = null;
  const yearOf = (v) => {
    const m = String(v || '').match(/(19|20)\d{2}/);
    return m ? parseInt(m[0], 10) : null;
  };
  for (const r of all) {
    const y = yearOf(r.start) || yearOf(r.dates) || yearOf(r.year);
    if (y && (earliest === null || y < earliest)) earliest = y;
  }
  // Certifications can hint at a career start (e.g. SAP 2008).
  for (const c of p.certifications || []) {
    const y = yearOf(c.year);
    if (y && (earliest === null || y < earliest)) earliest = y;
  }
  const NOW = 2026; // deterministic; renderer is offline
  return earliest ? Math.max(0, NOW - earliest) : null;
}

/** Split a "City, State, Country" location for compact display. */
function shortLocation(loc) {
  if (!loc) return '';
  const parts = String(loc).split(',').map((s) => s.trim());
  return parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : loc;
}

/** Normalize a URL for display (strip protocol + trailing slash). */
const cleanUrl = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

module.exports = {
  esc,
  initials,
  first,
  isPlaceholder,
  PLACEHOLDER_RE,
  ACTION_VERBS,
  WEAK_OPENERS,
  startsWithActionVerb,
  isQuantified,
  wordCount,
  deriveMetrics,
  estimateYears,
  shortLocation,
  cleanUrl,
};
