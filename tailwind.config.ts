import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          online: "#22c55e",
          slow: "#eab308",
          offline: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
