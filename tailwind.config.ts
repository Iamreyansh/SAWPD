import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        bone: {
          DEFAULT: "#FAF9F7",
          strong: "#F5F2EC",
          foreground: "#111111",
        },
        ink: {
          DEFAULT: "#111111",
          foreground: "#FAF9F7",
        },
        vermillion: {
          DEFAULT: "#FF4A1C",
          deep: "#DC320C",
          soft: "#FFEEE7",
          foreground: "#FAF9F7",
        },
        muted: {
          DEFAULT: "#8A857C",
          foreground: "#FAF9F7",
        },
        success: "#0F7A3E",
        warning: "#B45309",
        border: "rgba(17,17,17,0.07)",
        input: "rgba(17,17,17,0.07)",
        ring: "#FF4A1C",
        background: "#FAF9F7",
        foreground: "#111111",
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        lg: "0.875rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(17,17,17,0.04)",
        soft: "0 1px 2px rgba(17,17,17,0.04), 0 0 0 1px rgba(17,17,17,0.04)",
        sm: "0 2px 8px -2px rgba(17,17,17,0.06), 0 0 0 1px rgba(17,17,17,0.03)",
        md: "0 4px 18px -4px rgba(17,17,17,0.08), 0 0 0 1px rgba(17,17,17,0.04)",
        lg: "0 18px 50px -12px rgba(17,17,17,0.18), 0 0 0 1px rgba(17,17,17,0.04)",
        float: "0 -8px 30px rgba(17,17,17,0.08), 0 0 0 1px rgba(17,17,17,0.04)",
        glow: "0 8px 28px -8px rgba(255,74,28,0.35), 0 0 0 1px rgba(255,74,28,0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 0.4s ease-out",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
