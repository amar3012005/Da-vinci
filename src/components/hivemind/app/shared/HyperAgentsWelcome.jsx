import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { agentRoster } from './agent-roster';
import LangSwitcher from '../layout/LangSwitcher';
import { readTourProgress, tourCards, tourKey } from './hyperagents-tour';
import './hyperagents-welcome.css';
import { englishTour } from './hyperagents-tour-i18n';

export default function HyperAgentsWelcome({ company }) {
  const { user, org } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : null;
  const key = tourKey(user?.id, org?.id);
  const [progress, setProgress] = useState(() => readTourProgress(localStorage, key));
  const [open, setOpen] = useState(() => Boolean(key) && !readTourProgress(localStorage, key).done);
  const [team, setTeam] = useState(() => agentRoster.peek(scope) || []);
  const panel = useRef(null);
  const close = useCallback(() => {
    setOpen(false);
    setProgress(value => { const next = { ...value, done: true }; try { localStorage.setItem(key, JSON.stringify(next)); } catch {} return next; });
  }, [key]);
  useEffect(() => {
    const saved = readTourProgress(localStorage, key); setProgress(saved); setOpen(Boolean(key) && !saved.done);
    const replay = () => { setProgress({ step:0, done:false }); setOpen(true); };
    window.addEventListener('hm:replay-hyperagents-tour', replay);
    return () => window.removeEventListener('hm:replay-hyperagents-tour', replay);
  }, [key]);
  useEffect(() => {
    if (!open || !scope) return;
    let alive = true;
    agentRoster.load(scope).then(value => { if (alive) setTeam(value); }).catch(() => {});
    return () => { alive = false; };
  }, [scope, open]);
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector('[data-hivemind-app-shell]');
    const previous = document.activeElement, oldInert = root?.inert;
    const overflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button:not([disabled]),[href],select,[tabindex="0"]')].filter(item => item.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { if (root) root.inert = oldInert; document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, [open, close]);
  const go = step => {
    const next = { step, done:false }; setProgress(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  useEffect(() => {
    if (!open || progress.step === 5) return;
    const image = new Image(); image.src = `/assets/hyperagents-tour/${tourCards[progress.step + 1].id}.webp`;
  }, [open, progress.step]);
  if (!open) return null;
  const card = tourCards[progress.step], [x,y,w,h] = card.crop;
  const title = t(`welcomeTour.cards.${progress.step}.title`, { defaultValue: englishTour[progress.step * 2] });
  const body = t(`welcomeTour.cards.${progress.step}.body`, { defaultValue: englishTour[progress.step * 2 + 1] });
  const companyName = company?.name || company?.company_name || org?.name;
  return createPortal(<div className="hm-team-welcome-backdrop">
    <section className="hm-team-welcome" role="dialog" aria-modal="true" aria-labelledby="hm-team-welcome-title" aria-describedby="hm-team-welcome-description" dir={i18n.dir()} tabIndex={-1} ref={panel}>
      <header className="hm-team-welcome-header"><span>HIVEMIND <span className="hm-team-welcome-company">{companyName}</span></span><div><LangSwitcher compact/><button type="button" aria-label={t('actions.close', { ns:'common', defaultValue:'Close' })} onClick={close}>×</button></div></header>
      <div className="hm-team-welcome-heading" aria-live="polite"><h1 id="hm-team-welcome-title">{title}</h1>{![0,5].includes(progress.step) && <p id="hm-team-welcome-description">{body}</p>}</div>
      <div className="hm-team-welcome-art" style={{ aspectRatio:`${w}/${h}` }} aria-hidden="true"><img src={`/assets/hyperagents-tour/${card.id}.webp`} alt="" decoding="async" style={{ width:`${1536/w*100}%`, height:`${1024/h*100}%`, left:`${-x/w*100}%`, top:`${-y/h*100}%` }}/>{[0,5].includes(progress.step) && <p id="hm-team-welcome-description" className={`hm-team-welcome-bubble hm-team-welcome-bubble-${progress.step}`}>{body}</p>}</div>
      {progress.step === 1 && <div className="hm-team-welcome-team">{team.slice(0,3).map(employee => <div key={employee.id}><strong>{employee.name}</strong><span>{employee.title || employee.job_title || employee.jobTitle || employee.role || employee.role_archetype || employee.roleArchetype || ''}</span></div>)}</div>}
      {progress.step === 3 && <div className="hm-team-welcome-labels">{englishTour.slice(12).map((label,index)=><span key={label}>{t(`welcomeTour.statuses.${index}`, { defaultValue:label })}</span>)}</div>}
      <footer className="hm-team-welcome-footer"><span>{String(progress.step+1).padStart(2,'0')} / 06</span><nav aria-label={title}>{tourCards.map((item,index)=><button key={item.id} type="button" aria-label={`${index+1} / 6`} aria-current={progress.step===index?'step':undefined} onClick={()=>go(index)} />)}</nav><div className="hm-team-welcome-actions">{progress.step>0&&<button type="button" onClick={()=>go(progress.step-1)}>{t('actions.back', { ns:'common', defaultValue:'Back' })}</button>}<button type="button" onClick={close}>{t('actions.close', { ns:'common', defaultValue:'Close' })}</button><button className="hm-team-welcome-primary" type="button" onClick={()=>progress.step===5?close():go(progress.step+1)}>{t(progress.step === 5 ? 'actions.continue' : 'actions.next', { ns:'common', defaultValue:progress.step === 5 ? 'Continue' : 'Next' })} <span aria-hidden="true">→</span></button></div></footer>
    </section>
  </div>, document.body);
}
