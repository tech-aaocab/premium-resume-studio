#!/usr/bin/env bash
# One-shot setup for premium-resume-studio.
# Installs the Playwright module and ensures a Chromium is available, then
# verifies the render pipeline. Safe in managed/CI environments that already
# ship a Chromium build (it will reuse it instead of downloading).
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Installing Node dependencies (playwright)"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# If a Chromium is already present (e.g. PLAYWRIGHT_BROWSERS_PATH is pre-provisioned),
# skip the download — scripts/lib/browser.js will locate and use it.
if node -e "process.exit(require('./scripts/lib/browser').findChromiumExecutable() ? 0 : 1)"; then
  echo "==> Chromium already available: $(node -e "console.log(require('./scripts/lib/browser').findChromiumExecutable())")"
else
  echo "==> Installing Chromium browser for Playwright"
  npx --yes playwright install chromium
fi

echo "==> Verifying Chromium can launch"
node -e "require('./scripts/lib/browser').launchChromium().then(b => { console.log('OK: chromium launched'); return b.close(); }).catch(e => { console.error('FAIL:', e.message); process.exit(1); })"

echo "==> Done. Try:"
echo "    node scripts/build_resume.js --profile profile/sourabh.json --out output.pdf --html --ats"
