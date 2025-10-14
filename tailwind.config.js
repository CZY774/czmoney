/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        background: "#0b1221",
        card: "#0f1b2b",
        accent: "#1f8ef1",
        muted: "#9fb0c8",
        highlight: "#00d1b2",
        danger: "#ef4444",
        success: "#10b981",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
