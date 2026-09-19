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
 * `toast` is a persistent portrait lifecycle card; `dialog` and `reader`
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
      ? 'fixed bottom-4 left-4 z-[2147483647] flex max-h-[calc(100dvh-32px)] w-[min(420px,calc(100vw-28px))] flex-col sm:bottom-6 sm:left-6'
      : 'w-full'} overflow-hidden rounded-[18px] border border-[#deddd7] bg-[#fbfaf7] shadow-[0_26px_75px_rgba(25,31,39,0.16)]`}
  >
    <header className="flex h-[52px] items-center border-b border-[#deddd7] px-5">
      <WindowLights />
      <span className="ml-5 min-w-0 truncate font-mono text-[10px] font-semibold tracking-[0.1em] text-[#99978f]">{label}</span>
      {onClose ? <button type="button" onClick={onClose} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-[#8b8c87] hover:bg-[#f0eee9] hover:text-[#111]" aria-label="Close"><X size={17} /></button> : null}
    </header>
    <div className={`${reader ? 'min-h-0' : toast ? 'min-h-0 flex-1 px-7 py-7' : 'px-7 py-6 sm:px-9'} overflow-y-auto`}>
      {!reader ? <>
        {visual ? <div className={`${toast ? 'mb-8 rounded-[14px] border border-[#deddd7] bg-white p-5' : 'mb-5'}`}>{visual}</div> : null}
        {title ? <h2 className={`${toast ? 'text-[27px]' : 'text-[28px]'} max-w-2xl font-semibold leading-[1.1] tracking-[-0.04em] text-[#111]`}>{title}</h2> : null}
        {description ? <p className={`${toast ? 'mt-4 text-[15px] leading-6' : 'mt-2 text-[13px] leading-5 sm:text-[14px]'} max-w-2xl text-[#666861]`}>{description}</p> : null}
      </> : null}
      {children}
    </div>
    {(meta || secondaryAction || primaryAction) ? <footer className={`${toast ? 'min-h-[76px] px-5 py-4' : 'min-h-[64px] px-4 py-3'} flex items-center gap-2 border-t border-[#deddd7]`}>
      {meta ? <span className="hidden min-w-0 flex-1 truncate font-mono text-[9px] text-[#989992] sm:block">{meta}</span> : <span className="flex-1" />}
      {secondaryAction ? <button type="button" onClick={secondaryAction.onClick} className="h-10 rounded-[10px] border border-[#d6d4ce] bg-white px-4 text-[11px] font-semibold text-[#333] hover:border-[#aaa7a0]">{secondaryAction.label}</button> : null}
      {primaryAction ? <button type="button" onClick={primaryAction.onClick} className="h-10 rounded-[10px] bg-[#347df4] px-4 text-[11px] font-semibold text-white hover:bg-[#246ce0]">{primaryAction.label}</button> : null}
    </footer> : null}
  </section>;
}
