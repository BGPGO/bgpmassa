import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#25D366",
          dark: "#128C7E",
          light: "#DCF8C6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
