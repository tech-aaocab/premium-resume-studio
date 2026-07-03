// Archetype classifier for Premium Resume Studio.
// Reads a profile and decides — on its own — whether the resume should be
// built as executive, academic, fresher, technical, creative, or general,
// plus a seniority band. Returns transparent signals so the choice is auditable.

'use strict';

const { estimateYears } = require('./helpers');
const { themeForArchetype } = require('./themes');

const RX = {
  academic: /\b(ph\.?d|postdoc|post-doctoral|professor|lecturer|researcher|research fellow|research scholar|dissertation|thesis|principal investigator|assistant professor|associate professor|faculty|scholar|academia|university teaching)\b/i,
  academicSection: /(publications?|research|grants?|teaching|conferences?|patents?|dissertation)/i,
  exec: /\b(ceo|coo|cfo|cto|cmo|cxo|chief|founder|co-?founder|managing director|director|chairman|chairperson|president|vice president|\bvp\b|head of|partner|owner|proprietor|entrepreneur|board member)\b/i,
  technical: /\b(software engineer|developer|programmer|data scientist|machine learning|ml engineer|devops|sre|full[- ]stack|front[- ]end|back[- ]end|architect|sde|qa engineer|security engineer|cloud engineer|data engineer|android|ios developer)\b/i,
  creative: /\b(designer|art director|photographer|filmmaker|animator|illustrator|writer|copywriter|creative director|ux|ui designer|motion|producer|actor|musician)\b/i,
  fresher: /\b(fresher|entry[- ]level|recent graduate|graduate trainee|aspiring|seeking (an? )?(entry|first|internship)|final[- ]year|undergraduate)\b/i,
};

function textBlob(p) {
  return JSON.stringify({
    headline: p.identity?.headline,
    alt: p.identity?.headline_alternates,
    summary: p.summary,
    roles: (p.current_roles || []).map((r) => `${r.title} ${r.company} ${r.industry}`),
    objective: p.career_objective,
  }).toLowerCase();
}

function scoreArchetypes(p) {
  const blob = textBlob(p);
  const signals = { academic: [], executive: [], technical: [], creative: [], fresher: [], general: [] };
  const s = { academic: 0, executive: 0, technical: 0, creative: 0, fresher: 0, general: 1 };

  // --- Academic ---
  if (RX.academic.test(blob)) { s.academic += 4; signals.academic.push('academic title/keywords in headline or summary'); }
  const pubs = (p.publications || []).length;
  if (pubs) { s.academic += Math.min(5, pubs); signals.academic.push(`${pubs} publication(s) listed`); }
  if ((p.research || p.research_interests || []).length) { s.academic += 3; signals.academic.push('research interests present'); }
  if ((p.education || []).some((e) => /ph\.?d|doctor|m\.?phil|postdoc/i.test(`${e.degree} ${e.field}`))) {
    s.academic += 3; signals.academic.push('doctoral / MPhil education');
  }
  if ((p.grants || []).length || (p.teaching || []).length || (p.conferences || []).length) {
    s.academic += 2; signals.academic.push('grants / teaching / conferences sections');
  }

  // --- Executive ---
  const execRoles = (p.current_roles || []).filter((r) => RX.exec.test(`${r.title || ''}`)).length;
  if (execRoles) { s.executive += 3 + Math.min(3, execRoles); signals.executive.push(`${execRoles} leadership role title(s)`); }
  if (RX.exec.test(blob)) { s.executive += 2; signals.executive.push('leadership keywords in positioning'); }
  if (/turnover|revenue|p&l|₹|crore|\bmillion\b|profit|ebitda|scaled|founded/i.test(JSON.stringify(p.achievements || []) + JSON.stringify(p.metrics || []))) {
    s.executive += 3; signals.executive.push('revenue / P&L / scale achievements');
  }
  if ((p.current_roles || []).length >= 2) { s.executive += 1; signals.executive.push('multiple concurrent ventures'); }

  // --- Technical ---
  if (RX.technical.test(blob)) { s.technical += 4; signals.technical.push('engineering role keywords'); }
  const techSkills = (p.core_competencies?.technology_and_ai || []).length + (p.skills?.technical || []).length;
  if (techSkills >= 6 && !execRoles) { s.technical += 2; signals.technical.push('deep technical skill set, individual contributor'); }
  if ((p.projects || []).length && !execRoles) { s.technical += 1; signals.technical.push('project portfolio'); }
  if (p.identity?.github || p.links?.github) { s.technical += 1; signals.technical.push('GitHub link'); }

  // --- Creative ---
  if (RX.creative.test(blob)) { s.creative += 4; signals.creative.push('creative discipline keywords'); }
  if ((p.portfolio || p.identity?.portfolio)) { s.creative += 1; signals.creative.push('portfolio link'); }

  // --- Fresher ---
  const years = estimateYears(p);
  const roleCount = (p.current_roles || []).length + (p.past_roles || p.experience || []).length;
  const hasInternships = (p.internships || []).length > 0;
  if (RX.fresher.test(blob)) { s.fresher += 4; signals.fresher.push('explicit fresher / entry-level positioning'); }
  if (years !== null && years <= 1 && roleCount <= 1) { s.fresher += 4; signals.fresher.push(`~${years ?? 0} yr experience`); }
  if (roleCount === 0 && (p.education || []).length) { s.fresher += 3; signals.fresher.push('no full-time roles; education-led'); }
  if (hasInternships && roleCount <= 1) { s.fresher += 2; signals.fresher.push('internships instead of full roles'); }

  return { s, signals, years, roleCount };
}

/** Seniority band from titles + experience length. */
function seniority(p, years, isFresher) {
  if (isFresher) return 'fresher';
  const titles = (p.current_roles || []).map((r) => (r.title || '').toLowerCase()).join(' ');
  if (/\b(ceo|coo|cfo|cto|chief|founder|co-?founder|managing director|chairman|president|partner|owner)\b/.test(titles)) return 'executive';
  if (/\b(director|vice president|\bvp\b|head of|principal|senior manager)\b/.test(titles)) return 'senior';
  if (years !== null) {
    if (years >= 12) return 'executive';
    if (years >= 7) return 'senior';
    if (years >= 3) return 'mid';
    return 'junior';
  }
  return 'mid';
}

/**
 * Classify a profile.
 * @returns {{archetype, seniority, isFresher, confidence, signals, alternatives, recommendedTheme}}
 */
function classify(p, opts = {}) {
  const { s, signals, years, roleCount } = scoreArchetypes(p);

  // Fresher is a strong modifier: if fresher signal wins or ties high, honor it.
  const ranked = Object.entries(s).sort((a, b) => b[1] - a[1]);
  let [topKey, topScore] = ranked[0];
  const isFresher = s.fresher >= 4 && s.fresher >= topScore - 1;

  // A fresher who also looks technical/creative keeps the fresher layout
  // (which is designed to make early-career candidates stand out) but records
  // the secondary flavor for theme selection.
  let archetype = topKey;
  let flavor = null;
  if (isFresher) {
    archetype = 'fresher';
    const nonFresher = ranked.filter(([k]) => k !== 'fresher' && k !== 'general');
    flavor = nonFresher.length && nonFresher[0][1] >= 3 ? nonFresher[0][0] : null;
  }

  const secondScore = ranked[1] ? ranked[1][1] : 0;
  const margin = topScore - secondScore;
  const confidence = Math.max(0.35, Math.min(0.98, 0.5 + margin * 0.12 + (topScore >= 5 ? 0.15 : 0)));

  const sen = seniority(p, years, isFresher);

  const recommendedTheme =
    opts.theme ||
    (isFresher && flavor === 'creative' ? 'plum-coral' : themeForArchetype(archetype));

  const chosenSignals = signals[archetype] && signals[archetype].length
    ? signals[archetype]
    : signals[topKey] || [];

  return {
    archetype,
    flavor,
    seniority: sen,
    isFresher,
    yearsExperience: years,
    roleCount,
    confidence: Math.round(confidence * 100) / 100,
    signals: chosenSignals,
    scores: s,
    alternatives: ranked.slice(0, 3).map(([k, v]) => ({ archetype: k, score: v })),
    recommendedTheme,
  };
}

module.exports = { classify };
