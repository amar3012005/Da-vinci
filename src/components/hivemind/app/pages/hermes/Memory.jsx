/**
 * Hermes Agents v2 — Memory tab (P3)
 *
 * CONTRACT (props received from HermesAgents shell):
 *   agent      {object|null}  The tenant's Hermes agent record from GET /hermes/agent.
 *                             null while loading or when not enabled.
 *   apiClient  {object}       The shared HiveMindApiClient singleton (api-client.js).
 *                             Relevant methods:
 *                               apiClient.getHermesMemory()
 *   refresh    {function}     Call to re-fetch agent state from the shell. () => void
 *
 * Read-only: displays what the agent knows (memory entries), newest first.
 * No edit or delete operations.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Brain, AlertCircle, Loader2, RefreshCw, BookOpen } from 'lucide-react';
import { colors, shadows } from '../../shared/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text.primary,
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    borderRadius: '6px',
    border: `1px solid ${colors.border.default}`,
    background: colors.bg.elevated,
    color: colors.text.muted,
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: '10px',
    boxShadow: shadows.card,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
  },
  cardTimestamp: {
    fontSize: '11px',
    color: colors.text.muted,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  cardSnippet: {
    fontSize: '12px',
    color: colors.text.secondary,
    lineHeight: 1.5,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    color: colors.text.muted,
    fontSize: '13px',
    background: colors.bg.secondary,
    borderRadius: '10px',
    border: `1px dashed ${colors.border.default}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyIcon: {
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '12px',
    color: colors.text.muted,
    marginTop: '2px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(220, 38, 38, 0.06)',
    border: '1px solid rgba(220, 38, 38, 0.18)',
    borderRadius: '8px',
    color: colors.status.error,
    fontSize: '13px',
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '48px 0',
    color: colors.text.muted,
    fontSize: '13px',
  },
  noAgentWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: '8px',
    textAlign: 'center',
  },
  noAgentIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: colors.bg.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  noAgentText: {
    fontSize: '13px',
    color: colors.text.tertiary,
  },
  countBadge: {
    fontSize: '11px',
    color: colors.text.muted,
    background: colors.bg.secondary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: '999px',
    padding: '2px 8px',
    fontWeight: 500,
  },
};

// ─── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({ memory }) {
  return (
    <div style={styles.card} aria-label={`Memory: ${memory.title || 'Untitled'}`}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle} title={memory.title || 'Untitled'}>
          {memory.title || 'Untitled'}
        </span>
        <span style={styles.cardTimestamp}>
          {relativeTime(memory.created_at)}
        </span>
      </div>
      {memory.content_snippet && (
        <p style={styles.cardSnippet}>{memory.content_snippet}</p>
      )}
    </div>
  );
}

// ─── Memory tab ───────────────────────────────────────────────────────────────

export default function Memory({ agent, apiClient }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!apiClient) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHermesMemory();
      const list = data?.memories ?? [];
      // Sort newest first by created_at
      const sorted = [...list].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      setMemories(sorted);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load memory.');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  // ── No agent ────────────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div style={styles.noAgentWrap}>
        <div style={styles.noAgentIcon}>
          <Brain size={20} color={colors.text.muted} />
        </div>
        <p style={styles.noAgentText}>Agent data unavailable.</p>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && memories.length === 0) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Loading memory…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <span style={styles.title}>
          <Brain size={15} color={colors.accent.primary} />
          Agent Memory
          {memories.length > 0 && (
            <span style={styles.countBadge}>{memories.length}</span>
          )}
        </span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            ...styles.refreshBtn,
            opacity: loading ? 0.5 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
          aria-label="Refresh memory"
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
        </button>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && !error && memories.length === 0 && (
        <div style={styles.empty}>
          <BookOpen size={22} color={colors.text.muted} style={styles.emptyIcon} />
          <span>No memories yet.</span>
          <span style={styles.emptySubtext}>
            Memories will appear here as the agent learns from interactions.
          </span>
        </div>
      )}

      {/* ── Memory list ─────────────────────────────────────────────────────── */}
      {memories.length > 0 && (
        <div style={styles.list} aria-label="Memory entries">
          {memories.map((memory, index) => (
            <MemoryCard
              key={memory.id || `memory-${index}`}
              memory={memory}
            />
          ))}
        </div>
      )}
    </div>
  );
}
