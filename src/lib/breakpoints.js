/**
 * Centralized Breakpoints Configuration
 * 
 * This file serves as the single source of truth for all device detection
 * and responsive design breakpoints across the application. All breakpoints
 * align with Tailwind's responsive design system for consistency.
 * 
 * Breakpoint Strategy:
 * - Mobile: 0px - 767px (matches Tailwind default)
 * - Tablet: 768px - 1023px (matches Tailwind md to lg-1)
 * - Desktop: 1024px+ (matches Tailwind lg+)
 */

// Primary breakpoints for device detection
export const MOBILE_MAX_WIDTH = 767;      // Matches Tailwind md-1
export const TABLET_MIN_WIDTH = 768;      // Matches Tailwind md
export const TABLET_MAX_WIDTH = 1023;     // Matches Tailwind lg-1
export const DESKTOP_MIN_WIDTH = 1024;    // Matches Tailwind lg

// Additional breakpoints aligned with Tailwind's screen configuration
export const SMALL_MOBILE_MAX = 639;      // Matches Tailwind sm-1
export const SMALL_DESKTOP_MIN = 640;     // Matches Tailwind sm
export const LARGE_DESKTOP_MIN = 1280;    // Matches Tailwind xl
export const EXTRA_LARGE_DESKTOP_MIN = 1536; // Matches Tailwind 2xl

// Breakpoint object for easy import and iteration
export const BREAKPOINTS = {
  smallMobile: SMALL_MOBILE_MAX,
  mobile: MOBILE_MAX_WIDTH,
  tablet: TABLET_MIN_WIDTH,
  desktop: DESKTOP_MIN_WIDTH,
  largeDesktop: LARGE_DESKTOP_MIN,
  extraLargeDesktop: EXTRA_LARGE_DESKTOP_MIN
};

// CSS media query strings for consistent usage
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${MOBILE_MAX_WIDTH}px)`,
  tablet: `(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${TABLET_MAX_WIDTH}px)`,
  desktop: `(min-width: ${DESKTOP_MIN_WIDTH}px)`,
  smallMobile: `(max-width: ${SMALL_MOBILE_MAX}px)`,
  largeDesktop: `(min-width: ${LARGE_DESKTOP_MIN}px)`,
  touchDevice: '(pointer: coarse)',
  hoverCapable: '(hover: hover)',
  reducedMotion: '(prefers-reduced-motion: reduce)'
};

// Device type constants
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop'
};

/**
 * Utility function to check if a width falls within a specific device category
 * @param {number} width - The viewport width to check
 * @returns {string} The device type (mobile|tablet|desktop)
 */
export const getDeviceTypeByWidth = (width) => {
  if (width <= MOBILE_MAX_WIDTH) return DEVICE_TYPES.MOBILE;
  if (width <= TABLET_MAX_WIDTH) return DEVICE_TYPES.TABLET;
  return DEVICE_TYPES.DESKTOP;
};

/**
 * Check if current viewport matches a specific breakpoint
 * @param {string} breakpoint - The breakpoint name from MEDIA_QUERIES
 * @returns {boolean} Whether the current viewport matches the breakpoint
 */
export const matchesBreakpoint = (breakpoint) => {
  if (typeof window === 'undefined') return false;
  const query = MEDIA_QUERIES[breakpoint];
  if (!query) return false;
  return window.matchMedia(query).matches;
};

export default BREAKPOINTS;