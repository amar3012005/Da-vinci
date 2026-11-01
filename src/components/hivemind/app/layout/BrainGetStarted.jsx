import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { useCopy, useLocaleFormat } from './sidebar-copy';
import './RuntimeGetStarted.css';

/** [id, English default of `dashboard.brainGetStarted.steps.<id>`, route]. The English text is the fallback only; the visible label comes from the dictionary. */
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

/** `variant="chip"` renders the compact top-bar chip on phone chat routes; the default is the floating card. */
export default function BrainGetStarted({ scope, variant = 'float' }) {
  const navigate = useNavigate(); const location = useLocation();
  const { t } = useTranslation('dashboard');
  const copy = useCopy('brainGetStarted');
  const format = useLocaleFormat();
  const chip = variant === 'chip';
  const [progress, setProgress] = useState(() => read(scope));
  const [expanded, setExpanded] = useState(false);
  const summary = useRef(null);
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
  const total = STEPS.length;
  const percent = `${count / total * 100}%`;
  const countText = copy('count', '{{count}} of {{total}}', { count: format.number(count), total: format.number(total) });
  return <aside className={chip ? 'hm-runtime-start hm-runtime-start--chip' : 'hm-runtime-start'} aria-label={copy('ariaLabel', 'Getting started with Brain')}>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{countText}</span>
    <details className="hm-runtime-start-card" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}
      onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); setExpanded(false); summary.current?.focus(); } }}>
      <summary ref={summary} aria-label={chip ? t('getStarted.summary', { count, total, defaultValue: `Getting Started, ${count} of ${total}` }) : undefined}><span className="hm-runtime-start-ring" style={{ '--hm-start-progress': percent }} aria-hidden="true" />{chip && <span className="hm-runtime-start-short" aria-hidden="true">{format.number(count)}/{format.number(total)}</span>}<span className="hm-runtime-start-title">{copy('title', 'Getting Started')}</span><span className="hm-runtime-start-count">{countText} <Minus size={16} aria-hidden="true" /></span>
        <span className="hm-runtime-start-progress" role="progressbar" aria-label={copy('progressLabel', 'Brain getting started progress')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}><span style={{ width: percent }} /></span>
      </summary>
      <ol>{STEPS.map(([key, fallback, path]) => { const label = copy(`steps.${key}`, fallback); return <li key={key} data-complete={progress[key] === true}><button type="button" onClick={() => navigate(path)}><span className="hm-runtime-start-check" aria-hidden="true">{progress[key] === true && <Check size={12} strokeWidth={3} />}</span><span>{label}</span>{progress[key] === true && <span className="sr-only">{copy('stepDone', 'Done')}</span>}</button></li>; })}</ol>
      <p className="hm-runtime-start-hint">{copy('hint', 'Your knowledge, connected and ready to use.')}</p>
    </details>
  </aside>;
}
