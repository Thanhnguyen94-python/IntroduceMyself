import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f6ff",
          100: "#dbe9ff",
          200: "#bdd6ff",
          300: "#8cb8ff",
          400: "#5a93ff",
          500: "#0B5FFF",
          600: "#084EDB",
          700: "#083ea8",
          800: "#0c346f",
          900: "#0d2e5b"
        }
      }
    }
  },
  plugins: []
};

export default config;
