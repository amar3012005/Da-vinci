import React, { useState, useEffect, useCallback } from 'react';
import { Brain, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(/** @type {'org'|'personal'|null} */ (null));
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
          'The Cognitive Layer compresses memories, synthesizes new insights, and bridges related memories on an hourly schedule. Disabled by default.')}
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
