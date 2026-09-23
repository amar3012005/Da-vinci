import React, { useEffect, useRef, useState } from 'react';
import css from '../dsh.module.css';

function firstLine(text) {
  const n = String(text || '').indexOf('\n');
  return n === -1 ? text : text.slice(0, n);
}

function latestLine(text) {
  const visible = String(text || '').trimEnd();
  const n = visible.lastIndexOf('\n');
  return n === -1 ? visible : visible.slice(n + 1);
}

/** Harness Think disclosure: collapsed summary follows the live tail. */
export default function ReasoningRow({ text, running, title = 'Think' }) {
  const [expanded, setExpanded] = useState(false);
  const wasRunning = useRef(Boolean(running));
  useEffect(() => {
    if (wasRunning.current && !running) setExpanded(false);
    wasRunning.current = Boolean(running);
  }, [running]);
  if (!text && !running) return null;
  const summary = (running ? latestLine(text) : firstLine(text) || 'Thinking').replaceAll('**', '');
  return (
    <div className={css.thinkRoot} data-state={running ? 'running' : 'ok'}>
      <button type="button" className={css.thinkRow} onClick={() => setExpanded((v) => !v)}>
        <span className={css.thinkTitle}>{title}</span>
        <span className={css.sep} aria-hidden />
        <span className={css.thinkSummary} data-follow-end={running || undefined}>
          <span className={css.thinkSummaryText}>{summary}</span>
        </span>
      </button>
      {expanded ? <div className={css.thinkBody}>{text}</div> : null}
    </div>
  );
}
