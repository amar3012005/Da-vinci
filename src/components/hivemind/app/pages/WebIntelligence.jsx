import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  FileText,
  Play,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

function UsageCard({ label, used, limit, icon: Icon }) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isNear = pct > 80;
  return (
    <div className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#a3a3a3]" />
          <span className="text-[#525252] text-[11px] font-mono uppercase tracking-wider">{label}</span>
        </div>
        <span className="text-[#0a0a0a] text-sm font-mono font-semibold">
          {used ?? 0}<span className="text-[#d4d0ca]"> / {limit ?? '∞'}</span>
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#e3e0db] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isNear ? 'bg-amber-400' : 'bg-[#117dff]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function JobStatusBadge({ status }) {
  const styles = {
    queued: 'bg-[#f3f1ec] text-[#525252] border-[#e3e0db]',
    running: 'bg-blue-50 text-blue-600 border-blue-200',
    succeeded: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${styles[status] || styles.queued}`}>
      {status}
    </span>
  );
}

function RuntimeBadge({ runtime, fallback }) {
  if (!runtime) return null;
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${fallback ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]'}`}>
      {runtime}{fallback ? ' (fallback)' : ''}
    </span>
  );
}

export default function WebIntelligence() {
  const [searchQuery, setSearchQuery] = useState('');
  const [crawlUrl, setCrawlUrl] = useState('');
  const [submitting, setSubmitting] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const { data: usage, refetch: refetchUsage } = useApiQuery(() => apiClient.getWebUsage().catch(() => null));
  const { data: jobs, refetch: refetchJobs } = useApiQuery(() => apiClient.listWebJobs({ limit: 20 }).catch(() => null));

  const jobList = useMemo(() => {
    if (!jobs) return [];
    return Array.isArray(jobs) ? jobs : jobs.jobs || [];
  }, [jobs]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSubmitting('search');
    setSubmitError(null);
    try {
      await apiClient.submitWebSearch({ query: searchQuery.trim(), limit: 10 });
      setSearchQuery('');
      refetchJobs();
      refetchUsage();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setSubmitError(msg.includes('feature_not_enabled') ? 'Web Search is not enabled on your plan. Upgrade to access.' : msg);
    } finally {
      setSubmitting(null);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setSubmitting('crawl');
    setSubmitError(null);
    try {
      await apiClient.submitWebCrawl({ urls: [crawlUrl.trim()], depth: 1, page_limit: 10 });
      setCrawlUrl('');
      refetchJobs();
      refetchUsage();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setSubmitError(msg.includes('feature_not_enabled') ? 'Web Crawl is not enabled on your plan. Upgrade to access.' : msg);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Globe size={20} className="text-[#117dff]" />
          <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk']">Web Intelligence</h1>
          <span className="text-[9px] font-mono bg-[#117dff]/10 text-[#117dff] px-2 py-0.5 rounded uppercase">Add-on</span>
        </div>
        <p className="text-[#525252] text-sm font-['Space_Grotesk'] ml-8">Search the web and crawl pages as async jobs.</p>
      </motion.div>

      {/* Error */}
      {submitError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={14} className="text-[#dc2626] shrink-0" />
          <span className="text-[#dc2626] text-xs font-['Space_Grotesk']">{submitError}</span>
        </motion.div>
      )}

      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
        {/* Usage */}
        {usage && (
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UsageCard label="Search Requests" used={usage.web_search_requests?.used} limit={usage.web_search_requests?.limit} icon={Search} />
            <UsageCard label="Crawl Pages" used={usage.web_crawl_pages?.used} limit={usage.web_crawl_pages?.limit} icon={FileText} />
          </motion.div>
        )}

        {/* Submit Forms */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <Search size={15} className="text-[#117dff]" />
              <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">Web Search</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search query..."
                className="flex-1 bg-transparent border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40"
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || submitting === 'search'}
                className="flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                {submitting === 'search' ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                Search
              </button>
            </div>
          </div>

          {/* Crawl */}
          <div className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-[#525252]" />
              <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">Web Crawl</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={crawlUrl}
                onChange={(e) => setCrawlUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
                placeholder="https://example.com"
                className="flex-1 bg-transparent border border-[#e3e0db] rounded-lg py-2 px-3 text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40"
              />
              <button
                onClick={handleCrawl}
                disabled={!crawlUrl.trim() || submitting === 'crawl'}
                className="flex items-center gap-1.5 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                {submitting === 'crawl' ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                Crawl
              </button>
            </div>
          </div>
        </motion.div>

        {/* Job History */}
        <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-[#a3a3a3]" />
              <h3 className="text-[#0a0a0a] text-sm font-semibold font-['Space_Grotesk']">Job History</h3>
            </div>
            <button onClick={refetchJobs} className="text-[#a3a3a3] hover:text-[#117dff] transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          {jobList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#e3e0db]">
                    {['Job ID', 'Type', 'Status', 'Runtime', 'Pages', 'Duration', 'Created'].map(h => (
                      <th key={h} className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider pb-2.5 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobList.map((job) => (
                    <tr key={job.id} className="border-b border-[#eae7e1] hover:bg-[#faf9f4] transition-colors">
                      <td className="py-2.5 pr-3 text-[#525252] text-[11px] font-mono">{(job.id || '').slice(0, 8)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${job.type === 'search' ? 'bg-[#117dff]/10 text-[#117dff]' : 'bg-[#f3f1ec] text-[#525252]'}`}>
                          {job.type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3"><JobStatusBadge status={job.status} /></td>
                      <td className="py-2.5 pr-3"><RuntimeBadge runtime={job.runtime_used} fallback={job.fallback_applied} /></td>
                      <td className="py-2.5 pr-3 text-[#525252] text-[11px] font-mono">{job.pages_processed ?? '-'}</td>
                      <td className="py-2.5 pr-3 text-[#a3a3a3] text-[11px] font-mono">{job.duration_ms ? `${job.duration_ms}ms` : '-'}</td>
                      <td className="py-2.5 text-[#a3a3a3] text-[10px] font-mono">{job.created_at ? new Date(job.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe size={24} className="text-[#e3e0db] mx-auto mb-2" />
              <p className="text-[#a3a3a3] text-sm font-['Space_Grotesk']">No web jobs yet. Submit a search or crawl above.</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
