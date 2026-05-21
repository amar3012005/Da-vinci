import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Globe, Search, Link as LinkIcon, Send, Loader2, AlertTriangle, Lock, X,
  ChevronDown, ChevronUp, RefreshCw, Save, BookmarkPlus, CheckCircle2,
  RotateCcw, ExternalLink, Activity, Layers, TrendingUp, Zap, Info,
  ShieldAlert, ShieldCheck, Ban, FileText, Sparkles, Brain, ArrowUpRight,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import WebResultModal from '../components/WebResultModal';

/* ─── Helpers ──────────────────────────────────────────────────────── */

const URL_RE = /^https?:\/\/\S+$/i;
const URL_LIKE_RE = /^[\w-]+\.[a-z]{2,}/i;

function looksLikeUrl(s) {
  const t = s.trim();
  return URL_RE.test(t) || URL_LIKE_RE.test(t);
}

function normalizeUrl(s) {
  const t = s.trim();
  if (URL_RE.test(t)) return t;
  return `https://${t}`;
}

function formatMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 1000) return 'now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function isFeatureLocked(err) {
  const msg = err?.response?.data?.error || err?.message || '';
  return /feature.*not.*enabled|upgrade|locked/i.test(msg)
    || err?.response?.data?.code === 'feature_not_enabled';
}

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function WebStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHealthOpen = searchParams.get('view') === 'health';

  // Prompt + mode
  const [prompt, setPrompt] = useState('');
  const [forcedMode, setForcedMode] = useState(null); // null | 'research' | 'search' | 'crawl'
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [crawlPageLimit, setCrawlPageLimit] = useState(10);
  // Research knobs (depth-equivalent for Tavily).
  const [researchModel, setResearchModel] = useState('auto'); // 'mini' | 'pro' | 'auto'
  const [citationFormat, setCitationFormat] = useState('numbered'); // numbered | mla | apa | chicago
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Domain policy (URL paste)
  const [domainPolicy, setDomainPolicy] = useState(null);
  const [checkingPolicy, setCheckingPolicy] = useState(false);

  // Polling
  const [pollingId, setPollingId] = useState(null);
  const pollingRef = useRef(null);

  // Single-expanded-job model so the detail view can grow tall and let
  // the page itself scroll, while the list above stays capped at 10 rows.
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Modal
  const [selectedResult, setSelectedResult] = useState(null);

  // Admin drawer
  const [healthOpen, setHealthOpen] = useState(initialHealthOpen);
  const [adminAccessible, setAdminAccessible] = useState(false);

  // Locked plan
  const [featureLocked, setFeatureLocked] = useState(false);

  // API queries
  const { data: usage, refetch: refetchUsage }       = useApiQuery(() => apiClient.getWebUsage().catch(() => null));
  const { data: monthly, refetch: refetchMonthly }   = useApiQuery(() => apiClient.getWebMonthlyUsage().catch(() => null));
  const { data: jobs, refetch: refetchJobs }         = useApiQuery(() => apiClient.listWebJobs({ limit: 30 }).catch(() => null));
  const { data: metrics, refetch: refetchMetrics }   = useApiQuery(() => apiClient.getWebAdminMetrics().catch(() => null));

  // Probe entitlement + admin once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const limits = await apiClient.getWebLimits();
        if (!cancelled && limits?.feature_not_enabled) setFeatureLocked(true);
      } catch (err) {
        if (!cancelled && isFeatureLocked(err)) setFeatureLocked(true);
      }
      try {
        await apiClient.getWebAdminMetrics();
        if (!cancelled) setAdminAccessible(true);
      } catch {
        if (!cancelled) setAdminAccessible(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const jobList = useMemo(() => {
    if (!jobs) return [];
    return Array.isArray(jobs) ? jobs : (jobs.jobs || []);
  }, [jobs]);

  // ─── Resolve effective mode ────────────────────────────────
  // Default text → research (Tavily comprehensive report). Slash overrides:
  //   /research <q>  · /search <q> (raw 10 results) · /crawl <url>
  // URL paste → crawl auto-detect.
  const detectedMode = useMemo(() => {
    if (forcedMode) return forcedMode;
    const p = prompt.trim();
    if (!p) return 'research';
    if (p.startsWith('/research')) return 'research';
    if (p.startsWith('/search')) return 'search';
    if (p.startsWith('/crawl')) return 'crawl';
    return looksLikeUrl(p.split(/\s+/)[0]) ? 'crawl' : 'research';
  }, [prompt, forcedMode]);

  // Strip slash prefix
  const effectiveInput = useMemo(() => {
    return prompt.replace(/^\/(research|search|crawl)\s+/i, '').trim();
  }, [prompt]);

  // ─── Domain policy probe (debounced on URL change) ─────────
  useEffect(() => {
    if (detectedMode !== 'crawl' || !effectiveInput) {
      setDomainPolicy(null);
      return;
    }
    const url = normalizeUrl(effectiveInput.split(/\s+/)[0]);
    if (!URL_RE.test(url)) {
      setDomainPolicy(null);
      return;
    }
    let cancelled = false;
    setCheckingPolicy(true);
    const t = setTimeout(async () => {
      try {
        const policy = await apiClient.checkDomainPolicy(url);
        if (!cancelled) setDomainPolicy(policy);
      } catch {
        if (!cancelled) setDomainPolicy(null);
      } finally {
        if (!cancelled) setCheckingPolicy(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [effectiveInput, detectedMode]);

  // ─── Poll a job ────────────────────────────────────────────
  // While running, also refetch the full job list every tick so the
  // progress[] stream on research jobs shows up live in the expanded
  // detail view (the list endpoint returns the same row shape).
  const startPolling = useCallback((jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingId(jobId);
    pollingRef.current = setInterval(async () => {
      try {
        const r = await apiClient.getWebJob(jobId);
        refetchJobs();
        if (r?.status === 'succeeded' || r?.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPollingId(null);
          refetchUsage(); refetchMonthly();
        }
      } catch {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPollingId(null);
        refetchJobs();
      }
    }, 1500);
  }, [refetchJobs, refetchUsage, refetchMonthly]);

  // ─── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    const input = effectiveInput;
    if (!input || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (detectedMode === 'crawl') {
        const url = normalizeUrl(input.split(/\s+/)[0]);
        if (domainPolicy?.blocked) {
          setSubmitError(`Domain blocked: ${domainPolicy.reason || 'policy denial'}`);
          setSubmitting(false);
          return;
        }
        const r = await apiClient.submitWebCrawl({ urls: [url], depth: crawlDepth, page_limit: crawlPageLimit });
        const id = r?.job_id || r?.id;
        if (id) startPolling(id);
      } else if (detectedMode === 'research') {
        const r = await apiClient.submitWebResearch({ input, model: researchModel, citation_format: citationFormat });
        const id = r?.job_id || r?.id;
        if (id) {
          setExpandedJobId(id); // auto-open detail so user sees progress stream
          startPolling(id);
        }
      } else {
        const r = await apiClient.submitWebSearch({ query: input, limit: 10 });
        const id = r?.job_id || r?.id;
        if (id) startPolling(id);
      }
      setPrompt('');
      setForcedMode(null);
      setDomainPolicy(null);
      refetchJobs();
      refetchUsage();
    } catch (err) {
      if (isFeatureLocked(err)) {
        setFeatureLocked(true);
        setSubmitError('This capability is not enabled on your plan. Upgrade to unlock.');
      } else {
        setSubmitError(err.response?.data?.error || err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function toggleHealth() {
    const next = !healthOpen;
    setHealthOpen(next);
    setSearchParams(prev => {
      const np = new URLSearchParams(prev);
      if (next) np.set('view', 'health'); else np.delete('view');
      return np;
    }, { replace: true });
  }

  // The currently running research job (if any) takes over the upper
  // area. Once it succeeds it falls back to the "past research" toggle.
  const activeResearchJob = useMemo(() => {
    if (!pollingId) return null;
    const j = jobList.find(j => j.id === pollingId);
    if (!j) return null;
    if (j.type !== 'research') return null;
    if (j.status === 'succeeded' || j.status === 'failed') return null;
    return j;
  }, [jobList, pollingId]);

  // Past research toggle (drop-down list above the chat bar).
  const [pastOpen, setPastOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState(null);

  const researchJobs = useMemo(
    () => jobList.filter(j => j.type === 'research' && (j.status === 'succeeded' || j.status === 'failed')),
    [jobList]
  );
  const nonResearchJobs = useMemo(
    () => jobList.filter(j => j.type !== 'research'),
    [jobList]
  );

  return (
    <div className="font-['Space_Grotesk'] flex flex-col h-[calc(100vh-3.5rem-3rem)] max-w-[1100px] mx-auto -my-2">
      {/* Header — compact, always visible */}
      <header className="shrink-0 flex items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Globe size={16} className="text-[#117dff]" />
            <h1 className="text-[18px] font-semibold text-[#0a0a0a]">Web Studio</h1>
            <span className="text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-2 py-0.5 rounded uppercase tracking-wider">Add-on</span>
            {featureLocked && (
              <span className="text-[9px] font-mono bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Lock size={8} /> Locked
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#737373]">
            Ask the web. Live progress streams here. Saves to HIVEMIND through the same canonical pipeline as Knowledge Base uploads.
          </p>
        </div>
        <UsageRings usage={usage} monthly={monthly} />
      </header>

      {/* Upper area — fills available space, scrolls when content overflows.
          • Running research → live progress + streaming content
          • No active run → Past research toggle + (optional) drop-down list
          • Non-research jobs always show in their own compact list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {activeResearchJob ? (
          <LiveResearchPanel job={activeResearchJob} />
        ) : (
          <PastResearchPanel
            open={pastOpen}
            onToggle={() => setPastOpen(v => !v)}
            jobs={researchJobs}
            onPick={setPreviewJob}
            locked={featureLocked}
          />
        )}

        {/* Non-research jobs (search/crawl) — always rendered below.       */}
        {nonResearchJobs.length > 0 && (
          <section className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Search & Crawl runs</h3>
              <button onClick={refetchJobs} className="text-[10px] text-[#a3a3a3] hover:text-[#0a0a0a] flex items-center gap-1">
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
            <div className="border border-[#e3e0db] rounded-xl bg-white divide-y divide-[#f3f1ec] max-h-[420px] overflow-y-auto">
              {nonResearchJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  active={job.id === expandedJobId}
                  isPolling={job.id === pollingId}
                  onClick={() => setExpandedJobId(prev => prev === job.id ? null : job.id)}
                />
              ))}
            </div>
            <AnimatePresence>
              {expandedJobId && (() => {
                const job = nonResearchJobs.find(j => j.id === expandedJobId);
                if (!job) return null;
                return (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3">
                    <ExpandedJobView
                      job={job}
                      onClose={() => setExpandedJobId(null)}
                      onResultClick={setSelectedResult}
                      onMutate={() => { refetchJobs(); refetchUsage(); refetchMonthly(); }}
                    />
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </section>
        )}

        {/* System health (admin only) */}
        {adminAccessible && (
          <section className="mt-6 pt-4 border-t border-[#e3e0db]">
            <button onClick={toggleHealth} className="w-full flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-[#525252]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">System Health</span>
              </div>
              {healthOpen ? <ChevronUp size={13} className="text-[#a3a3a3]" /> : <ChevronDown size={13} className="text-[#a3a3a3]" />}
            </button>
            <AnimatePresence>
              {healthOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <HealthPanel metrics={metrics} onRefresh={refetchMetrics} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        <div className="h-3" />
      </div>

      {/* Fixed bottom chat bar */}
      <div className="shrink-0 pt-2 border-t border-[#e3e0db] bg-[#faf9f4]">
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700"
            >
              <AlertTriangle size={13} />{submitError}
              <button onClick={() => setSubmitError(null)} className="ml-auto text-red-400 hover:text-red-700">
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <PromptBar
          prompt={prompt} setPrompt={setPrompt}
          mode={detectedMode} forcedMode={forcedMode} setForcedMode={setForcedMode}
          submitting={submitting} onSubmit={handleSubmit} onKey={handleKey}
          depth={crawlDepth} setDepth={setCrawlDepth}
          pageLimit={crawlPageLimit} setPageLimit={setCrawlPageLimit}
          researchModel={researchModel} setResearchModel={setResearchModel}
          citationFormat={citationFormat} setCitationFormat={setCitationFormat}
          domainPolicy={domainPolicy} checkingPolicy={checkingPolicy}
          locked={featureLocked}
        />
      </div>

      {/* Detail modal — for non-research result drilldown */}
      <AnimatePresence>
        {selectedResult && (
          <WebResultModal
            isOpen={!!selectedResult}
            result={selectedResult.result}
            type={selectedResult.type}
            jobId={selectedResult.jobId}
            index={selectedResult.index}
            runtime={selectedResult.runtime}
            fallback={selectedResult.fallback}
            onClose={() => setSelectedResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Past-research preview popup with one-click save to HIVEMIND */}
      <AnimatePresence>
        {previewJob && (
          <ResearchPreviewModal
            job={previewJob}
            onClose={() => setPreviewJob(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Live research panel (running) ──────────────────────────────── */

function LiveResearchPanel({ job }) {
  const ref = useRef(null);
  // Auto-scroll the panel as new content streams in.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [job.partial_content, job.progress?.length]);

  return (
    <div ref={ref} className="h-full">
      <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden">
        <header className="px-4 py-2.5 border-b border-[#e3e0db] bg-[#faf9f4] flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-[12px] font-semibold text-[#0a0a0a]">{job.params?.input || 'Research'}</span>
          <span className="text-[10px] font-mono text-[#a3a3a3] ml-auto">streaming · {job.params?.model || 'auto'}</span>
          <Loader2 size={12} className="text-violet-500 animate-spin" />
        </header>
        <div className="p-4">
          <ResearchLiveView job={job} />
        </div>
      </div>
    </div>
  );
}

/* ─── Past research toggle + list ────────────────────────────────── */

function PastResearchPanel({ open, onToggle, jobs, onPick, locked }) {
  if (locked) return <EmptyState locked={true} />;

  return (
    <div className="h-full">
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#e3e0db] rounded-xl hover:border-[#d4d0ca] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          <span className="text-[13px] font-semibold text-[#0a0a0a]">Past research</span>
          <span className="text-[10px] font-mono text-[#a3a3a3]">
            {jobs.length === 0 ? 'no runs yet' : `${jobs.length} report${jobs.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        {open ? <ChevronUp size={14} className="text-[#a3a3a3]" /> : <ChevronDown size={14} className="text-[#a3a3a3]" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2"
          >
            {jobs.length === 0 ? (
              <div className="bg-white border border-[#e3e0db] rounded-xl p-6 text-center">
                <Sparkles size={18} className="text-[#117dff] mx-auto mb-2" />
                <p className="text-[12px] text-[#0a0a0a] font-semibold">No past research yet</p>
                <p className="text-[10px] text-[#737373] mt-1">Type a question in the chat bar below to start.</p>
              </div>
            ) : (
              <div className="border border-[#e3e0db] rounded-xl bg-white divide-y divide-[#f3f1ec] max-h-[460px] overflow-y-auto">
                {jobs.map(job => {
                  const results = Array.isArray(job.results) ? job.results : [];
                  const title = deriveJobTitle(job, results);
                  const sourceCount = results[0]?.sources?.length || 0;
                  return (
                    <button
                      key={job.id}
                      onClick={() => onPick(job)}
                      className="w-full px-4 py-2.5 text-left hover:bg-[#faf9f4] transition-colors flex items-center gap-3"
                    >
                      <Sparkles size={13} className="text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#0a0a0a] truncate">{title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#a3a3a3]">
                          <StatusBadge status={job.status} polling={false} />
                          <span>·</span>
                          <span>{relTime(job.createdAt || job.created_at)}</span>
                          {sourceCount > 0 && <><span>·</span><span>{sourceCount} sources</span></>}
                          {job.duration_ms != null && <><span>·</span><span>{formatMs(job.duration_ms)}</span></>}
                        </div>
                      </div>
                      <ArrowUpRight size={12} className="text-[#a3a3a3] shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiet hint when nothing else fills the area */}
      {!open && jobs.length === 0 && (
        <div className="mt-6 text-center text-[11px] text-[#a3a3a3]">
          Ask the web — type below. e.g. <code className="font-mono bg-[#f3f1ec] px-1 rounded">compare vector DBs for 1M-row RAG</code>
        </div>
      )}
    </div>
  );
}

/* ─── Past research preview modal (with one-click save) ──────────── */

function ResearchPreviewModal({ job, onClose }) {
  const result = Array.isArray(job.results) ? job.results[0] : null;
  const title = deriveJobTitle(job, job.results || []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // { documentId, segmentCount, promotedCount, promotedMemoryIds }
  const [saveErr, setSaveErr] = useState(null);
  const [relations, setRelations] = useState({}); // memoryId -> relations payload

  async function handleSaveToHivemind() {
    if (!result) return;
    setSaving(true); setSaveErr(null);
    try {
      const resp = await apiClient.saveResearchToKnowledge({
        title,
        markdown: typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2),
        sources: result.sources || [],
        tags: [job.params?.model ? `tavily-${job.params.model}` : 'tavily'],
        jobId: job.id,
      });
      setSaved(resp);

      // Fetch relations for each promoted memory so we can render a
      // mini graph tree of the ingestion outcome.
      const ids = Array.isArray(resp.promotedMemoryIds) ? resp.promotedMemoryIds.slice(0, 8) : [];
      const relMap = {};
      await Promise.all(ids.map(async (mid) => {
        try {
          relMap[mid] = await apiClient.getMemoryRelations(mid);
        } catch { /* silent */ }
      }));
      setRelations(relMap);
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!job) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-[860px] max-h-[88vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-[#e3e0db] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-violet-500" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#737373]">research</span>
              <StatusBadge status={job.status} polling={false} />
              {job.duration_ms != null && (
                <span className="text-[10px] font-mono text-[#a3a3a3]">{formatMs(job.duration_ms)}</span>
              )}
            </div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a] leading-tight">{title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveToHivemind}
              disabled={saving || !!saved || !result}
              className="flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-50 text-white text-[12px] font-semibold px-3 py-2 rounded-lg"
            >
              {saving ? <Loader2 size={12} className="animate-spin" />
                : saved ? <CheckCircle2 size={12} />
                : <Save size={12} />}
              {saving ? 'Saving' : saved ? 'Saved' : 'Save to HIVEMIND'}
            </button>
            <button onClick={onClose} className="p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] rounded hover:bg-[#faf9f4]">
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {saveErr && (
            <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700">
              <AlertTriangle size={12} /> {saveErr}
            </div>
          )}
          {saved && <PostUploadGraphTree saved={saved} relations={relations} />}

          {result && <ResearchReport result={result} fallbackProgress={job.progress} />}
          {!result && (
            <div className="text-[12px] text-[#a3a3a3]">No report content available.</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── After-upload graph tree (segments → memories → relations) ─── */

function PostUploadGraphTree({ saved, relations }) {
  const totalRelations = Object.values(relations).reduce((acc, r) => acc + (r?.counts?.total || (r?.out?.length || 0) + (r?.in?.length || 0)), 0);
  return (
    <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={14} className="text-emerald-600" />
        <span className="text-[12px] font-semibold text-[#0a0a0a]">Saved to HIVEMIND</span>
        <span className="text-[10px] text-[#737373] font-mono ml-auto">
          docId: <code>{(saved.documentId || '').slice(0, 8)}…</code>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Segments" value={saved.segmentCount ?? 0} />
        <Stat label="Memories" value={saved.promotedCount ?? saved.promotedMemoryIds?.length ?? 0} />
        <Stat label="Relations" value={totalRelations} />
      </div>
      {Array.isArray(saved.promotedMemoryIds) && saved.promotedMemoryIds.length > 0 && (
        <details>
          <summary className="text-[10px] uppercase tracking-wider font-mono text-[#737373] cursor-pointer">
            Memory tree
          </summary>
          <ul className="mt-2 space-y-1.5">
            {saved.promotedMemoryIds.slice(0, 8).map(mid => {
              const rel = relations[mid];
              return (
                <li key={mid} className="text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Brain size={10} className="text-violet-500" />
                    <code className="text-[10px] text-[#525252] font-mono">{mid.slice(0, 8)}…</code>
                    {rel && (
                      <span className="text-[10px] text-[#a3a3a3]">
                        · {(rel.out?.length || 0)} out / {(rel.in?.length || 0)} in
                      </span>
                    )}
                  </div>
                  {rel?.out?.length > 0 && (
                    <ul className="ml-4 mt-0.5 text-[10px] text-[#737373]">
                      {rel.out.slice(0, 3).map((r, i) => (
                        <li key={i} className="truncate">↳ {r.type}: {r.peer_title || r.target_id?.slice(0, 8)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {saved.promotedMemoryIds.length > 8 && (
              <li className="text-[10px] text-[#a3a3a3]">+{saved.promotedMemoryIds.length - 8} more memories</li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-violet-200 rounded-lg p-2">
      <div className="text-[18px] font-semibold tabular-nums text-violet-700 leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-[#737373] mt-1 font-mono">{label}</div>
    </div>
  );
}

/* ─── Prompt bar ───────────────────────────────────────────────────── */

function PromptBar({
  prompt, setPrompt, mode, forcedMode, setForcedMode,
  submitting, onSubmit, onKey,
  depth, setDepth, pageLimit, setPageLimit,
  researchModel, setResearchModel, citationFormat, setCitationFormat,
  domainPolicy, checkingPolicy, locked,
}) {
  const ModeIcon = mode === 'crawl' ? LinkIcon
    : mode === 'research' ? Sparkles
    : Search;
  const modeColor = mode === 'crawl' ? 'text-amber-500'
    : mode === 'research' ? 'text-violet-500'
    : 'text-[#117dff]';
  const modeLabel = mode === 'crawl' ? 'Crawl mode'
    : mode === 'research' ? 'Research mode'
    : 'Search mode';
  const modeHint = mode === 'crawl'
    ? 'Auto-detected from URL · /search or /research to override'
    : mode === 'research'
      ? 'Tavily compiles multi-source report with citations · /search for raw results'
      : 'Raw 10 results · /research for comprehensive report';
  const placeholder = mode === 'crawl'
    ? 'Paste a URL to crawl…'
    : mode === 'research'
      ? 'Research the web…  e.g. "compare vector DBs for 1M-row RAG"'
      : 'Search the web…  e.g. "milvus vs qdrant benchmarks"';

  // Cycle force: research → search → crawl → null (auto)
  const cycleForce = () => {
    if (forcedMode === null)       setForcedMode('search');
    else if (forcedMode === 'search')   setForcedMode('crawl');
    else if (forcedMode === 'crawl')    setForcedMode('research');
    else                                 setForcedMode(null);
  };

  return (
    <div className={`relative bg-white border ${locked ? 'border-red-200' : 'border-[#e3e0db]'} rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden`}>
      {/* Mode indicator strip */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
        <ModeIcon size={12} className={modeColor} />
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373]">{modeLabel}</span>
        {forcedMode && (
          <button onClick={() => setForcedMode(null)} className="text-[9px] font-mono text-[#a3a3a3] hover:text-[#0a0a0a]" title="Clear forced mode">
            (forced — clear)
          </button>
        )}
        <span className="text-[9px] text-[#a3a3a3] ml-auto">{modeHint}</span>
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={2}
        disabled={locked}
        className="w-full px-4 pt-1 pb-2 text-[14px] text-[#0a0a0a] placeholder:text-[#a3a3a3] bg-transparent border-0 resize-none focus:outline-none disabled:opacity-50"
      />

      {/* Research knobs — depth (model) + citation format */}
      {mode === 'research' && (
        <div className="px-4 py-2 border-t border-[#f3f1ec] flex flex-wrap items-center gap-3 text-[11px] text-[#525252]">
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3]">depth</span>
          <div className="flex items-center gap-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded-md p-0.5">
            {['mini', 'auto', 'pro'].map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setResearchModel(opt)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors ${
                  researchModel === opt
                    ? 'bg-violet-500 text-white'
                    : 'text-[#525252] hover:bg-white'
                }`}
                title={opt === 'mini' ? 'Targeted, fast (single-angle)' : opt === 'pro' ? 'Comprehensive, multi-subtopic' : 'Auto-pick best for query'}
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3] ml-2">cite</span>
          <select
            value={citationFormat}
            onChange={e => setCitationFormat(e.target.value)}
            className="bg-[#faf9f4] border border-[#e3e0db] rounded px-2 py-0.5 text-[10px] font-mono"
          >
            <option value="numbered">numbered</option>
            <option value="apa">apa</option>
            <option value="mla">mla</option>
            <option value="chicago">chicago</option>
          </select>
          <span className="ml-auto text-[10px] text-[#a3a3a3] font-mono">
            {researchModel === 'pro' ? '~60-180s · multi-subtopic' : researchModel === 'mini' ? '~15-40s · targeted' : 'auto-picked'}
          </span>
        </div>
      )}

      {/* Crawl knobs */}
      {mode === 'crawl' && (
        <div className="px-4 py-2 border-t border-[#f3f1ec] flex items-center gap-3 text-[11px] text-[#525252]">
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3]">depth</span>
          <input type="number" min={1} max={3} value={depth} onChange={e => setDepth(Math.max(1, Math.min(3, Number(e.target.value))))}
            className="w-12 px-1.5 py-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded text-center font-mono" />
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#a3a3a3] ml-2">pages</span>
          <input type="number" min={1} max={50} value={pageLimit} onChange={e => setPageLimit(Math.max(1, Math.min(50, Number(e.target.value))))}
            className="w-14 px-1.5 py-0.5 bg-[#faf9f4] border border-[#e3e0db] rounded text-center font-mono" />
          {checkingPolicy && <span className="ml-auto text-[10px] text-[#a3a3a3] flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> checking domain…</span>}
          {domainPolicy?.blocked && (
            <span className="ml-auto text-[10px] text-red-600 flex items-center gap-1">
              <Ban size={10} /> blocked: {domainPolicy.reason || 'policy denial'}
            </span>
          )}
          {domainPolicy && !domainPolicy.blocked && (
            <span className="ml-auto text-[10px] text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={10} /> allowed
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-[#faf9f4] border-t border-[#f3f1ec] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={cycleForce}
            className="text-[10px] text-[#525252] hover:text-[#0a0a0a] px-2 py-1 rounded hover:bg-white border border-transparent hover:border-[#e3e0db]"
            title="Cycle: auto → search → crawl → research"
          >
            ↔ {forcedMode ? `forced: ${forcedMode}` : `auto · click to force`}
          </button>
          <span className="text-[10px] text-[#a3a3a3] ml-1">Enter to send · Shift+Enter newline</span>
        </div>
        <button
          onClick={onSubmit}
          disabled={!prompt.trim() || submitting || locked || (mode === 'crawl' && domainPolicy?.blocked)}
          className="flex items-center gap-1.5 bg-[#0a0a0a] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          {submitting ? 'Submitting' : 'Send'}
        </button>
      </div>

      {locked && (
        <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px] flex items-center justify-center">
          <div className="text-center px-4">
            <Lock size={22} className="text-red-500 mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-[#0a0a0a]">Web intelligence is not enabled</p>
            <p className="text-[11px] text-[#737373] mt-1">Upgrade your plan to enable web search + crawl.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Usage rings (top right) ─────────────────────────────────────── */

function UsageRings({ usage, monthly }) {
  const dailySearch = usage?.search_used ?? 0;
  const dailySearchLimit = usage?.search_limit ?? 0;
  const dailyCrawl = usage?.crawl_used ?? 0;
  const dailyCrawlLimit = usage?.crawl_limit ?? 0;
  const monthlySearch = monthly?.search_used ?? 0;
  const monthlySearchLimit = monthly?.search_limit ?? 0;

  return (
    <div className="flex items-center gap-3 shrink-0">
      <UsagePill icon={Search} label="search · day" used={dailySearch} limit={dailySearchLimit} />
      <UsagePill icon={LinkIcon} label="crawl · day" used={dailyCrawl} limit={dailyCrawlLimit} />
      <UsagePill icon={TrendingUp} label="search · month" used={monthlySearch} limit={monthlySearchLimit} muted />
    </div>
  );
}

function UsagePill({ icon: Icon, label, used, limit, muted }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#16a34a';
  return (
    <div className={`bg-white border border-[#e3e0db] rounded-lg px-2.5 py-1.5 flex items-center gap-2 ${muted ? 'opacity-70' : ''}`}>
      <Icon size={12} className="text-[#525252]" />
      <div className="leading-none">
        <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wider font-mono">{label}</div>
        <div className="text-[11px] font-semibold tabular-nums" style={{ color }}>
          {used.toLocaleString()}<span className="text-[#a3a3a3] font-normal"> / {limit > 0 ? limit.toLocaleString() : '∞'}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Job row (compact, in list) ─────────────────────────────────── */

// Pick the best title for a job: research → report title; search/crawl →
// query or first URL. Falls back to the bare query/URL params.
function deriveJobTitle(job, results) {
  if (job.type === 'research' && results?.[0]?.title) return results[0].title;
  if (job.params?.input)  return job.params.input;
  if (job.params?.query)  return job.params.query;
  if (job.params?.urls?.[0]) return job.params.urls[0];
  if (job.query)          return job.query;
  if (job.urls?.[0])      return job.urls[0];
  return 'Untitled run';
}

function jobIcon(type) {
  if (type === 'crawl')    return LinkIcon;
  if (type === 'research') return Sparkles;
  return Search;
}

function jobColor(type) {
  if (type === 'crawl')    return 'text-amber-500';
  if (type === 'research') return 'text-violet-500';
  return 'text-[#117dff]';
}

function JobRow({ job, active, isPolling, onClick }) {
  const jobType = job.type || (job.urls ? 'crawl' : 'search');
  const Icon = jobIcon(jobType);
  const status = job.status || 'queued';
  const results = Array.isArray(job.results) ? job.results : (job.results?.results || job.results?.items || []);
  const title = deriveJobTitle(job, results);

  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
        active ? 'bg-[#faf9f4]' : 'hover:bg-[#faf9f4]'
      }`}
    >
      <Icon size={14} className={`shrink-0 ${jobColor(jobType)}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#0a0a0a] truncate">{title}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#a3a3a3]">
          <span className="uppercase tracking-wider">{jobType}</span>
          <span>·</span>
          <StatusBadge status={status} polling={isPolling} />
          <span>·</span>
          <span>{relTime(job.createdAt || job.created_at)}</span>
          {job.duration_ms != null && <><span>·</span><span>{formatMs(job.duration_ms)}</span></>}
          {jobType === 'research' && results[0]?.sources?.length > 0 && (
            <><span>·</span><span>{results[0].sources.length} sources</span></>
          )}
          {jobType !== 'research' && results.length > 0 && (
            <><span>·</span><span>{results.length} result{results.length !== 1 ? 's' : ''}</span></>
          )}
        </div>
      </div>
      {active
        ? <ChevronUp size={13} className="text-[#a3a3a3] shrink-0" />
        : <ChevronDown size={13} className="text-[#a3a3a3] shrink-0" />}
    </button>
  );
}

/* ─── Expanded job detail (no height cap; page scrolls) ──────────── */

function ExpandedJobView({ job, onClose, onResultClick, onMutate }) {
  const jobType = job.type || (job.urls ? 'crawl' : 'search');
  const status = job.status || 'queued';
  const results = Array.isArray(job.results) ? job.results : (job.results?.results || job.results?.items || []);
  const title = deriveJobTitle(job, results);
  const Icon = jobIcon(jobType);

  const [retrying, setRetrying] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try { await apiClient.retryWebJob(job.id); onMutate(); } catch { /* silent */ } finally { setRetrying(false); }
  }
  async function handleSaveAll() {
    setSavingAll(true);
    try {
      await apiClient.saveWebResultToMemory(job.id, {
        title,
        tags: [jobType === 'crawl' ? 'web-crawl' : jobType === 'research' ? 'web-research' : 'web-search'],
      });
      setSaved(true);
      onMutate();
    } catch { /* silent */ } finally { setSavingAll(false); }
  }

  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {/* Detail header */}
      <header className="px-5 py-3 border-b border-[#e3e0db] flex items-start justify-between gap-3 bg-[#faf9f4]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={14} className={jobColor(jobType)} />
            <span className="text-[10px] uppercase tracking-wider font-mono text-[#737373]">{jobType}</span>
            <StatusBadge status={status} polling={false} />
            {job.duration_ms != null && (
              <span className="text-[10px] font-mono text-[#a3a3a3]">{formatMs(job.duration_ms)}</span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold text-[#0a0a0a] leading-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {status === 'failed' && (
            <button onClick={handleRetry} disabled={retrying} className="p-1.5 text-[#525252] hover:text-[#117dff] rounded hover:bg-white" title="Retry">
              {retrying ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            </button>
          )}
          {status === 'succeeded' && results.length > 0 && (
            <button onClick={handleSaveAll} disabled={savingAll || saved} className={`p-1.5 rounded hover:bg-white ${saved ? 'text-emerald-600' : 'text-[#525252] hover:text-emerald-600'}`} title="Save report to memory">
              {savingAll ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] rounded hover:bg-white" title="Collapse">
            <X size={13} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="px-5 py-4">
        {status === 'failed' && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {job.error || 'Job failed'}
          </div>
        )}
        {(status === 'queued' || status === 'running') && jobType !== 'research' && (
          <div className="text-[12px] text-[#737373] flex items-center gap-2 py-3">
            <Loader2 size={13} className="animate-spin" />
            Waiting for results…
          </div>
        )}

        {/* Research: show live progress timeline + streamed content even
            while running. Once succeeded, render final report + sources. */}
        {jobType === 'research' && (status === 'running' || status === 'queued') && (
          <ResearchLiveView job={job} />
        )}
        {status === 'succeeded' && jobType === 'research' && (
          <ResearchReport result={results[0]} fallbackProgress={job.progress} />
        )}
        {status === 'succeeded' && jobType !== 'research' && (
          <RawResultList
            results={results}
            jobId={job.id}
            jobType={jobType}
            runtime={job.runtime}
            fallback={job.fallback}
            onResultClick={onResultClick}
            onSaved={onMutate}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Research live view (during streaming) ─────────────────────── */

function ResearchLiveView({ job }) {
  const partialContent = job.partial_content || '';
  const partialSources = Array.isArray(job.partial_sources) ? job.partial_sources : [];

  // Group by tool execution: each tool_call pairs with its tool_response.
  // Reach into job.progress inside the memo so the lint rule for stable
  // dep arrays is satisfied.
  const steps = useMemo(() => {
    const progress = Array.isArray(job.progress) ? job.progress : [];
    const byId = new Map();
    const order = [];
    for (const p of progress) {
      const key = p.id || `${p.tool}-${p.ts}`;
      if (!byId.has(key)) {
        byId.set(key, { tool: p.tool, id: p.id, queries: p.queries, sources: p.sources, call: null, response: null });
        order.push(key);
      }
      const slot = byId.get(key);
      if (p.kind === 'tool_call') slot.call = p;
      if (p.kind === 'tool_response') slot.response = p;
      if (p.queries) slot.queries = p.queries;
      if (p.sources) slot.sources = [...(slot.sources || []), ...p.sources];
    }
    return order.map(k => byId.get(k));
  }, [job.progress]);

  const hasAny = steps.length > 0 || partialContent || partialSources.length > 0;

  return (
    <div className="space-y-4">
      {/* Step timeline */}
      {steps.length > 0 && (
        <ol className="space-y-1.5">
          {steps.map((s, i) => (
            <ResearchStep key={s.id || i} step={s} />
          ))}
        </ol>
      )}

      {/* Streamed content (markdown so far) */}
      {partialContent && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-[#737373] mb-1.5 flex items-center gap-1.5">
            <Sparkles size={11} className="text-violet-500" />
            Report — streaming
            <span className="inline-block w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
          </div>
          <pre className="whitespace-pre-wrap font-['Space_Grotesk'] text-[13px] text-[#0a0a0a] leading-[1.65] m-0 bg-transparent p-0">
{partialContent}
          </pre>
        </div>
      )}

      {!hasAny && (
        <div className="text-[12px] text-[#737373] flex items-center gap-2 py-3">
          <Loader2 size={13} className="animate-spin" />
          Tavily Research starting…
        </div>
      )}
    </div>
  );
}

function ResearchStep({ step }) {
  const TOOL_META = {
    Planning:         { color: 'text-[#525252]', emoji: '🧭', label: 'Planning' },
    WebSearch:        { color: 'text-[#117dff]', emoji: '🔎', label: 'Web search' },
    ResearchSubtopic: { color: 'text-violet-600', emoji: '🧪', label: 'Subtopic research' },
    Generating:       { color: 'text-emerald-600', emoji: '✍️', label: 'Generating report' },
  };
  const meta = TOOL_META[step.tool] || { color: 'text-[#737373]', emoji: '•', label: step.tool || 'step' };
  const done = !!step.response;
  const queries = step.queries || step.call?.queries || [];
  const sources = step.sources || step.response?.sources || [];

  return (
    <li className="border border-[#e3e0db] rounded-lg px-3 py-2 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{meta.emoji}</span>
        <span className={`text-[12px] font-semibold ${meta.color}`}>{meta.label}</span>
        {!done && <Loader2 size={11} className="text-[#a3a3a3] animate-spin" />}
        {done && <CheckCircle2 size={11} className="text-emerald-500" />}
        <span className="text-[10px] text-[#a3a3a3] font-mono ml-auto truncate">
          {step.call?.arguments || step.response?.arguments || ''}
        </span>
      </div>

      {queries.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {queries.slice(0, 8).map((q, i) => (
            <span key={i} className="text-[10px] bg-[#117dff]/5 text-[#117dff] border border-[#117dff]/20 px-1.5 py-0.5 rounded font-mono">
              {q.length > 60 ? q.slice(0, 57) + '…' : q}
            </span>
          ))}
          {queries.length > 8 && <span className="text-[10px] text-[#a3a3a3]">+{queries.length - 8} more</span>}
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.slice(0, 6).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-[#faf9f4] text-[#525252] border border-[#e3e0db] hover:border-[#117dff] hover:text-[#117dff] px-1.5 py-0.5 rounded inline-flex items-center gap-1 max-w-[260px]"
              title={s.url}
            >
              {s.favicon && <img src={s.favicon} alt="" className="w-3 h-3" onError={e => { e.target.style.display = 'none'; }} />}
              <span className="truncate">{s.title || s.url}</span>
            </a>
          ))}
          {sources.length > 6 && <span className="text-[10px] text-[#a3a3a3]">+{sources.length - 6} more</span>}
        </div>
      )}
    </li>
  );
}

/* ─── Research report renderer ───────────────────────────────────── */

function ResearchReport({ result, fallbackProgress }) {
  if (!result) return null;
  const text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2);
  const sources = Array.isArray(result.sources) ? result.sources : [];
  // Build collapsible step timeline from saved progress[] when present.
  const progress = Array.isArray(fallbackProgress) ? fallbackProgress : [];
  // Render markdown as plain pre-wrapped text. Heavy markdown formatter
  // would add a dep; keeping it lightweight + readable.
  return (
    <div>
      {progress.length > 0 && (
        <CollapsibleProgress progress={progress} />
      )}

      <article className="prose prose-sm max-w-none">
        <pre className="whitespace-pre-wrap font-['Space_Grotesk'] text-[13px] text-[#0a0a0a] leading-[1.65] m-0 bg-transparent p-0">
{text}
        </pre>
      </article>

      {sources.length > 0 && (
        <section className="mt-6 pt-4 border-t border-[#e3e0db]">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1.5">
            <FileText size={11} /> Sources ({sources.length})
          </h4>
          <ol className="space-y-1.5 list-decimal pl-5 text-[12px]">
            {sources.map((s, i) => (
              <li key={i} className="text-[#525252]">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#117dff] hover:underline font-medium inline-flex items-center gap-1"
                >
                  {s.title || s.url}
                  <ExternalLink size={9} />
                </a>
                {s.title && s.url && (
                  <div className="text-[10px] text-[#a3a3a3] font-mono truncate">{s.url}</div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function RawResultList({ results, jobId, jobType, runtime, fallback, onResultClick, onSaved }) {
  if (results.length === 0) return <div className="text-[12px] text-[#a3a3a3] py-2">No results returned.</div>;
  return (
    <div className="space-y-1">
      {results.map((r, i) => (
        <ResultLine
          key={i}
          result={r}
          type={jobType}
          jobId={jobId}
          index={i}
          runtime={runtime}
          fallback={fallback}
          onClick={() => onResultClick({ result: r, type: jobType, jobId, index: i, runtime, fallback })}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status, polling }) {
  if (polling || status === 'running') {
    return <span className="inline-flex items-center gap-1 text-blue-600"><Loader2 size={9} className="animate-spin" />running</span>;
  }
  const map = {
    queued:    { c: 'text-amber-600',   l: 'queued' },
    succeeded: { c: 'text-emerald-600', l: 'done' },
    failed:    { c: 'text-red-600',     l: 'failed' },
  };
  const m = map[status] || { c: 'text-[#a3a3a3]', l: status };
  return <span className={m.c}>{m.l}</span>;
}

function ResultLine({ result, type, jobId, index, runtime, fallback, onClick, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await apiClient.saveWebResultToMemory(jobId, {
        resultIndex: index,
        title: result.title || result.url,
        tags: [type === 'crawl' ? 'web-crawl' : 'web-search'],
      });
      setSaved(true);
      onSaved?.();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-[#faf9f4] cursor-pointer group"
    >
      {type === 'crawl'
        ? <FileText size={11} className="text-[#a3a3a3] mt-0.5 shrink-0" />
        : <Search size={11} className="text-[#a3a3a3] mt-0.5 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-semibold text-[#117dff] truncate">{result.title || result.url}</span>
          <ExternalLink size={9} className="text-[#a3a3a3] shrink-0" />
        </div>
        <div className="text-[10px] text-[#a3a3a3] font-mono truncate">{result.url}</div>
        {result.snippet && (
          <div className="text-[11px] text-[#525252] mt-0.5 line-clamp-2">{result.snippet}</div>
        )}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`p-1 ${saved ? 'text-emerald-500' : 'text-[#a3a3a3] hover:text-[#117dff]'} transition-colors`}
        title={saved ? 'Saved' : 'Save to memory'}
      >
        {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <CheckCircle2 size={11} /> : <BookmarkPlus size={11} />}
      </button>
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────── */

function EmptyState({ locked }) {
  if (locked) return null;
  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center">
      <Sparkles size={20} className="text-[#117dff] mx-auto mb-2" />
      <p className="text-[13px] text-[#0a0a0a] font-semibold">No runs yet</p>
      <p className="text-[11px] text-[#737373] mt-1">Try <code className="font-mono bg-[#f3f1ec] px-1 rounded">best vector DBs for RAG</code> or paste a URL.</p>
    </div>
  );
}

/* ─── Health panel (collapsible) ──────────────────────────────────── */

function HealthPanel({ metrics, onRefresh }) {
  const m = metrics || {};
  const totalJobs = m.total_jobs ?? 0;
  const succeeded = m.succeeded ?? 0;
  const queued = m.queued ?? 0;
  const running = m.running ?? 0;
  const successRate = totalJobs > 0 ? (succeeded / totalJobs) * 100 : 0;
  const runtimeDist = m.runtime_distribution || {};
  const lightpanda = runtimeDist.lightpanda ?? 0;
  const fetchN = runtimeDist.fetch ?? 0;
  const runtimeTotal = lightpanda + fetchN;
  const telemetry = m.runtime_telemetry || {};
  const topErrors = m.top_errors || [];

  return (
    <div className="pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#737373]">Auto-refresh every 30s</span>
        <button onClick={onRefresh} className="text-[11px] text-[#525252] hover:text-[#0a0a0a] flex items-center gap-1">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Metric label="Total jobs"    value={totalJobs.toLocaleString()}                                          Icon={Layers} />
        <Metric label="Success rate"  value={`${successRate.toFixed(1)}%`} color={successRate >= 90 ? '#16a34a' : successRate >= 70 ? '#f59e0b' : '#dc2626'} Icon={CheckCircle2} />
        <Metric label="Avg duration"  value={formatMs(m.avg_duration_ms)}                                        Icon={Activity} />
        <Metric label="P95 duration"  value={formatMs(m.p95_duration_ms)}                                        Icon={TrendingUp} />
        <Metric label="Queue depth"   value={(queued + running).toLocaleString()}                                Icon={Activity} color={(queued + running) > 50 ? '#f59e0b' : '#0a0a0a'} />
        <Metric label="Jobs · 24h"    value={(m.jobs_last_24h ?? 0).toLocaleString()}                            Icon={Zap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">Runtime distribution</span>
          </div>
          {runtimeTotal === 0 ? (
            <p className="text-[10px] text-[#a3a3a3] text-center py-2 font-mono">No data</p>
          ) : (
            <div className="space-y-2">
              <RuntimeBar label="Lightpanda" count={lightpanda} total={runtimeTotal} color="#117dff" />
              <RuntimeBar label="Fetch fallback" count={fetchN} total={runtimeTotal} color="#f59e0b" />
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={12} className="text-[#525252]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">Telemetry</span>
          </div>
          {Object.keys(telemetry).length === 0 ? (
            <p className="text-[10px] text-[#a3a3a3] text-center py-2 font-mono">No telemetry</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 text-[11px]">
              <TelemetryRow label="Lightpanda OK" value={telemetry.lightpanda_success ?? 0} />
              <TelemetryRow label="Lightpanda fail" value={telemetry.lightpanda_failure ?? 0} warn={(telemetry.lightpanda_failure ?? 0) > 0} />
              <TelemetryRow label="Fetch fallback" value={telemetry.fetch_fallback ?? 0} />
              <TelemetryRow label="Domain blocks" value={telemetry.domain_blocks ?? 0} warn={(telemetry.domain_blocks ?? 0) > 0} />
            </div>
          )}
        </div>
      </div>

      {topErrors.length > 0 && (
        <div className="bg-white border border-[#e3e0db] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={12} className="text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">Top errors</span>
          </div>
          <ul className="space-y-1 text-[11px] text-[#525252]">
            {topErrors.slice(0, 5).map((e, i) => (
              <li key={i} className="flex items-center justify-between font-mono">
                <span className="truncate">{e.error_type || e.type || 'error'}</span>
                <span className="text-[#a3a3a3]">{e.count?.toLocaleString?.() || 0}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, Icon, color }) {
  return (
    <div className="bg-white border border-[#e3e0db] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={11} className="text-[#a3a3a3]" />}
        <span className="text-[9px] uppercase tracking-wider text-[#a3a3a3] font-mono">{label}</span>
      </div>
      <div className="text-[18px] font-semibold tabular-nums leading-none" style={{ color: color || '#0a0a0a' }}>
        {value}
      </div>
    </div>
  );
}

function RuntimeBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-[10px] text-[#525252] font-mono">
        <span>{label}</span>
        <span>{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-1.5 bg-[#f3f1ec] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Collapsible progress timeline (completed runs) ────────────── */

function CollapsibleProgress({ progress }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => {
    const byId = new Map();
    const order = [];
    for (const p of progress) {
      const key = p.id || `${p.tool}-${p.ts}`;
      if (!byId.has(key)) {
        byId.set(key, { tool: p.tool, id: p.id, queries: p.queries, sources: p.sources, call: null, response: null });
        order.push(key);
      }
      const slot = byId.get(key);
      if (p.kind === 'tool_call') slot.call = p;
      if (p.kind === 'tool_response') slot.response = p;
      if (p.queries) slot.queries = p.queries;
      if (p.sources) slot.sources = [...(slot.sources || []), ...p.sources];
    }
    return order.map(k => byId.get(k));
  }, [progress]);
  if (steps.length === 0) return null;
  return (
    <div className="mb-4 border border-[#e3e0db] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-3 py-2 flex items-center gap-2 bg-[#faf9f4] hover:bg-[#f3f1ec] text-left"
      >
        {open ? <ChevronUp size={12} className="text-[#a3a3a3]" /> : <ChevronDown size={12} className="text-[#a3a3a3]" />}
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#737373]">
          Research process ({steps.length} step{steps.length !== 1 ? 's' : ''})
        </span>
      </button>
      {open && (
        <ol className="p-3 space-y-1.5 border-t border-[#e3e0db]">
          {steps.map((s, i) => <ResearchStep key={s.id || i} step={s} />)}
        </ol>
      )}
    </div>
  );
}

function TelemetryRow({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#737373]">{label}</span>
      <span className={`font-mono tabular-nums ${warn ? 'text-amber-600' : 'text-[#0a0a0a]'}`}>{value.toLocaleString()}</span>
    </div>
  );
}
