import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Camera, FileText, Search, Check, Globe, Mic, Cable, X } from 'lucide-react';

function useSheetKeyboard(open, selector, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = document.querySelector(selector);
    const controls = () => [...(panel?.querySelectorAll('button:not(:disabled), input, a[href]') || [])];
    (panel?.querySelector('input') || controls()[0])?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = controls(); const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus?.(); };
  }, [open, selector, onClose]);
}

// Shared legacy presentation: native Brain supplies native actions, never a legacy chat loop.
export function LegacyMobileAddSheet({ plusSheetOpen, onClose, onPickFiles, deepResearchMode, setDeepResearchMode, onFocus, qrec, onConnectors }) { useSheetKeyboard(plusSheetOpen, '[data-legacy-mobile-add]', onClose); return (
<AnimatePresence>
        {plusSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-end bg-black/35"
            onClick={() => onClose()}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              data-legacy-mobile-add role="dialog" aria-modal="true" aria-label="Add to this chat"
              className="w-full bg-white rounded-t-[24px] border-t border-[#e8e5de] px-4 pt-2.5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 18px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8 h-1 rounded-full bg-[#d5d1c8] mx-auto mb-3" />
              <h3 className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] mb-2.5">Add to this chat</h3>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => { onClose(); onPickFiles('photo'); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] bg-[#faf9f4] border border-[#e8e5de] active:bg-[#f1eee7]"
                >
                  <ImageIcon size={17} className="text-[#0a0a0a]" />
                  <span className="text-[10px] font-semibold text-[#525252]">Photo</span>
                </button>
                <button
                  onClick={() => { onClose(); onPickFiles('camera'); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] bg-[#faf9f4] border border-[#e8e5de] active:bg-[#f1eee7]"
                >
                  <Camera size={17} className="text-[#0a0a0a]" />
                  <span className="text-[10px] font-semibold text-[#525252]">Camera</span>
                </button>
                <button
                  onClick={() => { onClose(); onPickFiles('file'); }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-[14px] bg-[#faf9f4] border border-[#e8e5de] active:bg-[#f1eee7]"
                >
                  <FileText size={17} className="text-[#0a0a0a]" />
                  <span className="text-[10px] font-semibold text-[#525252]">File</span>
                </button>
              </div>

              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[#a3a3a3] px-1 mb-1">Modes</p>
              <button
                onClick={() => { setDeepResearchMode(false); onClose(); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] active:bg-[#faf9f4]"
              >
                <span className="w-7 h-7 rounded-[9px] bg-[#117dff]/10 text-[#117dff] flex items-center justify-center flex-shrink-0"><Search size={14} /></span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[12.5px] font-semibold text-[#0a0a0a]">Search</span>
                  <span className="block text-[10.5px] text-[#8a867e]">Fast recall over your memory</span>
                </span>
                {!deepResearchMode && <Check size={14} className="text-[#117dff] flex-shrink-0" />}
              </button>
              <button
                onClick={() => { setDeepResearchMode(true); onClose(); onFocus?.(); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] active:bg-[#faf9f4]"
              >
                <span className="w-7 h-7 rounded-[9px] bg-[#117dff]/10 text-[#117dff] flex items-center justify-center flex-shrink-0"><Globe size={14} /></span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[12.5px] font-semibold text-[#0a0a0a]">Deep Research</span>
                  <span className="block text-[10.5px] text-[#8a867e]">Multi-source report, runs in background</span>
                </span>
                {deepResearchMode && <Check size={14} className="text-[#117dff] flex-shrink-0" />}
              </button>

              <div className="h-px bg-[#f1eee7] my-2" />

              <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[#a3a3a3] px-1 mb-1">Add</p>
              {qrec.supported && !qrec.active && (
                <button
                  onClick={() => { onClose(); qrec.openConfig(); }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] active:bg-[#faf9f4]"
                >
                  <span className="w-7 h-7 rounded-[9px] bg-[#fde8ea] text-[#e0455a] flex items-center justify-center flex-shrink-0"><Mic size={14} /></span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-[12.5px] font-semibold text-[#0a0a0a]">Start taking meeting notes</span>
                    <span className="block text-[10.5px] text-[#8a867e]">Triggers AI Meeting Notes for this call</span>
                  </span>
                </button>
              )}
              <button
                onClick={() => { onClose(); onConnectors(); }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] active:bg-[#faf9f4]"
              >
                <span className="w-7 h-7 rounded-[9px] bg-[#117dff]/10 text-[#117dff] flex items-center justify-center flex-shrink-0"><Cable size={14} /></span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[12.5px] font-semibold text-[#0a0a0a]">Connectors &amp; sources</span>
                  <span className="block text-[10.5px] text-[#8a867e]">Gmail, GitHub, Calendar, Sheets…</span>
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
); }
export function LegacyMobileAppsSheet({ connectorSheetOpen, onClose, connectorSearch, setConnectorSearch, visibleToolkits, chooseToolkit, loading = false, error = '' }) { useSheetKeyboard(connectorSheetOpen, '[data-legacy-mobile-apps]', onClose); return (
<AnimatePresence>
        {connectorSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex items-end bg-black/35"
            onClick={() => onClose()}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              data-legacy-mobile-apps role="dialog" aria-modal="true" aria-label="Apps and connectors"
              className="w-full rounded-t-[24px] border-t border-[#e3e0db] bg-white px-4 pt-2.5"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 18px)' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-[#d5d1c8]" />
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">Apps &amp; connectors</h3>
                  <p className="mt-0.5 text-[11px] text-[#737373]">Choose a connected app, or connect a new one.</p>
                </div>
                <button type="button" onClick={() => onClose()} className="p-1.5 text-[#a3a3a3]" aria-label="Close apps"><X size={15} /></button>
              </div>
              <label className="mb-3 flex h-10 items-center gap-2 rounded-[10px] border border-[#e3e0db] bg-[#faf9f4] px-3 focus-within:border-[#117dff]">
                <Search size={14} className="text-[#a3a3a3]" />
                <input
                  type="search"
                  value={connectorSearch}
                  onChange={(event) => setConnectorSearch(event.target.value)}
                  placeholder="Search Gmail, Slack, Calendar…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3]"
                  autoFocus
                />
              </label>
              <div className="max-h-[52vh] overflow-y-auto pb-1">
                {loading && <div role="status" className="py-10 text-center text-[12px] text-[#737373]">Loading apps…</div>}
                {error && <div role="alert" className="py-3 text-[12px] text-red-700">{error}</div>}
                {!loading && visibleToolkits.length > 0 ? visibleToolkits.map((toolkit) => (
                  <button
                    key={toolkit.slug}
                    type="button"
                    onClick={() => chooseToolkit(toolkit)}
                    className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2.5 text-left active:bg-[#faf9f4]"
                  >
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] border border-[#e3e0db] bg-[#faf9f4]">
                      {toolkit.logo ? <img src={toolkit.logo} alt="" className="h-5 w-5 object-contain" /> : <Cable size={15} className="text-[#117dff]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#0a0a0a]">{toolkit.name || toolkit.slug}</span>
                      <span className="block truncate text-[10.5px] text-[#8a867e]">{toolkit.connected ? 'Ready for this chat' : 'Tap to connect and return here'}</span>
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${toolkit.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{toolkit.connected ? 'Connected' : 'Connect'}</span>
                  </button>
                )) : (!loading && !error && <div className="py-10 text-center text-[12px] text-[#a3a3a3]">No apps match this search.</div>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
); }
