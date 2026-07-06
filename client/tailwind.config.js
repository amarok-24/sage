/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          bg: '#FAF8F5',
          sand: '#F0EBE3',
          forest: '#2D5016',
          moss: '#4A7C59',
          bark: '#8B7355',
          charcoal: '#2C2C2C',
          stone: '#6B6B6B',
          green: {
            50: '#f2f6ee',
            100: '#e3ebd7',
            200: '#c9d8b0',
            300: '#a9c084',
            400: '#87A96B',
            500: '#6f9455',
            600: '#587a42',
            700: '#456035',
            800: '#33461f',
            900: '#2D5016',
          },
          brown: {
            50: '#faf6f2',
            100: '#f0e6da',
            200: '#e0cdb8',
            300: '#cbae8f',
            400: '#ab8563',
            500: '#8B7355',
            600: '#6f5c44',
            700: '#574839',
            800: '#3c322a',
            900: '#2C2C2C',
          }
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        nova: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'nova-glow': '0 0 40px 0 rgba(139, 92, 246, 0.35)',
        'nova-glow-lg': '0 0 80px 10px rgba(6, 182, 212, 0.25)',
      },
      animation: {
        breathe: 'breathe 4s ease-in-out infinite',
        'nova-pulse': 'nova-pulse 3s ease-in-out infinite',
        'nova-gradient': 'nova-gradient 6s ease infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'nova-pulse': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(0.98)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        'nova-gradient': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      }
    },
  },
  plugins: [],
}
