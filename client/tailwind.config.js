/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Medical red palette (kept under the `clay` token name so the whole
        // app re-themes from this one place). 500 is the primary brand red.
        clay: {
          50: '#FEF2F2',
          100: '#FDE1E1',
          200: '#F9C4C4',
          300: '#F09A9A',
          400: '#E86A6A',
          500: '#DC2626', // primary
          600: '#BE1B1B',
          700: '#991B1B',
          800: '#7A1616',
          900: '#5A1111',
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
