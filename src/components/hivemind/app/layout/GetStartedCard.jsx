import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../../../i18n';
import { agentRoster } from '../shared/agent-roster';
import { useOnboarding } from '../shared/onboarding/onboarding-store';
import { STEPS, STEP_TILE, completedCount, nextStepId } from '../shared/onboarding/registry';
import { ONBOARDING_LANGUAGES } from '../shared/onboarding/onboarding-i18n';
import { isComposerRoute } from './get-started-placement';
import './GetStartedCard.css';


/**
 * The first-run checklist, read from the one step registry and the server record.
 * `variant="float"` is the desktop card in the workspace gutter; `variant="home"` is the phone chip on the home screen that
 * opens the same list as a bottom sheet. Works with Runtime off: no step needs Runtime.
 * @param {{ userId?: string, orgId?: string, variant?: 'float'|'home' }} props
 */
export default function GetStartedCard({ userId, orgId, variant = 'float' }) {
  const { t, i18n } = useTranslation('onboarding');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { view, error, store } = useOnboarding({ userId, orgId });
  const home = variant === 'home';
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const chip = useRef(null);
  const sheet = useRef(null);
  const viewed = useRef(new Set());
  const floating = useRef(null);
  // A floating card that would cover any text field steps aside until the layout changes.
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const changed = event => setPreviewOpen(event.detail?.open === true);
    window.addEventListener('hivemind:preview-visibility', changed);
    return () => window.removeEventListener('hivemind:preview-visibility', changed);
  }, []);
  // The shell renders this only after the company is admitted, so the awakening step is complete by the time anyone sees it.
  useEffect(() => { if (store) store.milestone('company_awake'); }, [store]);

  const steps = view?.steps || STEPS.map(step => ({ id: step.id, status: 'todo', ready: false }));
  const count = completedCount(steps);
  const total = STEPS.length;
  const next = nextStepId(steps);
  // In a chat room the card starts folded so it never covers the conversation; the person can open it.
  const [forced, setForced] = useState(null);
  const expanded = home ? sheetOpen : forced ?? (view?.open !== false && !isComposerRoute(pathname));

  useEffect(() => {
    if (!store || !next || !(home ? sheetOpen : expanded) || viewed.current.has(next)) return;
    viewed.current.add(next);
    store.track('onb_step_view', next);
  }, [store, next, expanded, home, sheetOpen]);

  useLayoutEffect(() => {
    if (home) return undefined;
    const check = () => {
      const card = floating.current?.getBoundingClientRect();
      if (!card || !card.width) { setBlocking(false); return; }
      setBlocking(overlapsTextField(card, floating.current));
    };
    check();
    window.addEventListener('resize', check);
    document.addEventListener('focusin', check);
    const timer = setInterval(check, 1500);
    return () => { window.removeEventListener('resize', check); document.removeEventListener('focusin', check); clearInterval(timer); };
  }, [home, pathname, view]);

  const closeSheet = useCallback(() => { setSheetOpen(false); chip.current?.focus(); }, []);
  useEffect(() => {
    if (!sheetOpen) return undefined;
    sheet.current?.focus();
    const key = event => { if (event.key === 'Escape') { event.preventDefault(); closeSheet(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [sheetOpen, closeSheet]);

  // Nothing shows until the server record (or its cached copy) exists: a card that cannot save progress would mislead.
  if (!store || !view || count === total) return null;

  const scope = `${userId}:${orgId}`;
  const run = (step, secondary) => {
    const action = STEPS.find(item => item.id === step)?.action;
    if (!action) return;
    if (home) setSheetOpen(false);
    const go = to => { if (home) window.dispatchEvent(new Event('hm:onboarding-navigate')); navigate(to); };
    if (secondary) go(secondary);
    else if (action.kind === 'route') go(action.to);
    else if (action.kind === 'create-or-route') {
      const team = agentRoster.peek(scope) || [];
      if (team.length) go(action.to); else window.dispatchEvent(new Event('hm:create-employee'));
    } else if (action.kind === 'event') window.dispatchEvent(new Event(action.name));
    else if (action.kind === 'proactive') {
      const item = view?.proactive?.state === 'ready' ? view.proactive.item : null;
      if (item?.dotId) {
        store.milestone('proactive_opened');
        store.track('onb_step_done', 'first_proactive');
        go(`/hivemind/app/employee/dots/${encodeURIComponent(item.dotId)}${item.conversationId ? `?c=${encodeURIComponent(item.conversationId)}` : ''}`);
      } else go(action.to);
    }
    // Opening the shared-brain card is the step: it shows what exists, the person does nothing else.
    if (step === 'shared_brain') store.track('onb_step_done', step);
  };
  const toggle = event => {
    event.preventDefault();
    if (home) { setSheetOpen(open => !open); if (!sheetOpen) store.track('onb_resume'); return; }
    store.track(expanded ? 'onb_dismiss' : 'onb_replay');
    setForced(!expanded);
  };

  const list = <StepList t={t} i18n={i18n} steps={steps} next={next} view={view} onRun={run} onSkip={step => store.track('onb_step_skip', step)} onLanguage={code => {
    void i18n.changeLanguage(code);
    window.dispatchEvent(new CustomEvent('hivemind:ui-language', { detail: { language: code } }));
  }} />;
  const footer = <>
    <p className="hm-onb-hint">{error || t('hint')}</p>
  </>;
  const progress = <span className="hm-onb-progress" role="progressbar" aria-label={t('title')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}><span style={{ width: `${count / total * 100}%` }} /></span>;

  if (home) return <div className="hm-onb-home">
    <button ref={chip} type="button" className="hm-onb-chip" aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={toggle}>
      <span className="hm-onb-ring" style={{ '--hm-onb-progress': `${count / total * 100}%` }} aria-hidden="true" />
      <span className="hm-onb-chip-title">{t('title')}</span>
      <span className="hm-onb-chip-count">{t('progress', { count, total })}</span>
    </button>
    {sheetOpen && <div className="hm-onb-sheet-backdrop" onClick={closeSheet}>
      <section ref={sheet} className="hm-onb-sheet" role="dialog" aria-modal="true" aria-label={t('summary', { count, total })} tabIndex={-1} onClick={event => event.stopPropagation()} dir={i18n.dir()}>
        <span className="hm-onb-grabber" aria-hidden="true" />
        <header className="hm-onb-head"><h2>{t('title')}</h2><span className="hm-onb-count">{t('progress', { count, total })}</span><button type="button" className="hm-onb-text" onClick={closeSheet}>{t('close')}</button></header>
        {progress}{list}{footer}
      </section>
    </div>}
  </div>;

  return <aside ref={floating} hidden={previewOpen} data-blocking={blocking || undefined} className="hm-onb" aria-label={t('title')} dir={i18n.dir()}>
    <div className="hm-onb-card" data-open={expanded || undefined}>
      <button type="button" className="hm-onb-summary" aria-expanded={expanded} onClick={toggle}>
        <span className="hm-onb-ring" style={{ '--hm-onb-progress': `${count / total * 100}%` }} aria-hidden="true" />
        <span className="hm-onb-title">{t('title')}</span>
        <span className="hm-onb-count">{expanded ? t('hide') : t('progress', { count, total })}</span>
      </button>
      {expanded && <>{progress}{list}{footer}</>}
    </div>
  </aside>;
}

/**
 * Whether a rectangle overlaps any visible text field, text area or editable region of the page outside `self`.
 * @param {DOMRect} rect
 * @param {Element|null} self
 * @returns {boolean}
 */
export function overlapsTextField(rect, self) {
  const fields = document.querySelectorAll('textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), [contenteditable=""], [contenteditable=true], [role=textbox]');
  for (const field of fields) {
    if (self?.contains(field)) continue;
    const box = field.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    if (box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top) return true;
  }
  return false;
}

function StepList({ t, i18n, steps, next, view, onRun, onSkip, onLanguage }) {
  return <ol className="hm-onb-steps">{steps.map(step => {
    const meta = STEPS.find(item => item.id === step.id);
    if (!meta) return null;
    const complete = step.status === 'done' || step.status === 'skipped';
    const active = step.id === next;
    const body = step.id === 'language' ? t('language.question')
      : step.id === 'first_proactive' && view?.proactive ? t(`proactive.${view.proactive.state}`) : t(`steps.${step.id}.body`);
    return <li key={step.id} aria-current={active ? 'step' : undefined} data-complete={complete || undefined} data-active={active || undefined} data-step={step.id}>
      <div className="hm-onb-row">
        <span className="hm-onb-check" aria-hidden="true">{complete && <Check size={11} strokeWidth={3} />}</span>
        <span className="hm-onb-label">{t(`steps.${step.id}.title`)}{step.ready && !complete && <span className="hm-onb-new" aria-hidden="true" />}</span>
        {complete && <span className="sr-only">{t('done')}</span>}
      </div>
      {!active && !complete && step.id === 'first_proactive' && view?.proactive && <p className="hm-onb-status" data-state={view.proactive.state}>{body}</p>}
      {active && <div className="hm-onb-detail" data-tile={STEP_TILE[step.id]}>
        <p>{body}</p>
        {step.id === 'language'
          ? <LanguageRow t={t} i18n={i18n} onPick={onLanguage} />
          : <div className="hm-onb-actions">
            <button type="button" className="hm-onb-primary" onClick={() => onRun(step.id)}>{t('continue')}</button>
            {meta.skippable && <button type="button" className="hm-onb-text" onClick={() => onSkip(step.id)}>{t('skip')}</button>}
            {meta.action.secondary && <button type="button" className="hm-onb-text" onClick={() => onRun(step.id, meta.action.secondary)}>{t('invite')}</button>}
          </div>}
      </div>}
    </li>;
  })}</ol>;
}

/** The language step: the detected language preselected, the full list by native name, and one Continue. */
function LanguageRow({ t, i18n, onPick }) {
  const current = (i18n.language || 'en').split('-')[0];
  const [choice, setChoice] = useState(current);
  const options = [...SUPPORTED_LANGUAGES].sort((a, b) => Number(ONBOARDING_LANGUAGES.includes(b.code)) - Number(ONBOARDING_LANGUAGES.includes(a.code)));
  return <div className="hm-onb-actions">
    <label className="hm-onb-lang"><span className="sr-only">{t('language.label')}</span>
      <select value={choice} onChange={event => setChoice(event.target.value)} aria-label={t('language.question')}>
        {options.map(language => <option key={language.code} value={language.code}>{language.native}</option>)}
      </select>
    </label>
    <button type="button" className="hm-onb-primary" onClick={() => onPick(choice)}>{t('continue')}</button>
  </div>;
}
