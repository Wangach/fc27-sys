/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        arena: { 950: '#080b0a', 900: '#0d1110', 850: '#121715', 800: '#171d1b', 700: '#222a27' },
        volt: '#d7ff3f',
      },
      boxShadow: { glow: '0 0 30px rgba(215,255,63,.16)' },
    },
  },
  plugins: [],
};
