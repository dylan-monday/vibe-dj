import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark synthwave palette from CLAUDE.md
        background: "#18181b",  // Warm dark (zinc-900)
        foreground: "#fafafa",  // Light text
        primary: {
          DEFAULT: "#7c3aed",   // Purple (violet-600)
          dark: "#5b21b6",      // Darker purple
        },
        accent: {
          magenta: "#ec4899",   // Pink-500
          cyan: "#06b6d4",      // Cyan-500
        },
        surface: {
          DEFAULT: "#27272a",   // Card background (zinc-800)
          elevated: "#3f3f46",  // Elevated surface (zinc-700)
        },
      },
      fontFamily: {
        display: ["Instrument Serif", "serif"],
        sans: ["Satoshi", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
