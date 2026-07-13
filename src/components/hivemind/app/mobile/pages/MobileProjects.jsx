import React from 'react';
import MobileShell from '../MobileShell';

/** /hivemind/m/projects — filled in feature-loop phase 3 (F5). */
export default function MobileProjects() {
  return (
    <MobileShell>
      <div className="px-6 pt-2">
        <h1 className="text-[34px] leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Projects</h1>
        <div className="mt-8 text-[13px] text-[#737373]">Loading projects…</div>
      </div>
    </MobileShell>
  );
}
