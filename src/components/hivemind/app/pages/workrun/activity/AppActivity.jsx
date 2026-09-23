import React from 'react';
import ActivityRow from './ActivityRow';

export default function AppActivity({ payload, status, label, onOpen }) {
  return (
    <button type="button" className="text-left w-full" onClick={() => onOpen && onOpen(payload)}>
      <ActivityRow label={label || 'Used a connected app'} status={status} />
    </button>
  );
}
