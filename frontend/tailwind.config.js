/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
  extend: {
    fontFamily: {
      jakarta: ["Plus Jakarta Sans", "sans-serif"],
    },
    colors: {
      yellow: {
        400: '#e1ca9f', // Lighter variant for hovers
        500: '#D0B079', // Primary Brand Gold
        600: '#b8965f', // Darker variant
      }
    }
  },
},
  plugins: [],
};
