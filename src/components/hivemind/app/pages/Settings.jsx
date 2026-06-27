import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Shield,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('dashboard');
  const isCopied = copiedField === field;
  return (
    <button
      onClick={() => onCopy(value, field)}
      className="ml-2 p-1.5 rounded-lg hover:bg-[#117dff]/10 transition-colors group flex-shrink-0"
      title={t('settings.copyToClipboard', 'Copy to clipboard')}
    >
      {isCopied ? (
        <Check size={14} className="text-[#117dff]" />
      ) : (
        <Copy size={14} className="text-[#a3a3a3] group-hover:text-[#117dff] transition-colors" />
      )}
    </button>
  );
}

// ─── Read-only field row ────────────────────────────────────────────────────
function ReadOnlyField({ label, value, field, copiedField, onCopy }) {
  return (
    <div>
      <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center bg-[#faf9f4] border border-[#e3e0db] rounded-xl px-3 py-2.5">
        <span className="text-[#525252] text-sm font-mono truncate flex-1 select-all">
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
      className={`bg-white backdrop-blur-xl border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={18} className="text-[#117dff]" />
      </div>
      <div>
        <h3 className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk']">{title}</h3>
        {description && (
          <p className="text-[#525252] text-sm mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function Settings() {
  const { t } = useTranslation('dashboard');
  const { user, org, logout } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [projectPolicy, setProjectPolicy] = useState('private');
  const [memoryPolicy, setMemoryPolicy] = useState('private');
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);
  const timeoutRef = useRef(null);
  // Account deletion (self-host-aware)
  const [isSelfHost, setIsSelfHost] = useState(false);
  const [deleteStage, setDeleteStage] = useState(0); // 0 idle · 1 reviewing · 2 (managed) final confirm
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const controlPlaneUrl = apiClient.controlPlane.defaults.baseURL;
  const coreApiUrl = apiClient.core.defaults.baseURL;

  // Load current org policies from canonical endpoint (covers both axes:
  // project provisioning + memory-save routing).
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await apiClient.core.get('/api/admin/org/policy');
        if (abort) return;
        if (r?.data?.default_project_policy) setProjectPolicy(r.data.default_project_policy);
        if (r?.data?.memory_save_policy) setMemoryPolicy(r.data.memory_save_policy);
      } catch {
        // Fall back to org context value
        if (org?.defaultProjectPolicy) setProjectPolicy(org.defaultProjectPolicy);
      }
    })();
    return () => { abort = true; };
  }, [org]);

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

  const handleSavePolicy = useCallback(async () => {
    setPolicyLoading(true);
    setPolicySaved(false);
    try {
      await apiClient.core.put('/api/admin/org/policy', {
        default_project_policy: projectPolicy,
        memory_save_policy: memoryPolicy,
      });
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    } catch {
      // Silently handle errors
    } finally {
      setPolicyLoading(false);
    }
  }, [projectPolicy, memoryPolicy]);

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

  // Detect self-host so the delete flow can reassure ("data stays on your server") vs warn harder.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await apiClient.selfHostStatus();
        if (alive) setIsSelfHost(!!(s && s.registered));
      } catch { /* default managed */ }
    })();
    return () => { alive = false; };
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true); setDeleteError(null);
    try {
      await apiClient.deleteAccount('DELETE');
      await logout(); // session is gone server-side; clear client + redirect to login
    } catch (e) {
      setDeleteError(e?.response?.data?.error || e?.message || 'Deletion failed');
      setDeleting(false);
    }
  }, [deleteText, logout]);

  const createdDate = org?.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  const projectPolicyOptions = [
    {
      value: 'private',
      label: t('settings.policyPrivateLabel', 'Private (default)'),
      description: t('settings.policyPrivateDesc', 'Creator + explicitly invited members only'),
    },
    {
      value: 'team_inherited',
      label: t('settings.policyTeamInheritedLabel', 'Team Inherited'),
      description: t('settings.policyTeamInheritedDesc', 'All team members auto-granted access when project has a team'),
    },
    {
      value: 'org_visible',
      label: t('settings.policyOrgVisibleLabel', 'Org Visible'),
      description: t('settings.policyOrgVisibleDesc', 'Discoverable by all org members, access on request'),
    },
  ];

  const memoryPolicyOptions = [
    {
      v: 'private',
      t: t('settings.memPolicyPrivateLabel', 'Private (default)'),
      d: t('settings.memPolicyPrivateDesc', 'Save to caller default project; falls through to org-wide.'),
    },
    {
      v: 'org-wide',
      t: t('settings.memPolicyOrgWideLabel', 'Org-wide'),
      d: t('settings.memPolicyOrgWideDesc', 'Always saves org-wide unless project explicitly passed.'),
    },
    {
      v: 'ask',
      t: t('settings.memPolicyAskLabel', 'Ask'),
      d: t('settings.memPolicyAskDesc', 'Server hints Claude to ask the user which project on every save.'),
    },
  ];

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[#0a0a0a] text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2.5">
          <SettingsIcon size={24} className="text-[#117dff]" />
          {t('settings.title', 'Settings')}
        </h1>
        <p className="text-[#525252] text-sm mt-1 font-['Space_Grotesk']">
          {t('settings.subtitle', 'Workspace configuration and connection details')}
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
            title={t('settings.workspaceInfo', 'Workspace Info')}
            description={t('settings.workspaceInfoDesc', 'Your organization and workspace details')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                {t('settings.labelOrganization', 'Organization')}
              </label>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">
                {org?.name || '—'}
              </p>
            </div>
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                {t('settings.labelCreated', 'Created')}
              </label>
              <p className="text-[#525252] text-sm font-['Space_Grotesk']">
                {createdDate}
              </p>
            </div>
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                {t('settings.labelYourRole', 'Your Role')}
              </label>
              <span className="inline-block text-[#117dff] text-xs font-mono bg-[#117dff]/10 border border-[#117dff]/20 rounded-md px-2 py-1">
                {user?.role || 'owner'}
              </span>
            </div>
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                {t('settings.labelCoreApiUrl', 'Core API URL')}
              </label>
              <p className="text-[#525252] text-sm font-mono truncate" title={coreApiUrl}>
                {coreApiUrl || '—'}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── Connection Details ──────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Globe}
            title={t('settings.connectionDetails', 'Connection Details')}
            description={t('settings.connectionDetailsDesc', 'Use these values to configure API clients and integrations')}
          />
          <div className="space-y-3">
            <ReadOnlyField
              label={t('settings.labelControlPlaneUrl', 'Control Plane URL')}
              value={controlPlaneUrl}
              field="controlPlane"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label={t('settings.labelCoreApiBaseUrl', 'Core API Base URL')}
              value={coreApiUrl}
              field="coreApi"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label={t('settings.labelUserId', 'User ID')}
              value={user?.id}
              field="userId"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
            <ReadOnlyField
              label={t('settings.labelOrgId', 'Org ID')}
              value={org?.id}
              field="orgId"
              copiedField={copiedField}
              onCopy={handleCopy}
            />
          </div>
        </SectionCard>

        {/* ── Project Access Policy ──────────────────────────────── */}
        {(user?.role === 'admin' || user?.role === 'owner') && (
          <SectionCard>
            <SectionHeader
              icon={Shield}
              title={t('settings.projectAccessPolicy', 'Project Access Policy')}
              description={t('settings.projectAccessPolicyDesc', 'Default access control for new projects')}
            />
            <div className="space-y-3">
              <div className="space-y-2">
                {projectPolicyOptions.map(({ value, label, description }) => (
                  <label key={value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#faf9f4] transition-colors">
                    <input
                      type="radio"
                      name="projectPolicy"
                      value={value}
                      checked={projectPolicy === value}
                      onChange={(e) => setProjectPolicy(e.target.value)}
                      className="w-4 h-4 text-[#117dff]"
                    />
                    <div>
                      <div className="text-[#0a0a0a] text-sm font-medium">{label}</div>
                      <div className="text-[#a3a3a3] text-xs mt-0.5">{description}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Memory-save policy — separate axis from project provisioning */}
              <div className="pt-4 mt-2 border-t border-[#ece8de]">
                <div className="text-[11px] text-[#a3a3a3] uppercase tracking-wide mb-2 font-semibold">
                  {t('settings.memorySavePolicy', 'Memory save policy')}
                </div>
                <p className="text-[11px] text-[#a3a3a3] mb-3">
                  {t('settings.memorySavePolicyDesc', 'Where MCP')} <code className="font-mono text-[10px] bg-[#faf9f4] px-1 rounded">save_memory</code> {t('settings.memorySavePolicyDesc2', 'routes when the caller omits a project.')}
                </p>
                <div className="space-y-2">
                  {memoryPolicyOptions.map(({ v, t: label, d }) => (
                    <label key={v} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#faf9f4] transition-colors">
                      <input
                        type="radio"
                        name="memoryPolicy"
                        value={v}
                        checked={memoryPolicy === v}
                        onChange={(e) => setMemoryPolicy(e.target.value)}
                        className="w-4 h-4 text-[#117dff]"
                      />
                      <div>
                        <div className="text-[#0a0a0a] text-sm font-medium">{label}</div>
                        <div className="text-[#a3a3a3] text-xs mt-0.5">{d}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSavePolicy}
                disabled={policyLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#117dff] text-white text-sm hover:bg-[#0066e0] disabled:opacity-50 transition-colors"
              >
                {policyLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : policySaved ? (
                  <>
                    <Check size={14} />
                    {t('settings.saved', 'Saved')}
                  </>
                ) : (
                  t('settings.savePolicy', 'Save Policy')
                )}
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── Danger Zone ─────────────────────────────────────────── */}
        <SectionCard className="!border-red-200 !bg-red-50">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} className="text-[#dc2626]" />
            </div>
            <div>
              <h3 className="text-[#dc2626] text-base font-semibold font-['Space_Grotesk']">
                {t('settings.dangerZone', 'Danger Zone')}
              </h3>
              <p className="text-[#525252] text-sm mt-0.5">
                {t('settings.dangerZoneDesc', 'These actions are destructive and cannot be undone.')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Sign Out All Sessions */}
            <div className="flex items-center justify-between bg-white border border-red-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">
                  {t('settings.signOutAllSessions', 'Sign Out of All Sessions')}
                </p>
                <p className="text-[#a3a3a3] text-xs mt-0.5">
                  {t('settings.signOutAllDesc', 'Invalidates all active sessions across devices.')}
                </p>
              </div>
              <button
                onClick={handleSignOutAll}
                className="flex items-center gap-1.5 text-[#dc2626] hover:text-[#dc2626] text-xs font-mono bg-red-500/10 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4"
              >
                {t('settings.signOutBtn', 'Sign Out')}
              </button>
            </div>

            {/* Revoke All API Keys */}
            <div className="flex items-center justify-between bg-white border border-red-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">
                  {t('settings.revokeAllKeys', 'Revoke All API Keys')}
                </p>
                <p className="text-[#a3a3a3] text-xs mt-0.5">
                  {t('settings.revokeAllKeysDesc', 'All existing API keys will stop working immediately.')}
                </p>
              </div>
              {showRevokeConfirm ? (
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    className="text-[#525252] hover:text-[#525252] text-xs font-mono px-3 py-2 transition-colors"
                  >
                    {t('settings.cancel', 'Cancel')}
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
                    {t('settings.confirmRevoke', 'Confirm Revoke')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRevokeConfirm(true)}
                  className="flex items-center gap-1.5 text-[#dc2626] hover:text-[#dc2626] text-xs font-mono bg-red-500/10 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4"
                >
                  <Trash2 size={12} />
                  {t('settings.revokeAll', 'Revoke All')}
                </button>
              )}
            </div>

            {/* Delete Account — self-host-aware */}
            <div className="bg-white border border-red-300 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-semibold">
                    {t('settings.deleteAccount', 'Delete Account')}
                  </p>
                  <p className="text-[#a3a3a3] text-xs mt-0.5">
                    {t('settings.deleteAccountDesc', 'Permanently closes your account and removes your identity, keys, orgs you solely own, and central data.')}
                  </p>
                </div>
                {deleteStage === 0 && (
                  <button
                    onClick={() => { setDeleteStage(1); setDeleteText(''); setDeleteError(null); }}
                    className="flex-shrink-0 ml-4 flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 text-xs font-mono rounded-lg px-3 py-2 transition-colors"
                  >
                    <Trash2 size={12} />
                    {t('settings.deleteAccountBtn', 'Delete Account')}
                  </button>
                )}
              </div>

              {deleteStage >= 1 && (
                <div className="mt-3 pt-3 border-t border-red-100">
                  {/* Residency notice: reassure self-host, warn harder for managed */}
                  {isSelfHost ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-3">
                      <p className="text-emerald-800 text-xs font-semibold font-['Space_Grotesk']">
                        {t('settings.deleteSelfHostTitle', 'Your memory data stays with you')}
                      </p>
                      <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                        {t('settings.deleteSelfHostBody', "You're self-hosted — your memories, vectors, and relationship graph live in the .amr (and Postgres) on your own server. Deleting only removes your Singulance identity, API keys, and the connection. Your data on your box is untouched and remains yours.")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mb-3">
                      <p className="text-red-800 text-xs font-semibold font-['Space_Grotesk']">
                        {t('settings.deleteManagedTitle', 'This permanently erases all your data')}
                      </p>
                      <p className="text-red-700 text-xs mt-0.5 leading-relaxed">
                        {t('settings.deleteManagedBody', 'All your memories, syntheses, connectors, and knowledge live on Singulance and will be permanently deleted. This cannot be undone.')}
                      </p>
                    </div>
                  )}

                  {deleteStage === 2 ? (
                    <div className="rounded-lg bg-red-100 border border-red-300 px-3 py-2.5 mb-3">
                      <p className="text-red-900 text-xs font-semibold">
                        {t('settings.deleteFinalConfirm', 'Are you absolutely sure? Your data cannot be recovered after this.')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="block text-[#525252] text-xs mb-1.5">
                        {t('settings.deleteTypeConfirm', 'Type DELETE to confirm')}
                      </label>
                      <input
                        type="text"
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        placeholder="DELETE"
                        autoComplete="off"
                        className="w-full sm:w-64 bg-white border border-red-200 rounded-lg px-3 py-2 text-sm font-mono text-[#0a0a0a] focus:outline-none focus:border-red-400 mb-3"
                      />
                    </>
                  )}

                  {deleteError && <p className="text-red-600 text-xs mb-2 font-mono">{deleteError}</p>}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDeleteStage(0); setDeleteText(''); setDeleteError(null); }}
                      disabled={deleting}
                      className="text-[#525252] hover:text-[#0a0a0a] text-xs font-mono px-3 py-2 transition-colors"
                    >
                      {t('settings.cancel', 'Cancel')}
                    </button>
                    {/* Managed gets a second confirmation step; self-host deletes after one. */}
                    {(!isSelfHost && deleteStage === 1) ? (
                      <button
                        onClick={() => setDeleteStage(2)}
                        disabled={deleteText !== 'DELETE'}
                        className="flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono rounded-lg px-3 py-2 transition-colors"
                      >
                        <Trash2 size={12} />
                        {t('settings.continue', 'Continue')}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || (deleteStage !== 2 && deleteText !== 'DELETE')}
                        className="flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono rounded-lg px-3 py-2 transition-colors"
                      >
                        {deleting ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        {isSelfHost
                          ? t('settings.deleteAndKeepData', 'Delete account')
                          : t('settings.deletePermanently', 'Permanently delete')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── About ───────────────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Info}
            title={t('settings.aboutTitle', 'About HIVEMIND')}
            description={t('settings.aboutDesc', 'Persistent memory engine for AI agents')}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#525252] text-xs font-mono uppercase tracking-wider">
                {t('settings.version', 'Version')}
              </span>
              <span className="text-[#525252] text-sm font-mono">{HIVEMIND_VERSION}</span>
            </div>
            <div className="border-t border-[#eae7e1] pt-3">
              <p className="text-[#a3a3a3] text-sm leading-relaxed mb-4">
                {t('settings.aboutBody', 'HIVEMIND is a persistent memory engine that gives AI agents long-term recall, semantic search, and cross-session context. Memories are stored, versioned, and retrievable across all connected clients.')}
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://hivemind.davinciai.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#117dff] hover:text-[#0066e0] text-xs font-mono transition-colors"
                >
                  {t('settings.documentation', 'Documentation')}
                  <ExternalLink size={11} />
                </a>
                <a
                  href="https://hivemind.davinciai.eu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#117dff] hover:text-[#0066e0] text-xs font-mono transition-colors"
                >
                  {t('settings.support', 'Support')}
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
