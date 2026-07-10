/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Claude-inspired warm orange / clay palette
        clay: {
          50: '#FBF3EF',
          100: '#F7E4DB',
          200: '#EFC8B6',
          300: '#E6AA90',
          400: '#DE8F6E',
          500: '#D97757', // primary
          600: '#C15F3C',
          700: '#9E4B2E',
          800: '#7C3B25',
          900: '#5D2D1D',
        },
        cream: {
          50: '#FDFCFA',
          100: '#FAF9F5',
          200: '#F0EEE6',
          300: '#E8E5DA',
        },
        ink: {
          700: '#3A3733',
          800: '#282624',
          900: '#141413',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Poppins"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(20,20,19,0.06), 0 8px 24px rgba(20,20,19,0.06)',
        'card-hover': '0 4px 12px rgba(20,20,19,0.10), 0 16px 40px rgba(20,20,19,0.10)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
