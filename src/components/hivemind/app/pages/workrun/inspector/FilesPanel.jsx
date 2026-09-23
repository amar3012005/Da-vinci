import React from 'react';

export default function FilesPanel({ files, artifacts }) {
  const fromArt = (artifacts || []).map((a) => ({
    id: a.block_id,
    name: a.payload?.label || a.payload?.path || a.kind,
    ago: '',
  }));
  const list = (Array.isArray(files) && files.length ? files : fromArt);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-[#0a0a0a]">Recent files</span>
        <span className="text-[11px] text-[#737373]">View all</span>
      </div>
      {list.length ? (
        <ul className="text-[12px] text-[#525252] space-y-2">
          {list.map((f) => (
            <li key={f.id || f.path || f.name} className="flex justify-between gap-2">
              <span className="truncate">{f.name || f.path}</span>
              <span className="text-[#a3a3a3] shrink-0">{f.ago}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-[#a3a3a3]">No files yet.</p>
      )}
    </div>
  );
}
