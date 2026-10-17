import React, { useId } from 'react';

// The same woven SVG treatment as BrainModeIcon, with distinct navigation silhouettes.
export default function BrainFabricIcon({ kind, size = 46 }) {
  const id = `fabric-${useId().replace(/:/g, '')}`;
  const colors = {
    memories: ['#d9c5e5', '#9574ad'], uploads: ['#e6d5ad', '#b19a68'],
    connectors: ['#b7cfbd', '#6e9479'], notes: ['#dfb9b4', '#ad7774'],
    graph: ['#b9cde0', '#7896b4'], advanced: ['#cac6bc', '#8d887d'],
    dreaming: ['#d8d2e8', '#8d80ae'], workspace: ['#c3cec2', '#7a907b'],
  };
  const [light, dark] = colors[kind] || colors.memories;
  const shapes = {
    dreaming: <><path d="M31 5A20 20 0 1 0 44 32C23 40 13 17 31 5Z"/><path d="m37 8 1.5 4.5L43 14l-4.5 1.5L37 20l-1.5-4.5L31 14l4.5-1.5Z"/></>,
    workspace: <><rect x="7" y="17" width="10" height="29" rx="3"/><rect x="17" y="5" width="22" height="41" rx="4"/><path d="M24 12h8m-8 7h8m-8 7h8m-8 7h8M27 46v-7h5v7" fill="none"/><path d="M3 46h42" fill="none" strokeWidth="3"/></>,
    memories: <><rect x="12" y="7" width="30" height="35" rx="6" transform="rotate(10 27 24)"/><rect x="6" y="11" width="30" height="35" rx="6" transform="rotate(-7 21 28)"/><path d="M14 22h14M15 28h10M16 34h12" fill="none"/></>,
    uploads: <><path d="M5 16Q5 11 10 11h9l4 5h16q4 0 4 5v20H5Z"/><path d="M24 35V22m-6 6 6-6 6 6" fill="none"/></>,
    connectors: <><path d="M12 6v9m9-9v9M8 15h17v7q0 7-8 7v9q0 5 7 5t7-7v-8" fill="none" strokeWidth="5"/><path d="M26 20h15v7q0 6-7 6t-8-6Z"/><path d="M30 12v8m8-8v8" fill="none" strokeWidth="4"/></>,
    notes: <><rect x="17" y="5" width="14" height="26" rx="7"/><path d="M11 23v2a13 13 0 0 0 26 0v-2M24 38v7m-8 0h16" fill="none" strokeWidth="4"/><path d="M22 12h4m-4 6h4" fill="none"/></>,
    graph: <><path d="M24 16v9M10 32v-7h28v7" fill="none" strokeWidth="4"/><rect x="17" y="4" width="14" height="13" rx="4"/><rect x="3" y="32" width="14" height="13" rx="4"/><rect x="31" y="32" width="14" height="13" rx="4"/></>,
    advanced: <><path d="M10 7v35M24 7v35M38 7v35" fill="none" strokeWidth="4"/><rect x="4" y="13" width="12" height="8" rx="4"/><rect x="18" y="30" width="12" height="8" rx="4"/><rect x="32" y="16" width="12" height="8" rx="4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 48 52" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-fill`} x2=".9" y2="1"><stop stopColor={light}/><stop offset="1" stopColor={dark}/></linearGradient>
      <pattern id={`${id}-weave`} width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0H2M0 0V2" stroke="white" strokeOpacity=".23" strokeWidth=".5"/></pattern>
      <mask id={`${id}-mask`}><g fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</g></mask>
    </defs>
    <ellipse cx="24" cy="49" rx="17" ry="1.5" fill="#504637" opacity=".08"/>
    <g fill={`url(#${id}-fill)`} stroke={dark} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</g>
    <rect width="48" height="48" fill={`url(#${id}-weave)`} mask={`url(#${id}-mask)`}/>
  </svg>;
}
