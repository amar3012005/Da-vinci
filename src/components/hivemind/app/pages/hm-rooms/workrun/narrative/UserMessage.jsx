import React from 'react';

export default function UserMessage({ text }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[70%] text-[14px] text-[#525252] bg-[#f4f4f2] rounded-2xl px-3.5 py-2">
        {text}
      </div>
    </div>
  );
}
