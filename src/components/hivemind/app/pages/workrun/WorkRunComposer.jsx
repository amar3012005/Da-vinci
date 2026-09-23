import React from 'react';
import { ArrowUp, Mic, Plus, Square } from 'lucide-react';
import bar from '../hm-rooms-dsh/InputBar.module.css';

export default function WorkRunComposer({
  value, onChange, onSubmit, busy, landing, stats, working, onStop,
}) {
  const empty = !String(value || '').trim();
  const placeholder = landing
    ? 'Describe what you want to build… / commands, @ files or sessions'
    : 'Message or run a task… / commands, @ files or sessions';
  return (
    <form onSubmit={onSubmit} className={`${bar.root} ${landing ? bar.hero : ''}`}>
      {landing ? (
        <div className="text-center mb-4">
          <div className="text-[22px] font-semibold text-[#0a0a0a] tracking-tight">Into the Unknown</div>
        </div>
      ) : null}
      <div className={bar.card}>
        <div className={bar.scroll}>
          <div className={bar.grow}>
            {empty && <div className={bar.placeholder}>{placeholder}</div>}
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              rows={landing ? 3 : 2}
              className={bar.input}
              aria-label={placeholder}
            />
          </div>
        </div>
        <div className={bar.row}>
          <div className={bar.tools}>
            <button type="button" className={bar.add} aria-label="Add"><Plus className="w-3.5 h-3.5" /></button>
            <span className={bar.select}>Workspace Write ▾</span>
          </div>
          <div className={bar.trailing}>
            <span className={bar.select}>Fast ▾</span>
            <Mic className="w-4 h-4" style={{ color: 'var(--dsw-alias-label-secondary)' }} />
            {working ? (
              <button type="button" onClick={onStop} className={bar.primary} aria-label="Stop current turn" title="Stop">
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={busy || empty} className={bar.primary} aria-label="Send">
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {stats ? (
        <div className="mt-2 text-center text-[11px] text-[#a3a3a3]">{stats}</div>
      ) : null}
    </form>
  );
}
