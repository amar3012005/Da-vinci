import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { agentRoster } from './agent-roster';
import LangSwitcher from '../layout/LangSwitcher';
import { readTourProgress, tourCards, tourKey } from './hyperagents-tour';
import './hyperagents-welcome.css';

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
    const root = document.getElementById('root');
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
  const companyName = company?.name || company?.company_name || org?.name;
  return createPortal(<div className="hm-team-welcome-backdrop">
    <section className="hm-team-welcome" role="dialog" aria-modal="true" aria-labelledby="hm-team-welcome-title" aria-describedby="hm-team-welcome-description" dir={i18n.dir()} tabIndex={-1} ref={panel}>
      <header className="hm-team-welcome-header"><span>HIVEMIND <span className="hm-team-welcome-company">{companyName}</span></span><div><LangSwitcher compact/><button type="button" aria-label={t('Close walkthrough')} onClick={close}>×</button></div></header>
      <div className="hm-team-welcome-heading" aria-live="polite"><h1 id="hm-team-welcome-title">{t(card.title)}</h1>{![0,5].includes(progress.step) && <p id="hm-team-welcome-description">{t(card.body)}</p>}</div>
      <div className="hm-team-welcome-art" style={{ aspectRatio:`${w}/${h}` }} aria-hidden="true"><img src={`/assets/hyperagents-tour/${card.id}.webp`} alt="" decoding="async" style={{ width:`${1536/w*100}%`, height:`${1024/h*100}%`, left:`${-x/w*100}%`, top:`${-y/h*100}%` }}/>{[0,5].includes(progress.step) && <p id="hm-team-welcome-description" className={`hm-team-welcome-bubble hm-team-welcome-bubble-${progress.step}`}>{t(card.body)}</p>}</div>
      {progress.step === 1 && <div className="hm-team-welcome-team">{team.slice(0,3).map(employee => <div key={employee.id}><strong>{employee.name}</strong><span>{t(employee.title || employee.jobTitle || employee.role || 'Company specialist')}</span></div>)}{team.length === 0 && <p>{t('Your specialists’ saved profiles are available in the sidebar.')}</p>}</div>}
      {progress.step === 2 && <div className="hm-team-welcome-labels">{['Your direction','Coordinated teamwork','Reviewed results'].map(label=><span key={label}>{t(label)}</span>)}</div>}
      {progress.step === 3 && <div className="hm-team-welcome-labels">{['Currently working','Work scheduled','Waiting for you','Unread messages'].map(label=><span key={label}>{t(label)}</span>)}</div>}
      {progress.step === 5 && <p className="hm-team-welcome-note">{t('Continue to your existing Runtime room. No message will be sent automatically.')}</p>}
      <footer className="hm-team-welcome-footer"><span>{String(progress.step+1).padStart(2,'0')} / 06</span><nav aria-label={t('Walkthrough steps')}>{tourCards.map((item,index)=><button key={item.id} type="button" aria-label={`${t('Step')} ${index+1}`} aria-current={progress.step===index?'step':undefined} onClick={()=>go(index)} />)}</nav><div className="hm-team-welcome-actions">{progress.step>0&&<button type="button" onClick={()=>go(progress.step-1)}>{t('Go back')}</button>}<button type="button" onClick={close}>{t('Skip tour')}</button><button className="hm-team-welcome-primary" type="button" onClick={()=>progress.step===5?close():go(progress.step+1)}>{t(card.next)} <span aria-hidden="true">→</span></button></div></footer>
    </section>
  </div>, document.body);
}
