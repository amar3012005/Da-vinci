import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Cpu, Brain, Clock, Shield, GitBranch, Zap,
  Play, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Search,
  Network, Sparkles, Activity
} from 'lucide-react';
import apiClient from '../shared/api-client';

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };

function Badge({ children, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    purple: 'bg-purple-500/10 text-purple-600',
    cyan: 'bg-cyan-500/10 text-cyan-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`bg-white border border-[#e3e0db] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-8 h-8 rounded-lg bg-[#117dff]/10 flex items-center justify-center">
        <Icon size={16} className="text-[#117dff]" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#0a0a0a]" style={{ fontFamily: 'Space Grotesk' }}>{title}</h3>
        {description && <p className="text-[11px] text-[#a3a3a3]">{description}</p>}
      </div>
    </div>
  );
}

/* ─── Cognitive Frame Viewer ─────────────────────────────────── */

function CognitiveFramePanel() {
  const { t } = useTranslation('dashboard');
  const [query, setQuery] = useState('');
  const [frame, setFrame] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFrame = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await apiClient.getCognitiveFrame(query, { maxTokens: 4000, contextBudget: 2000 });
      setFrame(data);
    } catch (e) {
      console.error('Frame fetch failed:', e);
    }
    setLoading(false);
  };

  const intentColors = { temporal: 'amber', action: 'blue', factual: 'green', emotional: 'purple', exploratory: 'cyan' };

  return (
    <Card>
      <SectionHeader icon={Brain} title={t('engine.cognitiveFrameTitle', 'Cognitive Frame')} description={t('engine.cognitiveFrameDesc', 'Intent detection + tiered memory assembly')} />
      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchFrame()}
          placeholder={t('engine.cognitiveFramePlaceholder', 'Enter a query to assemble cognitive frame...')}
          className="flex-1 bg-transparent border border-[#e3e0db] rounded-lg py-2 px-3 text-xs focus:border-[#117dff]/40 focus:outline-none"
        />
        <button onClick={fetchFrame} disabled={loading} className="bg-[#117dff] hover:bg-[#0066e0] text-white text-xs font-semibold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {t('engine.assemble', 'Assemble')}
        </button>
      </div>

      {frame && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={intentColors[frame.intent?.type] || 'blue'}>{frame.intent?.type || 'unknown'}</Badge>
            <span className="text-[10px] text-[#a3a3a3] font-mono">confidence: {((frame.intent?.confidence || 0) * 100).toFixed(0)}%</span>
            <span className="text-[10px] text-[#a3a3a3] font-mono">{frame.token_count} tokens</span>
            {frame.intent?.entities?.length > 0 && (
              <span className="text-[10px] text-[#525252]">entities: {frame.intent.entities.join(', ')}</span>
            )}
          </div>

          <div className="text-[10px] font-mono text-[#a3a3a3] flex gap-3 flex-wrap">
            {frame.dynamic_weights && Object.entries(frame.dynamic_weights).map(([k, v]) => (
              <span key={k}>{k}: <span className="text-[#0a0a0a]">{(v * 100).toFixed(1)}%</span></span>
            ))}
          </div>

          {frame.frame && Object.entries(frame.frame).map(([tier, data]) => (
            <div key={tier} className="border border-[#e3e0db] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#0a0a0a] capitalize">{tier}</span>
                <span className="text-[10px] text-[#a3a3a3] font-mono">{data.count} memories / {data.tokenCount} tok</span>
              </div>
              <p className="text-[10px] text-[#a3a3a3] mb-2">{data.description}</p>
              <div className="space-y-1.5">
                {(data.memories || []).slice(0, 3).map((m, i) => (
                  <div key={i} className="text-[11px] text-[#525252] bg-[#f3f1ec] rounded px-2 py-1.5 flex items-start gap-2">
                    <Badge color={m.memory_type === 'fact' ? 'blue' : m.memory_type === 'event' ? 'cyan' : m.memory_type === 'decision' ? 'red' : 'green'}>
                      {m.memory_type}
                    </Badge>
                    <span className="line-clamp-2">{(m.content || '').slice(0, 150)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {frame.injection && (
            <div className="text-[10px] text-[#a3a3a3] font-mono">
              Injection: {frame.injection.injected_count} injected, {frame.injection.dropped_count} dropped, {frame.injection.total_tokens} tokens
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Temporal Explorer ──────────────────────────────────────── */

function TemporalExplorer() {
  const { t } = useTranslation('dashboard');
  const [mode, setMode] = useState('diff');
  const [timeA, setTimeA] = useState('');
  const [timeB, setTimeB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);
    setTimeB(now.toISOString().slice(0, 16));
    setTimeA(weekAgo.toISOString().slice(0, 16));
  }, []);

  const runQuery = async () => {
    setLoading(true);
    try {
      if (mode === 'diff') {
        const data = await apiClient.temporalDiff(new Date(timeA).toISOString(), new Date(timeB).toISOString());
        setResult({ type: 'diff', data });
      } else {
        const data = await apiClient.temporalAsOf({
          transactionTime: new Date(timeA).toISOString(),
          ...(timeB ? { validTime: new Date(timeB).toISOString() } : {}),
        });
        setResult({ type: 'snapshot', data });
      }
    } catch (e) {
      console.error('Temporal query failed:', e);
    }
    setLoading(false);
  };

  return (
    <Card>
      <SectionHeader icon={Clock} title={t('engine.temporalExplorerTitle', 'Temporal Explorer')} description={t('engine.temporalExplorerDesc', 'Bi-temporal time-travel queries')} />
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('diff')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium ${mode === 'diff' ? 'bg-[#117dff] text-white' : 'bg-[#f3f1ec] text-[#525252]'}`}>
          {t('engine.temporalDiff', 'Temporal Diff')}
        </button>
        <button onClick={() => setMode('snapshot')} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium ${mode === 'snapshot' ? 'bg-[#117dff] text-white' : 'bg-[#f3f1ec] text-[#525252]'}`}>
          {t('engine.timeTravel', 'Time Travel')}
        </button>
      </div>

      <div className="flex gap-2 mb-3 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-[#a3a3a3] font-mono mb-1 block">{mode === 'diff' ? t('engine.from', 'From') : t('engine.transactionTime', 'Transaction Time')}</label>
          <input type="datetime-local" value={timeA} onChange={e => setTimeA(e.target.value)} className="w-full bg-transparent border border-[#e3e0db] rounded-lg py-1.5 px-2 text-[11px] focus:border-[#117dff]/40 focus:outline-none font-mono" />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-[#a3a3a3] font-mono mb-1 block">{mode === 'diff' ? t('engine.to', 'To') : t('engine.validTimeOptional', 'Valid Time (optional)')}</label>
          <input type="datetime-local" value={timeB} onChange={e => setTimeB(e.target.value)} className="w-full bg-transparent border border-[#e3e0db] rounded-lg py-1.5 px-2 text-[11px] focus:border-[#117dff]/40 focus:outline-none font-mono" />
        </div>
        <button onClick={runQuery} disabled={loading} className="bg-[#117dff] hover:bg-[#0066e0] text-white text-xs font-semibold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shrink-0">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {t('engine.query', 'Query')}
        </button>
      </div>

      {result?.type === 'diff' && result.data && (
        <div className="space-y-2">
          <div className="flex gap-3 text-[11px] font-mono">
            <span className="text-emerald-600">+{result.data.added?.length || 0} added</span>
            <span className="text-red-500">-{result.data.removed?.length || 0} removed</span>
            <span className="text-amber-600">~{result.data.modified?.length || 0} modified</span>
          </div>
          {(result.data.added || []).slice(0, 5).map((m, i) => (
            <div key={i} className="text-[11px] bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 flex items-center gap-2">
              <span className="text-emerald-600 font-mono text-[10px]">+</span>
              <Badge color="green">{m.memory_type}</Badge>
              <span className="text-[#525252] line-clamp-1">{(m.content || '').slice(0, 120)}</span>
            </div>
          ))}
        </div>
      )}

      {result?.type === 'snapshot' && result.data && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-[#a3a3a3]">{t('engine.memoriesAtPoint', '{{count}} memories at this point in time', { count: result.data.count })}</span>
          {(result.data.memories || []).slice(0, 5).map((m, i) => (
            <div key={i} className="text-[11px] bg-[#f3f1ec] rounded px-2.5 py-1.5 flex items-center gap-2">
              <Badge>{m.memory_type}</Badge>
              <span className="text-[#525252] line-clamp-1">{(m.content || '').slice(0, 120)}</span>
              <span className="text-[10px] text-[#a3a3a3] font-mono shrink-0">v{m.version}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Consensus Evaluator ────────────────────────────────────── */

function ConsensusEvaluator() {
  const { t } = useTranslation('dashboard');
  const [content, setContent] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const evaluate = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const data = await apiClient.evaluateConsensus(content);
      setResult(data);
    } catch (e) {
      console.error('Consensus failed:', e);
    }
    setLoading(false);
  };

  const scoreColor = (val) => val >= 80 ? 'text-emerald-600' : val >= 60 ? 'text-amber-600' : 'text-red-500';

  return (
    <Card>
      <SectionHeader icon={Shield} title={t('engine.byzantineConsensusTitle', 'Byzantine Consensus')} description={t('engine.byzantineConsensusDesc', 'Multi-voter evaluation for memory integrity')} />
      <div className="flex gap-2 mb-4">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && evaluate()}
          placeholder={t('engine.consensusPlaceholder', 'Enter memory content to evaluate...')}
          className="flex-1 bg-transparent border border-[#e3e0db] rounded-lg py-2 px-3 text-xs focus:border-[#117dff]/40 focus:outline-none"
        />
        <button onClick={evaluate} disabled={loading} className="bg-[#117dff] hover:bg-[#0066e0] text-white text-xs font-semibold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
          {t('engine.evaluate', 'Evaluate')}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {result.shouldCommit ? (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 size={16} />
                <span className="text-xs font-semibold">{t('engine.commitApproved', 'COMMIT APPROVED')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle size={16} />
                <span className="text-xs font-semibold">{t('engine.commitRejected', 'COMMIT REJECTED')}</span>
              </div>
            )}
            <span className="text-[10px] text-[#a3a3a3] font-mono">{result.voterCount} voters, {result.outliers?.length || 0} outliers</span>
          </div>

          {result.consensusScores && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: t('engine.factuality', 'Factuality'), value: result.consensusScores.factuality },
                { label: t('engine.relevance', 'Relevance'), value: result.consensusScores.relevance },
                { label: t('engine.consistency', 'Consistency'), value: result.consensusScores.consistency },
                { label: t('engine.average', 'Average'), value: result.consensusScores.average },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className={`text-lg font-bold font-mono ${scoreColor(value || 0)}`}>{(value || 0).toFixed(1)}</div>
                  <div className="text-[10px] text-[#a3a3a3]">{label}</div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-[#525252] font-mono">{result.reasoning}</p>
        </div>
      )}
    </Card>
  );
}

/* ─── Swarm Activity ─────────────────────────────────────────── */

function SwarmActivity() {
  const { t } = useTranslation('dashboard');
  const [traces, setTraces] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const data = await apiClient.swarmFollowTraces({ limit: 20 });
      setTraces(data);
    } catch (e) {
      console.error('Swarm fetch failed:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTraces(); }, []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionHeader icon={Network} title={t('engine.swarmActivityTitle', 'Swarm Activity')} description={t('engine.swarmActivityDesc', 'Stigmergic agent coordination traces')} />
        <button onClick={fetchTraces} className="text-[#a3a3a3] hover:text-[#117dff] transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {traces && (
        <div className="space-y-2">
          <div className="flex gap-3 text-[11px] font-mono text-[#a3a3a3]">
            <span>{traces.totalTraces || 0} active traces</span>
            <span className="text-emerald-600">{traces.affordances?.length || 0} affordances</span>
            <span className="text-red-400">{traces.disturbances?.length || 0} disturbances</span>
          </div>

          {traces.currentHead && (
            <div className="border border-[#117dff]/20 bg-[#117dff]/5 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap size={12} className="text-[#117dff]" />
                <span className="text-[10px] font-semibold text-[#117dff]">{t('engine.currentHead', 'Current Head')}</span>
              </div>
              <p className="text-[11px] text-[#525252] line-clamp-2">{(traces.currentHead.content || '').slice(0, 200)}</p>
            </div>
          )}

          {(traces.affordances || []).map((t, i) => (
            <div key={i} className="text-[11px] bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span className="text-[#525252] line-clamp-1">{(t.content || '').slice(0, 150)}</span>
            </div>
          ))}

          {(traces.disturbances || []).map((t, i) => (
            <div key={i} className="text-[11px] bg-red-50 border border-red-200 rounded px-2.5 py-1.5 flex items-center gap-2">
              <AlertTriangle size={12} className="text-red-400 shrink-0" />
              <span className="text-[#525252] line-clamp-1">{(t.content || '').slice(0, 150)}</span>
            </div>
          ))}

          {!traces.totalTraces && (
            <p className="text-[11px] text-[#a3a3a3] text-center py-4">{t('engine.noSwarmTraces', 'No active swarm traces. Agents leave traces when they reason collaboratively.')}</p>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Main Engine Page ───────────────────────────────────────── */

function CognitionLoopPanel() {
  const { t } = useTranslation('dashboard');
  const [status, setStatus] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg] = useState(null);

  const refresh = async () => {
    try {
      const [sRes, recRes] = await Promise.all([
        apiClient.core.get('/api/cognition/status'),
        apiClient.core.get('/api/cognition/recent?limit=4').catch(() => ({ data: { items: [] } })),
      ]);
      // axios responses wrap payload in `.data`
      const s = sRes?.data ?? sRes;
      const recItems = recRes?.data?.items ?? recRes?.items ?? [];
      setStatus(s);
      setRecent(Array.isArray(recItems) ? recItems : []);
    } catch (e) {
      // IMPORTANT: distinguish a real "disabled by env" from a transient fetch
      // failure. Old code always set enabled:false on any error, which made
      // the panel look permanently off when the request 401'd or the network
      // hiccupped. Keep enabled=null + carry the error so the UI can render
      // a "status unknown" pill rather than a misleading "disabled" pill.
      setStatus({
        enabled: null,
        error: e?.response?.data?.error || e?.message || 'status fetch failed',
        statusCode: e?.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, []);

  const triggerNow = async () => {
    setTriggering(true);
    setMsg(null);
    try {
      // Endpoint now runs inline + returns actual {synth, compact, ms}
      // counts so we can show a truthful result instead of always saying
      // "running in background" (which masked the empty-input case
      // where 0 new memories were eligible — looked like a no-op).
      const resp = await apiClient.core.post('/api/cognition/synthesize-now', {});
      const r = resp?.data ?? resp ?? {};
      if (r.skipped) {
        setMsg(`Skipped: ${r.reason || 'already running'}`);
      } else if ((r.synth ?? 0) === 0 && (r.compact ?? 0) === 0) {
        setMsg(`Done in ${r.ms ?? 0}ms. 0 new — need ≥${status?.cluster_min ?? 4} recent memories per topic in last ${status?.lookback_hours ?? 24}h.`);
      } else {
        setMsg(`Done in ${r.ms ?? 0}ms. ${r.synth ?? 0} synthesis · ${r.compact ?? 0} drift-compaction written.`);
      }
      // Refresh sooner now that the call is synchronous.
      setTimeout(refresh, 500);
    } catch (e) {
      const apiErr = e.response?.data?.error || e.message;
      const apiCode = e.response?.status ? ` [${e.response.status}]` : '';
      const roleSeen = e.response?.data?.role_seen;
      setMsg(`Failed${apiCode}: ${apiErr}${roleSeen ? ` (your role: ${roleSeen.join(',') || 'none'})` : ''}`);
    } finally {
      setTriggering(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const ago = Math.round((Date.now() - d.getTime()) / 1000);
    if (ago < 60) return `${ago}s ago`;
    if (ago < 3600) return `${Math.round(ago / 60)}m ago`;
    return `${Math.round(ago / 3600)}h ago`;
  };

  return (
    <Card className="lg:col-span-2">
      <div className="flex items-start justify-between mb-4">
        <SectionHeader
          icon={Sparkles}
          title={t('engine.cognitionLoopTitle', 'Cognition Loop')}
          description={t('engine.cognitionLoopDesc', "Hourly synthesis + drift compaction — the 'thinking' cron")}
        />
        <button
          onClick={triggerNow}
          disabled={triggering || !status?.enabled}
          className="text-[11px] font-mono px-3 py-1.5 rounded-md bg-[#117dff] text-white hover:bg-[#0a5fcc] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {triggering ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          {triggering ? t('engine.running', 'Running...') : t('engine.runNow', 'Run now')}
        </button>
      </div>

      {loading && <Loader2 size={16} className="animate-spin text-[#a3a3a3]" />}

      {!loading && status && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#faf9f4] rounded-lg p-3">
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide mb-1">{t('engine.status', 'Status')}</div>
              <div className="flex items-center gap-1.5">
                {status.enabled === true ? (
                  status.running
                    ? <><Loader2 size={12} className="animate-spin text-[#117dff]" /><span className="text-xs font-semibold text-[#117dff]">{t('engine.statusRunning', 'running')}</span></>
                    : <><CheckCircle2 size={12} className="text-emerald-600" /><span className="text-xs font-semibold text-emerald-700">{t('engine.statusIdle', 'idle')}</span></>
                ) : status.enabled === false ? (
                  <><XCircle size={12} className="text-amber-600" /><span className="text-xs font-semibold text-amber-700">{t('engine.statusDisabled', 'disabled')}</span></>
                ) : (
                  // enabled === null (or undefined) → status fetch failed; show
                  // a neutral "unknown" pill plus the underlying error so the
                  // user can act on it (auth, network, env) instead of guessing.
                  <><XCircle size={12} className="text-slate-500" /><span className="text-xs font-semibold text-slate-600" title={status.error || ''}>{t('engine.statusUnknown', 'unknown')}{status.statusCode ? ` (${status.statusCode})` : ''}</span></>
                )}
              </div>
              {status.enabled !== true && status.error && (
                <div className="text-[9.5px] text-[#a3a3a3] mt-1 truncate" title={status.error}>{status.error}</div>
              )}
            </div>
            <div className="bg-[#faf9f4] rounded-lg p-3">
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide mb-1">{t('engine.lastRun', 'Last run')}</div>
              <div className="text-xs font-semibold text-[#0a0a0a]">{fmtDate(status.last_run_at)}</div>
              {status.last_run_ms && <div className="text-[10px] text-[#a3a3a3]">{(status.last_run_ms / 1000).toFixed(1)}s</div>}
            </div>
            <div className="bg-[#faf9f4] rounded-lg p-3">
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide mb-1">{t('engine.nextRun', 'Next run')}</div>
              <div className="text-xs font-semibold text-[#0a0a0a]">{fmtDate(status.next_run_at)}</div>
              <div className="text-[10px] text-[#a3a3a3]">every {Math.round((status.interval_ms || 0) / 60000)}m</div>
            </div>
            <div className="bg-[#faf9f4] rounded-lg p-3">
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide mb-1">{t('engine.lastOutput', 'Last output')}</div>
              <div className="text-xs font-semibold text-[#0a0a0a]">
                {status.last_synthesis_count ?? 0} synth · {status.last_compaction_count ?? 0} compact
              </div>
            </div>
          </div>

          <div className="border-t border-[#ece8de] pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] font-mono">
            <div>
              <div className="text-[#a3a3a3]">{t('engine.lookback', 'Lookback')}</div>
              <div className="text-[#0a0a0a] font-semibold">{status.lookback_hours}h</div>
            </div>
            <div>
              <div className="text-[#a3a3a3]">{t('engine.clusterRange', 'Cluster range')}</div>
              <div className="text-[#0a0a0a] font-semibold">{status.cluster_min}–{status.cluster_max}</div>
            </div>
            <div>
              <div className="text-[#a3a3a3]">{t('engine.driftThreshold', 'Drift threshold')}</div>
              <div className="text-[#0a0a0a] font-semibold">≥{status.drift_threshold}</div>
            </div>
            <div>
              <div className="text-[#a3a3a3]">{t('engine.model', 'Model')}</div>
              <div className="text-[#0a0a0a] font-semibold truncate">{status.model}</div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-[#f0f7ff] border border-[#117dff]/15 rounded-lg text-[11px] text-[#0a0a0a] leading-relaxed">
            <div className="font-semibold mb-1 flex items-center gap-1.5">
              <Activity size={11} className="text-[#117dff]" />
              {t('engine.howItWorks', 'How it works')}
            </div>
            <p>Every {Math.round((status.interval_ms || 0) / 60000)} minutes the loop walks memories created in the last {status.lookback_hours}h, groups them by primary tag, and asks the LLM to emit ONE emergent insight per cluster (saved as a <span className="font-mono bg-white px-1 rounded">synthesis</span> memory with <span className="font-mono bg-white px-1 rounded">Derives</span> edges to its sources). When a topic cluster grows past {status.drift_threshold} memories, the second pass compresses it into a canonical "as-of-today" summary and supersedes the older granular memories — keeping recall fast and preventing graph bloat.</p>
          </div>

          {recent.length > 0 && (
            <div className="mt-4 border-t border-[#ece8de] pt-3">
              <div className="text-[10px] text-[#a3a3a3] uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                <Sparkles size={10} className="text-[#117dff]" />
                {t('engine.recentOutput', 'Recent output ({{count}})', { count: recent.length })}
              </div>
              <div className="space-y-2">
                {recent.map((r) => (
                  <div key={r.id} className="bg-[#faf9f4] rounded-lg p-3 border border-[#ece8de]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-semibold text-[#0a0a0a] truncate flex-1">{r.title}</span>
                      <Badge color={r.type === 'synthesis' ? 'purple' : 'cyan'}>{r.type}</Badge>
                    </div>
                    <p className="text-[11px] text-[#525252] leading-relaxed">{r.preview}{r.full_chars > 280 ? '…' : ''}</p>
                    <div className="text-[9px] text-[#a3a3a3] font-mono mt-1">
                      {new Date(r.created_at).toLocaleString()} · {r.full_chars} chars
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.errors && status.errors.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] font-mono">
              <div className="font-semibold text-amber-700 mb-1">{t('engine.recentErrors', 'Recent errors')}</div>
              {status.errors.slice(-3).map((e, i) => (
                <div key={i} className="text-amber-800 truncate">{e.at?.slice(11, 19)} {e.error}</div>
              ))}
            </div>
          )}

          {msg && (
            <div className="mt-3 p-2 bg-[#117dff]/8 border border-[#117dff]/20 rounded text-[11px] text-[#0a5fcc]">
              {msg}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function Engine() {
  const { t } = useTranslation('dashboard');
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold text-[#0a0a0a] flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
          <Cpu size={20} className="text-[#117dff]" />
          {t('engine.pageTitle', 'Memory Engine Intelligence')}
        </h2>
        <p className="text-xs text-[#a3a3a3] mt-1">
          {t('engine.pageSubtitle', '6 SOTA features powering your memory engine: predict-calibrate extraction, cognitive framing, context autopilot, bi-temporal queries, stigmergic reasoning, and Byzantine consensus.')}
        </p>
      </motion.div>

      {/* Feature status bar */}
      <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
        {[
          { icon: Zap, key: 'predict-calibrate', label: t('engine.featurePredictCalibrate', 'Predict-Calibrate'), color: 'blue' },
          { icon: Brain, key: 'cognitive-frame', label: t('engine.featureCognitiveFrame', 'Cognitive Frame'), color: 'purple' },
          { icon: RefreshCw, key: 'context-autopilot', label: t('engine.featureContextAutopilot', 'Context Autopilot'), color: 'cyan' },
          { icon: Clock, key: 'bi-temporal', label: t('engine.featureBiTemporal', 'Bi-Temporal'), color: 'amber' },
          { icon: GitBranch, key: 'stigmergic-cot', label: t('engine.featureStigmergicCoT', 'Stigmergic CoT'), color: 'green' },
          { icon: Shield, key: 'byzantine-consensus', label: t('engine.featureByzantineConsensus', 'Byzantine Consensus'), color: 'red' },
        ].map(({ icon: Icon, key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5 bg-white border border-[#e3e0db] rounded-lg px-3 py-1.5">
            <Icon size={12} className="text-[#117dff]" />
            <span className="text-[11px] font-medium text-[#0a0a0a]">{label}</span>
            <Badge color={color}>{t('engine.active', 'active')}</Badge>
          </div>
        ))}
      </motion.div>

      {/* Cognition Loop — full-width top section */}
      <CognitionLoopPanel />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CognitiveFramePanel />
        <ConsensusEvaluator />
        <TemporalExplorer />
        <SwarmActivity />
      </div>
    </motion.div>
  );
}
