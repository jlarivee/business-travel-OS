/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E1114',
        surface: '#171C21',
        panel: '#20272D',
        line: '#303A42',
        text: '#F5F1EA',
        muted: '#A9B0B5',
        quiet: '#737E86',
        amber: '#D99C42',
        sky: '#5EA6C8',
        green: '#69A27A',
        red: '#D46A5E',
        violet: '#8B7ED8',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(0,0,0,0.24)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
