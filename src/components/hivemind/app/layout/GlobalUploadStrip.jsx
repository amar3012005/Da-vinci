/**
 * GlobalUploadStrip — floating uploads tracker that lives at the AppShell
 * level so users can navigate away from the Knowledge Base while uploads
 * are still in flight without losing visibility.
 *
 * Subscribes to the module-level upload-store. On any page other than
 * KnowledgeBase (which has its own inline strip) it renders a compact
 * collapsible card pinned to the bottom-left, showing per-file progress
 * + an "Open" button to jump back to KB.
 *
 * Hides itself entirely on KnowledgeBase to avoid duplication.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { useUploads, removeUpload } from '../shared/upload-store';

const KB_ROUTE = '/hivemind/app/knowledge';

function fmtUpBytes(n) {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function fmtElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function statusBadge(u) {
  if (u.status === 'success') return { icon: CheckCircle2, color: '#16a34a', label: 'Uploaded' };
  if (u.status === 'error' || u.status === 'cancelled') return { icon: AlertTriangle, color: '#dc2626', label: u.status === 'cancelled' ? 'Cancelled' : 'Failed' };
  if (u.status === 'uploading') return { icon: Upload, color: '#117dff', label: u.bytesDone ? (u.stageLabel || 'Processing') : `${u.progress || 0}%` };
  return { icon: Upload, color: '#a3a3a3', label: 'Queued' };
}

export default function GlobalUploadStrip() {
  const uploads = useUploads();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    const active = uploads?.some((u) => u.status === 'uploading' || u.status === 'queued');
    if (!active) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [uploads]);

  // Don't double up — KB has its own inline strip, and Overview shows the
  // compact drop-up above its chat composer.
  if (location.pathname.startsWith(KB_ROUTE)) return null;
  if (/\/hivemind\/app(\/overview)?\/?$/.test(location.pathname)) return null;
  if (!uploads || uploads.length === 0) return null;

  const inFlight = uploads.filter((u) => u.status === 'uploading' || u.status === 'queued').length;
  const done = uploads.filter((u) => u.status === 'success').length;
  const failed = uploads.filter((u) => u.status === 'error' || u.status === 'cancelled').length;
  const allLanded = inFlight === 0;

  // Auto-prune confirmed rows after a while so the strip clears itself.
  // KB does its own clear via "Clear completed"; here we just hide rows that
  // finished more than 60s ago.
  const now = Date.now();
  const visible = uploads.filter((u) => {
    if (u.status !== 'success') return true;
    if (!u._completedAt) return true; // no timestamp yet → keep
    return now - u._completedAt < 60_000;
  });
  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="global-upload-strip"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="fixed bottom-6 left-6 z-40 w-[320px] rounded-2xl border border-[#ece9e2] bg-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.18),0_4px_14px_-4px_rgba(0,0,0,0.08)] overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#ece9e2] bg-gradient-to-b from-white to-[#fafaf6] hover:bg-[#f5f3ee] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-[#117dff]/8 border border-[#117dff]/18 flex items-center justify-center flex-shrink-0">
            <Upload size={13} className="text-[#117dff]" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[12.5px] font-semibold text-[#0a0a0a] leading-tight">
              {inFlight > 0
                ? `Uploading ${inFlight} ${inFlight === 1 ? 'file' : 'files'}…`
                : allLanded && failed === 0
                  ? `${done} ${done === 1 ? 'upload' : 'uploads'} complete`
                  : `${done} done · ${failed} failed`}
            </div>
            <div className="text-[10.5px] text-[#8a8a8a] mt-0.5 font-mono">
              {inFlight > 0 ? "Don't close this tab" : 'Safe to leave — server processing'}
            </div>
          </div>
          {collapsed ? <ChevronUp size={14} className="text-[#a3a3a3]" /> : <ChevronDown size={14} className="text-[#a3a3a3]" />}
        </button>

        {/* Body */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-[260px] overflow-y-auto px-2 py-2 space-y-1">
                {visible.map((u) => {
                  const { icon: Icon, color, label } = statusBadge(u);
                  const progress = u.bytesDone ? Number(u.serverProgress || 0) : Number(u.progress || 0);
                  const elapsed = fmtElapsed(clockNow - Number(u.startedAt || clockNow));
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f5f3ee] group"
                    >
                      <Icon size={12} className="flex-shrink-0 mt-0.5 self-start" style={{ color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] text-[#0a0a0a] font-medium truncate">{u.filename}</span>
                          <span className="text-[10px] font-mono flex-shrink-0" style={{ color }}>{label}</span>
                        </div>
                        {/* tqdm-style filling bar — determinate while uploading,
                            pulsing once bytes hit 100% and the server is parsing. */}
                        {u.status === 'uploading' && (
                          <>
                            <div className="mt-1 h-1.5 rounded-full bg-[#e3e0db] overflow-hidden">
                              <div
                                className={`h-full bg-[#117dff] transition-all duration-300 ${u.bytesDone && progress < 100 ? 'animate-pulse' : ''}`}
                                style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-[#a3a3a3] font-mono mt-0.5 truncate">
                              {u.bytesDone
                                ? `${Math.round(progress)}/100 [${elapsed} elapsed] · ${u.stageLabel || 'Processing'}`
                                : `${Math.round(progress)}/100 [${elapsed}${u.etaSec != null ? `<${fmtElapsed(u.etaSec * 1000)}` : ''}]${u.bytesTotal ? ` · ${fmtUpBytes(u.bytesLoaded)}/${fmtUpBytes(u.bytesTotal)}` : ''}${u.speedBps > 0 ? ` · ${fmtUpBytes(u.speedBps)}/s` : ''}`}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeUpload(u.id)}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md text-[#a3a3a3] hover:text-[#0a0a0a] hover:bg-[#e3e0db]/40 flex-shrink-0 transition-opacity"
                        aria-label="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer — jump back to KB */}
              <button
                onClick={() => navigate(KB_ROUTE)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border-t border-[#ece9e2] text-[11.5px] font-semibold text-[#117dff] hover:bg-[#117dff]/5 transition-colors"
              >
                <span>Open Knowledge Base</span>
                <ArrowUpRight size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
