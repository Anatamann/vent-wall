/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'media', // Automatically follows system preference
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        mood: {
          happy: '#fbbf24',
          sad: '#3b82f6',
          angry: '#ef4444',
          anxious: '#8b5cf6',
          excited: '#f59e0b',
          calm: '#10b981',
          frustrated: '#f97316',
          grateful: '#ec4899',
        },
        worldcup: {
          spain: {
            DEFAULT: '#C60B1E',
            deep: '#8B0000',
            gold: '#FFC400',
            soft: 'rgba(198, 11, 30, 0.18)',
            text: '#fecaca',
          },
          argentina: {
            DEFAULT: '#74ACDF',
            deep: '#3D7AB5',
            sun: '#F6B40E',
            soft: 'rgba(116, 172, 223, 0.20)',
            text: '#e0f2fe',
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}