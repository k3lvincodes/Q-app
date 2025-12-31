/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: '#EB4219',
        mainBg: '#F6F4F1'
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'sans-serif'],
        helvetica: ['Helvetica', 'sans-serif'],
        'helvetica-bold': ['Helvetica-Bold', 'sans-serif'],
        segoe: ['"Segoe UI"', 'sans-serif'],
        'segoe-bold': ['"Segoe UI"', 'sans-serif'], // Assuming bold is handled by font-weight or system fallback
      },
    },
  },
  plugins: [],
}