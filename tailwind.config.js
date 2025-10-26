/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // <- critical: prevents OS dark mode from turning the UI black
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
