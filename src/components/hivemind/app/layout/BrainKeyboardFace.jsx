import React from 'react';

// Original inline artwork: no asset requests, filters, fonts, or shared SVG IDs.
const ink = '#343b45';
const blue = '#5688ca';
const pale = '#c8dcf4';
const paper = '#fffdf7';
const shade = '#ddd8cb';

function FeatureArtwork({ kind }) {
  const drawings = {
    memories: <>
      <path d="M16 11 43 7l5 28-27 5z" fill={pale}/>
      <path d="M11 15 38 12l4 28-27 3z" fill={paper}/>
      <path d="m18 21 16-2m-15 7 13-1m-12 7 8-1"/>
      <path d="M8 35h42l-4 16H12z" fill={shade}/>
      <path d="M8 35h42v5H8z" fill={paper}/>
      <rect x="23" y="43" width="12" height="3" rx="1" fill={ink}/>
      <path d="m45 14 3 3 5-6" stroke={blue} strokeWidth="2.5"/>
    </>,
    uploads: <>
      <path d="M8 21v-8h17l5 5h22v29H8z" fill={shade}/>
      <path d="M18 13h23l6 6v23H18z" fill={paper}/>
      <path d="M41 13v7h6M24 24h13m-13 5h9"/>
      <path d="M5 29h49l-7 23H12z" fill={pale}/>
      <path d="M30 44V26m-7 7 7-7 7 7" stroke={blue} strokeWidth="3"/>
      <path d="M19 47h5" stroke={paper}/>
    </>,
    connectors: <>
      <path d="M10 14v9m8-9v9m24 15v9m8-9v9" strokeWidth="3"/>
      <path d="M6 23h16v7a8 8 0 0 1-16 0z" fill={paper}/>
      <path d="M38 31h16v7H38z" fill={pale}/>
      <path d="M14 38v5a9 9 0 0 0 18 0V19a9 9 0 0 1 18 0v12" stroke={blue} strokeWidth="4"/>
      <path d="M10 27h8m24 8h8" strokeWidth="1"/>
      <circle cx="31" cy="10" r="3" fill={paper}/>
    </>,
    notes: <>
      <rect x="8" y="15" width="44" height="36" rx="5" fill={shade}/>
      <rect x="13" y="20" width="34" height="16" rx="2" fill={ink}/>
      <path d="M17 28h4l3-5 4 10 4-9 3 5h7" stroke={pale}/>
      <circle cx="18" cy="43" r="3" fill={blue}/>
      <path d="M26 42h16m-16 4h11" strokeWidth="1.3"/>
      <path d="M22 9h17v6H22z" fill={paper}/>
    </>,
    graph: <>
      <path d="M30 18v13M13 39v-8h34v8" strokeWidth="2"/>
      <path d="m15 13 15-8 15 8-15 8z" fill={paper}/>
      <path d="m15 13 15 8v12l-15-8z" fill={shade}/>
      <path d="m30 21 15-8v12l-15 8z" fill={pale}/>
      <rect x="5" y="39" width="16" height="13" rx="3" fill={paper}/>
      <rect x="39" y="39" width="16" height="13" rx="3" fill={pale}/>
      <path d="M11 45h4m30 0h4" stroke={blue} strokeWidth="2"/>
      <circle cx="30" cy="37" r="3" fill={blue} stroke={paper}/>
    </>,
    advanced: <>
      <rect x="8" y="9" width="44" height="43" rx="4" fill="#333b48" stroke="#9aa7b8"/>
      <path d="M18 18v24m12-24v24m12-24v24" stroke="#b6c4d5"/>
      <rect x="14" y="24" width="8" height="7" rx="2" fill={pale} stroke={pale}/>
      <rect x="26" y="34" width="8" height="7" rx="2" fill={paper} stroke={paper}/>
      <rect x="38" y="19" width="8" height="7" rx="2" fill={blue} stroke={blue}/>
      <path d="M16 47h9m4 0h3" stroke="#b6c4d5"/>
    </>,
    dreaming: <>
      <path d="M37 8a20 20 0 1 0 14 33A20 20 0 0 1 37 8z" fill={pale}/>
      <path d="M8 39c-9 12 25 20 44-3" stroke={blue}/>
      <path d="m46 10 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill={paper}/>
      <circle cx="18" cy="21" r="2" fill={paper} stroke="none"/>
      <path d="M17 47h8" stroke={paper}/>
    </>,
    workspace: <>
      <path d="m8 27 17-7 16 7-17 7z" fill={paper}/>
      <path d="M8 27v23l16 5V34z" fill={shade}/>
      <path d="m24 34 17-7v23l-17 5z" fill={pale}/>
      <path d="M29 9 46 5l7 4-17 5z" fill={paper}/>
      <path d="M29 9v18l7 3V14z" fill={shade}/>
      <path d="m36 14 17-5v36l-12 5V27l-5 2z" fill={paper}/>
      <path d="m41 19 7-2m-7 8 7-2m-7 8 7-2m-7 8 7-2M13 35v4m6-2v4m-6 2v4m6-2v4" stroke={blue}/>
    </>,
  };
  return <svg viewBox="0 0 60 60" width="46" height="46" fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {drawings[kind] || drawings.memories}
  </svg>;
}

export default function BrainKeyboardFace({ kind, label }) {
  return <span className="brain-key-face">
    <span className="brain-key-symbol" aria-hidden="true"><FeatureArtwork kind={kind}/><i className="brain-key-indicator"/></span>
    <span className="brain-key-label">{label}</span>
  </span>;
}
