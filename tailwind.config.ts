import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssAspectRatio from "@tailwindcss/aspect-ratio";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          // Hover/pressed as a real token rather than `bg-primary/90`. An
          // opacity step lets the surface underneath bleed through, so the
          // same "hover" looks different on a card than on the canvas; a
          // named colour does not.
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Categorical palette (src/index.css --chart-*) — data-viz AND the
        // landing's decorative brand logomarks. Mapped through the additive
        // --chart-N-hsl bridge so opacity modifiers work (bg-chart-1/10);
        // the raw hex --chart-N tokens remain for non-Tailwind consumers.
        chart: {
          "1": "hsl(var(--chart-1-hsl))",
          "2": "hsl(var(--chart-2-hsl))",
          "3": "hsl(var(--chart-3-hsl))",
          "4": "hsl(var(--chart-4-hsl))",
          "5": "hsl(var(--chart-5-hsl))",
          "6": "hsl(var(--chart-6-hsl))",
          "7": "hsl(var(--chart-7-hsl))",
          "8": "hsl(var(--chart-8-hsl))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // The ACTIVE/selected fill. Defined in all six token scopes (it used
        // to exist only inside `.surface-studio`), so it is safe to expose as
        // a utility rather than being reached for via inline `hsl(var())`.
        "nav-active": "hsl(var(--nav-active))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      // `textColor` overrides ONLY the text-* utilities; every other family
      // (bg-, border-, ring-, fill-) still resolves from `colors` above. That
      // split is deliberate: the accent as a FILL and the accent as INK want
      // opposite lightness on a dark page, and one token cannot be both. So
      // `bg-primary` keeps the vivid button and `text-primary` gets a value
      // that is actually readable on a card. See --primary-ink in index.css.
      // Identical to --primary in light mode, so light rendering is unchanged.
      textColor: {
        primary: {
          DEFAULT: "hsl(var(--primary-ink))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Redesign two-radius system: one for controls, one for containers.
        control: "8px",
        container: "16px",
      },
      // ── Editorial type scale (Compass §7) ─────────────────────────────────
      // Named steps compose with `font-display` for the Plus Jakarta look on
      // display/heading text; body/caption stay Inter. Additive — the default
      // xs…9xl utilities remain untouched so existing screens don't shift.
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        // Data face — scores, counts, countdowns, salaries. Distinctive, tabular.
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        display: ["clamp(2rem, 4vw, 2.75rem)", { lineHeight: "1.08", letterSpacing: "-0.022em", fontWeight: "800" }],
        title: ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.018em", fontWeight: "700" }],
        h2: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.012em", fontWeight: "700" }],
        h3: ["1.0625rem", { lineHeight: "1.4", letterSpacing: "-0.008em", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.6", letterSpacing: "-0.002em" }],
        caption: ["0.8125rem", { lineHeight: "1.45" }],
      },
      // Token-driven elevation scale — resolves per-theme via CSS vars so dark
      // stays soft (no harsh black halos). Distinct names keep the default
      // shadow-sm/md/lg/xl utilities backwards-compatible.
      boxShadow: {
        soft: "var(--shadow-soft)",
        panel: "var(--shadow-panel)",
        pop: "var(--shadow-pop)",
        float: "var(--shadow-float)",
      },
      // Motion tokens surfaced as utilities so a component never hardcodes a
      // duration or a curve. `duration-base ease-standard` is the default
      // pairing; `ease-expo` (= decelerate) is for entrances, `ease-accelerate`
      // for exits. Mirrors src/lib/motion.ts for framer-motion.
      transitionTimingFunction: {
        expo: "var(--ease-out-expo)",
        standard: "var(--ease-standard)",
        decelerate: "var(--ease-decelerate)",
        accelerate: "var(--ease-accelerate)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        base: "var(--motion-base)",
        slow: "var(--motion-slow)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s var(--ease-out-expo) both",
        "fade-in": "fade-in 0.3s var(--ease-out-expo) both",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssAspectRatio],
} satisfies Config;
