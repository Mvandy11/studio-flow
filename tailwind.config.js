/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'studio-bg': '#08080c',
        'studio-surface': 'rgba(255,255,255,0.04)',
        'studio-border': 'rgba(255,255,255,0.08)',
        'studio-muted': '#888',
        'studio-accent': '#4f8ef7',
        'studio-gold': '#fabc50',
        'studio-live': '#f87171',
      },
    },
  },
  plugins: [],
};
