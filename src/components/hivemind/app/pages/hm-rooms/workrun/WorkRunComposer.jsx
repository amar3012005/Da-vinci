import React from 'react';
import { ArrowUp, Plus, Square } from 'lucide-react';
import bar from '../hm-rooms-dsh/InputBar.module.css';

export default function WorkRunComposer({ value, onChange, onSubmit, onStop, busy }) {
  const empty = !String(value || '').trim();
  return (
    <form onSubmit={onSubmit} className={bar.root}>
      <div className={bar.card}>
        <div className={bar.scroll}>
          <div className={bar.grow}>
            {empty && <div className={bar.placeholder}>Ask anything</div>}
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              rows={2}
              className={bar.input}
              aria-label="Ask anything"
            />
          </div>
        </div>
        <div className={bar.row}>
          <div className={bar.tools}>
            <button type="button" className={bar.add} aria-label="Add"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className={bar.trailing}>
            <span className={bar.select}>Fast ▾</span>
            {busy ? (
              <button type="button" onClick={onStop} className={bar.primary} aria-label="Stop WorkRun" title="Stop WorkRun">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={empty} className={bar.primary} aria-label="Send">
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
