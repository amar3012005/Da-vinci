import React from 'react';

export default function FilesPanel({ files }) {
  const list = Array.isArray(files) ? files : [];
  if (!list.length) return <p className="text-[12px] text-[#a3a3a3]">No files yet.</p>;
  return (
    <ul className="text-[12px] text-[#525252] space-y-1">
      {list.map((f) => <li key={f.path || f.id}>{f.path || f.name}</li>)}
    </ul>
  );
}
