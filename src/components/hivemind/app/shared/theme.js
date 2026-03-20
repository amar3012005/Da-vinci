/**
 * HIVEMIND Design Tokens
 * Supermemory-inspired dark console aesthetic
 * Accent: lime (#bdf213) from HIVEMIND brand
 */

export const colors = {
  // Base - deeper blacks like Supermemory console
  bg: {
    primary: '#09090b',
    secondary: '#0f0f11',
    tertiary: '#141416',
    elevated: '#18181b',
    surface: '#1c1c1f',
    hover: '#222225',
    active: '#27272a',
  },
  // Accent
  accent: {
    primary: '#bdf213',
    primaryHover: '#d4ff3a',
    primaryMuted: 'rgba(189, 242, 19, 0.12)',
    primaryGlow: 'rgba(189, 242, 19, 0.25)',
  },
  // Text
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    tertiary: '#71717a',
    muted: '#52525b',
    inverse: '#09090b',
  },
  // Borders - subtler like Supermemory
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
    accent: 'rgba(189, 242, 19, 0.2)',
  },
  // Status
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

export const fonts = {
  display: "'Space Grotesk', sans-serif",
  body: "'Space Grotesk', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.5)',
  elevated: '0 4px 12px rgba(0, 0, 0, 0.6)',
  glow: '0 0 20px rgba(189, 242, 19, 0.1)',
  glowStrong: '0 0 40px rgba(189, 242, 19, 0.2)',
};

// API endpoints resolved from bootstrap
export const API_DEFAULTS = {
  controlPlaneBase: process.env.REACT_APP_CONTROL_PLANE_URL || 'https://api.hivemind.davinciai.eu:8040',
  coreApiBase: process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050',
};
