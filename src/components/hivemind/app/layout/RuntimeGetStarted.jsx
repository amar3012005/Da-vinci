import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { openCompanyRuntime } from '../shared/openCompanyRuntime';
import './RuntimeGetStarted.css';

const STEPS = [
  ['companyUnderstood', 'Wake up Runtime', 'Runtime has retrieved and saved its understanding of your company.'],
  ['teamIntroduced', 'Meet your team', 'Your specialists have returned their introductions.'],
  ['firstPlan', 'Create our first operating plan', 'The inspected plan and its first assignments have been saved.'],
];
const keyFor = scope => `hivemind.runtime-get-started:v2:${scope}`;
export function readGettingStarted(scope) {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope)) || '{}');
    return Object.fromEntries(STEPS.map(([key]) => [key, value[key] === true]));
  } catch { return {}; }
}

/** One shell-owned rail across native Runtime, DSH and OpenDot rooms. */
export default function RuntimeGetStarted({ scope, variant = 'float' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation('dashboard');
  const chip = variant === 'chip';
  // Embedded chat owns the full viewport: keep progress listening, but never
  // float onboarding over its composer, transcript, or virtual keyboard.
  // Phone chat docks the chip in the top bar instead (variant="chip").
  const chatOpen = /^\/hivemind\/app\/employee\/(?:harness|dots)(?:\/|$)/.test(pathname);
  const [progress, setProgress] = useState(() => readGettingStarted(scope));
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    const changed = event => setPreviewOpen(event.detail?.open === true);
    window.addEventListener('hivemind:preview-visibility', changed);
    return () => window.removeEventListener('hivemind:preview-visibility', changed);
  }, []);
  const [error, setError] = useState(''); const [opening, setOpening] = useState(false);
  const [expanded, setExpanded] = useState(() => !window.matchMedia?.('(max-width: 1000px)').matches);
  useEffect(() => {
    setProgress(readGettingStarted(scope));
    let active = true;
    const merge = patch => setProgress(previous => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(keyFor(scope), JSON.stringify(next)); } catch { /* Optional UI cache. */ }
      return next;
    });
    const evidence = event => {
      const data = event.detail;
      if (!active || data?.version !== 1 || typeof data.rootSessionId !== 'string' || !data.rootSessionId) return;
      if (data.scope && data.scope !== scope) return;
      // Only native checkpoint evidence advances these onboarding milestones.
      if (!STEPS.some(([key]) => typeof data[key] === 'boolean')) return;
      merge(Object.fromEntries(STEPS.filter(([key]) => typeof data[key] === 'boolean').map(([key]) => [key, data[key]])));
    };
    window.addEventListener('hivemind:runtime-get-started', evidence);
    window.dispatchEvent(new Event('hivemind:request-get-started'));
    return () => { active = false; window.removeEventListener('hivemind:runtime-get-started', evidence);  };
  }, [scope]);
  const count = STEPS.filter(([key]) => progress[key]).length;
  const openStep = async key => {
    setError('');
    if (opening) return;
    setOpening(true);
    try { await openCompanyRuntime(navigate); } catch { setError('Runtime is still connecting. Open it from the sidebar to continue.'); }
    finally { setOpening(false); }
  };
  return <aside hidden={previewOpen || (chatOpen && !chip)} className={chip ? 'hm-runtime-start hm-runtime-start--chip' : 'hm-runtime-start'} aria-label="Get started with Runtime">
    <details className="hm-runtime-start-card" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary aria-label={chip ? t('getStarted.summary', { count, total: STEPS.length, defaultValue: `Getting Started, ${count} of ${STEPS.length}` }) : undefined}><span className="hm-runtime-start-ring" style={{ '--hm-start-progress': `${count / STEPS.length * 100}%` }} aria-hidden="true" />{chip && <span className="hm-runtime-start-short" aria-hidden="true">{count}/{STEPS.length}</span>}<span className="hm-runtime-start-title">Getting Started</span><span className="hm-runtime-start-count">{count} of {STEPS.length} <Minus size={16} aria-hidden="true" /></span>
        <span className="hm-runtime-start-progress" role="progressbar" aria-label="Getting started progress" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={count}><span style={{ width: `${count / STEPS.length * 100}%` }} /></span>
      </summary>
      <ol>{STEPS.map(([key, label, description]) => <li key={key} data-complete={progress[key] === true}>
        <button type="button" aria-label={label} onClick={() => void openStep(key)} title={description} disabled={opening}>
          <span className="hm-runtime-start-check" role="checkbox" aria-checked={progress[key] === true} aria-readonly="true" aria-label={label}>{progress[key] && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span>
          <span>{label}</span>
        </button>
      </li>)}</ol>
      <p className="hm-runtime-start-hint">{count === STEPS.length ? 'You’re ready. Your team can take it from here.' : 'Progress checks off as you go.'}</p>
      {error && <p role="status" className="hm-runtime-start-error">{error}</p>}
    </details>
  </aside>;
}
