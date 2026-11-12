import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssAspectRatio from "@tailwindcss/aspect-ratio";

// The brand moved from plum to cobalt (2026-11-12). About 300 older class
// names (`text-purple-600`, `bg-violet-50`, `from-fuchsia-500` ...) were the
// brand colour hard-coded. Pointing those three scales at one cobalt ramp
// re-brands them in place; new code uses `primary` / `signal`, never these.
const cobaltRamp = {
  50: "#EEF2FF",
  100: "#E0E8FF",
  200: "#C7D4FE",
  300: "#A3B8FD",
  400: "#7C97F8",
  500: "#5573EE",
  600: "#2648D6",
  700: "#1E3AB4",
  800: "#1C318F",
  900: "#1B2C70",
  950: "#121B45",
};

// Status scales, re-tuned for contrast. Tailwind's stock 600s fail small text
// on white (emerald 3.77, amber 3.19, teal 3.74, sky 4.10, orange 3.56) and the
// app pairs `text-*-600` with `dark:text-*-300` in hundreds of places. These
// ramps keep each step's role but measure, on #FFFFFF / the muted fill / the
// dark card #121A31:
//   600: 5.2 to 5.9 / 4.5 to 5.1 / -   (light text, AA)
//   500: 3.2 to 3.9 on white            (icons and fills, 3:1)
//   300 and 400: 6.4 to 10.6 on the dark card (dark text, AA)
// Greens join the mint signal family and yellows join amber, so a stray
// raw class still lands inside the system.
const mintRamp = {
  50: "#ECFBF4",
  100: "#D2F5E4",
  200: "#A6EBCB",
  300: "#6EDDAE",
  400: "#3CCB91",
  500: "#15A472",
  600: "#0A7A50",
  700: "#0B6B47",
  800: "#0C553A",
  900: "#0B4531",
  950: "#04271B",
};
const amberRamp = {
  50: "#FFF8EB",
  100: "#FEEDC7",
  200: "#FDD98A",
  300: "#FCC24D",
  400: "#F5A524",
  500: "#C77A06",
  600: "#A15C00",
  700: "#8A4D00",
  800: "#6F3F05",
  900: "#5C3408",
  950: "#341B02",
};
const tealRamp = {
  50: "#EDFBF8",
  100: "#D0F4EE",
  200: "#A3E8DD",
  300: "#68D5C6",
  400: "#33BCAB",
  500: "#14998A",
  600: "#0C7A6E",
  700: "#0B675D",
  800: "#0D524B",
  900: "#0E443F",
  950: "#042825",
};
const skyRamp = {
  50: "#EEF8FD",
  100: "#D8EFFA",
  200: "#B1DEF4",
  300: "#7CC6EC",
  400: "#3FA7DD",
  500: "#1688C4",
  600: "#0B6A9C",
  700: "#0A5A85",
  800: "#0D4A6B",
  900: "#103E59",
  950: "#0A2639",
};
const orangeRamp = {
  50: "#FFF4ED",
  100: "#FFE5D3",
  200: "#FEC7A5",
  300: "#FDA26D",
  400: "#F97B38",
  500: "#E25F14",
  600: "#B8470A",
  700: "#9A3A0B",
  800: "#7C3010",
  900: "#652A10",
  950: "#381305",
};

export default {
  // Hover styles only on devices that can hover: on touch screens Tailwind 3's
  // `hover:` otherwise sticks after a tap.
  future: { hoverOnlyWhenSupported: true },
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
        // The second colour: matches, scores, progress. Fill (`bg-signal`),
        // text (`text-signal`, readable on card and canvas in both themes)
        // and a quiet chip background (`bg-signal-tint`).
        signal: {
          DEFAULT: "hsl(var(--signal))",
          foreground: "hsl(var(--signal-foreground))",
          tint: "hsl(var(--signal-tint))",
        },
        purple: cobaltRamp,
        violet: cobaltRamp,
        fuchsia: cobaltRamp,
        indigo: cobaltRamp,
        emerald: mintRamp,
        green: mintRamp,
        teal: tealRamp,
        amber: amberRamp,
        yellow: amberRamp,
        sky: skyRamp,
        orange: orangeRamp,
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
        // The three text steps and the strong neutral fill, for new code.
        // `text-ink-subtle` equals `text-muted-foreground`; `text-ink-muted`
        // is the AAA secondary step between it and the foreground.
        ink: {
          DEFAULT: "hsl(var(--ink))",
          muted: "hsl(var(--ink-muted))",
          subtle: "hsl(var(--ink-subtle))",
        },
        "surface-strong": "hsl(var(--surface-strong))",
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
      // US launch type scale (docs/design/2026-11-11-type-color-principles.md
      // section 8.1). Body is 16px; nothing renders below 12px. Display steps
      // keep a rem term inside clamp() so text-only zoom still scales them.
      // The older names (display, title, h1, h2, h3, body, caption) are kept
      // and re-pointed at the nearest new step so existing screens follow.
      fontSize: {
        "display-lg": ["clamp(2.5rem, 1.75rem + 3.2vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "800" }],
        "display-sm": ["clamp(2rem, 1.5rem + 2vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.015em", fontWeight: "700" }],
        "headline-sm": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em", fontWeight: "700" }],
        "title-lg": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em", fontWeight: "600" }],
        "title-md": ["1.125rem", { lineHeight: "1.625rem", fontWeight: "600" }],
        "title-sm": ["1rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "body-md": ["1rem", { lineHeight: "1.5rem" }],
        "body-sm": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.005em" }],
        // `text-label` was used about 60 times with no definition, so those
        // labels silently inherited 16px body text. It maps onto the existing
        // --text-label-* tokens (14px / 20px / 600).
        label: [
          "var(--text-label-size)",
          { lineHeight: "var(--text-label-lh)", fontWeight: "var(--text-label-w)" },
        ],
        "label-lg": ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.005em", fontWeight: "600" }],
        "label-md": ["0.8125rem", { lineHeight: "1rem", letterSpacing: "0.01em", fontWeight: "600" }],
        "caption-sm": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em", fontWeight: "500" }],
        display: ["clamp(2rem, 1.5rem + 2vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        title: ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.015em", fontWeight: "700" }],
        h1: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em", fontWeight: "700" }],
        h3: ["1.125rem", { lineHeight: "1.625rem", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.5rem" }],
        caption: ["0.8125rem", { lineHeight: "1.25rem" }],
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
        "fade-up": "fade-up 0.28s var(--ease-out-expo) both",
        "fade-in": "fade-in 0.24s var(--ease-out-expo) both",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssAspectRatio],
} satisfies Config;
