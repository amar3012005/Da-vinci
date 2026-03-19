/**
 * HIVEMIND Design Tokens
 * Dark-mode-first, industrial-neural aesthetic
 * Accent: lime (#bdf213) inherited from brand
 */

export const colors = {
  // Base
  bg: {
    primary: '#0a0a0a',
    secondary: '#111111',
    tertiary: '#161616',
    elevated: '#1a1a1a',
    surface: '#1e1e1e',
    hover: '#252525',
    active: '#2a2a2a',
  },
  // Accent
  accent: {
    primary: '#bdf213',
    primaryHover: '#d4ff3a',
    primaryMuted: 'rgba(189, 242, 19, 0.15)',
    primaryGlow: 'rgba(189, 242, 19, 0.3)',
  },
  // Text
  text: {
    primary: '#f5f5f5',
    secondary: '#a0a0a0',
    tertiary: '#666666',
    muted: '#444444',
    inverse: '#0a0a0a',
  },
  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.15)',
    accent: 'rgba(189, 242, 19, 0.3)',
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
  card: '0 1px 3px rgba(0, 0, 0, 0.4)',
  elevated: '0 4px 12px rgba(0, 0, 0, 0.5)',
  glow: '0 0 20px rgba(189, 242, 19, 0.15)',
  glowStrong: '0 0 40px rgba(189, 242, 19, 0.25)',
};

// API endpoints resolved from bootstrap
export const API_DEFAULTS = {
  controlPlaneBase: process.env.REACT_APP_CONTROL_PLANE_URL || 'https://hivemind.davinciai.eu',
  coreApiBase: process.env.REACT_APP_CORE_API_URL || 'https://api.hivemind.davinciai.eu',
};
