/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tactical: {
          bg: '#0a0e12',
          panel: '#151c24',
          border: '#2a3540',
          hover: '#1a222c',
        },
        cyber: {
          cyan: '#00d4ff',
          green: '#00ff9d',
          amber: '#ffb800',
          red: '#ff3d5a',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b8c5d1',
          muted: '#5a6a78',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
