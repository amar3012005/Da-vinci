import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Copy, Trash2, AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import { useTranslation } from 'react-i18next';

const SSO_TYPES = [
  { value: 'zitadel_oidc', label: 'Zitadel OIDC (default)' },
  { value: 'saml', label: 'SAML 2.0 (via Zitadel SP)' },
];

const DEFAULT_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'developer', label: 'Developer' },
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-[12px] font-medium text-[#0a0a0a]">{label}</label>
      {hint && <p className="text-[11px] text-[#a3a3a3]">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', readOnly, className = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full px-3 py-2 rounded-[6px] border border-[#e3e0db] bg-white text-[13px] text-[#0a0a0a] placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20 ${readOnly ? 'bg-[#f8f7f4] text-[#525252]' : ''} ${className}`}
    />
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value || ''}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-[6px] border border-[#e3e0db] bg-white text-[13px] text-[#0a0a0a] focus:outline-none focus:border-[#117dff] focus:ring-1 focus:ring-[#117dff]/20"
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
      <span className="text-[13px] text-[#0a0a0a]">{label}</span>
    </label>
  );
}

export default function AdminSso() {
  const { t } = useTranslation('dashboard');
  const { org } = useAuth();
  const orgId = org?.id;

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // One-time token display
  const [generatedToken, setGeneratedToken] = useState(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Teams for default team picker
  const [teams, setTeams] = useState([]);

  // Form state
  const [form, setForm] = useState({
    sso_type: 'zitadel_oidc',
    zitadel_project_id: '',
    saml_idp_metadata_url: '',
    subdomain: '',
    enabled: false,
    jit_provisioning: true,
    default_role: 'member',
    default_team_id: '',
  });

  const loadConfig = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [ssoRes, teamsRes] = await Promise.all([
        apiClient.getSsoConfig(orgId),
        apiClient.listTeams().catch(() => ({ teams: [] })),
      ]);
      setTeams(teamsRes.teams || []);
      if (ssoRes.sso_config) {
        const cfg = ssoRes.sso_config;
        setConfig(cfg);
        setForm({
          sso_type: cfg.sso_type || 'zitadel_oidc',
          zitadel_project_id: cfg.zitadel_project_id || '',
          saml_idp_metadata_url: cfg.saml_idp_metadata_url || '',
          subdomain: cfg.subdomain || '',
          enabled: cfg.enabled || false,
          jit_provisioning: cfg.jit_provisioning !== false,
          default_role: cfg.default_role || 'member',
          default_team_id: cfg.default_team_id || '',
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSave(e) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.updateSsoConfig(orgId, {
        sso_type: form.sso_type,
        zitadel_project_id: form.zitadel_project_id || null,
        saml_idp_metadata_url: form.saml_idp_metadata_url || null,
        subdomain: form.subdomain || null,
        enabled: form.enabled,
        jit_provisioning: form.jit_provisioning,
        default_role: form.default_role,
        default_team_id: form.default_team_id || null,
      });
      setSuccess(t('adminsso.saveSuccess', 'SSO configuration saved.'));
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateToken() {
    if (!orgId) return;
    setError(null);
    try {
      const res = await apiClient.generateScimToken(orgId);
      setGeneratedToken(res.scim_token);
      setTokenVisible(true);
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  async function handleRevokeToken() {
    if (!orgId) return;
    if (!window.confirm(t('adminsso.revokeConfirm', 'Revoke SCIM token? Any IdP using it will stop provisioning immediately.'))) return;
    setError(null);
    try {
      await apiClient.revokeScimToken(orgId);
      setGeneratedToken(null);
      setSuccess(t('adminsso.revokeSuccess', 'SCIM token revoked.'));
      await loadConfig();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  function copyToken() {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  function setField(key) {
    return (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  const acsUrl = form.subdomain
    ? `https://${form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')}.singulancelabs.com/saml/acs`
    : config?.acs_url || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-[#117dff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#0a0a0a] font-['Space_Grotesk'] flex items-center gap-2">
            <Shield size={20} className="text-[#117dff]" />
            {t('adminsso.title', 'SSO Config')}
          </h1>
          <p className="text-[12px] text-[#a3a3a3] mt-1">
            {t('adminsso.subtitle', 'Configure SAML / OIDC identity provider and SCIM 2.0 user provisioning.')}
          </p>
        </div>
        <button
          onClick={loadConfig}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#f3f1ec] border border-[#e3e0db] text-[12px] hover:bg-[#eae7e1]"
        >
          <RefreshCw size={13} />
          {t('adminsso.refresh', 'Refresh')}
        </button>
      </header>

      {/* Alert banners */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-red-50 border border-red-200 text-[12px] text-red-700">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700">
          <CheckCircle size={14} />
          {success}
        </div>
      )}

      {/* One-time token warning */}
      {generatedToken && (
        <div className="rounded-[10px] border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-[13px]">
            <AlertTriangle size={16} className="text-amber-500" />
            {t('adminsso.tokenWarning', 'Save this token now — it will not be shown again.')}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-[12px] bg-white border border-amber-300 rounded-[6px] px-3 py-2 text-[#0a0a0a] truncate">
              {tokenVisible ? generatedToken : '•'.repeat(Math.min(generatedToken.length, 48))}
            </div>
            <button
              onClick={() => setTokenVisible(v => !v)}
              className="p-2 rounded-[6px] border border-[#e3e0db] bg-white hover:bg-[#f3f1ec] text-[#525252]"
              title={tokenVisible ? t('adminsso.hideToken', 'Hide token') : t('adminsso.showToken', 'Show token')}
            >
              {tokenVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#e3e0db] bg-white hover:bg-[#f3f1ec] text-[12px] text-[#525252]"
            >
              <Copy size={13} />
              {tokenCopied ? t('adminsso.copied', 'Copied!') : t('adminsso.copy', 'Copy')}
            </button>
          </div>
          <button
            onClick={() => setGeneratedToken(null)}
            className="text-[11px] text-amber-700 underline"
          >
            {t('adminsso.tokenDismiss', 'I have saved this token — dismiss')}
          </button>
        </div>
      )}

      {/* Config form */}
      <form onSubmit={handleSave} className="bg-white rounded-[12px] border border-[#e3e0db] divide-y divide-[#f3f1ec]">

        {/* Basic SSO settings */}
        <section className="p-5 space-y-4">
          <h2 className="text-[14px] font-semibold text-[#0a0a0a]">{t('adminsso.idpSettingsHeading', 'Identity Provider Settings')}</h2>

          <Field label={t('adminsso.ssoTypeLabel', 'SSO Type')} hint={t('adminsso.ssoTypeHint', 'How your users authenticate.')}>
            <Select value={form.sso_type} onChange={setField('sso_type')}>
              {SSO_TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
            </Select>
          </Field>

          <Field
            label={t('adminsso.subdomainLabel', 'Subdomain')}
            hint={t('adminsso.subdomainHint', 'Customers access HIVEMIND at <subdomain>.singulancelabs.com')}
          >
            <div className="flex items-center gap-2">
              <Input
                value={form.subdomain}
                onChange={setField('subdomain')}
                placeholder="acme"
                className="flex-1"
              />
              <span className="text-[12px] text-[#a3a3a3] whitespace-nowrap">.singulancelabs.com</span>
            </div>
          </Field>

          <Field
            label={t('adminsso.zitadelProjectIdLabel', 'Zitadel Project ID')}
            hint={t('adminsso.zitadelProjectIdHint', "The Zitadel project configured for this org's OIDC / SAML client.")}
          >
            <Input
              value={form.zitadel_project_id}
              onChange={setField('zitadel_project_id')}
              placeholder="275965..."
            />
          </Field>

          {form.sso_type === 'saml' && (
            <Field
              label={t('adminsso.samlMetadataUrlLabel', 'SAML IdP Metadata URL')}
              hint={t('adminsso.samlMetadataUrlHint', 'Paste the XML metadata URL from Okta / Azure AD / Google Workspace.')}
            >
              <Input
                value={form.saml_idp_metadata_url}
                onChange={setField('saml_idp_metadata_url')}
                placeholder="https://login.microsoftonline.com/.../federationmetadata/2007-06/federationmetadata.xml"
              />
            </Field>
          )}

          {acsUrl && (
            <Field
              label={t('adminsso.acsUrlLabel', 'ACS URL (copy into your IdP)')}
              hint={t('adminsso.acsUrlHint', 'Paste this into Okta / Azure AD as the SAML Assertion Consumer Service URL.')}
            >
              <div className="flex items-center gap-2">
                <Input value={acsUrl} readOnly />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(acsUrl)}
                  className="p-2 rounded-[6px] border border-[#e3e0db] bg-[#f3f1ec] hover:bg-[#eae7e1] text-[#525252]"
                >
                  <Copy size={13} />
                </button>
              </div>
            </Field>
          )}

          <div className="flex items-center gap-8 pt-1">
            <Toggle
              checked={form.enabled}
              onChange={v => setForm(f => ({ ...f, enabled: v }))}
              label={t('adminsso.ssoEnabledLabel', 'SSO Enabled')}
            />
            <Toggle
              checked={form.jit_provisioning}
              onChange={v => setForm(f => ({ ...f, jit_provisioning: v }))}
              label={t('adminsso.jitProvisioningLabel', 'JIT Provisioning')}
            />
          </div>
        </section>

        {/* Provisioning defaults */}
        <section className="p-5 space-y-4">
          <h2 className="text-[14px] font-semibold text-[#0a0a0a]">{t('adminsso.provisioningDefaultsHeading', 'Provisioning Defaults')}</h2>
          <p className="text-[11px] text-[#a3a3a3]">
            {t('adminsso.provisioningDefaultsHint', 'Applied when SCIM creates a user or JIT provisioning fires on first login.')}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('adminsso.defaultRoleLabel', 'Default Role')}>
              <Select value={form.default_role} onChange={setField('default_role')}>
                {DEFAULT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>

            <Field label={t('adminsso.defaultTeamLabel', 'Default Team')} hint={t('adminsso.defaultTeamHint', 'Optional. Auto-add new SCIM users to this team.')}>
              <Select value={form.default_team_id} onChange={setField('default_team_id')}>
                <option value="">{t('adminsso.noTeam', '— none —')}</option>
                {teams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        {/* Save */}
        <div className="p-5 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#117dff] text-white text-[13px] font-semibold hover:bg-[#0066e0] disabled:opacity-50 transition-colors"
          >
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? t('adminsso.saving', 'Saving…') : t('adminsso.saveButton', 'Save Configuration')}
          </button>
        </div>
      </form>

      {/* SCIM token section */}
      <div className="bg-white rounded-[12px] border border-[#e3e0db] p-5 space-y-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#0a0a0a]">{t('adminsso.scimTokenHeading', 'SCIM 2.0 Token')}</h2>
          <p className="text-[11px] text-[#a3a3a3] mt-1">
            {t('adminsso.scimTokenHint', 'Used by your IdP (Okta / Azure AD) to call')}{' '}
            <code className="font-mono bg-[#f3f1ec] px-1 rounded text-[10px]">
              {apiClient.controlPlane.defaults.baseURL}/scim/v2/
            </code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {config?.has_scim_token ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700">
                <CheckCircle size={12} />
                {t('adminsso.tokenActive', 'Token active (ID: {{id}})', { id: config.scim_token_id || 'unknown' })}
              </div>
              <button
                onClick={handleGenerateToken}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#e3e0db] bg-[#f3f1ec] text-[12px] hover:bg-[#eae7e1] text-[#525252]"
              >
                <RefreshCw size={12} />
                {t('adminsso.rotateToken', 'Rotate token')}
              </button>
              <button
                onClick={handleRevokeToken}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-red-200 bg-red-50 text-[12px] text-red-700 hover:bg-red-100"
              >
                <Trash2 size={12} />
                {t('adminsso.revokeToken', 'Revoke')}
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateToken}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] bg-[#117dff] text-white text-[13px] font-semibold hover:bg-[#0066e0] transition-colors"
            >
              {t('adminsso.generateToken', 'Generate SCIM Token')}
            </button>
          )}
        </div>

        <div className="rounded-[8px] bg-[#f8f7f4] border border-[#e3e0db] p-3 space-y-1 text-[11px] text-[#525252]">
          <p className="font-medium text-[#0a0a0a]">{t('adminsso.scimEndpointHeading', 'SCIM endpoint configuration')}</p>
          <p>{t('adminsso.scimBaseUrl', 'Base URL:')}{' '}<code className="font-mono">{apiClient.controlPlane.defaults.baseURL}/scim/v2</code></p>
          <p>{t('adminsso.scimAuth', 'Auth: Bearer token (generated above)')}</p>
          <p>{t('adminsso.scimSupported', 'Supported: Users CRUD, Groups (Teams) CRUD, ServiceProviderConfig')}</p>
        </div>
      </div>
    </div>
  );
}
