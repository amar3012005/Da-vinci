import React from 'react';
import { Building2, Cable, Files, FolderUp, Mic, MoonStar, Network, SlidersHorizontal } from 'lucide-react';

const icons = { memories: Files, uploads: FolderUp, connectors: Cable, notes: Mic, graph: Network, advanced: SlidersHorizontal, dreaming: MoonStar, workspace: Building2 };

// Small native SVG marks; the keycap material is CSS, with no image downloads.
export default function BrainKeyboardFace({ kind, label }) {
  const Icon = icons[kind] || Files;
  return <span className="brain-key-face">
    <span className="brain-key-symbol" aria-hidden="true"><Icon size={25} strokeWidth={1.6}/><i className="brain-key-indicator"/></span>
    <span className="brain-key-label">{label}</span>
    {kind === 'uploads' && <span className="brain-key-mark" aria-hidden="true">↥</span>}
    {kind === 'advanced' && <span className="brain-key-mark" aria-hidden="true">↗</span>}
  </span>;
}
