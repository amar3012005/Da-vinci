import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building2,
  Globe,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';

const HIVEMIND_VERSION = '1.0.0';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Copy button with per-field tracking ────────────────────────────────────
function CopyButton({ value, field, copiedField, onCopy }) {
  const isCopied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(value, field)}
      className="ml-2 p-1.5 rounded-lg hover:bg-[#bdf213]/10 transition-colors group flex-shrink-0"
      title="Copy to clipboard"
    >
      {isCopied ? (
        <Check size={14} className="text-[#bdf213]" />
      ) : (
        <Copy size={14} className="text-white/30 group-hover:text-[#bdf213] transition-colors" />
      )}
    </button>
  );
}

// ─── Read-only field row ────────────────────────────────────────────────────
function ReadOnlyField({ label, value, field, copiedField, onCopy }) {
  return (
    <div>
      <label className="block text-white/40 text-[11px] font-mono uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-3 py-2.5">
        <span className="text-white/60 text-sm font-mono truncate flex-1 select-all">
          {value || '—'}
        </span>
        {value && (
          <CopyButton
            value={value}
            field={field}
            copiedField={copiedField}
            onCopy={onCopy}
          />
        )}
      </div>
    </div>
  );
}

// ─── Section card wrapper ───────────────────────────────────────────────────
function SectionCard({ children, className = '' }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`bg-[#111]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={18} className="text-[#bdf213]" />
      </div>
      <div>
        <h3 className="text-white text-base font-semibold font-['Space_Grotesk']">{title}</h3>
        {description && (
          <p className="text-white/40 text-sm mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function Settings() {
  const { user, org, logout } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const timeoutRef = useRef(null);

  const controlPlaneUrl = apiClient.controlPlane.defaults.baseURL;
  const coreApiUrl = apiClient.core.defaults.baseURL;

  const handleCopy = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedField(field);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleRevokeAllKeys = useCallback(async () => {
    setRevoking(true);
    try {
      await apiClient.controlPlane.delete('/v1/keys');
      setShowRevokeConfirm(false);
    } catch {
      // Silently handle — user stays on page
    } finally {
      setRevoking(false);
    }
  }, []);

  const handleSignOutAll = useCallback(async () => {
    await logout();
  }, [logout]);

  const createdDate = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2.5">
          <SettingsIcon size={24} className="text-[#bdf213]" />
          Settings
        </h1>
        <p className="text-white/40 text-sm mt-1 font-['Space_Grotesk']">
          Workspace configuration and connection details
        </p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6 max-w-3xl"
      >
        {/* ── Workspace Info ──────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Building2}
            title="Workspace Info"
            description="Your organization and workspace details"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/40 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Organization
              </label>
              <p className="text-white text-sm font-['Space_Grotesk'] font-medium">
                {org?.name || '—'}
              </p>
            </div>
            <div>
              <label className="block text-white/40 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Created
              </label>
              <p className="text-white/60 text-sm font-['Space_Grotesk']">
                {createdDate}
              </p>
            </div>
            <div>
              <label className="block text-white/40 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Your Role
              </label>
              <span className="inline-block text-[#bdf213] text-xs font-mono bg-[#bdf213]/10 border border-[#bdf213]/20 rounded-md px-2 py-1">
                {user?.role || 'owner'}
              </span>
            </div>
            <div>
              <label className="block text-white/40 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Core API URL
              </label>
              <p className="text-white/50 text-sm font-mono truncate" title={coreApiUrl}>
                {coreApiUrl || '—'}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Connection Details ──────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Globe}
            title="Connection Details"
            description="Use these values to configure API clients and integrations"
          />
          <div className="space-y-3">
            <ReadOnlyField
              label="Control Plane URL"
              value={controlPlaneUrl}
              field="controlPlane"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label="Core API Base URL"
              value={coreApiUrl}
              field="coreApi"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label="User ID"
              value={user?.id}
              field="userId"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label="Org ID"
              value={org?.id}
              field="orgId"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
          </div>
        </SectionCard>

        {/* ── Danger Zone ─────────────────────────────────────────── */}
        <SectionCard className="!border-red-500/20 !bg-red-500/[0.03]">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-red-400 text-base font-semibold font-['Space_Grotesk']">
                Danger Zone
              </h3>
              <p className="text-white/40 text-sm mt-0.5">
                These actions are destructive and cannot be undone.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sign Out All Sessions */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-red-500/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white text-sm font-['Space_Grotesk'] font-medium">
                  Sign Out of All Sessions
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  Invalidates all active sessions across devices.
                </p>
              </div>
              <button
                onClick={handleSignOutAll}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-mono bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4"
              >
                Sign Out
              </button>
            </div>

            {/* Revoke All API Keys */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-red-500/10 rounded-xl px-4 py-3">
              <div>
                <p className="text-white text-sm font-['Space_Grotesk'] font-medium">
                  Revoke All API Keys
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  All existing API keys will stop working immediately.
                </p>
              </div>
              {showRevokeConfirm ? (
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    className="text-white/40 hover:text-white/60 text-xs font-mono px-3 py-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRevokeAllKeys}
                    disabled={revoking}
                    className="flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-mono rounded-lg px-3 py-2 transition-colors"
                  >
                    {revoking ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Confirm Revoke
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRevokeConfirm(true)}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs font-mono bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4"
                >
                  <Trash2 size={12} />
                  Revoke All
                </button>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── About ───────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Info}
            title="About HIVEMIND"
            description="Persistent memory engine for AI agents"
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs font-mono uppercase tracking-wider">
                Version
              </span>
              <span className="text-white/60 text-sm font-mono">{HIVEMIND_VERSION}</span>
            </div>
            <div className="border-t border-white/[0.04] pt-3">
              <p className="text-white/30 text-sm leading-relaxed mb-4">
                HIVEMIND is a persistent memory engine that gives AI agents long-term recall,
                semantic search, and cross-session context. Memories are stored, versioned,
                and retrievable across all connected clients.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://docs.hivemind.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#bdf213] hover:text-[#d4ff3a] text-xs font-mono transition-colors"
                >
                  Documentation
                  <ExternalLink size={11} />
                </a>
                <a
                  href="https://hivemind.dev/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#bdf213] hover:text-[#d4ff3a] text-xs font-mono transition-colors"
                >
                  Support
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </SectionCard>
      </motion.div>
    </div>
  );
}
