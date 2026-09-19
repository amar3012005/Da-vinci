import React from 'react';
import { X } from 'lucide-react';

export function WindowLights() {
  return <span className="flex items-center gap-1.5" aria-hidden="true">
    <i className="h-2.5 w-2.5 rounded-full bg-[#ef675f]" />
    <i className="h-2.5 w-2.5 rounded-full bg-[#efb83d]" />
    <i className="h-2.5 w-2.5 rounded-full bg-[#55bd58]" />
  </span>;
}

/**
 * One visual language for lifecycle notices, page guides, and artifact readers.
 * `toast` is bottom-left and intentionally compact; `dialog` and `reader`
 * share the same window chrome so expanding a notice never feels like a new UI.
 */
export default function WorkspacePopupSurface({
  variant = 'dialog', label = 'hivemind', title, description, visual,
  onClose, secondaryAction, primaryAction, meta, children, ariaLabel,
}) {
  const toast = variant === 'toast';
  const reader = variant === 'reader';
  return <section
    role="dialog"
    aria-modal={!toast}
    aria-label={ariaLabel || title || label}
    className={`${toast
      ? 'fixed bottom-4 left-4 z-[90] w-[min(430px,calc(100vw-32px))]'
      : 'w-full'} overflow-hidden rounded-[18px] border border-[#deddd7] bg-[#fbfaf7] shadow-[0_26px_75px_rgba(25,31,39,0.16)]`}
  >
    <header className="flex h-[52px] items-center border-b border-[#deddd7] px-5">
      <WindowLights />
      <span className="ml-5 min-w-0 truncate font-mono text-[10px] font-semibold tracking-[0.1em] text-[#99978f]">{label}</span>
      {onClose ? <button type="button" onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[#8b8c87] hover:bg-[#f0eee9] hover:text-[#111]" aria-label="Close"><X size={17} /></button> : null}
    </header>
    <div className={`${reader ? 'min-h-0' : toast ? 'px-6 py-5' : 'px-7 py-6 sm:px-9'} overflow-y-auto`}>
      {!reader ? <>
        {visual ? <div className="mb-5">{visual}</div> : null}
        {title ? <h2 className={`${toast ? 'text-[23px]' : 'text-[28px]'} max-w-2xl font-semibold leading-[1.12] tracking-[-0.04em] text-[#111]`}>{title}</h2> : null}
        {description ? <p className="mt-2 max-w-2xl text-[13px] leading-5 text-[#666861] sm:text-[14px]">{description}</p> : null}
      </> : null}
      {children}
    </div>
    {(meta || secondaryAction || primaryAction) ? <footer className="flex min-h-[64px] items-center gap-2 border-t border-[#deddd7] px-4 py-3">
      {meta ? <span className="hidden min-w-0 flex-1 truncate font-mono text-[9px] text-[#989992] sm:block">{meta}</span> : <span className="flex-1" />}
      {secondaryAction ? <button type="button" onClick={secondaryAction.onClick} className="h-10 rounded-[10px] border border-[#d6d4ce] bg-white px-4 text-[11px] font-semibold text-[#333] hover:border-[#aaa7a0]">{secondaryAction.label}</button> : null}
      {primaryAction ? <button type="button" onClick={primaryAction.onClick} className="h-10 rounded-[10px] bg-[#347df4] px-4 text-[11px] font-semibold text-white hover:bg-[#246ce0]">{primaryAction.label}</button> : null}
    </footer> : null}
  </section>;
}
