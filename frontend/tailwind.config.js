/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17251f",
        canvas: "#f4f0e6",
        moss: "#315c45",
        leaf: "#5b8f63",
        lime: "#d4e8a3",
        clay: "#c7643b",
        amber: "#d6a13f",
        cream: "#fffdf7",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Manrope", "Avenir Next", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        card: "0 18px 50px rgba(23, 37, 31, 0.10)",
      },
    },
  },
  plugins: [],
};
