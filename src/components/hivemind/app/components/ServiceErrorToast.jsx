import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { SERVICE_ERROR_EVENT } from '../shared/serviceError';

/**
 * ServiceErrorToast — global, dismissible, auto-hiding notice for a 5xx / network
 * outage. Reacts to the window 'hm:service-error' event dispatched by the axios
 * interceptor (shared/api-client.js). Replaces the old silent failure (raw console
 * "503 (Service Unavailable)" with no UI). Mounted once in AppShell.
 *
 * Themed to the HIVEMIND warm-light console (see PlanLimitModal.jsx): white surface,
 * #e3e0db border, #0a0a0a/#525252 text, Space Grotesk. Non-blocking (bottom-center,
 * does not trap focus like the plan-limit modal) since a transient outage is recoverable.
 */
const AUTO_HIDE_MS = 7000;

export default function ServiceErrorToast() {
  const [toast, setToast] = useState(null); // null | { status, message }

  useEffect(() => {
    let hideTimer;
    const onError = (e) => {
      setToast(e.detail || { status: null, message: 'The service is temporarily unavailable.' });
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setToast(null), AUTO_HIDE_MS);
    };
    window.addEventListener(SERVICE_ERROR_EVENT, onError);
    return () => {
      window.removeEventListener(SERVICE_ERROR_EVENT, onError);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-[#e3e0db] shadow-2xl px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#b45309]/10 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-[#b45309]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#0a0a0a] text-[13px] font-semibold font-['Space_Grotesk'] mb-0.5">
                {toast.status ? `Service unavailable${toast.status ? ` (${toast.status})` : ''}` : 'Connection problem'}
              </p>
              <p className="text-[#525252] text-[12px] font-['Space_Grotesk'] leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
