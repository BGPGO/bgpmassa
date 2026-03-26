import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#25D366",
          dark: "#128C7E",
          light: "#d9fdd3",
        },
        wa: {
          sidebar: "#202c33",
          header: "#202c33",
          panel: "#ffffff",
          chat: "#efeae2",
          "msg-out": "#d9fdd3",
          "msg-in": "#ffffff",
          "panel-hover": "#f5f6f6",
          "panel-active": "#ffffff",
          search: "#f0f2f5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
