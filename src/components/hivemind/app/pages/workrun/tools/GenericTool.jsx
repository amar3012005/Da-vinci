import React, { useState } from 'react';
import { Check, ChevronDown, CircleX, LoaderCircle, Wrench } from 'lucide-react';
import css from '../dsh.module.css';

function compactInput(input) {
  if (input == null) return '';
  if (typeof input === 'object') {
    const useful = input.command || input.path || input.query || input.url || input.operation || input.content;
    if (useful != null) return String(useful);
    try { return JSON.stringify(input); } catch { return ''; }
  }
  return String(input);
}

function printable(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function GenericTool({ name, label, state, input, result }) {
  const [open, setOpen] = useState(false);
  const running = state === 'running';
  const failed = state === 'failed' || state === 'error' || state === 'cancelled';
  const rawName = String(name || 'tool');
  const action = label && label !== rawName ? label : (/bash|shell|exec/i.test(rawName) ? 'Ran' : 'Tool call');
  const preview = compactInput(input).replace(/\s+/g, ' ').trim();
  const output = printable(result);
  return (
    <div className={css.toolRoot} data-state={running ? 'running' : 'ok'} data-tool={name}>
      <button
        type="button"
        className={css.toolRow}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {running ? <LoaderCircle size={14} className="shrink-0 animate-spin text-[#737373]" /> : failed ? <CircleX size={14} className="shrink-0 text-[#b45309]" /> : <Wrench size={14} className="shrink-0 text-[#737373]" />}
        <span className={css.toolTitle}>{action}</span>
        <span className={css.sep} aria-hidden />
        <span className="shrink-0 font-mono text-[11px] text-[#737373]">{rawName}</span>
        {preview ? <><span className={css.sep} aria-hidden /><span className={css.toolSummary}>{preview}</span></> : null}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] text-[#737373]">
          {running ? 'running' : failed ? 'failed' : <><Check size={12} />done</>}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open ? <div className="ml-5 space-y-3 border-l border-[#e3e0db] py-2 pl-3 text-[11px] leading-5 text-[#525252]">
        {input != null ? <div><div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[#a3a3a3]">Input</div><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-[#e3e0db] bg-[#faf9f4] p-2 font-mono">{printable(input)}</pre></div> : null}
        {output ? <div><div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-[#a3a3a3]">Output</div><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-[#e3e0db] bg-white p-2 font-mono">{output}</pre></div> : <div className="text-[#737373]">{running ? 'Waiting for tool result…' : failed ? 'The run ended before this tool returned a result.' : 'No result captured.'}</div>}
      </div> : null}
    </div>
  );
}
