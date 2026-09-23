import React, { useState } from 'react';
import css from '../dsh.module.css';

export default function GenericTool({ name, label, state, input, result, onOpen }) {
  const [open, setOpen] = useState(false);
  const running = state === 'running';
  return (
    <div className={css.toolRoot} data-state={running ? 'running' : 'ok'} data-tool={name}>
      <button
        type="button"
        className={css.toolRow}
        onClick={() => {
          if (onOpen) onOpen({ name, result, title: label || name });
          setOpen((v) => !v);
        }}
      >
        <span className={css.dot} />
        <span className={css.toolTitle}>{label || name}</span>
        <span className={css.sep} aria-hidden />
        <span className={css.toolSummary}>{running ? 'running' : (result ? String(result).slice(0, 80) : 'done')}</span>
      </button>
      {open ? <div className={css.thinkBody}>
        {input != null ? <><div className="mb-1 text-[10px] font-medium uppercase tracking-wide">Input</div><pre className="whitespace-pre-wrap break-words">{typeof input === 'string' ? input : JSON.stringify(input, null, 2)}</pre></> : null}
        {result ? <><div className="mb-1 mt-3 text-[10px] font-medium uppercase tracking-wide">Output</div><pre className="whitespace-pre-wrap break-words">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre></> : <div className="mt-2">{running ? 'Waiting for tool result…' : 'No result captured.'}</div>}
      </div> : null}
    </div>
  );
}
