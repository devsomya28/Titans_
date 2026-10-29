/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50:  '#f5f5ff',
          100: '#ededfa',
          200: '#e0e0f5',
          300: '#c8c8ee',
        },
        teal: {
          50:  '#FEFDDF',
          100: '#FEFDDF',
          200: '#fef3c7',
          300: '#73A5CA',
          400: '#FFC81E',
          500: '#E87F24',
          600: '#d9701a',
          700: '#b85a0e',
        },
        brand: {
          primary: '#E87F24',
          secondary: '#FFC81E',
          cream: '#FEFDDF',
          blue: '#73A5CA',
        }
      },
      fontFamily: {
        sans: ["'Google Sans'", 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-12px)' },
        }
      }
    },
  },
  plugins: [],
}
