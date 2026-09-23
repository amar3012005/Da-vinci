import React from 'react';

export default function ArtifactCard({ title, kind, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left py-1 text-[13px] text-[#0a0a0a] truncate">
      {title || kind || 'Artifact'}
    </button>
  );
}
