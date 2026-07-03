#!/usr/bin/env node
// Back-compat shim. The original single-design entry point now delegates to the
// upgraded engine (auto-classification + themes + model council). It forces the
// executive template so existing invocations keep producing the navy+gold look,
// but with fully data-driven metrics (no hard-coded numbers) and a quality score.
//
//   node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf [--html]
//
// For the full experience (auto-archetype, --theme, --ats, --cover), use:
//   node scripts/build_resume.js ...

'use strict';

const fs = require('fs');
const path = require('path');
const { getTheme } = require('./lib/themes');
const executive = require('./lib/templates/executive');
const { classify } = require('./lib/classify');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PROFILE = arg('--profile', path.join(__dirname, '..', 'profile', 'sourabh.json'));
const OUT_PDF = arg('--out', 'output.pdf');
const ALSO_HTML = process.argv.includes('--html');

if (!fs.existsSync(PROFILE)) { console.error(`Profile not found: ${PROFILE}`); process.exit(1); }
const p = JSON.parse(fs.readFileSync(PROFILE, 'utf8'));
if (!p.identity || !p.identity.name) { console.error('Profile missing required field: identity.name'); process.exit(1); }

const { launchChromium } = require('./lib/browser');

const cls = classify(p);
const theme = getTheme('midnight-gold');
const html = executive.render(p, { theme, classification: cls });

const outAbs = path.resolve(OUT_PDF);
if (ALSO_HTML) fs.writeFileSync(outAbs.replace(/\.pdf$/i, '.html'), html);

(async () => {
  const browser = await launchChromium();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.pdf({
    path: outAbs, format: 'A4', printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true,
  });
  await browser.close();
  console.log(`OK: ${outAbs}`);
  if (ALSO_HTML) console.log(`OK: ${outAbs.replace(/\.pdf$/i, '.html')}`);
})().catch((e) => { console.error(e); process.exit(1); });
