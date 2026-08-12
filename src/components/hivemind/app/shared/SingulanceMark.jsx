// SINGULANCE brand mark — 8-point cyan starburst with a black orbit ring +
// satellite dot. Pure SVG (no raster asset) so it scales crisply from the
// mobile nav to a hero-size chat empty-state. Two-color by design: pass
// `starColor`/`orbitColor` only to override the defaults.
import React from 'react';

export default function SingulanceMark({ size = 24, starColor = '#22d3ee', orbitColor = '#0a0a0a', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-6 -6 112 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <ellipse
        cx="50" cy="50" rx="40" ry="13"
        transform="rotate(-18 50 50)"
        stroke={orbitColor}
        strokeWidth="3.2"
        fill="none"
      />
      <circle cx="88.04" cy="37.64" r="4.4" fill={orbitColor} />
      <path
        d="M80,50 57.39,53.06 62.73,62.73 53.06,57.39 50,96 46.94,57.39 37.27,62.73 42.61,53.06 20,50 42.61,46.94 37.27,37.27 46.94,42.61 50,4 53.06,42.61 62.73,37.27 57.39,46.94 Z"
        fill={starColor}
      />
    </svg>
  );
}
