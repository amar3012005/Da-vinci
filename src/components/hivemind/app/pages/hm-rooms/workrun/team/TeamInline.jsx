import React from 'react';

export default function TeamInline({ team, onOpen }) {
  const list = Array.isArray(team) ? team : [];
  if (!list.length) return null;
  return (
    <button type="button" onClick={onOpen} className="text-[11px] text-[#737373]">
      Team · {list.length}
    </button>
  );
}
