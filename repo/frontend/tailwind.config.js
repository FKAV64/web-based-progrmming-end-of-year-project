/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        crypto: {
          green: '#10b981',
          red: '#ef4444',
          blue: '#2563eb',
          'dark-bg': '#0f1117',
          'dark-surface': '#1a1f2e',
          'dark-border': '#2d3748',
        }
      }
    },
  },
  plugins: [],
}
