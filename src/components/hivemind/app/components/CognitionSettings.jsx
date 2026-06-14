import React, { useState, useEffect, useCallback } from 'react';
import { Brain, AlertCircle, Loader2, RefreshCw, Moon, Clock, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';

/**
 * CognitionSettings — Cognitive Layer org-level toggles.
 *
 * Renders inside WorkspaceAdmin (overview tab or its own tab).
 * Admin/owner-only — server enforces 403; we surface it as an error banner.
 */
export default function CognitionSettings() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();

  const [orgEnabled, setOrgEnabled] = useState(false);
  const [personalEnabled, setPersonalEnabled] = useState(false);
  const [crossProjectEnabled, setCrossProjectEnabled] = useState(false);
  const [projects, setProjects] = useState(/** @type {Array<{id:string,name:string,self_evolve_enabled:boolean}>} */ ([]));
  const [schedule, setSchedule] = useState({ mode: 'nightmode', window_start_hour: null, window_end_hour: null, tz: 'UTC' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(/** @type {string|null} */ (null));
  const [dreaming, setDreaming] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [toast, setToast] = useState(/** @type {string|null} */ (null));

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCognitionSettings();
      setOrgEnabled(Boolean(data.org_enabled));
      setPersonalEnabled(Boolean(data.personal_enabled));
      setCrossProjectEnabled(Boolean(data.cross_project_enabled));
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      if (data.schedule && typeof data.schedule === 'object') {
        setSchedule({
          mode: data.schedule.mode || 'nightmode',
          window_start_hour: data.schedule.window_start_hour ?? null,
          window_end_hour: data.schedule.window_end_hour ?? null,
          tz: data.schedule.tz || 'UTC',
        });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError(t('cognition.err403', 'Admin or owner role required to view cognitive layer settings.'));
      } else {
        setError(err?.response?.data?.error || err?.message || t('cognition.errLoad', 'Failed to load settings.'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleOrgToggle = useCallback(async () => {
    const next = !orgEnabled;
    setOrgEnabled(next);
    setSaving('org');
    setError(null);
    try {
      await apiClient.updateCognitionSettings({ org_enabled: next });
      showToast(next
        ? t('cognition.toastOrgOn', 'Cognitive layer enabled for this organization.')
        : t('cognition.toastOrgOff', 'Cognitive layer disabled.'));
      // If turning org off, personal must also be off logically — keep UI consistent.
      if (!next) setPersonalEnabled(false);
    } catch (err) {
      setOrgEnabled(!next); // revert
      const status = err?.response?.status;
      if (status === 403) {
        setError(t('cognition.err403', 'Admin or owner role required to view cognitive layer settings.'));
      } else {
        setError(err?.response?.data?.error || err?.message || t('cognition.errSave', 'Failed to save setting.'));
      }
    } finally {
      setSaving(null);
    }
  }, [orgEnabled, showToast, t]);

  const handlePersonalToggle = useCallback(async () => {
    if (!orgEnabled) return; // guard: personal requires org
    const next = !personalEnabled;
    setPersonalEnabled(next);
    setSaving('personal');
    setError(null);
    try {
      await apiClient.updateCognitionSettings({ personal_enabled: next });
      showToast(next
        ? t('cognition.toastPersonalOn', 'Personal memories included in cognitive synthesis.')
        : t('cognition.toastPersonalOff', "Members' personal memories excluded."));
    } catch (err) {
      setPersonalEnabled(!next); // revert
      const status = err?.response?.status;
      if (status === 403) {
        setError(t('cognition.err403', 'Admin or owner role required to view cognitive layer settings.'));
      } else {
        setError(err?.response?.data?.error || err?.message || t('cognition.errSave', 'Failed to save setting.'));
      }
    } finally {
      setSaving(null);
    }
  }, [orgEnabled, personalEnabled, showToast, t]);

  const handleCrossProjectToggle = useCallback(async () => {
    if (!orgEnabled) return;
    const next = !crossProjectEnabled;
    setCrossProjectEnabled(next);
    setSaving('cross');
    setError(null);
    try {
      await apiClient.updateCognitionSettings({ cross_project_enabled: next });
      showToast(next
        ? t('cognition.toastCrossOn', 'Cross-project dreaming enabled — bridges may span projects.')
        : t('cognition.toastCrossOff', 'Cross-project dreaming disabled.'));
    } catch (err) {
      setCrossProjectEnabled(!next);
      setError(err?.response?.data?.error || err?.message || t('cognition.errSave', 'Failed to save setting.'));
    } finally {
      setSaving(null);
    }
  }, [orgEnabled, crossProjectEnabled, showToast, t]);

  const saveSchedule = useCallback(async (nextSchedule) => {
    setSchedule(nextSchedule);
    setSaving('schedule');
    setError(null);
    try {
      await apiClient.updateCognitionSettings({ schedule: nextSchedule });
      showToast(t('cognition.toastSchedule', 'Dream schedule updated.'));
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || t('cognition.errSave', 'Failed to save setting.'));
    } finally {
      setSaving(null);
    }
  }, [showToast, t]);

  const handleProjectToggle = useCallback(async (projectId, current) => {
    const next = !current;
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, self_evolve_enabled: next } : p)));
    setSaving(`proj:${projectId}`);
    setError(null);
    try {
      await apiClient.updateCognitionSettings({ project_id: projectId, self_evolve_enabled: next });
    } catch (err) {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, self_evolve_enabled: current } : p)));
      setError(err?.response?.data?.error || err?.message || t('cognition.errSave', 'Failed to save setting.'));
    } finally {
      setSaving(null);
    }
  }, [t]);

  const handleDreamNow = useCallback(async () => {
    setDreaming(true);
    setError(null);
    try {
      const res = await apiClient.triggerDreamNow(24);
      if (res?.skipped) {
        showToast(t('cognition.toastDreamSkip', `No new dreams (${res.reason || 'nothing to synthesize'}).`));
      } else {
        showToast(t('cognition.toastDreamDone', `Dream complete — ${res?.synth ?? 0} synthesized.`));
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || t('cognition.errDream', 'Dream trigger failed.'));
    } finally {
      setDreaming(false);
    }
  }, [showToast, t]);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="bg-white border border-[#e3e0db] rounded-[10px] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-[#117dff]" />
          <h3 className="text-[13px] font-semibold text-[#0a0a0a]">
            {t('cognition.title', 'Cognitive Layer')}
          </h3>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 text-[#a3a3a3] hover:text-[#0a0a0a] disabled:opacity-50 transition-colors"
          title={t('cognition.refresh', 'Refresh')}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Description */}
      <p className="text-[11px] text-[#737373] leading-relaxed">
        {t('cognition.description',
          'The Cognitive Layer compresses memories, synthesizes new insights, and bridges related memories on a schedule you control. Disabled by default.')}
      </p>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-[6px] text-[12px] text-[#dc2626]">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="flex items-center gap-2 py-3 text-[12px] text-[#a3a3a3]">
          <Loader2 size={13} className="animate-spin" />
          {t('cognition.loading', 'Loading…')}
        </div>
      )}

      {/* Toggles — only show once loaded and no blocking error */}
      {!loading && !error && (
        <div className="space-y-3">
          {/* Org-level toggle */}
          <ToggleRow
            label={t('cognition.orgEnabledLabel', 'Enable cognitive layer (organization memories)')}
            description={t('cognition.orgEnabledDesc',
              'Activates hourly compression, synthesis, and memory bridging across all organization memories.')}
            checked={orgEnabled}
            disabled={saving !== null || !isAdmin}
            busy={saving === 'org'}
            onToggle={handleOrgToggle}
          />

          {/* Personal memories toggle — subordinate, indented */}
          <div className="ml-6 border-l-2 border-[#e3e0db] pl-4">
            <ToggleRow
              label={t('cognition.personalEnabledLabel', "Also include members' personal memories")}
              description={t('cognition.personalEnabledDesc',
                "Allows the cognitive layer to synthesize insights from members' private memories. Members retain ownership and access controls.")}
              checked={personalEnabled}
              disabled={saving !== null || !orgEnabled || !isAdmin}
              busy={saving === 'personal'}
              onToggle={handlePersonalToggle}
            />
            {!orgEnabled && (
              <p className="text-[10px] text-[#a3a3a3] mt-1">
                {t('cognition.personalRequiresOrg', 'Enable the organization cognitive layer first.')}
              </p>
            )}
          </div>

          {/* Cross-project dreaming toggle */}
          <div className="ml-6 border-l-2 border-[#e3e0db] pl-4">
            <ToggleRow
              label={t('cognition.crossProjectLabel', 'Allow cross-project dreaming')}
              description={t('cognition.crossProjectDesc',
                'Lets the cognitive layer form bridges and insights that span different projects. Off keeps each project’s dreams self-contained.')}
              checked={crossProjectEnabled}
              disabled={saving !== null || !orgEnabled || !isAdmin}
              busy={saving === 'cross'}
              onToggle={handleCrossProjectToggle}
            />
          </div>

          {/* Per-project scope toggles */}
          {orgEnabled && projects.length > 0 && (
            <div className="ml-6 border-l-2 border-[#e3e0db] pl-4 space-y-2">
              <div className="text-[11px] font-medium text-[#0a0a0a]">
                {t('cognition.projectsLabel', 'Per-project dreaming')}
              </div>
              {projects.map((p) => (
                <ToggleRow
                  key={p.id}
                  label={p.name}
                  description={t('cognition.projectDesc', 'Synthesize insights within this project.')}
                  checked={Boolean(p.self_evolve_enabled)}
                  disabled={saving !== null || !isAdmin}
                  busy={saving === `proj:${p.id}`}
                  onToggle={() => handleProjectToggle(p.id, Boolean(p.self_evolve_enabled))}
                />
              ))}
            </div>
          )}

          {/* Dream schedule */}
          {orgEnabled && (
            <div className="border-t border-[#e3e0db] pt-3 space-y-2">
              <div className="text-[12px] font-medium text-[#0a0a0a]">
                {t('cognition.scheduleTitle', 'Dream schedule')}
              </div>
              <p className="text-[11px] text-[#737373] leading-relaxed">
                {t('cognition.scheduleDesc',
                  'When the daily deep dream runs. Night-mode runs at midnight; Interval runs once inside a window; Continuous keeps only event-driven dreams.')}
              </p>
              <div className="flex gap-2">
                {[
                  { key: 'nightmode', label: t('cognition.modeNight', 'Night-mode'), icon: Moon },
                  { key: 'interval', label: t('cognition.modeInterval', 'Interval'), icon: Clock },
                  { key: 'continuous', label: t('cognition.modeContinuous', 'Continuous'), icon: Zap },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={saving !== null || !isAdmin}
                    onClick={() => saveSchedule({ ...schedule, mode: key })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-50 ${
                      schedule.mode === key
                        ? 'bg-[#117dff] text-white'
                        : 'bg-[#f5f3f0] text-[#737373] hover:bg-[#e3e0db]'
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
              {schedule.mode === 'interval' && (
                <div className="flex items-center gap-2 text-[11px] text-[#737373]">
                  <span>{t('cognition.from', 'From')}</span>
                  <HourSelect
                    value={schedule.window_start_hour ?? 0}
                    disabled={saving !== null || !isAdmin}
                    onChange={(h) => saveSchedule({ ...schedule, window_start_hour: h })}
                  />
                  <span>{t('cognition.to', 'to')}</span>
                  <HourSelect
                    value={schedule.window_end_hour ?? 6}
                    disabled={saving !== null || !isAdmin}
                    onChange={(h) => saveSchedule({ ...schedule, window_end_hour: h })}
                  />
                  <span className="text-[10px] text-[#a3a3a3]">({schedule.tz})</span>
                </div>
              )}
            </div>
          )}

          {/* Dev one-shot: run a dream now */}
          {orgEnabled && isAdmin && (
            <div className="border-t border-[#e3e0db] pt-3 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-[#0a0a0a]">
                  {t('cognition.dreamNowLabel', 'Run a dream now')}
                </div>
                <div className="text-[11px] text-[#737373] mt-0.5 leading-relaxed">
                  {t('cognition.dreamNowDesc', 'Trigger one synthesis pass immediately over the last 24h (skips compaction).')}
                </div>
              </div>
              <button
                type="button"
                disabled={dreaming || saving !== null}
                onClick={handleDreamNow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-medium bg-[#0a0a0a] text-white hover:bg-[#262626] disabled:opacity-50 transition-colors shrink-0"
              >
                {dreaming ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                {dreaming ? t('cognition.dreaming', 'Dreaming…') : t('cognition.dreamNow', 'Dream now')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Role gate hint — visible when org toggle is visible but user lacks admin */}
      {!loading && !error && !isAdmin && (
        <p className="text-[10px] text-[#a3a3a3]">
          {t('cognition.readOnlyHint', 'Viewing only — admin or owner role required to change these settings.')}
        </p>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#0a0a0a] text-white text-[12px] px-4 py-2.5 rounded-[8px] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── ToggleRow ──────────────────────────────────────────────────────────── */

/**
 * @param {{
 *   label: string,
 *   description: string,
 *   checked: boolean,
 *   disabled: boolean,
 *   busy: boolean,
 *   onToggle: () => void,
 * }} props
 */
function ToggleRow({ label, description, checked, disabled, busy, onToggle }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-[#0a0a0a]">{label}</div>
        <div className="text-[11px] text-[#737373] mt-0.5 leading-relaxed">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#117dff] disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-[#117dff]' : 'bg-[#d4d0ca]'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin text-white" />
          </span>
        )}
      </button>
    </div>
  );
}

/* ─── HourSelect ─────────────────────────────────────────────────────────── */

/**
 * @param {{ value: number, disabled: boolean, onChange: (h: number) => void }} props
 */
function HourSelect({ value, disabled, onChange }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="px-2 py-1 rounded-[6px] border border-[#e3e0db] bg-white text-[11px] text-[#0a0a0a] disabled:opacity-50"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
      ))}
    </select>
  );
}
