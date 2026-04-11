import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ExternalLink,
  Link,
  Trash2,
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  Globe,
  XCircle,
} from 'lucide-react';
import apiClient from '../shared/api-client';

/* ─── Design Tokens (matching WebIntelligence.jsx) ───────────────── */

const BTN_PRIMARY = 'flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all';
const BTN_GHOST = 'flex items-center gap-1.5 text-[#525252] hover:text-[#117dff] hover:bg-[#117dff]/5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all';

/* ─── Animation Variants ─────────────────────────────────────────── */

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const scaleUp = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.15 } },
};

/* ─── Inline Toast Component ─────────────────────────────────────── */

function InlineToast({ message, type = 'success' }) {
  if (!message) return null;
  const colors = type === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : 'bg-red-50 border-red-200 text-red-600';
  const ToastIcon = type === 'success' ? CheckCircle2 : XCircle;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-['Space_Grotesk'] ${colors}`}
    >
      <ToastIcon size={12} />
      {message}
    </motion.div>
  );
}

/* ─── Runtime Badge Component ────────────────────────────────────── */

function RuntimeBadge({ runtime, fallback }) {
  if (!runtime) return null;
  const isTavily = runtime === 'tavily';
  const isLightpanda = runtime === 'lightpanda';

  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
      fallback
        ? 'bg-amber-50 text-amber-600 border-amber-200'
        : isTavily
        ? 'bg-blue-50 text-blue-600 border-blue-200'
        : isLightpanda
        ? 'bg-purple-50 text-purple-600 border-purple-200'
        : 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]'
    }`}>
      {runtime === 'tavily' && <Globe size={8} />}
      {runtime}{fallback ? ' (fallback)' : ''}
    </span>
  );
}

/* ─── Main Modal Component ───────────────────────────────────────── */

export function WebResultModal({
  isOpen,
  onClose,
  result,
  jobId,
  index,
  type,
  runtime,
  fallback,
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);
  const [copying, setCopying] = useState(false);

  // Close on ESC key
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  // Extract result data based on type
  const isSearch = type === 'search';
  const title = result.title || result.url || 'Untitled';
  const url = result.url;
  const content = isSearch
    ? (result.snippet || result.content || '')
    : (result.text || result.content || result.markdown || '');
  const score = result.score;
  const domainAuthority = result.domainAuthority;
  const wordCount = result.word_count;
  const readingTime = result.reading_time;
  const favicon = result.favicon;

  // Handlers
  const handleSaveToMemory = async () => {
    if (saved) return;
    setSaving(true);
    try {
      await apiClient.saveWebResultToMemory(jobId, {
        resultIndex: index,
        title: title,
        tags: [`web-${type}`],
      });
      setSaved(true);
      setToast({ message: 'Saved to memory', type: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast({ message: 'Save failed', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!url) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: 'URL copied to clipboard', type: 'success' });
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast({ message: 'Failed to copy', type: 'error' });
      setTimeout(() => setToast(null), 2000);
    } finally {
      setCopying(false);
    }
  };

  const handleOpenInBrowser = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = () => {
    // Client-side only deletion - just close the modal
    // In a real implementation, you might want to remove from parent state
    setToast({ message: 'Result removed', type: 'info' });
    setTimeout(() => {
      setToast(null);
      onClose();
    }, 800);
  };

  // Calculate reading time if not provided
  const displayReadingTime = readingTime || (wordCount ? Math.ceil(wordCount / 200) : (content.length > 0 ? Math.ceil(content.length / 800) : null));

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeIn}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={scaleUp}
          className="relative w-full max-w-2xl bg-white border border-[#e3e0db] rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-4 border-b border-[#eae7e1] bg-[#faf9f4]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {favicon && (
                  <img src={favicon} alt="" className="w-4 h-4 rounded" onError={(e) => e.target.style.display = 'none'} />
                )}
                <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk'] truncate">
                  {title}
                </h3>
              </div>
              {url && (
                <p className="text-[#a3a3a3] text-[10px] font-mono truncate">
                  {url}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <RuntimeBadge runtime={runtime} fallback={fallback} />
                <span className="text-[9px] font-mono text-[#a3a3a3] capitalize">{type}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#a3a3a3] hover:text-[#0a0a0a] transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Metadata Bar */}
          {(score !== undefined || domainAuthority !== undefined || wordCount !== undefined || displayReadingTime !== null) && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#eae7e1] bg-white">
              {score !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#a3a3a3]">Score:</span>
                  <span className="text-[10px] font-semibold font-['Space_Grotesk'] text-[#117dff]">
                    {typeof score === 'number' ? score.toFixed(2) : score}
                  </span>
                </div>
              )}
              {domainAuthority !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#a3a3a3]">Authority:</span>
                  <span className="text-[10px] font-semibold font-['Space_Grotesk'] text-[#117dff]">
                    {typeof domainAuthority === 'number' ? domainAuthority.toFixed(1) : domainAuthority}
                  </span>
                </div>
              )}
              {wordCount !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#a3a3a3]">Words:</span>
                  <span className="text-[10px] font-semibold font-['Space_Grotesk'] text-[#525252]">
                    {typeof wordCount === 'number' ? wordCount.toLocaleString() : wordCount}
                  </span>
                </div>
              )}
              {displayReadingTime !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-[#a3a3a3]">Read:</span>
                  <span className="text-[10px] font-semibold font-['Space_Grotesk'] text-[#525252]">
                    ~{displayReadingTime} min
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-white">
            {content ? (
              <pre className="text-[11px] text-[#525252] font-['Space_Grotesk'] whitespace-pre-wrap leading-relaxed">
                {content}
              </pre>
            ) : (
              <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk'] text-center py-8">
                No content available
              </p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[#eae7e1] bg-[#faf9f4]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveToMemory}
                disabled={saving || saved}
                className={BTN_PRIMARY}
              >
                {saving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : saved ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <BookmarkPlus size={12} />
                )}
                {saved ? 'Saved' : 'Save to Memory'}
              </button>
              <button
                onClick={handleCopyUrl}
                disabled={copying || !url}
                className={BTN_GHOST}
              >
                {copying ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Link size={12} />
                )}
                {copying ? 'Copying...' : 'Copy URL'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className={`${BTN_GHOST} hover:!text-red-500 hover:!bg-red-50`}
              >
                <Trash2 size={12} />
                Delete
              </button>
              <button
                onClick={handleOpenInBrowser}
                disabled={!url}
                className={BTN_GHOST}
              >
                <ExternalLink size={12} />
                Open
              </button>
            </div>
          </div>

          {/* Toast Notifications */}
          <AnimatePresence>
            {toast && (
              <div className="absolute bottom-20 right-4">
                <InlineToast {...toast} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default WebResultModal;
