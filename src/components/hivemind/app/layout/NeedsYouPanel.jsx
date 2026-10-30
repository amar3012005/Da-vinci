import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AgentAvatar from '../hyperagents/AgentAvatar';
import WorkspacePopupSurface from '../shared/WorkspacePopupSurface';
import { answerNeedsYouCard, fetchNeedsYou } from '../shared/needs-you';
import { useCopy, useLocaleFormat } from './sidebar-copy';
import './needs-you.css';

const KIND_KEYS = {
  approval: ['kindApproval', 'Approval'], question: ['kindQuestion', 'Question'], secure: ['kindSecure', 'Secure input'],
  connect: ['kindConnect', 'Connect an app'], schedule: ['kindSchedule', 'Schedule'],
};

/**
 * Everything any employee is waiting on the person for: approvals, questions, secure inputs, app connections and schedules.
 * One read when it opens, and again when the sidebar's waiting set or a live room frame changes; it never polls.
 * Approve is offered only where the server marked the action reversible; every other answer happens in the room via Open.
 * @param {{ team: Array<object>, refreshKey: string, onClose: () => void, onOpenCard: (card: object) => void, portalContainer?: Element }} props - Roster, waiting-set signature, close and open handlers.
 */
export default function NeedsYouPanel({ team, refreshKey, onClose, onOpenCard, portalContainer }) {
  const cr = useCopy('needsYou');
  const format = useLocaleFormat();
  const container = useRef(null);
  const [cards, setCards] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState({});
  const [errors, setErrors] = useState({});
  const alive = useRef(true);
  const generation = useRef(0);
  useEffect(() => () => { alive.current = false; }, []);
  const load = useCallback(async () => {
    const mine = ++generation.current;
    try {
      const next = await fetchNeedsYou();
      if (alive.current && mine === generation.current) { setCards(next); setFailed(false); }
    } catch { if (alive.current && mine === generation.current) setFailed(true); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    window.addEventListener('hivemind:employee-status-changed', load);
    return () => window.removeEventListener('hivemind:employee-status-changed', load);
  }, [load]);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.querySelector('button')?.focus();
    const keyboard = event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyboard); previous?.focus?.(); };
  }, [onClose]);

  const byEmployee = new Map((team || []).map(agent => [String(agent.id).toLowerCase(), agent]));
  // A card of an employee who left the roster cannot be opened, so it is not listed.
  const rows = (cards || []).filter(card => byEmployee.has(card.employeeId.toLowerCase()));
  const decide = async (card, choice) => {
    setBusy(current => ({ ...current, [card.id]: choice })); setErrors(current => ({ ...current, [card.id]: '' }));
    const ok = await answerNeedsYouCard(card.id, choice);
    if (!alive.current) return;
    setBusy(current => ({ ...current, [card.id]: '' }));
    if (!ok) { setErrors(current => ({ ...current, [card.id]: cr('actionFailed', 'That did not go through. Open the room to answer.') })); return; }
    setCards(current => (current || []).filter(entry => entry.id !== card.id));
    window.dispatchEvent(new Event('hivemind:employee-status-changed'));
  };
  const when = card => format.ago(new Date(card.createdAt).toISOString()) || cr('justNow', 'Just now');

  return createPortal(<div data-needs-you-overlay className="fixed inset-0 z-[110] grid place-items-center bg-black/35 p-3 sm:p-6 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={container} className="w-full max-w-[560px] max-h-[calc(100dvh-48px)] overflow-y-auto">
      <WorkspacePopupSurface variant="reader" label={cr('windowLabel', 'hivemind — needs you')} ariaLabel={cr('title', 'Needs you')} onClose={onClose}>
        <div className="ny-panel">
          <h2 className="ny-title">{cr('title', 'Needs you')}</h2>
          {cards === null && !failed && <p role="status" className="ny-note">{cr('loading', 'Checking what is waiting…')}</p>}
          {failed && <p role="alert" className="ny-note">{cr('loadFailed', 'Could not load this list.')} <button type="button" className="ny-link" onClick={load}>{cr('retry', 'Try again')}</button></p>}
          {cards !== null && !failed && rows.length === 0 && <p role="status" className="ny-empty">{cr('empty', 'Nothing needs you.')}</p>}
          {rows.length > 0 && <ul className="ny-list">{rows.map(card => {
            const agent = byEmployee.get(card.employeeId.toLowerCase());
            const name = agent?.name || cr('employeeFallback', 'Employee');
            const [kindKey, kindDefault] = KIND_KEYS[card.kind];
            const working = busy[card.id];
            return <li key={card.id} className="ny-row" data-needs-you-card={card.kind}>
              <span className="ny-avatar"><AgentAvatar agent={agent} size={36} /></span>
              <div className="ny-main">
                <div className="ny-meta"><strong>{name}</strong><span>{cr(kindKey, kindDefault)}</span><time dateTime={new Date(card.createdAt).toISOString()}>{when(card)}</time></div>
                <p className="ny-card-title">{card.title}</p>
                {errors[card.id] && <p role="alert" className="ny-error">{errors[card.id]}</p>}
                <div className="ny-actions">
                  <button type="button" className="ny-open" aria-label={cr('openAria', 'Open {{name}}’s room at this card', { name })} disabled={!!working} onClick={() => onOpenCard(card)}>{cr('open', 'Open')}</button>
                  {card.kind === 'approval' && card.quickApprove && <button type="button" className="ny-approve" disabled={!!working} aria-label={cr('approveAria', 'Approve: {{title}}', { title: card.title })} onClick={() => decide(card, 'approve')}>{cr('approve', 'Approve')}</button>}
                  {card.kind === 'approval' && <button type="button" className="ny-deny" disabled={!!working} aria-label={cr('denyAria', 'Deny: {{title}}', { title: card.title })} onClick={() => decide(card, 'deny')}>{cr('deny', 'Deny')}</button>}
                </div>
              </div>
            </li>;
          })}</ul>}
        </div>
      </WorkspacePopupSurface>
    </div>
  </div>, portalContainer || document.body);
}
