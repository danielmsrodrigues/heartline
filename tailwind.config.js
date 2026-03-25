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
        brand: '#E85D5D',
        surface: {
          bg: '#0A0A0A',
          card: '#1A1A1A',
          border: '#2A2A2A',
        },
        accent: {
          blue: '#4A90D9',
        },
        attention: {
          ok: "#8CB369",
          watch: "#F5A623",
          warning: "#E8973A",
          alert: "#D9534F",
        },
        txt: {
          primary: '#F5F5F5',
          secondary: '#9CA3AF',
          muted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};
