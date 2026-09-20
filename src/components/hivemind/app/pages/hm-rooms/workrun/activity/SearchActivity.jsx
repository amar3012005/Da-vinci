import React from 'react';
import ActivityRow from './ActivityRow';

export default function SearchActivity({ payload, status, label, onOpen }) {
  return (
    <button type="button" className="text-left w-full" onClick={() => onOpen && onOpen(payload)}>
      <ActivityRow label={label || 'Searched the web'} status={status}>
        {payload?.result ? <div className="text-[12px] text-[#737373] line-clamp-2">{payload.result}</div> : null}
      </ActivityRow>
    </button>
  );
}
