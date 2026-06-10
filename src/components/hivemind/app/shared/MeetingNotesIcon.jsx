import React from 'react';

/**
 * Meeting Notes identity glyph — a notepad with text lines and a microphone,
 * the brand icon for the AI Meeting Notes feature (sidebar + page).
 * lucide-react-compatible: accepts `size`, `strokeWidth`, `className`, and any
 * extra SVG props, and inherits color via `currentColor`, so it drops in
 * anywhere a lucide icon is used (`<MeetingNotesIcon size={18} />`).
 */
export default function MeetingNotesIcon({ size = 24, strokeWidth = 2, className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* notepad */}
      <rect x="4" y="3" width="16" height="11" rx="2.3" />
      {/* text lines */}
      <line x1="7.4" y1="6.6" x2="16.6" y2="6.6" />
      <line x1="7.4" y1="9.5" x2="13.2" y2="9.5" />
      {/* microphone capsule (overlaps the notepad's lower edge) */}
      <rect x="10.3" y="10" width="3.4" height="4.6" rx="1.7" />
      {/* mic stand + base */}
      <path d="M8.6 13.4a3.4 3.4 0 0 0 6.8 0" />
      <line x1="12" y1="16.6" x2="12" y2="18.8" />
      <line x1="10.1" y1="18.8" x2="13.9" y2="18.8" />
    </svg>
  );
}
