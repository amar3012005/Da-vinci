import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Check,
  AlertTriangle,
  Trash2,
  ExternalLink,
  Info,
  Shield,
  Bell,
  Clock3,
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
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showClearMemConfirm, setShowClearMemConfirm] = useState(false);
  const [clearingMem, setClearingMem] = useState(false);
  const [clearedCount, setClearedCount] = useState(null);
  const [clearMemError, setClearMemError] = useState(null);
  const [projectPolicy, setProjectPolicy] = useState('private');
  const [memoryPolicy, setMemoryPolicy] = useState('private');
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);
  const [proactiveSettings, setProactiveSettings] = useState({ enabled: false, timezone: 'UTC', quiet_start_hour: 21, quiet_end_hour: 8 });
  const [proactiveLoading, setProactiveLoading] = useState(true);
  const [proactiveSaving, setProactiveSaving] = useState(false);
  const [proactiveError, setProactiveError] = useState(null);
  const [proactiveSaved, setProactiveSaved] = useState(false);

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

  // Consent is read and written independently of the global rollout flag.
  // This lets a person opt in before a deliberately narrow shadow/canary
  // rollout, but never causes a background message by itself.
  useEffect(() => {
    let cancelled = false;
    apiClient.getProactiveCognitionSettings()
      .then((settings) => {
        if (!cancelled && settings) setProactiveSettings((current) => ({ ...current, ...settings }));
      })
      .catch(() => {
        if (!cancelled) setProactiveError('Proactive reflections are unavailable right now.');
      })
      .finally(() => { if (!cancelled) setProactiveLoading(false); });
    return () => { cancelled = true; };
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

  const saveProactiveSettings = useCallback(async () => {
    setProactiveSaving(true);
    setProactiveSaved(false);
    setProactiveError(null);
    try {
      const saved = await apiClient.updateProactiveCognitionSettings({
        enabled: proactiveSettings.enabled === true,
        timezone: proactiveSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        quiet_start_hour: Number(proactiveSettings.quiet_start_hour),
        quiet_end_hour: Number(proactiveSettings.quiet_end_hour),
      });
      setProactiveSettings((current) => ({ ...current, ...saved }));
      setProactiveSaved(true);
      setTimeout(() => setProactiveSaved(false), 3000);
    } catch (error) {
      setProactiveError(error?.response?.data?.error || 'Could not save your reflection preference.');
    } finally {
      setProactiveSaving(false);
    }
  }, [proactiveSettings]);

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

  // Hard-delete every memory in the org (count → 0). Does NOT touch LLM token
  // usage or any billing counter — those live in separate tables the clear
  // never references. Irreversible.
  const handleClearAllMemories = useCallback(async () => {
    setClearingMem(true);
    setClearedCount(null);
    try {
      const { data } = await apiClient.core.delete('/api/memories/delete-all');
      setClearedCount(typeof data?.deleted === 'number' ? data.deleted : 0);
      setShowClearMemConfirm(false);
      setClearMemError(null);
      window.dispatchEvent(new CustomEvent('hivemind:memories-cleared'));
    } catch (err) {
      // Surface the failure — a silent catch here made a dead backend look
      // like a dead button (user clicks, nothing happens, no feedback).
      const msg = err?.response?.data?.message || err?.response?.data?.error
        || (err?.response?.status ? `Request failed (${err.response.status})` : 'Network error — memory service unreachable');
      setClearMemError(msg);
    } finally {
      setClearingMem(false);
    }
  }, []);

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
          Workspace configuration, policies, and privacy controls
        </p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="space-y-6 max-w-3xl"
      >
        {/* ── Settings scope ───────────────────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={SettingsIcon}
            title="What belongs in Settings"
            description="Operational controls for this workspace. Identity, plan, hosting, and company context are managed in Profile; people and roles are managed in Team."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Profile
              </label>
              <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">
                Account identity, organization context, plan and hosting
              </p>
            </div>
            <div>
              <label className="block text-[#525252] text-[11px] font-mono uppercase tracking-wider mb-1.5">
                Team
              </label>
              <p className="text-[#525252] text-sm font-['Space_Grotesk']">
                Members, invitations, roles, projects and access
              </p>
            </div>
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

        {/* ── Proactive HIVE reflections ─────────────────────────── */}
        <SectionCard>
          <SectionHeader
            icon={Bell}
            title="HIVE reflections"
            description="Let HIVE-MIND occasionally ask about a recent decision or unfinished work. You control this completely."
          />
          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] p-4 cursor-pointer">
              <div>
                <div className="text-sm font-semibold text-[#0a0a0a]">Reflect on what matters</div>
                <p className="mt-1 text-xs leading-relaxed text-[#525252]">HIVE only considers a bounded recent activity window. It never sends a reflection without your opt-in, and you can stop at any time.</p>
              </div>
              <input
                type="checkbox"
                checked={proactiveSettings.enabled === true}
                disabled={proactiveLoading || proactiveSaving}
                onChange={(event) => setProactiveSettings((current) => ({ ...current, enabled: event.target.checked }))}
                className="mt-1 h-4 w-4 accent-[#117dff]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#525252]"><Clock3 size={12} /> Quiet from</span>
                <select value={proactiveSettings.quiet_start_hour} disabled={proactiveLoading || proactiveSaving}
                  onChange={(event) => setProactiveSettings((current) => ({ ...current, quiet_start_hour: Number(event.target.value) }))}
                  className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm text-[#0a0a0a]">
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#525252]"><Clock3 size={12} /> Until</span>
                <select value={proactiveSettings.quiet_end_hour} disabled={proactiveLoading || proactiveSaving}
                  onChange={(event) => setProactiveSettings((current) => ({ ...current, quiet_end_hour: Number(event.target.value) }))}
                  className="w-full rounded-lg border border-[#e3e0db] bg-white px-3 py-2.5 text-sm text-[#0a0a0a]">
                  {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs leading-relaxed text-[#737373]">At most one reflection can be delivered in any rolling 24-hour period. During the initial rollout, activity is evaluated in shadow mode first and no message is sent.</p>
            {proactiveError && <p className="text-xs text-[#dc2626]">{proactiveError}</p>}
            <button type="button" onClick={saveProactiveSettings} disabled={proactiveLoading || proactiveSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#117dff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0066e0] disabled:opacity-50">
              {proactiveSaving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : proactiveSaved ? <Check size={14} /> : <Bell size={14} />}
              {proactiveSaving ? 'Saving…' : proactiveSaved ? 'Saved' : 'Save reflection preference'}
            </button>
          </div>
        </SectionCard>

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
            {/* Clear All Memories — hard delete, count → 0, keeps usage/tokens */}
            <div className="flex items-center justify-between bg-white border border-red-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] font-medium">
                  {t('settings.clearAllMemories', 'Clear All Memories')}
                </p>
                <p className="text-[#a3a3a3] text-xs mt-0.5">
                  {clearedCount !== null
                    ? t('settings.clearAllMemDone', 'Cleared {{n}} memories — your memory count is now 0. Usage & tokens untouched.', { n: clearedCount })
                    : t('settings.clearAllMemDesc', 'Permanently deletes every memory (count drops to 0). LLM token usage & billing are NOT affected.')}
                </p>
                {clearMemError && (
                  <p className="text-[#dc2626] text-xs mt-1 font-mono">
                    {t('settings.clearAllMemFailed', 'Failed: {{msg}}', { msg: clearMemError })}
                  </p>
                )}
              </div>
              {showClearMemConfirm ? (
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => setShowClearMemConfirm(false)}
                    className="text-[#525252] hover:text-[#525252] text-xs font-mono px-3 py-2 transition-colors"
                  >
                    {t('settings.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleClearAllMemories}
                    disabled={clearingMem}
                    className="flex items-center gap-1.5 text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 text-xs font-mono rounded-lg px-3 py-2 transition-colors"
                  >
                    {clearingMem ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    {t('settings.confirmClearMem', 'Delete everything')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowClearMemConfirm(true); setClearedCount(null); setClearMemError(null); }}
                  className="flex items-center gap-1.5 text-[#dc2626] hover:text-[#dc2626] text-xs font-mono bg-red-500/10 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 transition-colors flex-shrink-0 ml-4"
                >
                  <Trash2 size={12} />
                  {t('settings.clearAll', 'Clear All')}
                </button>
              )}
            </div>

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
                  href="https://singulancelabs.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#117dff] hover:text-[#0066e0] text-xs font-mono transition-colors"
                >
                  {t('settings.documentation', 'Documentation')}
                  <ExternalLink size={11} />
                </a>
                <a
                  href="https://singulancelabs.com"
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
