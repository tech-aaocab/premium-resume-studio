#!/usr/bin/env bash
# One-shot setup for premium-resume-studio.
# Installs Playwright + Chromium and verifies the build pipeline.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing Node dependencies (playwright)"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> Installing Chromium browser for Playwright"
npx --yes playwright install chromium

echo "==> Verifying Chromium can launch"
node -e "const {chromium} = require('playwright'); chromium.launch().then(b => { console.log('OK: chromium launched'); return b.close(); }).catch(e => { console.error('FAIL:', e.message); process.exit(1); })"

echo "==> Done. Try:  node scripts/build_stunning_pdf.js --profile profile/sourabh.json --out output.pdf"
