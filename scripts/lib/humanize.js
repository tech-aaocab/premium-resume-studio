// Slop linter — flags the machine-written / clichéd phrasing that makes a resume
// read as AI-generated, so the copy can be rewritten to sound like a person.
// Pure functions; also runnable as a CLI to list offenders.

'use strict';

// Résumé clichés + corporate filler. Each hit is a real penalty.
const CLICHE = [
  'results-driven', 'results-oriented', 'detail-oriented', 'detail oriented', 'team player',
  'go-getter', 'self-starter', 'hard-working', 'hard worker', 'proven track record',
  'track record of success', 'passionate about', 'deeply passionate', 'thought leader',
  'thought leadership', 'game-?changer', 'game[- ]changing', 'best-in-class', 'best in class',
  'cutting-edge', 'cutting edge', 'world-class', 'state-of-the-art', 'next-level', 'next level',
  'hit the ground running', 'wear(s|ing)? many hats', 'wearing multiple hats', 'jack of all trades',
  'think outside the box', 'move the needle', 'low-hanging fruit', 'value-add', 'value add',
  'win-win', 'deep dive', 'circle back', 'boil the ocean', 'mission-critical', 'go above and beyond',
  'dynamic professional', 'seasoned professional', 'strategic thinker', 'diverse background',
  'fast-paced environment', 'dynamic environment', 'unlock(ing)? (value|potential|growth)',
  'drive(s|n)? value', 'at the intersection of', 'transformative journey', 'human-centric',
  'ready for the (ai|future|ai-driven future)', 'future-proof', 'poised to', 'at the forefront',
  'in today\'?s fast-paced world', 'ever-evolving', 'the .{0,12} landscape', 'testament to',
];

// Buzzwords — overused verbs/nouns. Capped so one or two are OK.
const BUZZ = [
  'leverage', 'leveraging', 'leveraged', 'spearhead', 'spearheaded', 'orchestrated', 'championed',
  'pioneered', 'synerg', 'holistic', 'robust', 'seamless', 'seamlessly', 'empower', 'empowered',
  'utilize', 'utilizing', 'utilized', 'utilization', 'harness', 'harnessing', 'elevate', 'elevating',
  'showcase', 'showcasing', 'boasts', 'delve', 'delving', 'realm', 'tapestry', 'underscore',
  'ecosystem', 'paradigm', 'bandwidth', 'ideate', 'operationalize', 'impactful',
];

// Filler / hedges that add words without meaning.
const FILLER = ['responsible for', 'duties included', 'tasked with', 'helped to', 'worked to',
  'in order to', 'a wide range of', 'a variety of', 'various', 'numerous', 'myriad', 'plethora',
  'and more', 'among others', 'etc\\.?'];

const rx = (list) => list.map((w) => new RegExp('\\b' + w + '\\b', 'gi'));
const CLICHE_RX = rx(CLICHE);
const BUZZ_RX = rx(BUZZ);
const FILLER_RX = rx(FILLER);

function collectStrings(p) {
  const out = [];
  const add = (label, s) => { if (s && typeof s === 'string') out.push({ label, text: s }); };
  add('summary', p.summary?.long); add('summary', p.summary?.short);
  add('brand statement', p.personal_brand_statement);
  add('objective', p.career_objective);
  (p.current_roles || []).concat(p.past_roles || [], p.internships || []).forEach((r) => {
    (r.highlights || r.bullets || []).forEach((h) => add(`${r.company || r.title || 'role'} bullet`, h));
  });
  (p.achievements || []).forEach((a) => add('achievement', a));
  (p.awards || []).forEach((a) => add('award', typeof a === 'string' ? a : a.name));
  (p.projects || []).forEach((pr) => add('project', pr.description));
  return out;
}

// A clause carrying a run of short comma/middot-separated items reads as
// keyword-soup even when it's embedded in a longer sentence.
function commaSoup(text) {
  return String(text || '').split(/[.;:—]/).some((clause) => {
    const parts = clause.split(/,|·/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 4) return false;
    const short = parts.filter((s) => s.split(/\s+/).length <= 5).length;
    return short / parts.length >= 0.6;
  });
}

/**
 * Lint a profile for slop.
 * @returns {{score:number, issues:Array, counts:object}}
 */
function lintProfile(p) {
  const strings = collectStrings(p);
  const issues = [];
  let cliche = 0, buzz = 0, filler = 0, soup = 0;

  for (const { label, text } of strings) {
    for (const r of CLICHE_RX) { const m = text.match(r); if (m) { cliche += m.length; m.forEach((x) => issues.push({ label, type: 'cliché', phrase: x })); } }
    for (const r of BUZZ_RX) { const m = text.match(r); if (m) { buzz += m.length; m.forEach((x) => issues.push({ label, type: 'buzzword', phrase: x })); } }
    for (const r of FILLER_RX) { const m = text.match(r); if (m) { filler += m.length; m.forEach((x) => issues.push({ label, type: 'filler', phrase: x })); } }
    if (commaSoup(text)) { soup += 1; issues.push({ label, type: 'comma-soup', phrase: text.slice(0, 60) + '…' }); }
  }

  // Uniform openers (every bullet starting the same verb) reads templated.
  const openers = strings.filter((s) => /bullet/.test(s.label)).map((s) => s.text.trim().split(/\s+/)[0].toLowerCase());
  const topOpener = openers.length ? Math.max(...Object.values(openers.reduce((a, o) => (a[o] = (a[o] || 0) + 1, a), {}))) : 0;
  const uniform = openers.length >= 5 && topOpener / openers.length > 0.4;
  if (uniform) issues.push({ label: 'bullets', type: 'uniform-openers', phrase: `${topOpener}/${openers.length} start with the same verb` });

  const penalty = cliche * 9 + buzz * 4 + filler * 2.5 + soup * 6 + (uniform ? 8 : 0);
  const score = Math.max(0, Math.round((100 - penalty) * 10) / 10);
  return { score, issues, counts: { cliche, buzz, filler, soup, uniform } };
}

module.exports = { lintProfile, CLICHE, BUZZ, FILLER };

// ---- CLI: node scripts/lib/humanize.js --profile x.json ----
if (require.main === module) {
  const fs = require('fs'); const path = require('path');
  const i = process.argv.indexOf('--profile');
  const prof = i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : path.join(__dirname, '..', '..', 'profile', 'sourabh.json');
  const r = lintProfile(JSON.parse(fs.readFileSync(prof, 'utf8')));
  console.log(`\n  Human-voice score: ${r.score}/100  ${r.score >= 85 ? '✅ reads human' : '⚠️  reads AI-generated'}`);
  console.log(`  Counts: ${r.counts.cliche} clichés · ${r.counts.buzz} buzzwords · ${r.counts.filler} filler · ${r.counts.soup} comma-soup${r.counts.uniform ? ' · uniform openers' : ''}`);
  if (r.issues.length) {
    console.log('\n  Fix these (rewrite in plain, specific language):');
    r.issues.slice(0, 40).forEach((x) => console.log(`    [${x.type}] (${x.label})  “${x.phrase}”`));
  } else console.log('\n  No slop detected.');
  console.log('');
  process.exit(r.score >= 85 ? 0 : 1);
}
