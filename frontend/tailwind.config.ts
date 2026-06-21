import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cool technical canvas — calm = working.
        ink: { DEFAULT: "#0B1622", 900: "#0B1622", 800: "#0F1E2E", 700: "#13283C", line: "#1C3247" },
        fog: { DEFAULT: "#E6EEF6", muted: "#7E97AD", faint: "#51697F" },
        // Cool blue = airflow / personas at rest.
        cool: { DEFAULT: "#5BA7E6", soft: "#9FC7E8", deep: "#2E6FA8" },
        // Heat scale = friction radiating. Used as data, not decoration.
        heat: { low: "#F6C453", med: "#F08A3C", high: "#E5484D", ember: "#F0683C" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
