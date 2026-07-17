/**
 * presets.js — compatibility layer over tokens.js.
 *
 * The token model in tokens.js is the source of truth for the Swiss/Brutalist
 * design system. This file preserves the original FONT_PRESETS/THEME_PRESETS
 * API shape that App.jsx, SettingsApp.jsx and LayoutEditorApp.jsx consume, so
 * the theme switch keeps working while those hosts migrate to applyTheme().
 *
 * Preset IDs are unchanged (persisted `uiTheme`/`uiFont` values keep
 * resolving); labels and values now come from the new system.
 */

import { FONT_STACKS, THEMES, getTheme } from './tokens';

export const FONT_PRESETS = {
  outfit: {
    id: 'outfit',
    label: 'Archivo (Swiss)',
    stack: FONT_STACKS.ui,
  },
  inter: {
    id: 'inter',
    label: 'Inter',
    stack: '"Inter Variable", "Inter", "Segoe UI", system-ui, sans-serif',
  },
  jetbrains: {
    id: 'jetbrains',
    label: 'JetBrains Mono',
    stack: FONT_STACKS.micro,
  },
  georgia: {
    id: 'georgia',
    label: 'Georgia',
    stack: 'Georgia, "Times New Roman", serif',
  },
};

function toLegacyPreset(theme) {
  return {
    id: theme.id,
    label: theme.label,
    background: theme.color.bg,
    accent: theme.color.accent,
    /* board is chromeless in the new system */
    widgetSurface: 'transparent',
    widgetBorder: 'transparent',
    editSurface: 'rgba(127,127,127,0.10)',
    editBorder: theme.color.accent,
  };
}

export const THEME_PRESETS = Object.fromEntries(
  Object.values(THEMES).map((theme) => [theme.id, toLegacyPreset(theme)])
);

export function getFontPreset(fontId) {
  return FONT_PRESETS[fontId] || FONT_PRESETS.outfit;
}

export function getThemePreset(themeId) {
  return toLegacyPreset(getTheme(themeId));
}
