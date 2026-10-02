import React, { useId } from 'react';

export default function VoiceModeIcon({ size = 32 }) {
  const id = useId().replace(/:/g, '');
  return <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Voice">
    <defs>
      <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9eee2"/><stop offset=".5" stopColor="#89b6a0"/><stop offset="1" stopColor="#4e7b66"/></linearGradient>
      <pattern id={`${id}-weave`} width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0H2M0 0V2" stroke="#fff" strokeOpacity=".28" strokeWidth=".5"/></pattern>
      <clipPath id={`${id}-shape`}><rect x="13" y="4" width="14" height="24" rx="7"/></clipPath>
    </defs>
    <ellipse cx="20" cy="36" rx="11" ry="2" fill="#365b48" opacity=".12"/>
    <g clipPath={`url(#${id}-shape)`}><rect x="13" y="4" width="14" height="24" fill={`url(#${id}-shade)`}/><rect x="13" y="4" width="14" height="24" fill={`url(#${id}-weave)`}/></g>
    <path d="M9 19v2a11 11 0 0 0 22 0v-2M20 32v4m-5 0h10M16 10h8m-8 4h8m-8 4h8" fill="none" stroke="#4e7560" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}
