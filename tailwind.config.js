/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Paleta usada na app (ver também constants/colors.ts)
      colors: {
        brand: '#1D9E75',
        surface: {
          bg: '#0A0A0A',
          card: '#111111',
          border: '#151515',
        },
        accent: {
          blue: '#4A90D9',
        },
        attention: {
          ok: "#1D9E75",
          watch: "#EF9F27",
          warning: "#EF9F27",
          alert: "#E24B4A",
        },
        txt: {
          primary: '#F5F5F5',
          secondary: '#888888',
          muted: '#555555',
        },
      },
    },
  },
  plugins: [],
};
