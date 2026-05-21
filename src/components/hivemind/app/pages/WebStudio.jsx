import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Globe, Search, Link as LinkIcon, Send, Loader2, AlertTriangle, Lock, X,
  ChevronDown, ChevronUp, RefreshCw, Save, BookmarkPlus, CheckCircle2,
  RotateCcw, ExternalLink, Activity, Layers, TrendingUp, Zap, Info,
  ShieldAlert, ShieldCheck, Ban, FileText, Sparkles,
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
  const [forcedMode, setForcedMode] = useState(null); // null | 'search' | 'crawl'
  const [crawlDepth, setCrawlDepth] = useState(1);
  const [crawlPageLimit, setCrawlPageLimit] = useState(10);
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
  const startPolling = useCallback((jobId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingId(jobId);
    pollingRef.current = setInterval(async () => {
      try {
        const r = await apiClient.getWebJob(jobId);
        if (r?.status === 'succeeded' || r?.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPollingId(null);
          refetchJobs(); refetchUsage(); refetchMonthly();
        }
      } catch {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPollingId(null);
        refetchJobs();
      }
    }, 2000);
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
        const r = await apiClient.submitWebResearch({ input, model: 'auto', citation_format: 'numbered' });
        const id = r?.job_id || r?.id;
        if (id) startPolling(id);
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

  return (
    <div className="max-w-[1100px] mx-auto font-['Space_Grotesk']">
      {/* Header */}
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={18} className="text-[#117dff]" />
            <h1 className="text-[22px] font-semibold text-[#0a0a0a]">Web Studio</h1>
            <span className="text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-2 py-0.5 rounded uppercase tracking-wider">Add-on</span>
            {featureLocked && (
              <span className="text-[9px] font-mono bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Lock size={8} /> Locked
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#737373]">
            Ask a question or paste a URL. Studio routes it to search or crawl, streams results, and one-click saves into HIVEMIND memory.
          </p>
        </div>
        <UsageRings usage={usage} monthly={monthly} />
      </header>

      {/* Prompt */}
      <PromptBar
        prompt={prompt} setPrompt={setPrompt}
        mode={detectedMode} forcedMode={forcedMode} setForcedMode={setForcedMode}
        submitting={submitting} onSubmit={handleSubmit} onKey={handleKey}
        depth={crawlDepth} setDepth={setCrawlDepth}
        pageLimit={crawlPageLimit} setPageLimit={setCrawlPageLimit}
        domainPolicy={domainPolicy} checkingPolicy={checkingPolicy}
        locked={featureLocked}
      />

      {/* Error */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700"
          >
            <AlertTriangle size={13} />{submitError}
            <button onClick={() => setSubmitError(null)} className="ml-auto text-red-400 hover:text-red-700">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job timeline */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Recent runs</h2>
          <button onClick={refetchJobs} className="text-[10px] text-[#a3a3a3] hover:text-[#0a0a0a] flex items-center gap-1">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        {jobList.length === 0 ? (
          <EmptyState locked={featureLocked} />
        ) : (
          <div className="relative">
            {/* Capped list of compact rows. ~10 fit before internal scroll. */}
            <div className="max-h-[640px] overflow-y-auto pr-1 [scrollbar-width:thin] border border-[#e3e0db] rounded-xl bg-white divide-y divide-[#f3f1ec]">
              {jobList.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  active={job.id === expandedJobId}
                  isPolling={job.id === pollingId}
                  onClick={() => setExpandedJobId(prev => prev === job.id ? null : job.id)}
                />
              ))}
            </div>
            {jobList.length > 10 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent rounded-b-xl" />
            )}
            <div className="mt-2 text-[10px] text-[#a3a3a3] font-mono text-right">
              {jobList.length} run{jobList.length !== 1 ? 's' : ''} · scroll for older
            </div>
          </div>
        )}

        {/* Expanded detail — renders below the list, no height cap; page scrolls. */}
        <AnimatePresence>
          {expandedJobId && (() => {
            const job = jobList.find(j => j.id === expandedJobId);
            if (!job) return null;
            return (
              <motion.div
                key={expandedJobId}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4"
              >
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

      {/* System health (admin only) */}
      {adminAccessible && (
        <section className="mt-8 mb-12 border-t border-[#e3e0db] pt-5">
          <button
            onClick={toggleHealth}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#525252]" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#525252]">System Health</span>
              <span className="text-[10px] text-[#a3a3a3]">— operational metrics & runtime telemetry</span>
            </div>
            {healthOpen ? <ChevronUp size={14} className="text-[#a3a3a3]" /> : <ChevronDown size={14} className="text-[#a3a3a3]" />}
          </button>
          <AnimatePresence>
            {healthOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <HealthPanel metrics={metrics} onRefresh={refetchMetrics} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Detail modal */}
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
    </div>
  );
}

/* ─── Prompt bar ───────────────────────────────────────────────────── */

function PromptBar({
  prompt, setPrompt, mode, forcedMode, setForcedMode,
  submitting, onSubmit, onKey,
  depth, setDepth, pageLimit, setPageLimit,
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
        {(status === 'queued' || status === 'running') && (
          <div className="text-[12px] text-[#737373] flex items-center gap-2 py-3">
            <Loader2 size={13} className="animate-spin" />
            {jobType === 'research'
              ? 'Tavily Research is compiling your report — typically 20–90 seconds.'
              : 'Waiting for results…'}
          </div>
        )}
        {status === 'succeeded' && (
          jobType === 'research'
            ? <ResearchReport result={results[0]} />
            : <RawResultList
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

/* ─── Research report renderer ───────────────────────────────────── */

function ResearchReport({ result }) {
  if (!result) return null;
  const text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2);
  const sources = Array.isArray(result.sources) ? result.sources : [];
  // Render markdown as plain pre-wrapped text. Heavy markdown formatter
  // would add a dep; keeping it lightweight + readable.
  return (
    <div>
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

function TelemetryRow({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[#737373]">{label}</span>
      <span className={`font-mono tabular-nums ${warn ? 'text-amber-600' : 'text-[#0a0a0a]'}`}>{value.toLocaleString()}</span>
    </div>
  );
}
