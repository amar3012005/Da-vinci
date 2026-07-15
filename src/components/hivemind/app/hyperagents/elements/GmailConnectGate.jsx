import React, { useState } from 'react';
import { Mail, Send, X, Zap, Loader2, Check } from 'lucide-react';
import { EmailComposeCard } from './LiveActionCards';

/**
 * GmailConnectGate — the outreach-powers nudge.
 *
 * Shown when a task room opens (or Send is clicked on the demo) and the org
 * has no Gmail connected. It doesn't just ask — it SHOWS: an embedded demo
 * EmailComposeCard types out a sample outreach draft in realtime, so the user
 * sees exactly what connecting unlocks. Send on the demo flips the footer to
 * the connect CTA instead of sending anything.
 */
const DEMO_APPROVAL = {
  to: 'anna.schmidt@prospect-firm.eu',
  subject: 'Faster client responses — fully GDPR-native',
  body_md:
    'Dear Anna,\n\nI noticed your firm is scaling its EU legal practice. Our agents keep every '
    + 'client file inside your own secure memory — German-hosted, fully auditable — while answering '
    + 'matter questions in seconds.\n\nWould you have 15 minutes next week for a quick look?\n\nBest regards,\nYour AI team',
};

export default function GmailConnectGate({ open, onClose, onConnect, connecting }) {
  const [demoSendTried, setDemoSendTried] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-[620px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* sharp corners per popup design system */}
        <div className="flex items-center justify-between border-b border-[#e3e0db] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-[#117dff]" />
            <span className="text-[13px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'Space Grotesk' }}>
              Give your agents outreach powers
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-[12.5px] text-[#525252] leading-relaxed">
            With Gmail connected, your agents don&apos;t stop at reports — they <b>write real emails in front
            of you</b> and send with one click (or automatically, once you allow it). Watch:
          </p>
          <EmailComposeCard
            approval={DEMO_APPROVAL}
            fromName="Your outreach agent"
            resolved={null}
            busy={false}
            autoSend={false}
            onToggleAutoSend={() => {}}
            onSend={() => setDemoSendTried(true)}
            onDeny={() => setDemoSendTried(true)}
          />
          <ul className="text-[12px] text-[#525252] space-y-1 pl-1">
            <li className="flex items-center gap-2"><Check size={12} className="text-emerald-600" /> Drafts stay yours — nothing sends without your click</li>
            <li className="flex items-center gap-2"><Check size={12} className="text-emerald-600" /> Replies are detected automatically and counted on your dashboard</li>
            <li className="flex items-center gap-2"><Zap size={12} className="text-[#117dff]" /> Flip one toggle later to automate sending entirely</li>
          </ul>
        </div>
        <div className="flex items-center justify-between border-t border-[#e3e0db] px-5 py-3.5 bg-[#faf9f4]">
          <span className="text-[11px] text-[#a3a3a3]">
            {demoSendTried ? 'That send needs a real Gmail connection —' : 'Takes ~20 seconds via Google.'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-[11.5px] font-medium text-[#737373] hover:text-[#0a0a0a]">Later</button>
            <button type="button" disabled={connecting} onClick={onConnect}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#117dff] text-white text-[11.5px] font-semibold hover:bg-[#0f6fe0] disabled:opacity-50">
              {connecting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Connect Gmail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
