/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF4E9",
        ink: "#2B2420",
        clay: "#6B5D4F",
        amber: {
          50: "#FBF1DE",
          200: "#EFCE93",
          400: "#D9A441",
          500: "#C4902F",
          600: "#9C7222",
        },
        sage: {
          50: "#EEF2E8",
          200: "#C3D2B4",
          400: "#8FAE79",
          500: "#728F5E",
          600: "#566E45",
        },
        plum: {
          50: "#F4EAEE",
          200: "#DDB9C7",
          400: "#B3789A",
          500: "#96597C",
          600: "#743E60",
        },
        rust: {
          50: "#F7E9E2",
          200: "#E3B29A",
          400: "#C06A46",
          500: "#A34E31",
          600: "#7E3A23",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        body: ["Quicksand", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.75rem",
      },
      boxShadow: {
        soft: "0 20px 60px -20px rgba(43, 36, 32, 0.25)",
        card: "0 12px 30px -12px rgba(43, 36, 32, 0.18)",
      },
      backgroundImage: {
        grain: "url('/grain.svg')",
      },
    },
  },
  plugins: [],
};
