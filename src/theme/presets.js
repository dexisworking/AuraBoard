/**
 * Font stacks name the bundled @fontsource-variable families ("Outfit Variable"),
 * which are the names those packages register. The non-variable names are kept as
 * fallbacks, and every stack ends in a system font so text stays legible even if
 * a face fails to load.
 */
export const FONT_PRESETS = {
  outfit: {
    id: 'outfit',
    label: 'Outfit',
    stack: '"Outfit Variable", "Outfit", "Inter Variable", system-ui, sans-serif',
  },
  inter: {
    id: 'inter',
    label: 'Inter',
    stack: '"Inter Variable", "Inter", "Segoe UI", system-ui, sans-serif',
  },
  jetbrains: {
    id: 'jetbrains',
    label: 'JetBrains Mono',
    stack: '"JetBrains Mono Variable", "JetBrains Mono", "Consolas", monospace',
  },
  georgia: {
    id: 'georgia',
    label: 'Georgia',
    stack: 'Georgia, "Times New Roman", serif',
  },
};

export const THEME_PRESETS = {
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    background: '#02050a',
    accent: '#818cf8',
    widgetSurface: 'rgba(10,14,20,0.38)',
    widgetBorder: 'rgba(255,255,255,0.12)',
    editSurface: 'rgba(129,140,248,0.14)',
    editBorder: 'rgba(129,140,248,0.60)',
  },
  graphite: {
    id: 'graphite',
    label: 'Graphite',
    background: '#0b1018',
    accent: '#94a3b8',
    widgetSurface: 'rgba(15,23,42,0.50)',
    widgetBorder: 'rgba(148,163,184,0.30)',
    editSurface: 'rgba(148,163,184,0.16)',
    editBorder: 'rgba(148,163,184,0.72)',
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    background: '#021018',
    accent: '#22d3ee',
    widgetSurface: 'rgba(4,32,44,0.42)',
    widgetBorder: 'rgba(34,211,238,0.36)',
    editSurface: 'rgba(34,211,238,0.15)',
    editBorder: 'rgba(34,211,238,0.74)',
  },
  ember: {
    id: 'ember',
    label: 'Ember',
    background: '#1a0c08',
    accent: '#fb923c',
    widgetSurface: 'rgba(42,21,12,0.46)',
    widgetBorder: 'rgba(251,146,60,0.34)',
    editSurface: 'rgba(251,146,60,0.14)',
    editBorder: 'rgba(251,146,60,0.74)',
  },
};

export function getFontPreset(fontId) {
  return FONT_PRESETS[fontId] || FONT_PRESETS.outfit;
}

export function getThemePreset(themeId) {
  return THEME_PRESETS[themeId] || THEME_PRESETS.aurora;
}
