import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fetchWithRuntimeAdmission } from '../shared/runtime-admission';
import { HYPERAGENTS_WORKSPACE, RUNTIME_WORKSPACE } from '../shared/runtime-workspace';

/** One autonomy dial for Runtime and HyperAgents; it lives in the HyperAgents sidebar on every page. */
export const AUTONOMY_ENDPOINT = '/api/hivemindHq/autonomyLevel';
/** OpenDot's own copy of the dial: the source of truth the employees' approval decisions read, so the dial and the policy cannot disagree. */
export const OPEN_DOT_AUTONOMY_ENDPOINT = '/api/dots/autonomy';
const MAX = 4;
const CELLS = 20;
/** Short checkpoint labels under the bar, one per level. */
const CHECKPOINTS = ['Observe', 'Suggest', 'Prepare', 'Lanes', 'Auto'];
/** Shown before a level was ever chosen; the previous approval rules behave closest to Prepare. */
const UNSET_DISPLAY = 2;
export const AUTONOMY_LEVELS = [
  { name: 'Observe', hint: 'Runtime and HyperAgents read signals and keep the company picture current. They tell you what changed and take no action.' },
  { name: 'Suggest', hint: 'Runtime and HyperAgents propose next steps and drafts. Every action needs your yes.' },
  { name: 'Prepare', hint: 'Runtime and HyperAgents take initiative on reversible internal work: research, drafts, files, plans and tasks. They ask before anything leaves the company or can’t be undone.' },
  { name: 'Act in lanes', hint: 'Runtime and HyperAgents act in your connected apps and tools without asking. Anything that can’t be undone, such as sending, deleting or paying, still asks first.' },
  { name: 'Autonomous', hint: 'No approvals: Runtime and HyperAgents act fully on their own, including actions that can’t be undone. Your own never-allow rules still apply.' },
];

function HumanIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="5" r="2.75" stroke="currentColor" strokeWidth="1.4"/><path d="M2.75 14c.6-2.75 2.7-4.25 5.25-4.25s4.65 1.5 5.25 4.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
}
function AgentIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="11" height="8.5" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 4.5V2.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="8" cy="1.75" r=".9" fill="currentColor"/><circle cx="5.9" cy="8.75" r="1" fill="currentColor"/><circle cx="10.1" cy="8.75" r="1" fill="currentColor"/></svg>;
}

/**
 * Drag the bar, then confirm the change from the previous level to the new one; nothing is saved until Save.
 * Renders nothing where the Runtime dial endpoint does not exist, and a compact level badge when collapsed.
 * @param {{ collapsed?: boolean, fetcher?: typeof fetch }} props
 */
/** Stable across renders, so a re-rendering parent never restarts or cancels the dial's read. */
const defaultFetcher = (...args) => fetchWithRuntimeAdmission(...args);

/* The company's last confirmed level on this device: the dial draws at once on every page, and on
   Brain's host (which has no autonomy API) it stays visible read-only, opening Runtime to change it. */
const cacheKey = orgId => `hivemind.autonomy.v1:${orgId || 'unknown'}`;
function readCachedAutonomy(orgId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(cacheKey(orgId)) || 'null');
    return saved && Number.isInteger(saved.revision) && Number.isInteger(saved.maxSelectable) ? saved : undefined;
  } catch { return undefined; }
}
function writeCachedAutonomy(orgId, value) {
  try { window.localStorage.setItem(cacheKey(orgId), JSON.stringify({ level: value.level, revision: value.revision, maxSelectable: value.maxSelectable })); } catch { /* Optional cache: only the instant first paint is lost. */ }
}

let authorityReported = false;
/** Tell the walkthrough the person has a chosen level; the server keeps the first time only. */
function reportAuthoritySet() {
  if (authorityReported) return;
  authorityReported = true;
  window.dispatchEvent(new CustomEvent('hm:onboarding', { detail: { milestone: 'authority_set' } }));
}

export default function AutonomyDial({ collapsed = false, fetcher = defaultFetcher, orgId, runtimeEnabled = true }) {
  const [state, setState] = useState(() => readCachedAutonomy(orgId));
  const [remote, setRemote] = useState(false);
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const generation = useRef(0);
  const root = useRef(null);
  const [attention, setAttention] = useState(false);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      // OpenDot's copy first. With no OpenDot API on this host (404) the legacy Runtime read below applies.
      let local = null;
      try {
        const own = await fetcher(OPEN_DOT_AUTONOMY_ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
        if (current !== generation.current) return;
        if (own.ok) local = (await own.json())?.value ?? null;
      } catch { /* OpenDot unreachable: fall through to the legacy read */ }
      if (current !== generation.current) return;
      if (local && local.level !== undefined) { setRemote(false); setState(local); writeCachedAutonomy(orgId, local); return; }
      // OpenDot answered but no level was ever chosen there. With Runtime off nothing else is asked.
      if (local && !runtimeEnabled) { setRemote(false); setState(previous => previous ?? local); return; }
      const response = await fetcher(AUTONOMY_ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
      if (current !== generation.current) return;
      if (response.status === 404) { setRemote(true); setState(previous => previous ?? readCachedAutonomy(orgId) ?? { revision: 0, maxSelectable: MAX }); return; }
      const body = await response.json();
      if (!response.ok || !body?.ok) { setState(previous => previous ?? false); return; }
      setRemote(false);
      setState(body.value);
      writeCachedAutonomy(orgId, body.value);
      // A level chosen before OpenDot kept its own copy is handed over once.
      if (local && body.value.level !== undefined) void fetcher(OPEN_DOT_AUTONOMY_ENDPOINT, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: body.value.level }) }).catch(() => undefined);
    } catch { if (current === generation.current) setState(previous => previous ?? false); }
  }, [fetcher, orgId, runtimeEnabled]);
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(); };
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60_000);
    return () => { generation.current++; window.removeEventListener('focus', refresh); clearInterval(timer); };
  }, [load]);
  // The walkthrough's authority step points here: the visible dial scrolls into view and takes focus.
  useEffect(() => {
    const focus = () => {
      const node = root.current;
      if (!node || !node.getClientRects().length) return;
      node.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      node.querySelector('input[type=range]')?.focus({ preventScroll: true });
      setAttention(true);
      setTimeout(() => setAttention(false), 2400);
    };
    window.addEventListener('hm:focus-autonomy', focus);
    return () => window.removeEventListener('hm:focus-autonomy', focus);
  }, []);
  // A level already chosen (here or on another device) completes the walkthrough's authority step, once per page load.
  useEffect(() => {
    if (state && state.level !== undefined) reportAuthoritySet();
  }, [state]);

  if (state === undefined || state === null) return null;
  const available = state !== false;
  const saved = available ? state.level ?? UNSET_DISPLAY : UNSET_DISPLAY;
  const shown = draft ?? pending ?? saved;
  /* Without Runtime the level governs the employees alone, so the copy names only them. */
  const hint = index => runtimeEnabled ? AUTONOMY_LEVELS[index].hint : AUTONOMY_LEVELS[index].hint.replace(/^Runtime and HyperAgents/, 'Your HyperAgents');
  const subject = runtimeEnabled ? 'Runtime and HyperAgents' : 'HyperAgents';
  const level = AUTONOMY_LEVELS[Math.max(0, Math.min(MAX, Math.round(shown)))];
  const filled = Math.round((shown / MAX) * CELLS);
  const lockedFrom = available ? Math.round((state.maxSelectable / MAX) * CELLS) : CELLS;
  const release = (value) => {
    const wanted = Number(value);
    setDraft(null);
    if (!available) return;
    if (remote) { window.location.assign(runtimeEnabled ? RUNTIME_WORKSPACE : HYPERAGENTS_WORKSPACE); return; }
    if (wanted > state.maxSelectable) { setNotice('Higher levels unlock after the restart and isolation safety tests pass.'); return; }
    if (wanted === state.level) return;
    setNotice(null);
    setPending(wanted);
  };
  /** Runtime's copy follows OpenDot's, best effort and only while Runtime is on; a failure here never changes what the person saved. */
  const syncRuntime = async level => {
    if (!runtimeEnabled) return;
    try {
      const read = await fetcher(AUTONOMY_ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
      if (!read.ok) return;
      const revision = (await read.json())?.value?.revision;
      await fetcher(AUTONOMY_ENDPOINT, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level, expectedRevision: revision }) });
    } catch { /* Runtime offline or disabled: OpenDot already holds the level. */ }
  };
  const save = async () => {
    if (pending === null || !available) return;
    setSaving(true);
    try {
      const post = (endpoint, body) => fetcher(endpoint, { method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      // OpenDot first: it is the source of truth. Without an OpenDot API on this host (404) the legacy Runtime save applies.
      let response = await post(OPEN_DOT_AUTONOMY_ENDPOINT, { level: pending, expectedRevision: state.revision });
      const viaOpenDot = response.status !== 404;
      if (!viaOpenDot) response = await post(AUTONOMY_ENDPOINT, { level: pending, expectedRevision: state.revision });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.value?.ok) {
        setState(body.value.value); writeCachedAutonomy(orgId, body.value.value); const saved = pending; setPending(null); setNotice(null); reportAuthoritySet();
        if (viaOpenDot) void syncRuntime(saved);
      }
      else if (response.ok && body?.value?.ok === false) { setState(body.value.current); setPending(null); setNotice('The level changed elsewhere. The current level is loaded.'); }
      else setNotice(body?.error === 'cross_site_request' ? 'Open HIVEMIND again to change the level.' : 'The level could not be saved. Try again.');
    } catch { setNotice('The level could not be saved. Try again.'); }
    finally { setSaving(false); }
  };
  const previous = available && state.level !== undefined ? AUTONOMY_LEVELS[state.level].name : 'Not set';

  if (collapsed) {
    return <div className="ha-autonomy-dial is-collapsed" title={`Autonomy · ${available ? level.name : 'unavailable'}`} data-hivemind-autonomy-dial>
      <span className="ha-autonomy-badge">{available ? `${Math.round(saved)}/${MAX}` : '–'}</span>
    </div>;
  }
  return <div ref={root} className="ha-autonomy-dial" data-attention={attention || undefined} data-unset={(available && state.level === undefined) || undefined} data-unavailable={!available || undefined} data-hivemind-autonomy-dial>
    <div className="ha-autonomy-head">
      <span className="ha-autonomy-title">Autonomy · {subject}</span>
      <span className="ha-autonomy-count">{available ? `${Math.round(shown)}/${MAX} · ${level.name}` : 'Unavailable'}</span>
    </div>
    <div className="ha-autonomy-row">
      <span className="ha-autonomy-end" title="Human in the loop"><HumanIcon/></span>
      <div className="ha-autonomy-bar">
        <span className="ha-autonomy-cells" aria-hidden="true">{Array.from({ length: CELLS }, (_, index) =>
          <i key={index} data-filled={index < filled || undefined} data-locked={index >= lockedFrom || undefined}/>)}</span>
        <input type="range" className="ha-autonomy-range" min={0} max={MAX} step={1} value={shown}
          disabled={!available || saving || pending !== null} aria-label={`Autonomy level for ${subject}`} aria-valuetext={level.name}
          onChange={event => { setNotice(null); setDraft(Number(event.target.value)); }}
          onPointerUp={event => release(event.currentTarget.value)}
          onKeyUp={event => { if (draft !== null) release(event.currentTarget.value); }}
          onBlur={event => { if (draft !== null) release(event.currentTarget.value); }}/>
      </div>
      <span className="ha-autonomy-end" title="Fully autonomous"><AgentIcon/></span>
    </div>
    <div className="ha-autonomy-checkpoints" role="group" aria-label="Autonomy checkpoints">
      {CHECKPOINTS.map((label, index) => <button key={label} type="button" className="ha-autonomy-checkpoint"
        data-current={index === Math.round(saved) || undefined} data-locked={(available && index > state.maxSelectable) || undefined}
        disabled={!available || saving || pending !== null} aria-pressed={index === Math.round(saved)}
        title={AUTONOMY_LEVELS[index].name} onClick={() => release(index)}>
        <span className="ha-autonomy-checkpoint-mark" aria-hidden="true"/>{label}
      </button>)}
    </div>
    {notice && <p className="ha-autonomy-notice" role="status">{notice}</p>}
    {remote && (runtimeEnabled
      ? <a className="ha-autonomy-notice" href={RUNTIME_WORKSPACE}>Change the level in the Runtime room</a>
      : <a className="ha-autonomy-notice" href={HYPERAGENTS_WORKSPACE}>Change the level in your HyperAgents workspace</a>)}
    {pending !== null && createPortal(<div className="ha-autonomy-overlay" role="presentation" onClick={() => { if (!saving) setPending(null); }}>
      <div className="ha-autonomy-confirm" role="dialog" aria-modal="true" aria-labelledby="ha-autonomy-confirm-title" onClick={event => event.stopPropagation()}
        onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); if (!saving) setPending(null); } }}>
        <h3 id="ha-autonomy-confirm-title">Change autonomy?</h3>
        <p className="ha-autonomy-change"><span>{previous}</span><span aria-hidden="true">→</span><strong>{AUTONOMY_LEVELS[pending].name}</strong></p>
        <p className="ha-autonomy-confirm-hint">{hint(pending)}</p>
        <p className="ha-autonomy-confirm-note">{runtimeEnabled ? 'This applies to Runtime and all HyperAgents until you change it again.' : 'This applies to all your HyperAgents until you change it again.'}</p>
        <div className="ha-autonomy-actions">
          <button type="button" onClick={() => setPending(null)} disabled={saving}>Cancel</button>
          <button type="button" className="is-primary" onClick={() => { void save(); }} disabled={saving} autoFocus>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>, document.body)}
  </div>;
}
