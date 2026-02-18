import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v3+ runs JIT by default.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      // 8px spacing system tokens (additive, keeps default Tailwind spacing).
      spacing: {
        1: "0.5rem", // 8px
        2: "1rem", // 16px
        3: "1.5rem", // 24px
        4: "2rem", // 32px
        5: "2.5rem", // 40px
        6: "3rem", // 48px
        7: "3.5rem", // 56px
        8: "4rem", // 64px
        9: "4.5rem", // 72px
        10: "5rem", // 80px
        12: "6rem", // 96px
        14: "7rem", // 112px
        16: "8rem", // 128px
        20: "10rem", // 160px
        24: "12rem", // 192px
      },
      // Brand palette for premium dark luxury UI.
      colors: {
        brand: {
          bg: "#0B0B0F",
          surface: "#141419",
          gold: "#C6A75E",
          text: "#F5F5F5",
          muted: "#9CA3AF",
          success: "#1E3A34",
          danger: "#3A0F14",
        },
      },
      // Typography foundation: modern sans + editorial serif headings.
      fontFamily: {
        sans: ["Inter", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Playfair Display", "Cormorant Garamond", "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.5rem", letterSpacing: "0.01em" }],
        base: ["1rem", { lineHeight: "1.75rem", letterSpacing: "0.005em" }],
        lg: ["1.125rem", { lineHeight: "1.875rem", letterSpacing: "0.005em" }],
        xl: ["1.25rem", { lineHeight: "2rem", letterSpacing: "0em" }],
        "2xl": ["1.5rem", { lineHeight: "2.25rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem", { lineHeight: "2.5rem", letterSpacing: "-0.015em" }],
        "4xl": ["2.25rem", { lineHeight: "2.875rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        xs: "0.375rem",
        sm: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
      // Soft shadows tuned for dark, luxury elevation.
      boxShadow: {
        soft: "0 8px 30px rgba(0, 0, 0, 0.38)",
        card: "0 16px 36px rgba(0, 0, 0, 0.46)",
        glow: "0 0 0 1px rgba(198, 167, 94, 0.20), 0 12px 36px rgba(198, 167, 94, 0.14)",
        "glow-hover": "0 0 0 1px rgba(198, 167, 94, 0.45), 0 18px 42px rgba(198, 167, 94, 0.22)",
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionTimingFunction: {
        luxury: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, theme }) {
      addUtilities({
        // Blurred glass surface for nav and overlays.
        ".glass-panel": {
          backgroundColor: "rgba(20, 20, 25, 0.58)",
          border: "1px solid rgba(245, 245, 245, 0.12)",
          boxShadow: theme("boxShadow.soft"),
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        },
        // Elevated content card with restrained contrast.
        ".premium-card": {
          backgroundColor: theme("colors.brand.surface"),
          border: "1px solid rgba(245, 245, 245, 0.10)",
          borderRadius: theme("borderRadius.xl"),
          boxShadow: theme("boxShadow.card"),
          transitionProperty: "transform, box-shadow, border-color",
          transitionDuration: "320ms",
          transitionTimingFunction: theme("transitionTimingFunction.luxury"),
        },
        // Elegant accent stroke.
        ".gold-border": {
          border: "1px solid rgba(198, 167, 94, 0.52)",
        },
        // Gold lift on hover for premium interactions.
        ".gold-glow-hover": {
          transitionProperty: "box-shadow, border-color, transform",
          transitionDuration: "300ms",
          transitionTimingFunction: theme("transitionTimingFunction.luxury"),
          "&:hover": {
            borderColor: "rgba(198, 167, 94, 0.65)",
            boxShadow: theme("boxShadow.glow-hover"),
            transform: "translateY(-2px)",
          },
        },
        // Consistent section spacing token.
        ".section-padding": {
          paddingTop: theme("spacing.8"),
          paddingBottom: theme("spacing.8"),
        },
        // Shared heading style across hero and section titles.
        ".luxury-heading": {
          fontFamily: theme("fontFamily.heading"),
          color: theme("colors.brand.text"),
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontWeight: "600",
        },
      });
    }),
  ],
};
