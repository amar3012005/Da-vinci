import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import apiClient from '../shared/api-client';
import { openCompanyRuntime } from '../shared/openCompanyRuntime';
import './RuntimeGetStarted.css';

const STEPS = [
  ['awakened', 'Awaken Runtime', 'Meet your Chief of Staff and create your first plan.'],
  ['visited', 'Meet a specialist', 'Open a teammate from the sidebar to get to know them.'],
  ['connected', 'Connect your apps', 'Give your team the context they need.'],
  ['delegated', 'Delegate your first task', 'Ask Runtime to assign a clear outcome to a specialist.'],
  ['reviewed', 'Review a finished result', 'Review a saved deliverable with Runtime.'],
  ['scheduled', 'Schedule a follow-up', 'Let Runtime arrange the next work or check-in.'],
];
const keyFor = scope => `hivemind.runtime-get-started:v1:${scope}`;
export function readGettingStarted(scope) {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope)) || '{}');
    return Object.fromEntries(STEPS.map(([key]) => [key, value[key] === true]));
  } catch { return {}; }
}

/** One shell-owned rail across native Runtime, DSH and OpenDot rooms. */
export default function RuntimeGetStarted({ scope }) {
  const navigate = useNavigate(); const location = useLocation();
  const [progress, setProgress] = useState(() => readGettingStarted(scope));
  const [error, setError] = useState(''); const [opening, setOpening] = useState(false);
  const [expanded, setExpanded] = useState(() => !window.matchMedia?.('(max-width: 1000px)').matches);
  useEffect(() => {
    let active = true; let loading = false;
    const merge = patch => setProgress(previous => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Optional UI cache. */ }
      return next;
    });
    const evidence = event => {
      const data = event.detail;
      if (!active || data?.version !== 1 || typeof data.rootSessionId !== 'string' || !data.rootSessionId) return;
      if (data.scope && data.scope !== scope) return;
      merge(Object.fromEntries(['awakened', 'delegated', 'reviewed', 'scheduled'].map(key => [key, data[key] === true])));
    };
    const selected = event => { if (typeof event.detail?.id === 'string' && !['', 'runtime', 'lead'].includes(event.detail.id)) merge({ visited: true }); };
    const connections = async () => {
      if (!active || loading || document.hidden) return;
      loading = true;
      try {
        const result = await apiClient.getConnectorConnectionStatus();
        if (active && Array.isArray(result?.connectors)) merge({ connected: result.connectors.some(item => Boolean(item.connection)) });
      } catch { /* Keep saved progress on a temporary connection failure. */ }
      finally { loading = false; }
    };
    window.addEventListener('hivemind:runtime-get-started', evidence);
    window.addEventListener('hivemind:agent-selected', selected);
    window.addEventListener('focus', connections);
    window.addEventListener('hivemind:session-established', connections);
    window.dispatchEvent(new Event('hivemind:request-get-started'));
    void connections();
    return () => { active = false; window.removeEventListener('hivemind:runtime-get-started', evidence); window.removeEventListener('hivemind:agent-selected', selected); window.removeEventListener('focus', connections); window.removeEventListener('hivemind:session-established', connections); };
  }, [scope]);
  useEffect(() => {
    if (!/^\/hivemind\/app\/employee\/dots\/[^/]+/.test(location.pathname)) return;
    setProgress(previous => {
      const next = { ...previous, visited: true };
      try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Optional UI cache. */ }
      return next;
    });
  }, [location.pathname, scope]);
  const count = STEPS.filter(([key]) => progress[key]).length;
  const openStep = async key => {
    setError('');
    if (key === 'connected') { navigate('/hivemind/app/employee/apps'); return; }
    if (key === 'visited') { navigate('/hivemind/app/employees/mycompany'); return; }
    if (opening) return;
    setOpening(true);
    try { await openCompanyRuntime(navigate); } catch { setError('Runtime is still connecting. Open it from the sidebar to continue.'); }
    finally { setOpening(false); }
  };
  return <aside className="hm-runtime-start" aria-label="Get started with Runtime">
    <details className="hm-runtime-start-card" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary><span className="hm-runtime-start-ring" style={{ '--hm-start-progress': `${count / 6 * 100}%` }} aria-hidden="true" /><span className="hm-runtime-start-title">Getting Started</span><span className="hm-runtime-start-count">{count} of 6 <Minus size={16} aria-hidden="true" /></span>
        <span className="hm-runtime-start-progress" role="progressbar" aria-label="Getting started progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={count}><span style={{ width: `${count / 6 * 100}%` }} /></span>
      </summary>
      <ol>{STEPS.map(([key, label, description]) => <li key={key} data-complete={progress[key] === true}>
        <button type="button" aria-label={label} onClick={() => void openStep(key)} title={description} disabled={opening}>
          <span className="hm-runtime-start-check" role="checkbox" aria-checked={progress[key] === true} aria-readonly="true" aria-label={label}>{progress[key] && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span>
          <span>{label}</span>
        </button>
      </li>)}</ol>
      <p className="hm-runtime-start-hint">{count === 6 ? 'You’re ready. Your team can take it from here.' : 'Progress checks off as you go.'}</p>
      {error && <p role="status" className="hm-runtime-start-error">{error}</p>}
    </details>
  </aside>;
}
