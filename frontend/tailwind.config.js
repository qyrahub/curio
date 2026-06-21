/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFBF4",
        ink: "#2C2A4A",
        coral: "#FF7A66",
        sun: "#FFC94D",
        leaf: "#5BBF8A",
        sky: "#5AA7E6",
      },
    },
  },
  plugins: [],
};
