import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Brain, Tag, Link, Clock, Send } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <motion.div variants={fadeUp} className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: accent ? 'rgba(17,125,255,0.1)' : 'rgba(0,0,0,0.03)' }}
        >
          <Icon size={18} className={accent ? 'text-[#117dff]' : 'text-[#525252]'} />
        </div>
        <span className="text-[#525252] text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[#0a0a0a] text-3xl font-bold font-mono leading-none">{value ?? '--'}</p>
    </motion.div>
  );
}

function PillBadge({ children }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20">
      {children}
    </span>
  );
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk'] mb-4">{children}</h3>
  );
}

export default function Profile() {
  const { data: profile, loading, error } = useApiQuery(() => apiClient.getProfile());

  const [query, setQuery] = useState('');
  const [contextResult, setContextResult] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);

  const handleGenerateContext = async () => {
    if (!query.trim()) return;
    setContextLoading(true);
    setContextError(null);
    setContextResult(null);
    try {
      const result = await apiClient.getContext(query.trim());
      setContextResult(result);
    } catch (err) {
      setContextError(err.response?.data?.error || err.message);
    } finally {
      setContextLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateContext();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#dc2626] text-sm font-mono">{error}</p>
      </div>
    );
  }

  const {
    memory_count = 0,
    relationship_count = 0,
    top_tags = [],
    top_source_platforms = [],
    recent_titles = [],
    graph_summary = {},
  } = profile || {};

  const relationshipTypes = [
    { label: 'Update', count: graph_summary.update || 0, color: '#3b82f6' },
    { label: 'Extend', count: graph_summary.extend || 0, color: '#117dff' },
    { label: 'Derive', count: graph_summary.derive || 0, color: '#a855f7' },
  ];

  const maxRelCount = Math.max(...relationshipTypes.map((r) => r.count), 1);

  return (
    <div className="min-h-full">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] mb-1">Memory Profile</h1>
        <p className="text-[#525252] text-sm font-['Space_Grotesk']">
          Your memory footprint and context state
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      >
        <StatCard icon={Brain} label="Memories" value={memory_count.toLocaleString()} accent />
        <StatCard icon={Link} label="Relationships" value={relationship_count.toLocaleString()} />
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
      >
        {/* Top Tags */}
        <motion.div variants={fadeUp} className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-[#117dff]" />
            <SectionHeading>Top Tags</SectionHeading>
          </div>
          {top_tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {top_tags.map((tag) => (
                <PillBadge key={tag}>{tag}</PillBadge>
              ))}
            </div>
          ) : (
            <p className="text-[#a3a3a3] text-sm font-mono">No tags yet</p>
          )}
        </motion.div>

        {/* Top Source Platforms */}
        <motion.div variants={fadeUp} className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-[#525252]" />
            <SectionHeading>Source Platforms</SectionHeading>
          </div>
          {top_source_platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {top_source_platforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-[#f3f1ec] text-[#525252] border border-[#e3e0db]"
                >
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[#a3a3a3] text-sm font-mono">No platforms yet</p>
          )}
        </motion.div>
      </motion.div>

      {/* Recent Memories */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 mb-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#525252]" />
          <SectionHeading>Recent Memories</SectionHeading>
        </div>
        {recent_titles.length > 0 ? (
          <ul className="space-y-2">
            {recent_titles.map((title, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#eae7e1] hover:border-[#e3e0db] transition-colors"
              >
                <span className="text-[#d4d0ca] text-xs font-mono w-5 text-right">{i + 1}</span>
                <span className="text-[#0a0a0a]/80 text-sm font-['Space_Grotesk'] truncate">{title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[#a3a3a3] text-sm font-mono">No recent memories</p>
        )}
      </motion.div>

      {/* Graph Summary */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 mb-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-2 mb-6">
          <Link size={16} className="text-[#525252]" />
          <SectionHeading>Relationship Distribution</SectionHeading>
        </div>
        <div className="space-y-4">
          {relationshipTypes.map(({ label, count, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#525252] text-sm font-['Space_Grotesk']">{label}</span>
                <span className="text-[#0a0a0a] font-mono text-sm font-semibold">{count}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#f3f1ec] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / maxRelCount) * 100}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Context Preview */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-[#117dff]" />
          <SectionHeading>Context Preview</SectionHeading>
        </div>
        <p className="text-[#525252] text-xs font-['Space_Grotesk'] mb-4">
          See what context would be injected into an AI conversation for a given query.
        </p>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a query..."
            className="flex-1 bg-transparent border border-[#e3e0db] rounded-xl py-3 px-4 text-[#0a0a0a] text-sm font-['Space_Grotesk'] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff]/40 transition-colors"
          />
          <button
            onClick={handleGenerateContext}
            disabled={!query.trim() || contextLoading}
            className="flex items-center gap-2 bg-[#117dff] hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-5 rounded-xl transition-all text-sm font-['Space_Grotesk'] group"
          >
            {contextLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send size={14} className="group-hover:translate-x-0.5 transition-transform" />
                Generate Context
              </>
            )}
          </button>
        </div>

        {contextError && (
          <p className="text-[#dc2626] text-xs font-mono mb-4">{contextError}</p>
        )}

        {contextResult && (
          <div className="space-y-4">
            {/* System Prompt */}
            {contextResult.context?.system_prompt && (
              <div>
                <label className="block text-[#525252] text-xs font-mono uppercase tracking-wider mb-2">
                  System Prompt
                </label>
                <pre className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-xs font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {contextResult.context.system_prompt}
                </pre>
              </div>
            )}

            {/* Injection Text */}
            {contextResult.context?.injection_text && (
              <div>
                <label className="block text-[#525252] text-xs font-mono uppercase tracking-wider mb-2">
                  Injection Text
                </label>
                <pre className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-xs font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {contextResult.context.injection_text}
                </pre>
              </div>
            )}

            {/* Matched Memories */}
            {contextResult.context?.memories?.length > 0 && (
              <div>
                <label className="block text-[#525252] text-xs font-mono uppercase tracking-wider mb-2">
                  Matched Memories ({contextResult.context.memories.length})
                </label>
                <ul className="space-y-2">
                  {contextResult.context.memories.map((mem, i) => (
                    <li
                      key={mem.id || i}
                      className="px-4 py-3 rounded-xl bg-white border border-[#eae7e1] text-[#525252] text-sm font-['Space_Grotesk']"
                    >
                      <span className="text-[#a3a3a3] font-mono text-xs mr-2">#{i + 1}</span>
                      {mem.title || mem.content?.slice(0, 120) || 'Untitled memory'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Profile Data */}
            {contextResult.profile && (
              <div>
                <label className="block text-[#525252] text-xs font-mono uppercase tracking-wider mb-2">
                  Profile Data
                </label>
                <pre className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-4 text-[#525252] text-xs font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {JSON.stringify(contextResult.profile, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
