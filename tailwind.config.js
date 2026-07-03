/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          accent: 'var(--app-accent)',
          'accent-soft': 'var(--app-accent-soft)',
          bg: 'var(--app-bg)',
          surface: 'var(--app-surface)',
          'surface-2': 'var(--app-surface-2)',
          text: 'var(--app-text)',
          muted: 'var(--app-text-muted)',
          success: 'var(--app-success)',
        },
      },
      fontFamily: {
        display: ['var(--app-font-display)'],
        body: ['var(--app-font-body)'],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: { 120: '120ms', 220: '220ms', 380: '380ms', 600: '600ms' },
    },
  },
  plugins: [],
};
