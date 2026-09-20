import React from 'react';
import {
  ArrowUp,
  ChevronDown,
  Folder,
  Mic,
  Paperclip,
  Plus,
  Square,
  Workflow,
} from 'lucide-react';
import styles from './WorkRunComposer.module.css';

export default function WorkRunComposer({ value, onChange, onSubmit, onStop, busy }) {
  const empty = !String(value || '').trim();
  return (
    <form onSubmit={onSubmit} className={styles.root}>
      <div className={styles.contextRow} aria-label="Conversation settings">
        <button type="button" className={styles.contextControl} aria-label="Full scope">
          <Folder size={18} strokeWidth={1.8} />
          <span>Full scope</span>
          <ChevronDown size={16} strokeWidth={1.8} />
        </button>
        <button type="button" className={styles.contextControl} aria-label="HIVE-MIND chat">
          <Workflow size={18} strokeWidth={1.8} />
          <span>HIVE-MIND chat</span>
          <ChevronDown size={16} strokeWidth={1.8} />
        </button>
      </div>
      <div className={styles.card}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          rows={3}
          className={styles.input}
          placeholder="Message or run a task, / commands, @ files or sessions"
          aria-label="Message or run a task"
        />
        <div className={styles.controls}>
          <div className={styles.leadingControls}>
            <button type="button" className={styles.roundControl} aria-label="Add context"><Plus size={24} strokeWidth={1.75} /></button>
            <button type="button" className={styles.roundControl} aria-label="Attach file"><Paperclip size={21} strokeWidth={1.75} /></button>
            <button type="button" className={styles.workspaceControl} aria-label="Workspace write mode">
              <Workflow size={20} strokeWidth={1.75} />
              <span>Workspace Write</span>
              <ChevronDown size={16} strokeWidth={1.75} />
            </button>
            <button type="button" className={styles.iconControl} aria-label="Voice input"><Mic size={21} strokeWidth={1.75} /></button>
          </div>
          <div className={styles.trailingControls}>
            <span className={styles.model}>Default</span>
            {busy && <span className={styles.live} aria-label="Agent is working" />}
            {busy ? (
              <button type="button" onClick={onStop} className={styles.primary} aria-label="Stop WorkRun" title="Stop WorkRun">
                <Square size={15} className="fill-current" />
              </button>
            ) : (
              <button type="submit" disabled={empty} className={styles.primary} aria-label="Send">
                <ArrowUp size={26} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
