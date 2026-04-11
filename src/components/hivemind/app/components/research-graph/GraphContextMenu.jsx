import React from 'react';
import { Download, Flag, Save, ScanSearch } from 'lucide-react';

function GraphContextMenu({
  open,
  position,
  node,
  canSave,
  onAction,
  onClose,
}) {
  if (!open || !position) return null;

  const handleAction = (action) => {
    onAction?.(action, node);
    onClose?.();
  };

  return (
    <div
      className="fixed z-[80] min-w-52 rounded-xl border border-[#dfe8f4] bg-white/98 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur p-1.5"
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        onClick={() => handleAction('inspect')}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0a0a0a] hover:bg-[#f5f3ef]"
        type="button"
      >
        <ScanSearch size={14} className="text-[#117dff]" />
        Inspect node
      </button>

      {canSave && (
        <button
          onClick={() => handleAction('save')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0a0a0a] hover:bg-[#f5f3ef]"
          type="button"
        >
          <Save size={14} className="text-[#117dff]" />
          Save to memory
        </button>
      )}

      <button
        onClick={() => handleAction('export-png')}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0a0a0a] hover:bg-[#f5f3ef]"
        type="button"
      >
        <Download size={14} className="text-[#9333ea]" />
        Export snapshot
      </button>

      <button
        onClick={() => handleAction('export-json')}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0a0a0a] hover:bg-[#f5f3ef]"
        type="button"
      >
        <Download size={14} className="text-[#0f766e]" />
        Export JSON
      </button>

      <button
        onClick={() => handleAction('flag')}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#0a0a0a] hover:bg-[#f5f3ef]"
        type="button"
      >
        <Flag size={14} className="text-[#d97706]" />
        Flag for review
      </button>
    </div>
  );
}

export default GraphContextMenu;
