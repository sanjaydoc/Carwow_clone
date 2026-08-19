/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Medical blue palette (kept under the `clay` token name so the whole
        // app re-themes from this one place). 500 is the primary brand blue
        // (the Google-button blue #4285F4).
        clay: {
          50: '#EAF1FE',
          100: '#D6E4FD',
          200: '#AFC9FB',
          300: '#83A9F8',
          400: '#5B90F6',
          500: '#4285F4', // primary
          600: '#2F6FE0',
          700: '#1F59C2',
          800: '#1A4A9E',
          900: '#153A7C',
        },
        // Clinical whites (kept under the `cream` token name).
        cream: {
          50: '#FFFFFF',
          100: '#FDFDFC',
          200: '#F4F5F6',
          300: '#E7E8EA',
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
