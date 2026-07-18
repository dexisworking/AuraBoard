/**
 * applyTheme — flattens the token model in tokens.js onto a DOM element as
 * `--ab-*` custom properties. Every styling system in the app (Tailwind
 * utilities, per-widget CSS files, inline styles) reads these same variables,
 * so this function is the single point where a theme switch takes effect.
 *
 * Returns the style object form as well, for hosts that prefer to spread it
 * onto a React `style` prop instead of mutating a node.
 */

import {
  FONT_STACKS,
  FONT_AXES,
  TYPE_SCALE,
  TYPE_TRACKING,
  TYPE_LEADING,
  RADIUS,
  RULE,
  MOTION,
  getTheme,
  getPhaseColor,
} from './tokens';

export function buildThemeVars(themeId, phase) {
  const theme = getTheme(themeId);
  // Time-of-day palette shifts the ground/accent; falsy phase = base palette.
  const c = phase ? getPhaseColor(themeId, phase) : theme.color;

  return {
    /* color */
    '--ab-bg': c.bg,
    '--ab-ink': c.ink,
    '--ab-ink-secondary': c.inkSecondary,
    '--ab-ink-tertiary': c.inkTertiary,
    '--ab-accent': c.accent,
    '--ab-accent-ink': c.accentInk,
    '--ab-positive': c.positive,
    '--ab-negative': c.negative,
    '--ab-warning': c.warning,
    '--ab-rule': c.rule,
    '--ab-rule-strong': c.ruleStrong,
    '--ab-surface': c.surface,
    '--ab-surface-raised': c.surfaceRaised,
    '--ab-surface-border': c.surfaceBorder,

    /* photo treatment — the legibility mechanism */
    '--ab-photo-filter': theme.photoFilter,
    '--ab-scrim': theme.scrim,

    /* typography */
    '--ab-font-display': FONT_STACKS.display,
    '--ab-font-numeric': FONT_STACKS.numeric,
    '--ab-font-ui': FONT_STACKS.ui,
    '--ab-font-micro': FONT_STACKS.micro,
    '--ab-axes-numeric-condensed': FONT_AXES.numericCondensed,
    '--ab-axes-numeric-tight': FONT_AXES.numericTight,

    '--ab-text-micro': TYPE_SCALE.micro,
    '--ab-text-label': TYPE_SCALE.label,
    '--ab-text-body': TYPE_SCALE.body,
    '--ab-text-lead': TYPE_SCALE.lead,
    '--ab-text-stat': TYPE_SCALE.stat,
    '--ab-text-display-sm': TYPE_SCALE.displaySm,
    '--ab-text-display-md': TYPE_SCALE.displayMd,
    '--ab-text-display-lg': TYPE_SCALE.displayLg,
    '--ab-text-display-2xl': TYPE_SCALE.display2xl,

    '--ab-track-micro': TYPE_TRACKING.micro,
    '--ab-track-label': TYPE_TRACKING.label,
    '--ab-track-tight': TYPE_TRACKING.tight,
    '--ab-track-display': TYPE_TRACKING.display,

    '--ab-leading-display': TYPE_LEADING.display,
    '--ab-leading-tight': TYPE_LEADING.tight,
    '--ab-leading-normal': TYPE_LEADING.normal,

    /* structure */
    '--ab-radius': RADIUS.none,
    '--ab-radius-chrome': RADIUS.chrome,
    '--ab-rule-hairline': RULE.hairline,
    '--ab-rule-bold': RULE.bold,
    '--ab-rule-brutal': RULE.brutal,

    /* motion */
    '--ab-motion-fast': MOTION.fast,
    '--ab-motion-normal': MOTION.normal,
    '--ab-motion-slow': MOTION.slow,
    '--ab-motion-ambient': MOTION.ambient,
    '--ab-ease-out': MOTION.easeOut,

    /* legacy aliases — the pre-Swiss variable names still referenced by
       WidgetGrid inline styles and the un-migrated widget CSS files. Mapped
       to the closest new token so nothing breaks mid-migration; delete once
       DS-2 finishes. The board is chromeless, so widget surface/border
       resolve to nothing. */
    '--ab-font-family': FONT_STACKS.ui,
    '--ab-widget-surface': 'transparent',
    '--ab-widget-border': 'transparent',
    '--ab-edit-surface': 'rgba(127,127,127,0.10)',
    '--ab-edit-border': c.accent,
  };
}

/**
 * Apply theme variables to a DOM element (usually document.documentElement).
 * `phase` optionally applies the time-of-day palette shift.
 */
export function applyTheme(themeId, element = document.documentElement, phase = null) {
  const vars = buildThemeVars(themeId, phase);
  for (const [key, value] of Object.entries(vars)) {
    element.style.setProperty(key, value);
  }
  element.style.backgroundColor = vars['--ab-bg'];
  return vars;
}
