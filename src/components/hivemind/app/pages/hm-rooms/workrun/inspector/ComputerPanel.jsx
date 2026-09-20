import React from 'react';

export default function ComputerPanel({ computer }) {
  if (!computer) {
    return <p className="text-[12px] text-[#a3a3a3]">Computer is idle.</p>;
  }
  return (
    <div className="text-[13px] text-[#171717]">
      {computer.label || 'Using computer'}
    </div>
  );
}
