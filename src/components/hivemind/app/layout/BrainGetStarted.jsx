import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import apiClient from '../shared/api-client';
import './RuntimeGetStarted.css';

const STEPS = [
  ['chat', 'Start a Brain conversation', '/hivemind/app/overview'],
  ['source', 'Add your first source', '/hivemind/app/knowledge'],
  ['memory', 'Save something worth remembering', '/hivemind/app/memories'],
  ['connected', 'Connect your apps', '/hivemind/app/connectors'],
  ['explored', 'Explore your memories', '/hivemind/app/memories'],
  ['library', 'Open your knowledge library', '/hivemind/app/knowledge'],
];
const keyFor = scope => `hivemind.brain-get-started:v1:${scope}`;
function read(scope) { try { return JSON.parse(localStorage.getItem(keyFor(scope)) || '{}'); } catch { return {}; } }

export default function BrainGetStarted({ scope }) {
  const navigate = useNavigate(); const location = useLocation();
  const [progress, setProgress] = useState(() => read(scope));
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const patch = {};
    if (/\/overview\/session\/[^/]+/.test(location.pathname)) patch.chat = true;
    if (location.pathname === '/hivemind/app/memories') patch.explored = true;
    if (location.pathname === '/hivemind/app/knowledge') patch.library = true;
    if (Object.keys(patch).length) setProgress(previous => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Optional cache. */ }
      return next;
    });
  }, [location.pathname, scope]);
  useEffect(() => {
    let active = true; let loading = false;
    const refresh = async () => {
      if (!active || loading || document.hidden) return;
      loading = true;
      const results = await Promise.allSettled([
        apiClient.listDocuments({ limit: 1 }), apiClient.listMemories({ limit: 1 }), apiClient.getConnectorConnectionStatus(),
      ]);
      if (active) setProgress(previous => {
        const next = { ...previous };
        if (results[0].status === 'fulfilled' && Array.isArray(results[0].value?.documents)) next.source = results[0].value.documents.length > 0;
        if (results[1].status === 'fulfilled') {
          const data = results[1].value; const memories = data?.memories || data?.results || data;
          if (Array.isArray(memories)) next.memory = memories.length > 0;
        }
        if (results[2].status === 'fulfilled' && Array.isArray(results[2].value?.connectors)) next.connected = results[2].value.connectors.some(item => Boolean(item.connection));
        try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Optional cache. */ }
        return next;
      });
      loading = false;
    };
    void refresh(); window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [scope, location.pathname]);
  if (!/^\/hivemind\/app\/overview(?:\/|$)/.test(location.pathname)) return null;
  const count = STEPS.filter(([key]) => progress[key] === true).length;
  return <aside className="hm-runtime-start" aria-label="Getting started with Brain">
    <details className="hm-runtime-start-card" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary><span className="hm-runtime-start-ring" style={{ '--hm-start-progress': `${count / 6 * 100}%` }} aria-hidden="true" /><span className="hm-runtime-start-title">Getting Started</span><span className="hm-runtime-start-count">{count} of 6 <Minus size={16} aria-hidden="true" /></span>
        <span className="hm-runtime-start-progress" role="progressbar" aria-label="Brain getting started progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={count}><span style={{ width: `${count / 6 * 100}%` }} /></span>
      </summary>
      <ol>{STEPS.map(([key, label, path]) => <li key={key} data-complete={progress[key] === true}><button type="button" onClick={() => navigate(path)}><span className="hm-runtime-start-check" role="checkbox" aria-readonly="true" aria-checked={progress[key] === true} aria-label={label}>{progress[key] === true && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span><span>{label}</span></button></li>)}</ol>
      <p className="hm-runtime-start-hint">Your knowledge, connected and ready to use.</p>
    </details>
  </aside>;
}
