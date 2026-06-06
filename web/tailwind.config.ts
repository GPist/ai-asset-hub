import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hub: {
          50:  "#f0f4ff",
          100: "#dde6ff",
          200: "#c2d0ff",
          300: "#9db0ff",
          400: "#7385ff",
          500: "#4f5fff",
          600: "#3a3fef",
          700: "#3131d3",
          800: "#2828aa",
          900: "#262887",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
