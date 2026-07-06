// Design selector — picks a design model from the catalog based on the person's
// context (archetype, seniority, industry). Default is best-fit and reproducible;
// --design/--variant/--random override.

'use strict';

const { CATALOG } = require('./catalog');

const INDUSTRY = {
  finance: /\b(finance|financial|bank|investment|fintech|accounting|audit|wealth|trading|equity|capital markets)\b/i,
  tech: /\b(software|develop|programmer|technology|it services|cloud|\bai\b|machine learning|data|devops|saas|platform|cyber|system integration)\b/i,
  consulting: /\b(consult|strategy|advisory)\b/i,
  creative: /\b(design|creative|\bart\b|film|photograph|brand|content|copywriter|theatre|music|animation)\b/i,
  media: /\b(media|journalis|editor|broadcast|video|production|storytelling)\b/i,
  healthcare: /\b(health|medical|clinical|pharma|hospital|nurse|doctor|biotech)\b/i,
  academia: /\b(research|professor|university|ph\.?d|academic|scholar|postdoc|lecturer)\b/i,
  law: /\b(\blaw\b|legal|attorney|counsel|litigation|paralegal)\b/i,
  luxury: /\b(luxury|fashion|hospitality|hotel|premium|couture)\b/i,
  nonprofit: /\b(non-?profit|\bngo\b|social impact|foundation|charity)\b/i,
  startup: /\b(founder|start-?up|co-?founder|venture)\b/i,
  engineering: /\b(mechanical|civil|electrical|manufactur|hardware)\b/i,
  sustainability: /\b(sustainab|climate|environment|renewable)\b/i,
};

function detectIndustries(p) {
  const blob = JSON.stringify({
    h: p.identity && p.identity.headline, s: p.summary,
    r: (p.current_roles || []).map((r) => `${r.title} ${r.company} ${r.industry}`),
    o: p.career_objective,
  }).toLowerCase();
  return Object.keys(INDUSTRY).filter((k) => INDUSTRY[k].test(blob));
}

// Parse the user's free-text intent ("minimalist, for a fintech role", "bold
// creative one-pager", "conservative navy") into design steering.
function parseContext(text) {
  const t = String(text || '').toLowerCase();
  const c = { industries: [], tones: [], forceFamily: null, forcePalette: null, maxPages: null };
  if (!t.trim()) return c;
  for (const k in INDUSTRY) if (INDUSTRY[k].test(t)) c.industries.push(k);

  const styles = [
    [/minimal|minimalist|simple|clean|understated|no.?frills|plain/, { tone: 'minimal', family: 'single', palette: 'slate-mono' }],
    [/bold|striking|eye.?catching|vibrant|colou?rful|punchy|standout/, { tone: 'bold', family: 'header-band' }],
    [/classic|traditional|conservative|formal|old.?school/, { tone: 'formal', palette: 'academic-navy' }],
    [/elegant|premium|luxur|sophisticat|refined|high.?end/, { tone: 'rich', palette: 'noir-gold' }],
    [/modern|sleek|contemporary|fresh/, { tone: 'modern', palette: 'graphite-azure' }],
    [/creative|artist|design.?y|expressive/, { tone: 'bold', family: 'header-band', palette: 'plum-coral' }],
    [/\btech|developer|engineer|startup|saas|coding/, { tone: 'modern', palette: 'graphite-azure' }],
    [/academic|research|scholarly|professor|phd/, { family: 'academic' }],
    [/corporate|executive|boardroom|\bceo\b|banking|finance|consult/, { tone: 'formal', palette: 'midnight-gold' }],
  ];
  for (const [re, o] of styles) if (re.test(t)) {
    if (o.tone) c.tones.push(o.tone);
    if (o.family && !c.forceFamily) c.forceFamily = o.family;
    if (o.palette && !c.forcePalette) c.forcePalette = o.palette;
  }

  const colours = [
    [/\bnavy\b|\bblue\b/, 'sapphire-teal'], [/emerald|\bgreen\b/, 'royal-emerald'], [/forest|olive/, 'forest-copper'],
    [/\bdark\b|\bblack\b|noir/, 'noir-gold'], [/purple|violet|plum|aubergine/, 'plum-coral'],
    [/burgundy|maroon|\bwine\b|\bred\b/, 'burgundy-rose'], [/\bteal\b|\bcyan\b/, 'steel-cyan'],
    [/orange|coral|sunrise/, 'ocean-coral'], [/\bgold\b|amber/, 'midnight-gold'],
    [/grey|gray|\bmono\b|monochrome|black.and.white/, 'slate-mono'], [/indigo/, 'indigo-amber'],
  ];
  for (const [re, pal] of colours) if (re.test(t)) { c.forcePalette = pal; break; }

  if (/single.?column|one.?column/.test(t)) c.forceFamily = 'single';
  if (/two.?column|2.?column/.test(t)) c.forceFamily = /right/.test(t) ? 'sidebar-right' : 'executive';
  if (/header|banner|\bhero\b/.test(t)) c.forceFamily = 'header-band';
  if (/one.?page|single.?page|1.?pager|one.?pager|\b1.?page\b/.test(t)) c.maxPages = 1;
  if (/two.?page|2.?page/.test(t)) c.maxPages = 2;
  return c;
}

function scoreEntry(entry, ctx) {
  let s = 1;
  const inds = ctx.industries || [];
  const overlap = (entry.tags.industries || []).filter((t) => inds.includes(t)).length;
  s += overlap * 4;

  const tones = entry.tags.tones || [];
  const has = (t) => tones.includes(t);
  const sen = ctx.seniority;
  if (sen === 'executive' || sen === 'senior') {
    if (has('formal')) s += 2; if (has('leadership')) s += 2; if (has('sober')) s += 2; if (has('rich')) s += 1;
    if (has('bold')) s -= 2; if (has('energetic')) s -= 2;
  } else if (ctx.isFresher || sen === 'junior') {
    if (has('bold')) s += 2; if (has('modern')) s += 2; if (has('energetic')) s += 2;
    if (has('formal')) s -= 1;
  } else { // mid
    if (has('modern')) s += 1; if (has('corporate')) s += 1;
  }
  // Prefer the flagship layout for the primary archetype (small nudge).
  if (ctx.archetype === 'executive' && entry.family === 'executive') s += 1.5;
  if (ctx.archetype === 'academic' && entry.family === 'academic') s += 2;
  if (ctx.isFresher && entry.family === 'fresher') s += 2;

  // User's stated context dominates when present — an explicitly named layout or
  // palette must beat any profile-derived nudge.
  if (ctx.forceFamily && entry.family === ctx.forceFamily) s += 20;
  if (ctx.forcePalette && entry.theme === ctx.forcePalette) s += 14;
  for (const tn of ctx.contextTones || []) if ((entry.tags.tones || []).includes(tn)) s += 3;
  return s;
}

function fittingList(classification, profile, context) {
  const archetype = classification.archetype || 'general';
  const cc = context || {};
  const ctx = {
    archetype, seniority: classification.seniority, isFresher: classification.isFresher,
    industries: [...new Set(detectIndustries(profile || {}).concat(cc.industries || []))],
    contextTones: cc.tones || [],
    forceFamily: cc.forceFamily || null,
    forcePalette: cc.forcePalette || null,
  };
  let pool = CATALOG.filter((e) => (e.tags.archetypes || []).includes(archetype)
    || (cc.forceFamily && e.family === cc.forceFamily)); // let an explicitly-asked layout in
  if (!pool.length) pool = CATALOG.slice();
  const scored = pool.map((e) => ({ e, s: scoreEntry(e, ctx) }));
  // Deterministic: score desc, then catalog order (id) asc.
  scored.sort((a, b) => (b.s - a.s) || (a.e.n - b.e.n));

  // Interleave by LAYOUT FAMILY so consecutive designs are structurally
  // different, not just recolored. Families are ordered by their best score, so
  // list[0] stays the overall best fit; list[1], list[2]… are different layouts.
  const byFamily = new Map();
  for (const x of scored) {
    if (!byFamily.has(x.e.family)) byFamily.set(x.e.family, []);
    byFamily.get(x.e.family).push(x.e);
  }
  const families = [...byFamily.keys()]; // insertion order = best-score order
  const woven = [];
  for (let round = 0; woven.length < scored.length; round++) {
    for (const fam of families) {
      const arr = byFamily.get(fam);
      if (arr[round]) woven.push(arr[round]);
    }
  }
  return { ctx, list: woven };
}

function findById(ref) {
  const r = String(ref).toLowerCase();
  return CATALOG.find((e) => e.id.toLowerCase() === r || e.name.toLowerCase() === r || String(e.n) === r) || null;
}

/**
 * @param classification  from classify()
 * @param profile         the profile object
 * @param opts { design, variant, random }
 * @returns { design, reason, fitting, total }
 */
function selectDesign(classification, profile, opts = {}) {
  const context = parseContext(opts.context);
  if (opts.design) {
    const hit = findById(opts.design);
    if (hit) return { design: hit, reason: `forced via --design ${opts.design}`, fitting: 1, total: CATALOG.length, maxPages: context.maxPages };
  }
  const { ctx, list } = fittingList(classification, profile, context);
  let idx = 0;
  const steer = [context.forceFamily && `layout:${context.forceFamily}`, context.forcePalette && `palette:${context.forcePalette}`, ...context.tones]
    .filter(Boolean).join(', ');
  let reason = (steer ? `context (${steer}) + ` : '') + `best fit for ${ctx.archetype}/${ctx.seniority}`
    + (ctx.industries.length ? ` · industry: ${ctx.industries.slice(0, 3).join(', ')}` : '');
  if (opts.random) {
    idx = Math.floor(Math.random() * list.length);
    reason = `random on-brand pick (${idx + 1}/${list.length} fitting)`;
  } else if (opts.variant && opts.variant > 1) {
    idx = (opts.variant - 1) % list.length;
    reason = `variant ${opts.variant} of ${list.length} fitting designs`;
  }
  return { design: list[idx], reason, fitting: list.length, total: CATALOG.length, maxPages: context.maxPages };
}

function listDesigns() {
  return CATALOG.map((e) => ({ n: e.n, id: e.id, name: e.name, family: e.family, palette: e.theme, type: e.type }));
}

module.exports = { selectDesign, listDesigns, fittingList, detectIndustries, parseContext };
