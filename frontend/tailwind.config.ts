import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        darkbg: '#080B11',
        darkcard: '#101524',
        darkborder: '#1f293d',
        navy: {
          900: '#0f172a',
          950: '#020617',
        }
      },
      boxShadow: {
        'glow-brand': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-accent': '0 0 20px rgba(99, 102, 241, 0.25)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
