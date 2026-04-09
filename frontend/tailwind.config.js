/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff7f5',
          100: '#ffede8',
          200: '#ffd9cf',
          300: '#ffb8a8',
          400: '#ff9580',
          500: '#f97352',
          600: '#e85d3a',
          700: '#c44a2d',
          800: '#a03d26',
          900: '#843520',
        },
        rose: {
          50:  '#fff5f7',
          100: '#ffe8ee',
          200: '#ffd1df',
          300: '#ffb3c7',
          400: '#ff8aaa',
        },
        warm: {
          50:  '#fffbfa',
          100: '#fff5f2',
          200: '#ffe8e0',
          300: '#ffd4c7',
          400: '#ffb8a3',
          500: '#ff9b7f',
        },
        calm: {
          50:  '#fef9f7',
          100: '#fdf0eb',
          200: '#fbe0d6',
          300: '#f7c9b8',
          400: '#f0a78e',
          500: '#e88565',
        },
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50:  '#fff7f5',
          100: '#ffede8',
          200: '#ffd9cf',
          300: '#ffb8a8',
          400: '#ff9580',
          500: '#f97352',
          600: '#e85d3a',
          700: '#c44a2d',
          800: '#a03d26',
          900: '#843520',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.04), 0 10px 20px -2px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        'warm': '0 4px 20px -4px rgba(249, 115, 82, 0.12)',
        'float': '0 8px 30px -6px rgba(0, 0, 0, 0.08)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      }
    },
  },
  plugins: [],
}
