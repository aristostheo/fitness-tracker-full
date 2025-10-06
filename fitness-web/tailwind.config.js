/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ← enable class-based dark mode
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Subtle slate + accent
        brand: {
          50:  "#e9f2ff",
          100: "#d9e9ff",
          200: "#b9d3ff",
          300: "#8eb6ff",
          400: "#5b8dff",
          500: "#3b6dff",   // primary accent
          600: "#2d54d6",
          700: "#2442aa",
          800: "#1f378b",
          900: "#1a2f73",
        },
      },
      boxShadow: {
        card: "0 8px 30px rgba(0,0,0,0.20)",
        soft: "0 2px 10px rgba(0,0,0,0.10)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
};
