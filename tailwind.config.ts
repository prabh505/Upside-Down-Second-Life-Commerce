import type { Config } from "tailwindcss";

const config: Config = {
  // Scan every file under src/ to ensure Tailwind purges only unused classes.
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Brand color palette — single source of truth for the SLC design system.
      //
      // Amazon-inspired: cool dark-slate surfaces (700–950) paired with the
      // signature orange accent (400–600) and clean light slate text (50–300).
      // The hue intentionally shifts from neutral slate to orange at the 400
      // stop — the dark end is for surfaces/borders, the mid for accents/CTAs,
      // the light end for type.
      colors: {
        brand: {
          50: "#f6f8fa",
          100: "#eceff3",
          200: "#d3dae2",
          300: "#a7b3c1",
          400: "#ffa424", // accent — bright Amazon orange
          500: "#ff9900", // core Amazon orange (primary CTA)
          600: "#e07d00", // hover / pressed
          700: "#2a3a4a", // slate border
          800: "#1d2a38", // surface border / muted
          900: "#162230", // card surface
          950: "#0d141d", // app background
        },
        // Orange accent, addressable directly when slate "brand" would be wrong.
        accent: {
          DEFAULT: "#ff9900",
          soft: "#ffa424",
          deep: "#e07d00",
        },
        // Condition grade accent palette (matches GRADE_COLORS in constants.ts)
        grade: {
          A: "#22c55e", // Like New — green
          B: "#84cc16", // Very Good — lime
          C: "#eab308", // Good — yellow
          D: "#f97316", // Acceptable — orange
          E: "#ef4444", // Poor — red
        },
      },
      // Typography — Inter for body, Geist Mono for code/data.
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      // Animation tokens for micro-interactions.
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 153, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 153, 0, 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "slide-up": "slide-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
