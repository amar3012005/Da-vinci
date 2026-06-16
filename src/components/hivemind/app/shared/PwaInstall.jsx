/**
 * PwaInstall — makes Talk-to-HIVE installable as a home-screen app.
 *
 * Platform reality (not glossed over):
 *   • Android / Chromium: the `beforeinstallprompt` event lets us TRIGGER the
 *     native install dialog from our own button. True one-tap install.
 *   • iOS / Safari: Apple exposes NO install API. We cannot trigger it from a
 *     button — the user must use Share → "Add to Home Screen". We detect iOS
 *     and show those exact steps. Once added, the app launches standalone
 *     (apple-mobile-web-app-capable in index.html).
 *
 * On mount it swaps the page <link rel="manifest"> to the dedicated HIVE
 * manifest (start_url = /hivemind/m/chat) so the installed icon opens straight
 * into this chat, and restores the site manifest on unmount.
 *
 * Renders: a dismissible bottom banner when installable, plus an iOS
 * instruction sheet. Also listens for a window 'hive:install' event so a menu
 * item elsewhere (e.g. the chat kebab) can open the same flow.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, Plus } from 'lucide-react';

const HIVE_MANIFEST = '/hivemind-manifest.json';
const DISMISS_KEY = 'hive:pwa-dismissed';

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; detect via touch.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator.standalone === true;
}

export default function PwaInstall() {
  const [deferred, setDeferred] = useState(null);     // Android beforeinstallprompt
  const [showBanner, setShowBanner] = useState(false);
  const [iosExpanded, setIosExpanded] = useState(false); // inline A2HS steps
  const prevManifestRef = useRef(null);

  const ios = isIOSDevice();
  const standalone = isStandalone();

  // Swap the page manifest to the HIVE one so install identity = "HIVE" and the
  // installed icon opens the mobile chat. Restore on unmount.
  useEffect(() => {
    if (standalone) return undefined;
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      prevManifestRef.current = link.getAttribute('href');
      link.setAttribute('href', HIVE_MANIFEST);
    }
    return () => {
      if (link && prevManifestRef.current) link.setAttribute('href', prevManifestRef.current);
    };
  }, [standalone]);

  // Capture the Android install prompt.
  useEffect(() => {
    if (standalone) return undefined;
    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (localStorage.getItem(DISMISS_KEY) !== '1') setShowBanner(true);
    };
    const onInstalled = () => { setDeferred(null); setShowBanner(false); };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [standalone]);

  // iOS has no event — show the banner proactively (once, undismissed).
  useEffect(() => {
    if (standalone || !ios) return;
    if (localStorage.getItem(DISMISS_KEY) !== '1') setShowBanner(true);
  }, [ios, standalone]);

  const triggerInstall = useCallback(async () => {
    // iOS: no install API — reveal the Add-to-Home-Screen steps inline.
    if (ios) { setShowBanner(true); setIosExpanded((v) => !v); return; }
    // Android/Chromium: fire the real native install dialog.
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch { /* ignore */ }
      setDeferred(null);
      setShowBanner(false);
    }
  }, [ios, deferred]);

  // Web Share API exists on iOS but the programmatic share sheet usually does
  // NOT contain "Add to Home Screen" (that lives only in Safari's own share).
  // Offered as a convenience to pop the sheet; the inline steps stay the guide.
  const openShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: 'HIVE', url: window.location.href }).catch(() => {});
    }
  }, []);

  // Let a menu item elsewhere open the same flow.
  useEffect(() => {
    const handler = () => triggerInstall();
    window.addEventListener('hive:install', handler);
    return () => window.removeEventListener('hive:install', handler);
  }, [triggerInstall]);

  const dismiss = () => {
    setShowBanner(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  if (standalone) return null;                 // already installed → nothing
  const installable = ios || !!deferred;       // something to offer
  if (!installable) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="flex-shrink-0 mx-3 mb-2 rounded-2xl bg-[#0a0a0a] text-white shadow-lg overflow-hidden"
        >
          {/* Header row — the Download button */}
          <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="w-9 h-9 rounded-xl bg-[#117dff]/20 border border-[#117dff]/30 flex items-center justify-center flex-shrink-0">
              <Download size={17} className="text-[#5aa6ff]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold leading-tight">Install HIVE</div>
              <div className="text-[11px] text-white/60 mt-0.5 truncate">
                {ios ? 'Add to your Home Screen — opens like an app' : 'One tap — runs full-screen, works offline'}
              </div>
            </div>
            <button
              onClick={triggerInstall}
              className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold bg-[#117dff] text-white active:scale-95 transition-transform flex-shrink-0 inline-flex items-center gap-1.5"
            >
              <Download size={13} />
              {ios ? (iosExpanded ? 'Steps' : 'Download') : 'Install'}
            </button>
            <button onClick={dismiss} aria-label="Dismiss"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 active:text-white active:bg-white/10 flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* iOS: inline Add-to-Home-Screen steps revealed under the button.
              No install API on iOS — these steps ARE the path. */}
          <AnimatePresence>
            {ios && iosExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-1 border-t border-white/10">
                  <div className="text-[11px] text-white/55 mb-2.5 mt-2.5">
                    iPhone installs from Safari's Share menu — two taps:
                  </div>
                  <ol className="space-y-2.5">
                    <li className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#117dff]/20 text-[#5aa6ff] text-[12px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <span className="text-[13px] text-white flex items-center gap-1.5">Tap <Share size={15} className="text-[#5aa6ff] inline" /> Share (bottom bar)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#117dff]/20 text-[#5aa6ff] text-[12px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <span className="text-[13px] text-white flex items-center gap-1.5">Pick <strong className="font-semibold">Add to Home Screen</strong> <Plus size={14} className="text-white/70 inline" /></span>
                    </li>
                  </ol>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button
                      onClick={openShare}
                      className="mt-3 w-full py-2 rounded-xl text-[12px] font-medium bg-white/10 text-white active:bg-white/15"
                    >
                      Open share menu
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
