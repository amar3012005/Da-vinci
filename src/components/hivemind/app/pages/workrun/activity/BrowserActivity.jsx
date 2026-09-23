import React from 'react';
import ActivityRow from './ActivityRow';

export default function BrowserActivity({ payload, status, label, onOpen }) {
  return (
    <button type="button" className="text-left w-full" onClick={() => onOpen && onOpen(payload)}>
      <ActivityRow label={label || 'Read a page'} status={status} />
    </button>
  );
}
