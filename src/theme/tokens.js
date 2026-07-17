/**
 * AuraBoard design tokens — Swiss / International Typographic Style with a
 * Brutalist edge. Bold minimalism: one signal colour on a monochrome ground,
 * colossal condensed grotesque type, and micro-typography as counterpoint.
 *
 * This module is the single source of truth. `applyTheme()` flattens it to
 * `--ab-*` custom properties, which BOTH Tailwind utilities and the per-widget
 * CSS files read — so one theme switch drives everything.
 *
 * Design rules encoded here:
 *  - Type carries the design. It is structure, not decoration.
 *  - Extreme scale contrast (~100:1 between display and micro).
 *  - The board is chromeless: no cards, no borders, no glass. Surfaces exist
 *    only in dashboard chrome (settings), never behind a widget.
 *  - Photographs are driven to high-contrast monochrome so the signal colour
 *    always wins. This is what makes arbitrary user photos look deliberate and
 *    keeps text legible over them.
 */

/* ── Typeface roles ─────────────────────────────────────────────────────────
 * display : Anton — ultra-condensed heavy grotesque. Headlines only.
 *           Single weight, no tabular figures, so never use it for numbers
 *           that tick (they would jitter).
 * numeric : Archivo Variable at wdth 62-75 / wght 800-900. Reads like Anton
 *           but exposes tabular figures — correct for clocks, prices, temps.
 * ui      : Archivo Variable at normal width. Swiss workhorse grotesque.
 * micro   : JetBrains Mono Variable. Tracked-out caps captions and labels.
 */
export const FONT_STACKS = {
  display: "'Anton', 'Archivo Variable', 'Haettenschweiler', Impact, sans-serif",
  numeric: "'Archivo Variable', 'Anton', 'Helvetica Neue', system-ui, sans-serif",
  ui: "'Archivo Variable', 'Inter Variable', 'Helvetica Neue', system-ui, sans-serif",
  micro: "'JetBrains Mono Variable', 'Consolas', ui-monospace, monospace",
};

/* Variable-font axis settings. Archivo's wdth axis is what produces the
 * condensed Druk/Inserat character; it ships only in `archivo/wdth.css`. */
export const FONT_AXES = {
  numericCondensed: "'wdth' 64, 'wght' 900",
  numericTight: "'wdth' 75, 'wght' 800",
  uiNormal: "'wdth' 100, 'wght' 500",
  uiBold: "'wdth' 100, 'wght' 700",
};

/* ── Type scale ─────────────────────────────────────────────────────────────
 * Deliberately non-linear and exaggerated. The gap between `micro` and
 * `display2xl` is the point: bold minimalism needs the jump to be violent.
 * Values are rem; the board sets its own root size per display density.
 */
export const TYPE_SCALE = {
  micro: '0.6875rem',   // 11px  — tracked-out caps captions
  label: '0.8125rem',   // 13px  — widget labels
  body: '1rem',         // 16px
  lead: '1.375rem',     // 22px
  stat: '3rem',         // 48px  — secondary figures
  displaySm: '6rem',    // 96px
  displayMd: '10rem',   // 160px
  displayLg: '16.25rem',// 260px — the clock
  display2xl: '24rem',  // 384px — cropped/bleeding headline
};

export const TYPE_TRACKING = {
  micro: '0.28em',   // extreme tracking is the Swiss caption signature
  label: '0.18em',
  normal: '0',
  tight: '-0.02em',
  display: '-0.04em', // big condensed type needs negative tracking to lock up
};

export const TYPE_LEADING = {
  display: '0.82',    // sub-1 leading so stacked headlines interlock
  tight: '1.05',
  normal: '1.5',
};

export const SPACE = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  24: '6rem',
};

/* Brutalism: corners are square. Radius exists only for dashboard chrome. */
export const RADIUS = {
  none: '0',
  sm: '2px',
  chrome: '4px',
};

export const RULE = {
  hairline: '1px',
  bold: '3px',
  brutal: '6px',
};

/* Slow and mechanical — this is an ambient display, not a web app. */
export const MOTION = {
  instant: '0ms',
  fast: '180ms',
  normal: '420ms',
  slow: '1200ms',
  ambient: '2400ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeStep: 'steps(1, end)',
};

/* ── Themes ─────────────────────────────────────────────────────────────────
 * Preset IDs are preserved from the previous theme system so persisted
 * `uiTheme` values keep resolving; the palettes and labels are re-cut for the
 * Swiss/Brutalist direction. Each is one signal colour on a mono ground.
 *
 * `photoFilter` is the legibility mechanism: slideshow imagery is driven to
 * high-contrast monochrome so the signal colour and white type always win,
 * regardless of what the user pointed us at.
 */
export const THEMES = {
  aurora: {
    id: 'aurora',
    label: 'Signal',
    description: 'Signal red on black. The default voice.',
    color: {
      bg: '#0A0A0A',
      ink: '#FFFFFF',
      inkSecondary: 'rgba(255,255,255,0.68)',
      inkTertiary: 'rgba(255,255,255,0.38)',
      accent: '#FF2B12',
      accentInk: '#FFFFFF',
      positive: '#00E06A',
      negative: '#FF2B12',
      warning: '#FFB800',
      rule: 'rgba(255,255,255,0.22)',
      ruleStrong: '#FFFFFF',
      /* dashboard chrome only — never on the board */
      surface: '#141414',
      surfaceRaised: '#1E1E1E',
      surfaceBorder: 'rgba(255,255,255,0.14)',
    },
    photoFilter: 'grayscale(1) contrast(1.4) brightness(0.5)',
    scrim: 'rgba(10,10,10,0.42)',
  },

  graphite: {
    id: 'graphite',
    label: 'Newsprint',
    description: 'Black on warm paper. Editorial, printed.',
    color: {
      bg: '#E9E5DC',
      ink: '#0E0E0C',
      inkSecondary: 'rgba(14,14,12,0.70)',
      inkTertiary: 'rgba(14,14,12,0.42)',
      accent: '#D2200E',
      accentInk: '#FFFFFF',
      positive: '#0A7A3C',
      negative: '#D2200E',
      warning: '#A66A00',
      rule: 'rgba(14,14,12,0.24)',
      ruleStrong: '#0E0E0C',
      surface: '#F3F0E9',
      surfaceRaised: '#FFFFFF',
      surfaceBorder: 'rgba(14,14,12,0.16)',
    },
    /* Light ground: lift the photo instead of crushing it, so dark ink holds. */
    photoFilter: 'grayscale(1) contrast(1.25) brightness(1.25)',
    scrim: 'rgba(233,229,220,0.55)',
  },

  ocean: {
    id: 'ocean',
    label: 'Cyan',
    description: 'Electric cyan on near-black.',
    color: {
      bg: '#05070A',
      ink: '#FFFFFF',
      inkSecondary: 'rgba(255,255,255,0.66)',
      inkTertiary: 'rgba(255,255,255,0.36)',
      accent: '#00E5FF',
      accentInk: '#05070A',
      positive: '#00E06A',
      negative: '#FF3B30',
      warning: '#FFB800',
      rule: 'rgba(255,255,255,0.20)',
      ruleStrong: '#FFFFFF',
      surface: '#0D1117',
      surfaceRaised: '#161B22',
      surfaceBorder: 'rgba(255,255,255,0.14)',
    },
    photoFilter: 'grayscale(1) contrast(1.45) brightness(0.45)',
    scrim: 'rgba(5,7,10,0.46)',
  },

  ember: {
    id: 'ember',
    label: 'Amber',
    description: 'Hazard amber on charcoal.',
    color: {
      bg: '#0A0705',
      ink: '#F7F3EC',
      inkSecondary: 'rgba(247,243,236,0.66)',
      inkTertiary: 'rgba(247,243,236,0.36)',
      accent: '#FF6A00',
      accentInk: '#0A0705',
      positive: '#00E06A',
      negative: '#FF2B12',
      warning: '#FFB800',
      rule: 'rgba(247,243,236,0.20)',
      ruleStrong: '#F7F3EC',
      surface: '#150F0A',
      surfaceRaised: '#1F1710',
      surfaceBorder: 'rgba(247,243,236,0.14)',
    },
    photoFilter: 'grayscale(1) contrast(1.4) sepia(0.25) brightness(0.5)',
    scrim: 'rgba(10,7,5,0.44)',
  },
};

export const DEFAULT_THEME_ID = 'aurora';

export function getTheme(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}
