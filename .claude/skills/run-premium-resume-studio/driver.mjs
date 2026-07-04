#!/usr/bin/env node
// Driver for Premium Resume Studio — builds a resume and lets you SEE it.
//
// This project is a CLI/library that renders a JSON profile into a designed PDF.
// The interesting surface is the *rendered page*, so this driver renders the
// chosen design, applies the auto-fit, and writes a PNG of every A4 page (so an
// agent can look at the actual output for quality), plus the PDF, and prints the
// Model Council score + which of the 138 designs was picked.
//
// Usage (from anywhere; resolves the repo automatically):
//   node .claude/skills/run-premium-resume-studio/driver.mjs [options]
//     --profile <path>     profile JSON (default: profile/sourabh.json)
//     --design <id|n>      force a catalog design
//     --variant <n>        Nth structurally-different design (1=best fit)
//     --random             random on-brand design
//     --archetype <key>    override archetype
//     --out <dir>          output dir (default: <skill>/out)
//     --scale <n>          screenshot device scale (default 1.4)
//
// Output: <out>/resume.pdf and <out>/resume-p1.png, -p2.png, … + a JSON summary.

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

// Resolve repo root: 3 up from .claude/skills/run-…/, else walk up for scripts/, else cwd.
function findRepo() {
  const guess = path.resolve(HERE, '..', '..', '..');
  if (fs.existsSync(path.join(guess, 'scripts', 'build_resume.js'))) return guess;
  let d = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'scripts', 'build_resume.js'))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return process.cwd();
}
const REPO = findRepo();
const L = (m) => require(path.join(REPO, 'scripts', 'lib', m));

const argv = process.argv;
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (n) => argv.includes(n);

const PROFILE = path.resolve(REPO, arg('--profile', 'profile/sourabh.json'));
const OUT = path.resolve(arg('--out', path.join(HERE, 'out')));
const SCALE = parseFloat(arg('--scale', '1.4'));
const PAGE_PX = 1122.5;

(async () => {
  if (!fs.existsSync(PROFILE)) { console.error('Profile not found:', PROFILE); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  const p = JSON.parse(fs.readFileSync(PROFILE, 'utf8'));
  const { classify } = L('classify');
  const { getTheme } = L('themes');
  const { getRenderer } = L('templates');
  const { selectDesign } = L('design/select');
  const { fitPage } = L('fit');
  const { launchChromium } = L('browser');
  const council = L('council');

  const cls = classify(p);
  if (arg('--archetype', null)) cls.archetype = arg('--archetype', null);
  const sel = selectDesign(cls, p, {
    design: arg('--design', null),
    variant: arg('--variant', null) ? parseInt(arg('--variant', null), 10) : null,
    random: has('--random'),
  });
  const d = sel.design;
  const design = { theme: d.theme, type: d.type, ornaments: d.ornaments, family: d.family };
  const html = getRenderer(d.renderer).render(p, { theme: getTheme(d.theme), classification: cls, design });

  const browser = await launchChromium();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: SCALE });
  await page.emulateMedia({ media: 'print' });
  await page.setContent(html, { waitUntil: 'networkidle' });
  const fit = await fitPage(page, {});
  const H = await page.evaluate(() => (document.querySelector('.sheet') || document.body).getBoundingClientRect().height);
  const pages = Math.max(1, Math.ceil((H - 6) / PAGE_PX));

  await page.pdf({ path: path.join(OUT, 'resume.pdf'), format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
  // Grow the viewport to the full content height so per-page clips (which live
  // below the fold) are actually captured.
  await page.setViewportSize({ width: 794, height: Math.min(16000, Math.ceil(H) + 4) });
  const shots = [];
  for (let i = 0; i < pages; i++) {
    const remaining = H - i * PAGE_PX;
    if (remaining < 4) break; // rounding tail — nothing to show
    const f = path.join(OUT, `resume-p${i + 1}.png`);
    await page.screenshot({ path: f, clip: { x: 0, y: i * PAGE_PX, width: 794, height: Math.max(1, Math.min(PAGE_PX, remaining)) } });
    shots.push(f);
  }
  await browser.close();

  const report = council.convene(p, { classification: cls, themeMatchesArchetype: true, pages }, 85);
  const summary = {
    profile: PROFILE,
    design: { n: d.n, id: d.id, name: d.name, family: d.family, palette: d.theme, type: d.type },
    reason: sel.reason,
    fit, pages,
    council: { absolute: report.absolute, passed: report.passed, personas: report.personas },
    files: { pdf: path.join(OUT, 'resume.pdf'), pngs: shots },
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('');
  console.log(`  Design : #${d.n} ${d.name}  [${d.family} · ${d.theme} · ${d.type}]`);
  console.log(`  Reason : ${sel.reason}`);
  console.log(`  Pages  : ${pages}   Fit: ${fit.font !== 1 ? 'densify ' + fit.font : 'fill ' + fit.space}`);
  console.log(`  Council: ${report.absolute}/100  ${report.passed ? 'PASS' : 'ITERATE'}   (${report.personas.map((x) => x.name.split(' ')[0] + ' ' + x.score).join(' · ')})`);
  console.log(`  PDF    : ${path.join(OUT, 'resume.pdf')}`);
  console.log(`  Look   : ${shots.join('  ')}`);
  console.log('');
})().catch((e) => { console.error('driver error:', e && e.stack || e); process.exit(1); });
