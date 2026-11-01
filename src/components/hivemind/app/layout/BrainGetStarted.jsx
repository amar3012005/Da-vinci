import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { SUPPORTED_LANGUAGES } from '../../../../i18n';
import { useOnboarding } from '../shared/onboarding/onboarding-store';
import { BRAIN_STEPS } from '../shared/onboarding/registry';
import { useCopy, useLocaleFormat } from './sidebar-copy';
import './RuntimeGetStarted.css';

/** English defaults of `dashboard.brainGetStarted.steps.<id>`; the visible label comes from the dictionary. None names an employee or a colleague: a Brain-only company has none. */
const FALLBACK = {
  language: 'Choose your language', company: 'Tell Brain about your company', source: 'Add your first source',
  ask: 'Ask a question and get an answer with its source', remember: 'Save something worth remembering',
  connect: 'Connect your apps', invite: 'Invite someone to your Brain',
};
const keyFor = scope => `hivemind.brain-get-started:v2:${scope}`;
function read(scope) { try { return JSON.parse(localStorage.getItem(keyFor(scope)) || '{}'); } catch { return {}; } }
const finished = status => status === 'done' || status === 'skipped';

/**
 * The Brain-only first-run card: seven steps (language, company, source, ask, remember, connect, invite) read from the server
 * record in OpenDot settings, so progress carries across devices and needs no employee and no Runtime. The browser cache only
 * paints the first frame and covers an offline moment. `ask` completes only when a Brain answer shows its sources.
 * `variant="chip"` renders the compact top-bar chip on phone chat routes; the default is the floating card.
 */
export default function BrainGetStarted({ scope, variant = 'float' }) {
  const navigate = useNavigate(); const location = useLocation();
  const copy = useCopy('brainGetStarted');
  const { t, i18n } = useTranslation('dashboard');
  const format = useLocaleFormat();
  const chip = variant === 'chip';
  const [userId, orgId] = String(scope || '').split(':');
  const { view, store } = useOnboarding({ userId, orgId });
  const [local, setLocal] = useState(() => read(scope));
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const summary = useRef(null);
  useEffect(() => {
    let active = true; let loading = false;
    const refresh = async () => {
      if (!active || loading || document.hidden) return;
      loading = true;
      const results = await Promise.allSettled([
        apiClient.listDocuments({ limit: 1 }), apiClient.listMemories({ limit: 1 }), apiClient.getConnectorConnectionStatus(),
      ]);
      loading = false;
      if (!active) return;
      const next = {};
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value?.documents)) next.source = results[0].value.documents.length > 0;
      if (results[1].status === 'fulfilled') {
        const data = results[1].value; const memories = data?.memories || data?.results || data;
        if (Array.isArray(memories)) next.remember = memories.length > 0;
      }
      if (results[2].status === 'fulfilled' && Array.isArray(results[2].value?.connectors)) next.connect = results[2].value.connectors.some(item => Boolean(item.connection));
      // What the Brain app can see is reported once; the server keeps the first time and ignores repeats.
      if (next.source) store?.milestone('source_added');
      if (next.remember) store?.milestone('memory_saved');
      setLocal(previous => {
        const merged = { ...previous, ...next };
        try { localStorage.setItem(keyFor(scope), JSON.stringify(merged)); } catch { /* Optional cache. */ }
        return merged;
      });
    };
    void refresh(); window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [scope, location.pathname, store]);
  const server = Object.fromEntries((view?.brainSteps || []).map(item => [item.id, item.status]));
  const done = id => finished(server[id]) || (id !== 'ask' && id !== 'language' && local[id] === true) || (id === 'language' && Boolean(view?.locale));
  const complete = BRAIN_STEPS.map(step => step.id).filter(done);
  if (!/^\/hivemind\/app\/overview(?:\/|$)/.test(location.pathname)) return null;
  const count = complete.length;
  const total = BRAIN_STEPS.length;
  const percent = `${count / total * 100}%`;
  const countText = copy('count', '{{count}} of {{total}}', { count: format.number(count), total: format.number(total) });
  const run = step => {
    if (step.action === 'language') { setPicking(open => !open); return; }
    store?.track('onb_step_view', step.id);
    navigate(step.to);
  };
  const pick = code => {
    setPicking(false);
    void i18n.changeLanguage(code);
    window.dispatchEvent(new CustomEvent('hivemind:ui-language', { detail: { language: code } }));
  };
  return <aside className={chip ? 'hm-runtime-start hm-runtime-start--chip' : 'hm-runtime-start'} aria-label={copy('ariaLabel', 'Getting started with Brain')}>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{countText}</span>
    <details className="hm-runtime-start-card" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}
      onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); setExpanded(false); summary.current?.focus(); } }}>
      <summary ref={summary} aria-label={chip ? t('getStarted.summary', { count, total, defaultValue: `Getting Started, ${count} of ${total}` }) : undefined}><span className="hm-runtime-start-ring" style={{ '--hm-start-progress': percent }} aria-hidden="true" />{chip && <span className="hm-runtime-start-short" aria-hidden="true">{format.number(count)}/{format.number(total)}</span>}<span className="hm-runtime-start-title">{copy('title', 'Getting Started')}</span><span className="hm-runtime-start-count">{countText} <Minus size={16} aria-hidden="true" /></span>
        <span className="hm-runtime-start-progress" role="progressbar" aria-label={copy('progressLabel', 'Brain getting started progress')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}><span style={{ width: percent }} /></span>
      </summary>
      <ol>{BRAIN_STEPS.map(step => { const label = copy(`steps.${step.id}`, FALLBACK[step.id]); const isDone = complete.includes(step.id); return <li key={step.id} data-complete={isDone} data-step={step.id}><button type="button" onClick={() => run(step)}><span className="hm-runtime-start-check" aria-hidden="true">{isDone && <Check size={12} strokeWidth={3} />}</span><span>{label}</span>{isDone && <span className="sr-only">{copy('stepDone', 'Done')}</span>}</button>
        {step.action === 'language' && picking && <select className="hm-runtime-start-lang" value={(i18n.language || 'en').split('-')[0]} aria-label={label} onChange={event => pick(event.target.value)}>{SUPPORTED_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.native}</option>)}</select>}
      </li>; })}</ol>
      <p className="hm-runtime-start-hint">{copy('hint', 'Your knowledge, connected and ready to use.')}</p>
    </details>
  </aside>;
}
