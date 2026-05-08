/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FEE2E5',
          100: '#FBBFC6',
          200: '#F4808F',
          300: '#EE5065',
          400: '#E63D52',
          500: '#D4192F',
          600: '#C8102E',
          700: '#A00B24',
          800: '#75071A',
          900: '#4D0512',
        },
        steel: {
          50:  '#F5F5F5',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#B0B0B0',
          400: '#8C8C8C',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#1A1A1A',
        },
        accent: {
          DEFAULT: '#F5C400',
          light:   '#FFF3CC',
        },
        // Warm design system
        cream:  { DEFAULT: '#FAF8F5', 2: '#F0EDE8' },
        paper:  '#FFFFFF',
        ink:    { DEFAULT: '#241E18', 2: '#3A312A' },
        muted:  { DEFAULT: '#7A6E62', 2: '#A89B8C' },
        hair:   { DEFAULT: '#E8E1D6', 2: '#DCD2C2' },
        terra:  { DEFAULT: '#B22234', deep: '#8C1A28', soft: '#F5DCDF' },
        navy:   { DEFAULT: '#002868', deep: '#001A47', soft: '#DDE4EF' },
        'warm-ok':   { DEFAULT: '#047857', bg: '#D1FAE5' },
        'warm-warn': { DEFAULT: '#B45309', bg: '#FEF3C7' },
        'warm-crit': { DEFAULT: '#B22234', bg: '#FEE2E2' },
      },
      fontFamily: {
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'pulse-once': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-crit': {
          '0%, 100%': { boxShadow: '0 4px 12px -3px rgba(178,34,52,0.45), 0 0 0 0 rgba(178,34,52,0.4), inset 0 0 0 1px rgba(255,255,255,0.18)' },
          '50%':       { boxShadow: '0 4px 12px -3px rgba(178,34,52,0.45), 0 0 0 8px rgba(178,34,52,0), inset 0 0 0 1px rgba(255,255,255,0.18)' },
        },
      },
      animation: {
        'pulse-once': 'pulse-once 0.6s ease-in-out 1',
        'slide-in':   'slide-in 0.3s ease-out 1',
        'pulse-crit': 'pulse-crit 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
