// Design-token themes for Premium Resume Studio.
// Each theme is a self-contained palette. "Colorful but sober" means deep,
// saturated accents on clean backgrounds — rich, never neon.
//
// Templates consume these via CSS custom properties emitted by themeCSS().

'use strict';

/**
 * @typedef {Object} Theme
 * @property {string} key
 * @property {string} label
 * @property {string} ink        Primary body text
 * @property {string} inkSoft    Secondary text
 * @property {string} bg         Page background
 * @property {string} surface    Card / tint background
 * @property {string} hairline   Dividers
 * @property {string} sidebarFrom, sidebarVia, sidebarTo  Sidebar gradient stops
 * @property {string} sidebarInk, sidebarMuted            Text on the sidebar
 * @property {string} accent     Primary accent
 * @property {string} accentRGB  "r,g,b" for rgba() tints
 * @property {string} accentDeep Darker accent (borders, secondary)
 * @property {string} accentText Text color to sit on the accent fill
 * @property {string} heroInk    Accent-tinted text on the dark sidebar
 */

const THEMES = {
  // Executive default — deep navy + warm amber/gold.
  'midnight-gold': {
    label: 'Midnight Gold',
    ink: '#16202f', inkSoft: '#59647a', bg: '#ffffff', surface: '#f5f7fb', hairline: '#e2e8f2',
    sidebarFrom: '#0b1e39', sidebarVia: '#12365f', sidebarTo: '#1f4f8a',
    sidebarInk: '#eef3fb', sidebarMuted: '#b9cae2',
    accent: '#f0b34e', accentRGB: '240,179,78', accentDeep: '#cf8a34', accentText: '#0b1e39',
    heroInk: '#fbe2b4',
  },
  // Executive alt — deep emerald + antique gold.
  'royal-emerald': {
    label: 'Royal Emerald',
    ink: '#132019', inkSoft: '#54655c', bg: '#ffffff', surface: '#f3f7f4', hairline: '#dde8e1',
    sidebarFrom: '#08301f', sidebarVia: '#0f4a30', sidebarTo: '#1c6a48',
    sidebarInk: '#eefaf3', sidebarMuted: '#b6d6c4',
    accent: '#e5b769', accentRGB: '229,183,105', accentDeep: '#bd8f3f', accentText: '#08301f',
    heroInk: '#f6e3bd',
  },
  // Corporate blue — sapphire + teal, crisp and modern.
  'sapphire-teal': {
    label: 'Sapphire Teal',
    ink: '#111c2b', inkSoft: '#556174', bg: '#ffffff', surface: '#f2f6fb', hairline: '#dde6f1',
    sidebarFrom: '#0a2540', sidebarVia: '#0e3a63', sidebarTo: '#155e75',
    sidebarInk: '#eef6fb', sidebarMuted: '#accbdf',
    accent: '#2dd4bf', accentRGB: '45,212,191', accentDeep: '#0f9d8f', accentText: '#052e2b',
    heroInk: '#a7f3e6',
  },
  // Distinguished — burgundy + rose gold.
  'burgundy-rose': {
    label: 'Burgundy Rose',
    ink: '#241318', inkSoft: '#6b5459', bg: '#ffffff', surface: '#faf3f4', hairline: '#ecdcdf',
    sidebarFrom: '#3a0f1c', sidebarVia: '#5c1728', sidebarTo: '#822338',
    sidebarInk: '#fdf0f2', sidebarMuted: '#e4b9c3',
    accent: '#dda15e', accentRGB: '221,161,94', accentDeep: '#b87b3c', accentText: '#3a0f1c',
    heroInk: '#f4d9bf',
  },
  // Technical — graphite + electric azure.
  'graphite-azure': {
    label: 'Graphite Azure',
    ink: '#151922', inkSoft: '#5b6474', bg: '#ffffff', surface: '#f4f6fa', hairline: '#e0e5ee',
    sidebarFrom: '#12151c', sidebarVia: '#1b2430', sidebarTo: '#28384a',
    sidebarInk: '#eef2f8', sidebarMuted: '#aeb9c9',
    accent: '#38bdf8', accentRGB: '56,189,248', accentDeep: '#0ea5e9', accentText: '#082032',
    heroInk: '#bae6fd',
  },
  // Creative / fresher — deep plum + warm coral.
  'plum-coral': {
    label: 'Plum Coral',
    ink: '#1e1524', inkSoft: '#62596c', bg: '#ffffff', surface: '#f7f3fa', hairline: '#e8ddef',
    sidebarFrom: '#2a1244', sidebarVia: '#421d6b', sidebarTo: '#5b2a8c',
    sidebarInk: '#f6effc', sidebarMuted: '#cdb9e4',
    accent: '#fb7185', accentRGB: '251,113,133', accentDeep: '#e11d48', accentText: '#2a1244',
    heroInk: '#fecdd3',
  },
  // Fresher — teal + warm sunrise, energetic yet professional.
  'teal-sunrise': {
    label: 'Teal Sunrise',
    ink: '#0f1f22', inkSoft: '#4d6167', bg: '#ffffff', surface: '#eff8f7', hairline: '#d5e8e6',
    sidebarFrom: '#0c3b3a', sidebarVia: '#0f5a57', sidebarTo: '#13807a',
    sidebarInk: '#effaf8', sidebarMuted: '#a8d8d2',
    accent: '#fb923c', accentRGB: '251,146,60', accentDeep: '#ea7317', accentText: '#0c3b3a',
    heroInk: '#fed7aa',
  },
  // Academic — restrained navy + crimson, serif-friendly.
  'academic-navy': {
    label: 'Academic Navy',
    ink: '#1a2230', inkSoft: '#59616f', bg: '#ffffff', surface: '#f4f6f9', hairline: '#dfe4ec',
    sidebarFrom: '#152238', sidebarVia: '#1d3355', sidebarTo: '#274a76',
    sidebarInk: '#eef2f8', sidebarMuted: '#b4c2d6',
    accent: '#9b1c2e', accentRGB: '155,28,46', accentDeep: '#7a1523', accentText: '#ffffff',
    heroInk: '#e7c9cd',
  },
  // ATS-safe monochrome — for the plain-text-adjacent print variant.
  'slate-mono': {
    label: 'Slate Mono',
    ink: '#1b1f27', inkSoft: '#4a5261', bg: '#ffffff', surface: '#f3f4f6', hairline: '#d9dde4',
    sidebarFrom: '#1b1f27', sidebarVia: '#242a34', sidebarTo: '#2f3742',
    sidebarInk: '#f2f3f5', sidebarMuted: '#b6bcc6',
    accent: '#374151', accentRGB: '55,65,81', accentDeep: '#1f2937', accentText: '#ffffff',
    heroInk: '#d1d5db',
  },
};

// Default theme per archetype (overridable via --theme).
const ARCHETYPE_THEME = {
  executive: 'midnight-gold',
  academic: 'academic-navy',
  fresher: 'teal-sunrise',
  technical: 'graphite-azure',
  general: 'sapphire-teal',
  creative: 'plum-coral',
};

function getTheme(key) {
  const t = THEMES[key];
  if (!t) return { key: 'midnight-gold', ...THEMES['midnight-gold'] };
  return { key, ...t };
}

function themeForArchetype(archetype) {
  return ARCHETYPE_THEME[archetype] || 'midnight-gold';
}

/** Emit the theme as CSS custom properties on :root. */
function themeCSS(theme) {
  const t = typeof theme === 'string' ? getTheme(theme) : theme;
  return `:root{
  --ink:${t.ink}; --ink-soft:${t.inkSoft}; --bg:${t.bg}; --surface:${t.surface}; --hairline:${t.hairline};
  --side-from:${t.sidebarFrom}; --side-via:${t.sidebarVia}; --side-to:${t.sidebarTo};
  --side-ink:${t.sidebarInk}; --side-muted:${t.sidebarMuted};
  --accent:${t.accent}; --accent-rgb:${t.accentRGB}; --accent-deep:${t.accentDeep};
  --accent-text:${t.accentText}; --hero-ink:${t.heroInk};
}`;
}

module.exports = { THEMES, ARCHETYPE_THEME, getTheme, themeForArchetype, themeCSS };
