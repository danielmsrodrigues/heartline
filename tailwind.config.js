/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        attention: {
          ok: "#8CB369",
          watch: "#F4A259",
          warning: "#E07A5F",
          alert: "#D64545",
        },
      },
    },
  },
  plugins: [],
};
