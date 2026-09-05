/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#F5FAEF',   // Very Light Background
          100: '#D8F7A5',  // Light Green
          200: '#c5ee8d',
          300: '#aee474',
          400: '#9BE85C',  // Lime Green
          500: '#289B8C',  // Teal
          600: '#23735F',  // Dark Green
          700: '#1b5c4c',  // Darker Green
          800: '#134237',
          900: '#080808',  // Black
          950: '#040404',
        },
        violet: {
          50: '#F5FAEF',
          100: '#D8F7A5',
          200: '#c5ee8d',
          300: '#aee474',
          400: '#9BE85C',
          500: '#289B8C',
          600: '#23735F',
          700: '#1b5c4c',
          800: '#134237',
          900: '#080808',
        }
      }
    },
  },
  plugins: [],
}
