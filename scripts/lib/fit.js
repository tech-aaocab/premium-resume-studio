// Auto-fit: eliminate awkward blank space so the pages a resume uses fill
// cleanly. Two modes, chosen automatically:
//
//   • DENSIFY — when content spills just past a page boundary, gently shrink
//     font size + spacing (width preserved) to pull it onto fewer pages.
//   • FILL   — when content genuinely needs N pages but under-fills the last
//     one, expand inter-section spacing (fonts untouched) to fill it.
//
// Because templates let content flow (no break-inside), the continuous layout
// equals the printed layout, so measuring height predicts pagination exactly.
// Operates on a live Playwright page with print media emulated.

'use strict';

const PAGE_PX = 1122.5; // A4 height at 96dpi
const round2 = (n) => Math.round(n * 100) / 100;

// Scale, relative to each element's original values (cached once on the DOM
// node): fontSize by `font`, marginBottom + rowGap by `space`, vertical padding
// by `pad`. font/pad=1 leaves those untouched.
function apply(page, font, space, pad) {
  return page.evaluate((a) => {
    const [font, space, pad] = a;
    document.querySelectorAll('.sheet, .sheet *').forEach((el) => {
      let b = el.__fitBase;
      if (!b) {
        const cs = getComputedStyle(el);
        b = el.__fitBase = {
          fs: parseFloat(cs.fontSize) || 0,
          mb: parseFloat(cs.marginBottom) || 0,
          rg: parseFloat(cs.rowGap) || 0,
          pt: parseFloat(cs.paddingTop) || 0,
          pb: parseFloat(cs.paddingBottom) || 0,
        };
      }
      if (b.fs) el.style.fontSize = b.fs * font + 'px';
      if (b.mb) el.style.marginBottom = b.mb * space + 'px';
      if (b.rg) el.style.rowGap = b.rg * space + 'px';
      if (b.pt) el.style.paddingTop = b.pt * pad + 'px';
      if (b.pb) el.style.paddingBottom = b.pb * pad + 'px';
    });
  }, [font, space, pad]);
}

const measure = (page) =>
  page.evaluate(() => (document.querySelector('.sheet') || document.body).getBoundingClientRect().height);

const pageCount = (h) => Math.max(1, Math.ceil((h - 6) / PAGE_PX));

// Largest densify factor f in [floor,1] whose height fits `k` pages; null if
// even f=floor overflows. Leaves the page densified at the winning f (or reset).
async function densifyToFit(page, k, floor) {
  await apply(page, floor, floor, floor);
  if ((await measure(page)) > k * PAGE_PX - 6) { await apply(page, 1, 1, 1); return null; }
  let lo = floor, hi = 1;
  for (let i = 0; i < 16; i++) {
    const f = (lo + hi) / 2;
    await apply(page, f, f, f);
    if ((await measure(page)) <= k * PAGE_PX - 6) lo = f; else hi = f;
  }
  await apply(page, lo, lo, lo);
  return lo;
}

// Expand spacing (fonts intact) to fill `k` pages as much as possible.
async function fillPages(page, k, maxSpace) {
  let lo = 0.7, hi = maxSpace;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    await apply(page, 1, m, 1);
    if ((await measure(page)) <= k * PAGE_PX - 0.03 * PAGE_PX) lo = m; else hi = m;
  }
  await apply(page, 1, lo, 1);
  const h = await measure(page);
  return { space: lo, h, lastFill: (h - (k - 1) * PAGE_PX) / PAGE_PX, fits: h <= k * PAGE_PX - 2 };
}

/**
 * Fit a resume so its pages fill cleanly. Chooses per profile between densifying
 * onto fewer pages and expanding spacing to fill.
 * @param {import('playwright').Page} page
 * @param {object} opts { maxPages, comfortFont, hardFont, maxSpace, fillOk }
 * @returns {Promise<{pages:number, font:number, space:number, mode:string}>}
 */
async function fitPage(page, opts = {}) {
  const { maxPages = null, comfortFont = 0.85, hardFont = 0.72, maxSpace = 2.6, fillOk = 0.72 } = opts;

  await apply(page, 1, 1, 1);
  const H0 = await measure(page);
  const N = Math.max(1, Math.ceil((H0 - 6) / PAGE_PX));
  const cap = maxPages ? Math.max(1, maxPages) : Infinity;
  const fillN = Math.min(N, cap === Infinity ? N : cap);
  const denseTo = cap < N ? cap : N - 1; // fewer pages we could try to reach

  const done = async (font, space, mode) =>
    ({ pages: pageCount(await measure(page)), font: round2(font), space: round2(space), mode });

  if (denseTo >= 1) {
    // How small a font would fewer pages need?
    const fA = await densifyToFit(page, denseTo, cap < N ? 0.6 : hardFont);
    // Comfortable shrink → just do it (fewer pages is better).
    if (fA !== null && fA >= comfortFont) return done(fA, fA, 'densify');

    // Otherwise see how well filling the natural page count works.
    await apply(page, 1, 1, 1);
    const fill = await fillPages(page, fillN, maxSpace);
    if (fill.fits && fill.lastFill >= fillOk) return done(1, fill.space, 'fill');

    // Filling leaves an ugly blank — densifying is the better trade if tolerable.
    if (fA !== null) { await apply(page, fA, fA, fA); return done(fA, fA, 'densify'); }

    // Neither is clean (content over cap): keep fill, guaranteeing it fits.
    if (fill.fits) return done(1, fill.space, 'fill');
    await apply(page, 1, 1, 1);
    const fs = (await densifyToFit(page, fillN, 0.55)) ?? 1;
    await apply(page, fs, fs, fs);
    return done(fs, fs, 'densify');
  }

  // N pages is the floor — fill them, then guarantee no rounding-hair overflow.
  const fill = await fillPages(page, fillN, maxSpace);
  if (fill.fits) return done(1, fill.space, 'fill');
  await apply(page, 1, 1, 1);
  const fs = (await densifyToFit(page, fillN, 0.9)) ?? (await densifyToFit(page, fillN, 0.6)) ?? 1;
  await apply(page, fs, fs, fs);
  return done(fs, fs, 'densify');
}

module.exports = { fitPage, PAGE_PX };
