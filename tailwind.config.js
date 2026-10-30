/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#068D9D",
        ink: "#53599A",
        "ink-strong": "#2F3366",
        steel: "#6D9DC5",
        aqua: "#80DED9",
        "aqua-soft": "#AEECEF",
        surface: "#FFFFFF",
        bg: "#F4FAFA",
        sea: "#DCF3F4",
        coral: "#E8927C",
        amber: "#F0C987",
        "coral-ink": "#8B4538",
        "amber-ink": "#695126",
        "sand-ink": "#7B7650",
        "dark-bg": "#18252F",
        "dark-surface": "#22333F",
        "dark-ink": "#E8F4F5"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        marine: "0 8px 24px rgb(83 89 154 / 0.15)",
        "marine-lg": "0 18px 48px rgb(83 89 154 / 0.18)"
      }
    }
  },
  plugins: []
};
