// Robust Chromium launcher for offline / managed environments.
// Playwright's bundled-browser version can drift from what's actually installed
// on the host (e.g. CI images that pre-provision a specific build). This helper
// locates an existing Chromium and passes executablePath so we never trigger a
// download at render time.

'use strict';

const fs = require('fs');
const path = require('path');

function findChromiumExecutable() {
  // 1. Explicit override.
  const envExe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH;
  if (envExe && fs.existsSync(envExe)) return envExe;

  // 2. Scan the Playwright browsers dir for any installed chromium build.
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(require('os').homedir(), '.cache', 'ms-playwright')]
    .filter(Boolean);
  for (const root of roots) {
    let entries = [];
    try { entries = fs.readdirSync(root); } catch (_) { continue; }
    // Prefer full chromium over headless_shell.
    const candidates = entries
      .filter((e) => /^chromium-\d+$/.test(e))
      .concat(entries.filter((e) => /^chromium_headless_shell-\d+$/.test(e)));
    for (const dir of candidates) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux/chrome-headless-shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        const full = path.join(root, dir, rel);
        if (fs.existsSync(full)) return full;
      }
    }
  }

  // 3. Common system Chromium locations.
  for (const sys of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (fs.existsSync(sys)) return sys;
  }
  return null;
}

async function launchChromium(opts = {}) {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) {
    const err = new Error('playwright module not found. Run ./install.sh once (installs Playwright + Chromium).');
    err.code = 'NO_PLAYWRIGHT';
    throw err;
  }
  const exe = findChromiumExecutable();
  const launchOpts = { ...opts };
  if (exe) launchOpts.executablePath = exe;
  return chromium.launch(launchOpts);
}

module.exports = { findChromiumExecutable, launchChromium };
