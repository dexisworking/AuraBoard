/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './settings.html',
    './layout.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      /* All values resolve through the --ab-* custom properties set by
         applyTheme(), so Tailwind utilities and widget CSS are driven by the
         same theme switch. */
      colors: {
        ink: {
          DEFAULT: 'var(--ab-ink)',
          secondary: 'var(--ab-ink-secondary)',
          tertiary: 'var(--ab-ink-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--ab-accent)',
          ink: 'var(--ab-accent-ink)',
        },
        positive: 'var(--ab-positive)',
        negative: 'var(--ab-negative)',
        warning: 'var(--ab-warning)',
        ground: 'var(--ab-bg)',
        surface: {
          DEFAULT: 'var(--ab-surface)',
          raised: 'var(--ab-surface-raised)',
          border: 'var(--ab-surface-border)',
        },
        rule: {
          DEFAULT: 'var(--ab-rule)',
          strong: 'var(--ab-rule-strong)',
        },
      },
      fontFamily: {
        display: 'var(--ab-font-display)',
        numeric: 'var(--ab-font-numeric)',
        ui: 'var(--ab-font-ui)',
        micro: 'var(--ab-font-micro)',
      },
      fontSize: {
        micro: 'var(--ab-text-micro)',
        label: 'var(--ab-text-label)',
        stat: 'var(--ab-text-stat)',
        'display-sm': 'var(--ab-text-display-sm)',
        'display-md': 'var(--ab-text-display-md)',
        'display-lg': 'var(--ab-text-display-lg)',
        'display-2xl': 'var(--ab-text-display-2xl)',
      },
      letterSpacing: {
        micro: 'var(--ab-track-micro)',
        label: 'var(--ab-track-label)',
        display: 'var(--ab-track-display)',
      },
      transitionDuration: {
        ambient: 'var(--ab-motion-ambient)',
      },
    },
  },
  plugins: [],
};
