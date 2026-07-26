import React from 'react';
import { Brain, Check, Loader2, Megaphone, Network, Play, UsersRound, X } from 'lucide-react';

const STEPS = [
  { label: 'Campaign brief accepted', detail: 'Goal, objective, and channels', icon: Megaphone },
  { label: 'Creating dedicated Room', detail: 'One private workspace for this campaign', icon: Network },
  { label: 'Assigning campaign agents', detail: 'Research, strategy, and content roles', icon: UsersRound },
  { label: 'Connecting company context', detail: 'Company knowledge and existing audience', icon: Brain },
  { label: 'Starting campaign workflow', detail: 'Your request is sent to the Room', icon: Play },
];

export default function CampaignActivation({ activation, onClose }) {
  const activeStep = activation?.step ?? 0;
  const failed = activation?.status === 'failed';
  const opening = activation?.status === 'opening';

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-3" role="dialog" aria-modal="true" aria-labelledby="campaign-activation-title">
    <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#d8d3cc] bg-[#fffefa] shadow-2xl">
      <header className="border-b border-[#e3dfd8] px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9.5px] font-mono uppercase text-[#256d5b]">{opening ? 'Room ready' : failed ? 'Setup paused' : 'Activating campaign'}</div>
            <h2 id="campaign-activation-title" className="mt-1 text-[22px] font-semibold text-[#171717]">{opening ? 'Opening your HyperAgents Room' : 'Setting up your Campaign Room'}</h2>
            <p className="mt-2 max-w-xl text-[11.5px] leading-5 text-[#6f6962]">{activation?.goal}</p>
          </div>
          {failed ? <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[#f0ede7]" title="Close setup"><X size={15} /></button> : null}
        </div>
      </header>

      <div className="px-5 py-2 sm:px-7">
        {STEPS.map((step, index) => {
          const complete = opening || index < activeStep;
          const active = !failed && !opening && index === activeStep;
          const Icon = step.icon;
          return <div key={step.label} className="flex min-h-16 items-center gap-3 border-b border-[#e8e4de] py-3 last:border-0">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md border ${complete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active ? 'border-[#171717] bg-[#171717] text-white' : 'border-[#ddd8d1] bg-[#faf8f3] text-[#aaa49c]'}`}>
              {complete ? <Check size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-[12px] font-semibold ${complete || active ? 'text-[#292624]' : 'text-[#8a847d]'}`}>{step.label}</div>
              <div className="mt-0.5 text-[10px] text-[#9a948d]">{step.detail}</div>
            </div>
            <span className={`text-[9px] font-mono uppercase ${complete ? 'text-emerald-700' : active ? 'text-[#256d5b]' : 'text-[#aaa49c]'}`}>{complete ? 'Ready' : active ? 'Working' : 'Waiting'}</span>
          </div>;
        })}
      </div>

      <footer className="border-t border-[#e3dfd8] px-5 py-4 sm:px-7">
        {failed ? <div className="flex items-center justify-between gap-4"><p className="text-[11px] text-red-700">{activation.error || 'The Campaign Room could not be created.'}</p><button onClick={onClose} className="h-9 shrink-0 rounded-md border border-[#bdb7af] px-3 text-[11px] font-semibold">Back to campaigns</button></div> : <div><div className="h-1 overflow-hidden rounded bg-[#e5e1da]"><div className="h-full bg-[#256d5b] transition-all duration-500" style={{ width: `${opening ? 100 : Math.max(8, ((activeStep + 0.5) / STEPS.length) * 100)}%` }} /></div><div className="mt-2 flex items-center justify-between text-[9.5px] font-mono text-[#8a847d]"><span>{opening ? 'Campaign workflow started' : 'Preparing the dedicated workspace'}</span><span>{opening ? 'Opening Room...' : `${Math.min(activeStep + 1, STEPS.length)}/${STEPS.length}`}</span></div></div>}
      </footer>
    </div>
  </div>;
}
