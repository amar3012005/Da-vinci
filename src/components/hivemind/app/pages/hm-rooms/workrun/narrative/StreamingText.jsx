import React from 'react';

export default function StreamingText({ text, streaming }) {
  if (!text && !streaming) return null;
  return (
    <span className="whitespace-pre-wrap">
      {text || ''}
      {streaming ? <span className="inline-block w-1.5 h-4 bg-[#0a0a0a] ml-0.5 align-middle animate-pulse" /> : null}
    </span>
  );
}
