import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  TrendingUp,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Play,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';


const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function scoreColor(score) {
  if (score >= 0.8) return '#22c55e';
  if (score >= 0.5) return '#f59e0b';
  return '#ef4444';
}

function ScoreDisplay({ label, value }) {
  const display = value != null ? value.toFixed(3) : '--';
  const color = value != null ? scoreColor(value) : '#666';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-white/40 text-xs font-mono uppercase tracking-wider">{label}</span>
      <span className="text-4xl font-bold font-mono leading-none" style={{ color }}>
        {display}
      </span>
    </div>
  );
}

function StatusBadge({ passed }) {
  if (passed == null) return null;
  return passed ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
      <CheckCircle size={12} />
      Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20">
      <XCircle size={12} />
      Failed
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return '--';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function derivePassFail(run) {
  if (run.status === 'passed' || run.passed === true) return true;
  if (run.status === 'failed' || run.passed === false) return false;
  const p = run.precision ?? run.scores?.precision;
  const r = run.recall ?? run.scores?.recall;
  const f = run.f1 ?? run.scores?.f1;
  if (p != null && r != null && f != null) {
    return p >= 0.5 && r >= 0.5 && f >= 0.5;
  }
  return null;
}

function extractScores(run) {
  return {
    precision: run.precision ?? run.scores?.precision ?? null,
    recall: run.recall ?? run.scores?.recall ?? null,
    f1: run.f1 ?? run.scores?.f1 ?? null,
  };
}

export default function Evaluation() {
  const { data: latest, loading: latestLoading, error: latestError, refetch: refetchLatest } =
    useApiQuery(() => apiClient.getEvalResults());

  const { data: history, loading: historyLoading, refetch: refetchHistory } =
    useApiQuery(() => apiClient.getEvalHistory());

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    setRunError(null);
    try {
      await apiClient.runEvaluation({});
      await Promise.all([refetchLatest(), refetchHistory()]);
    } catch (err) {
      setRunError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  };

  const historyList = useMemo(() => {
    if (!history) return [];
    return Array.isArray(history) ? history : history.runs || history.results || [];
  }, [history]);

  const comparisonRuns = useMemo(() => {
    if (!compareA || !compareB) return null;
    const a = historyList.find((r) => (r.id || r.run_id) === compareA);
    const b = historyList.find((r) => (r.id || r.run_id) === compareB);
    if (!a || !b) return null;
    return [a, b];
  }, [compareA, compareB, historyList]);

  if (latestLoading && historyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#bdf213] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const latestScores = latest ? extractScores(latest) : {};
  const latestPassed = latest ? derivePassFail(latest) : null;

  return (
    <div className="min-h-full">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold font-['Space_Grotesk'] mb-1">Retrieval Evaluation</h1>
          <p className="text-white/40 text-sm font-['Space_Grotesk']">
            Measure and track memory retrieval quality
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0a0a] font-semibold py-3 px-5 rounded-xl transition-all text-sm font-['Space_Grotesk'] group self-start"
        >
          {running ? (
            <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Play size={14} className="group-hover:translate-x-0.5 transition-transform" />
              Run Evaluation
            </>
          )}
        </button>
      </motion.div>

      {runError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-xs font-mono mb-4"
        >
          {runError}
        </motion.p>
      )}

      {latestError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-400 text-xs font-mono mb-4"
        >
          {latestError}
        </motion.p>
      )}

      {/* Latest Results */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[#bdf213]" />
            <h3 className="text-white text-lg font-bold font-['Space_Grotesk']">Latest Results</h3>
          </div>
          <div className="flex items-center gap-3">
            {latest?.cross_client_recall != null && (
              <span className="text-white/40 text-xs font-mono">
                Cross-client: {latest.cross_client_recall ? 'Yes' : 'No'}
              </span>
            )}
            <StatusBadge passed={latestPassed} />
          </div>
        </div>

        {latest ? (
          <>
            <div className="grid grid-cols-3 gap-8 mb-6">
              <ScoreDisplay label="Precision" value={latestScores.precision} />
              <ScoreDisplay label="Recall" value={latestScores.recall} />
              <ScoreDisplay label="F1" value={latestScores.f1} />
            </div>
            {(latest.timestamp || latest.created_at) && (
              <div className="flex items-center gap-1.5 text-white/30 text-xs font-mono">
                <Clock size={12} />
                {formatDate(latest.timestamp || latest.created_at)}
              </div>
            )}
          </>
        ) : (
          <p className="text-white/30 text-sm font-mono text-center py-8">
            No evaluation results yet. Run an evaluation to get started.
          </p>
        )}
      </motion.div>

      {/* History */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp size={16} className="text-white/50" />
          <h3 className="text-white text-lg font-bold font-['Space_Grotesk']">History</h3>
        </div>

        {historyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4">Run ID</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4">Date</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4 text-right">Precision</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4 text-right">Recall</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4 text-right">F1</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 pr-4 text-center">Status</th>
                  <th className="text-white/40 text-xs font-mono uppercase tracking-wider pb-3 text-center">Compare</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((run) => {
                  const id = run.id || run.run_id;
                  const scores = extractScores(run);
                  const passed = derivePassFail(run);
                  const isSelectedA = compareA === id;
                  const isSelectedB = compareB === id;

                  return (
                    <tr
                      key={id}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-white/70 text-xs font-mono">
                          {typeof id === 'string' ? id.slice(0, 8) : id}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-white/50 text-xs font-mono">
                          {formatDate(run.timestamp || run.created_at)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: scores.precision != null ? scoreColor(scores.precision) : '#666' }}
                        >
                          {scores.precision != null ? scores.precision.toFixed(3) : '--'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: scores.recall != null ? scoreColor(scores.recall) : '#666' }}
                        >
                          {scores.recall != null ? scores.recall.toFixed(3) : '--'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: scores.f1 != null ? scoreColor(scores.f1) : '#666' }}
                        >
                          {scores.f1 != null ? scores.f1.toFixed(3) : '--'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <StatusBadge passed={passed} />
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setCompareA(isSelectedA ? null : id)}
                            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                              isSelectedA
                                ? 'bg-[#bdf213]/20 text-[#bdf213] border border-[#bdf213]/30'
                                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => setCompareB(isSelectedB ? null : id)}
                            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                              isSelectedB
                                ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
                            }`}
                          >
                            B
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/30 text-sm font-mono text-center py-6">
            No evaluation history available
          </p>
        )}
      </motion.div>

      {/* Comparison */}
      {comparisonRuns && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-white/50" />
            <h3 className="text-white text-lg font-bold font-['Space_Grotesk']">Comparison</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {comparisonRuns.map((run, idx) => {
              const scores = extractScores(run);
              const passed = derivePassFail(run);
              const id = run.id || run.run_id;
              const label = idx === 0 ? 'A' : 'B';
              const accent = idx === 0 ? '#bdf213' : '#3b82f6';

              return (
                <div
                  key={id}
                  className="rounded-xl border p-5"
                  style={{ borderColor: `${accent}33`, background: `${accent}08` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold"
                        style={{ background: `${accent}22`, color: accent }}
                      >
                        {label}
                      </span>
                      <span className="text-white/50 text-xs font-mono">
                        {typeof id === 'string' ? id.slice(0, 8) : id}
                      </span>
                    </div>
                    <StatusBadge passed={passed} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <ScoreDisplay label="Precision" value={scores.precision} />
                    <ScoreDisplay label="Recall" value={scores.recall} />
                    <ScoreDisplay label="F1" value={scores.f1} />
                  </div>

                  <div className="flex items-center gap-1.5 text-white/30 text-xs font-mono">
                    <Clock size={12} />
                    {formatDate(run.timestamp || run.created_at)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delta row */}
          {(() => {
            const aScores = extractScores(comparisonRuns[0]);
            const bScores = extractScores(comparisonRuns[1]);
            const deltas = {
              precision: aScores.precision != null && bScores.precision != null ? bScores.precision - aScores.precision : null,
              recall: aScores.recall != null && bScores.recall != null ? bScores.recall - aScores.recall : null,
              f1: aScores.f1 != null && bScores.f1 != null ? bScores.f1 - aScores.f1 : null,
            };

            const hasDelta = Object.values(deltas).some((d) => d != null);
            if (!hasDelta) return null;

            return (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-3">
                  Delta (B - A)
                </p>
                <div className="grid grid-cols-3 gap-8 text-center">
                  {['precision', 'recall', 'f1'].map((key) => {
                    const d = deltas[key];
                    if (d == null) return <div key={key} className="text-white/20 font-mono">--</div>;
                    const sign = d >= 0 ? '+' : '';
                    const color = d > 0 ? '#22c55e' : d < 0 ? '#ef4444' : '#666';
                    return (
                      <div key={key}>
                        <span className="text-white/40 text-xs font-mono uppercase block mb-1">{key}</span>
                        <span className="text-lg font-mono font-bold" style={{ color }}>
                          {sign}{d.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}
