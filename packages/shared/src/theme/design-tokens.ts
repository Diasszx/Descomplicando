/**
 * FonoGames Design System — Canonical Design Tokens
 *
 * Fonte única de verdade (Single Source of Truth) para cores semânticas,
 * raios de borda e tipografia entre Web (`apps/web`) e Mobile (`apps/mobile`).
 *
 * REGRA DE OURO: Nenhum componente deve conter valores hexadecimais ou RGB
 * hardcodados. Consuma sempre estes tokens (ou as CSS variables equivalentes no Web).
 */

export type ThemeMode = 'light' | 'dark';

export type GameCategoryTheme = 'rose' | 'emerald' | 'purple' | 'blue' | 'amber';

export interface GameThemeTokens {
  readonly from: string;
  readonly to: string;
  readonly subtle: string;
  readonly foreground: string;
}

export interface ColorPalette {
  readonly background: string;
  readonly foreground: string;
  readonly card: string;
  readonly cardForeground: string;
  readonly popover: string;
  readonly popoverForeground: string;
  readonly border: string;
  readonly input: string;
  readonly ring: string;

  readonly primary: string;
  readonly primaryForeground: string;
  readonly secondary: string;
  readonly secondaryForeground: string;
  readonly muted: string;
  readonly mutedForeground: string;
  readonly accent: string;
  readonly accentForeground: string;
  readonly destructive: string;
  readonly destructiveForeground: string;

  readonly brand: {
    readonly teal: string;
    readonly tealHover: string;
    readonly tealForeground: string;
    readonly amber: string;
    readonly amberForeground: string;
  };

  readonly sidebar: {
    readonly bg: string;
    readonly border: string;
    readonly activeBg: string;
    readonly activeForeground: string;
    readonly cardBg: string;
    readonly cardBorder: string;
  };

  readonly game: Record<GameCategoryTheme, GameThemeTokens>;

  readonly status: {
    readonly easy: string;
    readonly medium: string;
    readonly hard: string;
    readonly notStarted: string;
    readonly success: string;
    readonly successSubtle: string;
    readonly successForeground: string;
    readonly error: string;
    readonly errorSubtle: string;
    readonly errorForeground: string;
  };

  readonly shadow: {
    readonly color: string;
  };
}

export const lightPalette: ColorPalette = {
  background: '#f8fafc',
  foreground: '#0f172a',
  card: '#ffffff',
  cardForeground: '#0f172a',
  popover: '#ffffff',
  popoverForeground: '#0f172a',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#1ba698',

  primary: '#1ba698',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  accent: '#e9faf8',
  accentForeground: '#126e65',
  destructive: '#ef4444',
  destructiveForeground: '#f8fafc',

  brand: {
    teal: '#0d9488',
    tealHover: '#0f766e',
    tealForeground: '#ffffff',
    amber: '#e7ab08',
    amberForeground: '#0f172a',
  },

  sidebar: {
    bg: '#ffffff',
    border: '#e2e8f0',
    activeBg: '#fbf4c6',
    activeForeground: '#0f172a',
    cardBg: '#f2f1fd',
    cardBorder: '#d3d1f8',
  },

  game: {
    rose: {
      from: '#f43f5e',
      to: '#f1193d',
      subtle: '#fff0f2',
      foreground: '#d90d2f',
    },
    emerald: {
      from: '#1ccf7b',
      to: '#14b8a6',
      subtle: '#eefcf5',
      foreground: '#16a261',
    },
    purple: {
      from: '#7c3aed',
      to: '#4f46e5',
      subtle: '#f5f0fd',
      foreground: '#641de6',
    },
    blue: {
      from: '#3b82f6',
      to: '#3c5ede',
      subtle: '#eff5fe',
      foreground: '#0b5ce0',
    },
    amber: {
      from: '#f7c231',
      to: '#f59e0b',
      subtle: '#fefaf0',
      foreground: '#c77f05',
    },
  },

  status: {
    easy: '#18b46b',
    medium: '#e7ab08',
    hard: '#ef4444',
    notStarted: '#64748b',
    success: '#059669',
    successSubtle: '#d1fae5',
    successForeground: '#065f46',
    error: '#dc2626',
    errorSubtle: '#fee2e2',
    errorForeground: '#7f1d1d',
  },

  shadow: {
    color: '#000000',
  },
} as const;

export const darkPalette: ColorPalette = {
  background: '#0f172a',
  foreground: '#f8fafc',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  popover: '#1e293b',
  popoverForeground: '#f8fafc',
  border: '#2b3b55',
  input: '#2b3b55',
  ring: '#20c4b4',

  primary: '#20c4b4',
  primaryForeground: '#0f172a',
  secondary: '#26344a',
  secondaryForeground: '#f8fafc',
  muted: '#26344a',
  mutedForeground: '#94a3b8',
  accent: '#0e5850',
  accentForeground: '#91ede4',
  destructive: '#7f1d1d',
  destructiveForeground: '#f8fafc',

  brand: {
    teal: '#20c4b4',
    tealHover: '#2cd9c8',
    tealForeground: '#0f172a',
    amber: '#f7c231',
    amberForeground: '#0f172a',
  },

  sidebar: {
    bg: '#1e293b',
    border: '#2b3b55',
    activeBg: '#665b19',
    activeForeground: '#fbf4c6',
    cardBg: '#221f47',
    cardBorder: '#35316b',
  },

  game: {
    rose: {
      from: '#e6193b',
      to: '#c11532',
      subtle: '#4d1922',
      foreground: '#f88699',
    },
    emerald: {
      from: '#1da566',
      to: '#188c7f',
      subtle: '#174530',
      foreground: '#63e3a7',
    },
    purple: {
      from: '#6726d9',
      to: '#4038c4',
      subtle: '#29194d',
      foreground: '#b486f8',
    },
    blue: {
      from: '#276ce2',
      to: '#3154c4',
      subtle: '#192b4d',
      foreground: '#86b4f8',
    },
    amber: {
      from: '#e6b119',
      to: '#c17d15',
      subtle: '#453817',
      foreground: '#fad16b',
    },
  },

  status: {
    easy: '#34d399',
    medium: '#f7c231',
    hard: '#f15b5b',
    notStarted: '#94a3b8',
    success: '#10b981',
    successSubtle: '#064e3b',
    successForeground: '#a7f3d0',
    error: '#f87171',
    errorSubtle: '#450a0a',
    errorForeground: '#fecaca',
  },

  shadow: {
    color: '#000000',
  },
} as const;

export const designTokens = {
  colors: {
    light: lightPalette,
    dark: darkPalette,
  },
  radius: {
    card: 24,
    banner: 16,
    pill: 12,
    control: 8,
    sm: 6,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
  },
  typography: {
    fontFamily: {
      sans: 'Inter',
    },
    fontSize: {
      xs: 12,
      sm: 13,
      base: 14,
      md: 16,
      lg: 18,
      xl: 24,
      '2xl': 30,
    },
  },
} as const;

export function getThemePalette(mode: ThemeMode = 'light'): ColorPalette {
  return mode === 'dark' ? darkPalette : lightPalette;
}
