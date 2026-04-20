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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
      },
      animation: {
        'pulse-once': 'pulse-once 0.6s ease-in-out 1',
        'slide-in': 'slide-in 0.3s ease-out 1',
      },
    },
  },
  plugins: [],
}
