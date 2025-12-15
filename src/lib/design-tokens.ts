/**
 * Design Tokens for VSCO Editor
 *
 * Centralized design system for consistent styling across the application.
 * These tokens are also exported as CSS variables in globals.css
 */

export const tokens = {
  colors: {
    // Neutral scale (matches Tailwind neutral)
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0a0a0a',
    },
    // Accent colors
    accent: {
      primary: '#171717',
      primaryForeground: '#ffffff',
    },
    // Semantic colors
    semantic: {
      error: '#ef4444',
      errorMuted: '#fef2f2',
      success: '#22c55e',
      successMuted: '#f0fdf4',
      warning: '#f59e0b',
      warningMuted: '#fffbeb',
    },
    // Channel colors (for curves, histogram)
    channel: {
      red: '#ef4444',
      redMuted: '#fee2e2',
      green: '#22c55e',
      greenMuted: '#dcfce7',
      blue: '#3b82f6',
      blueMuted: '#dbeafe',
      rgb: '#171717',
    },
  },

  spacing: {
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },

  typography: {
    // Font sizes
    size: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
    },
    // Font weights
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
    // Line heights
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  radius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },

  transitions: {
    fast: '100ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },

  // Editor-specific tokens
  editor: {
    sidebar: {
      width: '320px',
      tabHeight: '44px',
    },
    toolbar: {
      height: '56px',
    },
    canvas: {
      background: '#e5e5e5',
    },
    panel: {
      padding: '16px',
      gap: '16px',
      sectionGap: '24px',
    },
    slider: {
      height: '6px',
      thumbSize: '14px',
    },
  },
} as const;

// Type exports for TypeScript consumers
export type ColorToken = typeof tokens.colors;
export type SpacingToken = typeof tokens.spacing;
export type TypographyToken = typeof tokens.typography;
export type RadiusToken = typeof tokens.radius;

// CSS variable name generator
export function cssVar(name: string): string {
  return `var(--editor-${name})`;
}

// Utility to generate CSS custom properties string
export function generateCSSVariables(): string {
  const lines: string[] = [];

  // Colors
  Object.entries(tokens.colors.neutral).forEach(([key, value]) => {
    lines.push(`--editor-neutral-${key}: ${value};`);
  });

  lines.push(`--editor-accent: ${tokens.colors.accent.primary};`);
  lines.push(`--editor-accent-foreground: ${tokens.colors.accent.primaryForeground};`);

  // Spacing
  Object.entries(tokens.spacing).forEach(([key, value]) => {
    lines.push(`--editor-spacing-${key}: ${value};`);
  });

  // Typography
  Object.entries(tokens.typography.size).forEach(([key, value]) => {
    lines.push(`--editor-text-${key}: ${value};`);
  });

  // Radius
  Object.entries(tokens.radius).forEach(([key, value]) => {
    lines.push(`--editor-radius-${key}: ${value};`);
  });

  // Transitions
  Object.entries(tokens.transitions).forEach(([key, value]) => {
    lines.push(`--editor-transition-${key}: ${value};`);
  });

  // Editor specific
  lines.push(`--editor-sidebar-width: ${tokens.editor.sidebar.width};`);
  lines.push(`--editor-toolbar-height: ${tokens.editor.toolbar.height};`);
  lines.push(`--editor-canvas-bg: ${tokens.editor.canvas.background};`);

  return lines.join('\n  ');
}
