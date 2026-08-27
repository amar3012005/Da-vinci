import React from 'react';
import SingulanceMark from './SingulanceMark';

/**
 * Canonical SINGULANCE navbar lockup.
 *
 * The supplied raster artwork has been reduced to the existing vector mark so
 * it stays sharp at every density without loading a large PNG or carrying its
 * baked-in background. `dark` is for the black marketing chrome; `light` is
 * for the ivory HIVEMIND application chrome.
 */
export default function SingulanceBrand({
  variant = 'light',
  compact = false,
  markSize = 30,
  className = '',
}) {
  const dark = variant === 'dark';
  const ink = dark ? '#ffffff' : '#0a0a0a';

  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`} aria-label="SINGULANCE">
      <SingulanceMark
        size={markSize}
        starColor="#22d3ee"
        orbitColor={ink}
        className="shrink-0"
      />
      {!compact && (
        <span
          className="truncate font-['Space_Grotesk'] text-[14px] font-bold leading-none tracking-[0.09em]"
          style={{ color: ink }}
        >
          SINGULANCE
        </span>
      )}
    </span>
  );
}
