import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mail, Phone, PhoneCall, Send, X, Zap } from 'lucide-react';

/**
 * LiveActionCards — theatrical surfaces for the outbound closed loop.
 *
 * EmailComposeCard: a Gmail-style compose window rendered INSIDE the turn
 * stream when an agent queues a gmail_send. The body types itself out in
 * realtime (the agent visibly "writing"), then the user sends with one click.
 * An "Automate from next turn" toggle auto-approves future emails in this
 * room after the typing animation — the HITL gate stays, the click is what
 * gets automated (per-room, stored client-side).
 *
 * CallRingingCard: a phone-call overlay with pulse-ring ringing animation
 * while TARA dials a real number through Telnyx.
 */

function useTypewriter(text, { cps = 220, start = true } = {}) {
  const [n, setN] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => { setN(0); doneRef.current = false; }, [text]);
  useEffect(() => {
    if (!start || !text) return undefined;
    if (n >= text.length) { doneRef.current = true; return undefined; }
    const step = Math.max(2, Math.round(cps / 30));
    const id = setInterval(() => setN((p) => Math.min(text.length, p + step)), 33);
    return () => clearInterval(id);
  }, [text, n, start, cps]);
  return { shown: (text || '').slice(0, n), done: n >= (text || '').length };
}

export function EmailComposeCard({ approval, fromName, onSend, onDeny, busy, autoSend, onToggleAutoSend, resolved }) {
  const body = approval.body_md || '';
  const { shown, done } = useTypewriter(body, { start: !resolved });
  const firedRef = useRef(false);
  // Automation: once the draft finishes "being written", send without a click.
  useEffect(() => {
    if (autoSend && done && !resolved && !busy && !firedRef.current) {
      firedRef.current = true;
      const id = setTimeout(() => onSend && onSend(), 900);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [autoSend, done, resolved, busy, onSend]);

  return (
    <div className="rounded-xl overflow-hidden border border-[#d4d4d4] shadow-lg bg-white max-w-[560px]">
      {/* Gmail-style title bar */}
      <div className="flex items-center justify-between bg-[#404040] px-3 py-2">
        <span className="text-[12px] text-white font-medium flex items-center gap-2">
          <Mail size={13} /> New message
        </span>
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#d4d4d4]">
          {resolved ? (resolved.decision === 'approve' ? 'sent' : 'discarded') : done ? 'ready to send' : 'agent writing…'}
        </span>
      </div>
      {/* Schema rows */}
      <div className="px-3 text-[12px]">
        <div className="flex gap-2 border-b border-[#eee] py-1.5">
          <span className="text-[#a3a3a3] w-12 shrink-0">From</span>
          <span className="text-[#0a0a0a] truncate">{fromName || 'HIVEMIND agent'}</span>
        </div>
        <div className="flex gap-2 border-b border-[#eee] py-1.5">
          <span className="text-[#a3a3a3] w-12 shrink-0">To</span>
          <span className="text-[#0a0a0a] truncate">{approval.to || '—'}</span>
        </div>
        <div className="flex gap-2 border-b border-[#eee] py-1.5">
          <span className="text-[#a3a3a3] w-12 shrink-0">Subject</span>
          <span className="text-[#0a0a0a] font-medium truncate">{approval.subject || '(no subject)'}</span>
        </div>
        {/* Body — realtime typing */}
        <div className="py-2 min-h-[96px] max-h-[260px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-[12.5px] text-[#1f1f1f]">
          {resolved ? body : shown}
          {!resolved && !done && <span className="inline-block w-[7px] h-[14px] bg-[#1a73e8] align-text-bottom animate-pulse ml-0.5" />}
        </div>
      </div>
      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#eee] bg-[#fafafa]">
        {resolved ? (
          <span className={`text-[11px] font-medium flex items-center gap-1 ${resolved.decision === 'approve' ? 'text-emerald-700' : 'text-red-600'}`}>
            {resolved.decision === 'approve' ? <><Check size={12} /> Sent</> : <><X size={12} /> Discarded</>}
          </span>
        ) : (
          <>
            <button type="button" disabled={busy || !done} onClick={onSend}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-40 transition-colors">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
            </button>
            <button type="button" disabled={busy} onClick={onDeny}
              className="px-3 py-1.5 rounded-full text-[11px] text-[#525252] hover:bg-[#eee] transition-colors">Discard</button>
          </>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-[10px] text-[#525252] cursor-pointer select-none" title="Auto-send this room's future emails once the agent finishes writing">
          <button type="button" onClick={onToggleAutoSend}
            className={`w-7 h-4 rounded-full transition-colors relative ${autoSend ? 'bg-[#1a73e8]' : 'bg-[#d4d4d4]'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${autoSend ? 'left-3.5' : 'left-0.5'}`} />
          </button>
          <Zap size={10} className={autoSend ? 'text-[#1a73e8]' : 'text-[#a3a3a3]'} /> Automate from next turn
        </label>
      </div>
    </div>
  );
}

export function CallRingingCard({ number, status, onClose }) {
  // status: 'dialing' | 'ok' | 'error'; auto-dismiss a while after connect.
  useEffect(() => {
    if (status === 'ok' && onClose) { const id = setTimeout(onClose, 6000); return () => clearTimeout(id); }
    return undefined;
  }, [status, onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[280px] rounded-2xl bg-[#111] text-white shadow-2xl px-5 pt-6 pb-5 text-center">
      <div className="relative mx-auto w-16 h-16 mb-3">
        {status === 'dialing' && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-emerald-500/15 animate-ping [animation-delay:300ms]" />
          </>
        )}
        <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600">
          <PhoneCall size={24} className={status === 'dialing' ? 'animate-pulse' : ''} />
        </span>
      </div>
      <div className="text-[14px] font-medium">TARA</div>
      <div className="text-[12px] font-mono text-[#a3a3a3] mt-0.5">{number}</div>
      <div className="text-[11px] mt-2 text-emerald-400">
        {status === 'dialing' && <span className="animate-pulse">Ringing…</span>}
        {status === 'ok' && 'Call in progress — outcome will land on the dashboard'}
        {status === 'error' && <span className="text-red-400">Call failed</span>}
      </div>
      <button type="button" onClick={onClose}
        className="mt-4 mx-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-[11px] font-medium transition-colors">
        <Phone size={12} className="rotate-[135deg]" /> {status === 'dialing' ? 'Hide' : 'Close'}
      </button>
    </div>
  );
}
