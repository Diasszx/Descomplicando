/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Tokens Semânticos Canônicos */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        brand: {
          teal: {
            DEFAULT: 'hsl(var(--brand-teal))',
            hover: 'hsl(var(--brand-teal-hover))',
            foreground: 'hsl(var(--brand-teal-foreground))',
          },
          amber: {
            DEFAULT: 'hsl(var(--brand-amber))',
            foreground: 'hsl(var(--brand-amber-foreground))',
          },
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          patient: 'hsl(var(--card-patient))',
          'patient-foreground': 'hsl(var(--card-patient-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-bg))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          border: 'hsl(var(--sidebar-border))',
          active: {
            DEFAULT: 'hsl(var(--sidebar-active-bg))',
            foreground: 'hsl(var(--sidebar-active-foreground))',
          },
          card: {
            DEFAULT: 'hsl(var(--sidebar-card-bg))',
            border: 'hsl(var(--sidebar-card-border))',
          },
        },
        game: {
          rose: {
            from: 'hsl(var(--game-rose-from))',
            to: 'hsl(var(--game-rose-to))',
            subtle: 'hsl(var(--game-rose-subtle))',
            foreground: 'hsl(var(--game-rose-foreground))',
          },
          emerald: {
            from: 'hsl(var(--game-emerald-from))',
            to: 'hsl(var(--game-emerald-to))',
            subtle: 'hsl(var(--game-emerald-subtle))',
            foreground: 'hsl(var(--game-emerald-foreground))',
          },
          purple: {
            from: 'hsl(var(--game-purple-from))',
            to: 'hsl(var(--game-purple-to))',
            subtle: 'hsl(var(--game-purple-subtle))',
            foreground: 'hsl(var(--game-purple-foreground))',
          },
          blue: {
            from: 'hsl(var(--game-blue-from))',
            to: 'hsl(var(--game-blue-to))',
            subtle: 'hsl(var(--game-blue-subtle))',
            foreground: 'hsl(var(--game-blue-foreground))',
          },
          amber: {
            from: 'hsl(var(--game-amber-from))',
            to: 'hsl(var(--game-amber-to))',
            subtle: 'hsl(var(--game-amber-subtle))',
            foreground: 'hsl(var(--game-amber-foreground))',
          },
        },
        status: {
          easy: 'hsl(var(--status-easy))',
          medium: 'hsl(var(--status-medium))',
          hard: 'hsl(var(--status-hard))',
          'not-started': 'hsl(var(--status-not-started))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.25rem',
        '2xl': '1rem',
        xl: '0.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
