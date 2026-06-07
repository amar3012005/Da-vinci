/**
 * Hermes Agents v2 — Approvals tab (P3)
 *
 * CONTRACT (props received from HermesAgents shell):
 *   agent      {object|null}  The tenant's Hermes agent record from GET /hermes/agent.
 *                             Shape: { id, name, status, config, tenant_id, created_at, updated_at }
 *                             null while loading or when not enabled.
 *   apiClient  {object}       The shared HiveMindApiClient singleton (api-client.js).
 *                             Relevant methods:
 *                               apiClient.listHermesApprovals(id)               — pending approvals
 *                               apiClient.decideHermesApproval(id, aid, dec)    — approve | reject
 *   refresh    {function}     Call to re-fetch agent state from the shell.
 *                             Signature: () => void
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function extractErrorText(err) {
  if (!err) return 'An unexpected error occurred.';
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.detail) return err.response.data.detail;
  if (err.response?.status === 502) return 'The agent runtime is temporarily unavailable (502). Please try again shortly.';
  if (err.response?.status === 503) return 'Service unavailable. The agent may be paused or unreachable.';
  return err.message || 'An unexpected error occurred.';
}

function payloadPreview(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, null, 2);
}

// ─── Single approval row ──────────────────────────────────────────────────────

function ApprovalRow({ approval, onDecide, deciding }) {
  const preview = payloadPreview(approval.payload);
  const isPending = approval.status === 'pending' || !approval.status;

  return (
    <div className="rounded-[10px] border border-[#e3e0db] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Left: action label + timestamp */}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#0a0a0a] truncate">
            {approval.action || 'Pending action'}
          </p>
          <p className="text-[10px] text-[#a3a3a3] font-mono mt-0.5">
            {formatDate(approval.created_at)}
          </p>
        </div>

        {/* Right: status pill */}
        {!isPending && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f3f1ec] text-[#737373] shrink-0">
            <Clock size={10} />
            {approval.status}
          </span>
        )}
      </div>

      {/* Payload preview */}
      {preview && (
        <pre className="mt-3 text-[11px] text-[#334155] bg-[#faf9f4] border border-[#e3e0db] rounded-[6px] p-2 overflow-x-auto whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
          {preview}
        </pre>
      )}

      {/* Approve / Reject buttons — only while pending */}
      {isPending && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={deciding === approval.id}
            onClick={() => onDecide(approval.id, 'approve')}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-emerald-600 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deciding === approval.id ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Approve
          </button>

          <button
            type="button"
            disabled={deciding === approval.id}
            onClick={() => onDecide(approval.id, 'reject')}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-semibold text-[#dc2626] hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={12} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Approvals tab ────────────────────────────────────────────────────────────

export default function Approvals({ agent, apiClient, refresh }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Id of the approval currently being decided (locks both buttons on that row)
  const [deciding, setDeciding] = useState(null);
  const [decideError, setDecideError] = useState(null);

  // ── Load approvals ────────────────────────────────────────────────────────
  const loadApprovals = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.listHermesApprovals(agent.id);
      setApprovals(data?.approvals || []);
    } catch (err) {
      setLoadError(extractErrorText(err));
    } finally {
      setLoading(false);
    }
  }, [agent, apiClient]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // ── Decide on an approval ─────────────────────────────────────────────────
  const handleDecide = useCallback(async (approvalId, decision) => {
    if (!agent?.id || deciding) return;
    setDeciding(approvalId);
    setDecideError(null);
    try {
      await apiClient.decideHermesApproval(agent.id, approvalId, decision);
      // Re-fetch list + parent agent state after decision
      await loadApprovals();
      refresh();
    } catch (err) {
      setDecideError(extractErrorText(err));
    } finally {
      setDeciding(null);
    }
  }, [agent, apiClient, deciding, loadApprovals, refresh]);

  // ── No agent guard ────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-3">
          <ShieldCheck size={20} className="text-[#a3a3a3]" />
        </div>
        <p className="text-[14px] font-semibold text-[#0a0a0a]">Agent not available</p>
        <p className="text-[11px] text-[#737373] mt-1">
          The Hermes agent record has not loaded yet.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 border-b border-[#e3e0db] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#0a0a0a]">Approvals</h2>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Actions awaiting your decision before Hermes can proceed.
            </p>
          </div>

          <button
            type="button"
            onClick={loadApprovals}
            disabled={loading}
            className="text-[#a3a3a3] hover:text-[#525252] p-1.5 rounded transition-colors disabled:opacity-40"
            aria-label="Refresh approvals"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">

        {/* Decide error banner */}
        {decideError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 mb-4">
            <AlertCircle size={14} className="text-[#dc2626] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#dc2626]">{decideError}</p>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 mb-4">
            <AlertCircle size={14} className="text-[#dc2626] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#dc2626]">{loadError}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && approvals.length === 0 && (
          <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3] py-4">
            <RefreshCw size={12} className="animate-spin" />
            Loading approvals…
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && approvals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-[#f3f1ec] flex items-center justify-center mb-2">
              <ShieldCheck size={16} className="text-[#a3a3a3]" />
            </div>
            <p className="text-[12px] text-[#737373]">No pending approvals</p>
            <p className="text-[10px] text-[#a3a3a3] mt-0.5">
              Actions requiring human sign-off will appear here.
            </p>
          </div>
        )}

        {/* Approval rows */}
        {approvals.length > 0 && (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                onDecide={handleDecide}
                deciding={deciding}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
