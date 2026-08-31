import axios from 'axios';
import { API_DEFAULTS } from './theme';
import { isPlanLimitError, extractPlanLimit, emitPlanLimit } from './planLimit';
import { isServiceError, extractServiceError, emitServiceError } from './serviceError';
import { productActionDecision } from './product-access';
import { hasIngestModeMismatch, hasMemoryGenerationFailure, ingestFailureDetails, normalizeIngestMode, responseIngestMode } from './knowledge-ingest-contract';

const ACCOUNT_DELETE_ENDPOINT = '/v1/account';

/**
 * HIVEMIND API Client
 *
 * All calls go through the control plane (api.hivemind.davinciai.eu:8040):
 *   GET  /auth/login?return_to=<url>    → ZITADEL OIDC redirect
 *   GET  /auth/callback                 → sets hm_cp_session cookie, redirects to return_to
 *   POST /auth/logout                   → clears session
 *   GET  /v1/bootstrap                  → { user, organization, onboarding, connectivity, client_support }
 *   POST /v1/orgs                       → { success, organization }
 *   GET  /v1/api-keys                   → { keys: [...] }
 *   POST /v1/api-keys                   → { success, api_key, key, descriptors }
 *   POST /v1/api-keys/:id/revoke        → { success, key_id, revoked_at }
 *   GET  /v1/clients/descriptors        → { core_api_base_url, descriptors }
 *   GET  /v1/clients/descriptors/:client → single descriptor
 *
 * Core API proxy (routed via control plane):
 *   /v1/proxy/* → strips prefix, forwards to core /api/*
 *   Session cookie (withCredentials) authenticates all proxied calls.
 */

class HiveMindApiClient {
  constructor() {
    this.controlPlane = axios.create({
      baseURL: API_DEFAULTS.controlPlaneBase,
      withCredentials: true,
      timeout: 60000, // Increased from 10s to 60s for long-running operations like research
      headers: { 'Content-Type': 'application/json' },
    });

    this.core = axios.create({
      baseURL: API_DEFAULTS.coreApiBase,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this._apiKey = null;
    this._coreBaseUrl = null;
    this._productAccessPlan = 'free';
    this._apiKeyStorageKey = 'hivemind_core_api_key';

    // Global plan-limit detector: on any 402 (or 403/429) carrying the
    // `plan_limit_exceeded` or `quota_reached` machine code, emit a window event so the single
    // <PlanLimitModal> mounted in AppShell can surface the upgrade prompt —
    // then re-reject so individual callers behave exactly as before.
    this._attachPlanLimitInterceptor(this.controlPlane);
    this._attachPlanLimitInterceptor(this.core);
    this._attachProductAccessInterceptor(this.controlPlane);
    this._attachProductAccessInterceptor(this.core);

    this.loadStoredApiKey();
  }

  setProductAccessPlan(planId) {
    this._productAccessPlan = String(planId || 'free').toLowerCase();
  }

  _attachProductAccessInterceptor(instance) {
    instance.interceptors.request.use((config) => {
      if (typeof window === 'undefined') return config;
      const method = String(config?.method || 'get').toLowerCase();
      const pathname = window.location.pathname || '';
      if (!pathname.startsWith('/hivemind/app/')) return config;
      const requestPath = String(config?.url || '');
      // Account/session/commercial controls belong to the app shell, not to
      // the product currently visible behind it. They must remain usable from
      // every screen (especially logout and upgrade checkout).
      if (/^\/(?:auth\/|v1\/(?:account|billing)(?:\/|$))/.test(requestPath)) return config;
      const decision = productActionDecision({ method, pathname, planId: this._productAccessPlan });
      if (decision.allowed) return config;
      window.dispatchEvent(new CustomEvent('hm:product-access-required', { detail: decision }));
      throw new axios.CanceledError('subscription_access_required');
    });
  }

  _attachPlanLimitInterceptor(instance) {
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isPlanLimitError(error)) {
          emitPlanLimit(extractPlanLimit(error));
        } else if (isServiceError(error) && error?.config?.suppressServiceError !== true) {
          // 5xx / network outage → global toast so it never fails silently.
          emitServiceError(extractServiceError(error));
        }
        return Promise.reject(error);
      },
    );
  }

  loadStoredApiKey() {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(this._apiKeyStorageKey);
      if (stored) {
        this.setApiKey(stored, { persist: false });
        return stored;
      }
    } catch {
      // Ignore storage access failures
    }
    return null;
  }

  setApiKey(key, { persist = true } = {}) {
    if (!key) {
      this.clearApiKey();
      return;
    }

    this._apiKey = key;
    this.core.defaults.headers['X-API-Key'] = key;
    this.core.defaults.headers['Authorization'] = `Bearer ${key}`;

    if (persist && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(this._apiKeyStorageKey, key);
      } catch {
        // Ignore storage access failures
      }
    }
  }

  clearApiKey() {
    this._apiKey = null;
    delete this.core.defaults.headers['X-API-Key'];
    delete this.core.defaults.headers['Authorization'];

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(this._apiKeyStorageKey);
      } catch {
        // Ignore storage access failures
      }
    }
  }

  hasApiKey() {
    return Boolean(this._apiKey);
  }

  setCoreBaseUrl(url) {
    // Guard against the control-plane returning a docker-internal hostname
    // (http://hm-core:3000) — browsers can't resolve that and CSP would
    // block it anyway. Force-fallback to the publicly resolvable default.
    let safeUrl = url;
    if (safeUrl && /^https?:\/\/(hm-core|localhost|127\.0\.0\.1|::1)(?::\d+)?/i.test(safeUrl)) {
      console.warn('[api-client] ignoring internal core base URL from bootstrap:', safeUrl);
      safeUrl = process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050';
    }
    if (safeUrl && safeUrl !== this._coreBaseUrl) {
      this._coreBaseUrl = safeUrl;
      this.core.defaults.baseURL = safeUrl;
    }
  }

  // ─── Control Plane: Auth ─────────────────────────────────────

  /**
   * Build the login URL.
   * - return_to: frontend route to return to after auth
   * - idpHint: pre-select IdP in Zitadel (e.g. 'google')
   *
   * The control plane owns redirect_uri (for Zitadel).
   * The frontend owns return_to (for the browser flow after login).
   */
  getLoginUrl(returnTo, idpHint, workspaceInviteToken) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (idpHint) params.set('idp_hint', idpHint); // microsoft | apple | google — federated via ZITADEL
    if (workspaceInviteToken) params.set('workspace_invite', workspaceInviteToken);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/login${qs ? `?${qs}` : ''}`;
  }

  getGoogleLoginUrl(returnTo, signupTicket, workspaceInviteToken) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (signupTicket) params.set('signup_ticket', signupTicket);
    if (workspaceInviteToken) params.set('workspace_invite', workspaceInviteToken);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/google${qs ? `?${qs}` : ''}`;
  }

  async requestLocalPreviewSignIn(email, returnTo) {
    const { data } = await this.controlPlane.post('/auth/local-preview/request', {
      email,
      return_to: returnTo,
    });
    return data;
  }

  async getEmailIdentityConfig() {
    const { data } = await this.controlPlane.get('/auth/email/config');
    return data;
  }

  async startEmailSignIn({ email, returnTo, intent = 'auto', turnstileToken = '' }) {
    const { data } = await this.controlPlane.post('/auth/email/start', {
      email, return_to: returnTo, intent, turnstile_token: turnstileToken,
    });
    return data;
  }

  async verifyEmailSignIn({ challengeId, code, linkToken }) {
    const { data } = await this.controlPlane.post('/auth/email/verify', {
      challenge_id: challengeId, ...(code ? { code } : {}), ...(linkToken ? { link_token: linkToken } : {}),
    });
    return data;
  }

  async resendEmailSignIn({ challengeId, turnstileToken = '' }) {
    const { data } = await this.controlPlane.post('/auth/email/resend', {
      challenge_id: challengeId, turnstile_token: turnstileToken,
    });
    return data;
  }

  getRegisterUrl(returnTo, idpHint, signupTicket) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (idpHint) params.set('idp_hint', idpHint);
    if (signupTicket) params.set('signup_ticket', signupTicket);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/register${qs ? `?${qs}` : ''}`;
  }

  async requestSignupAdmission({ accountType, invitationCode, enterpriseInvitationToken = null, personalInvitationToken = null }) {
    const { data } = await this.controlPlane.post('/auth/signup-admission', {
      account_type: accountType,
      invitation_code: invitationCode,
      ...(enterpriseInvitationToken ? { enterprise_invitation_token: enterpriseInvitationToken } : {}),
      ...(personalInvitationToken ? { personal_invitation_token: personalInvitationToken } : {}),
    });
    return data;
  }

  async previewEnterpriseInvitation(token) {
    const { data } = await this.controlPlane.get('/auth/enterprise-invitations/preview', { params: { token } });
    return data;
  }

  async previewPersonalInvitation(token) {
    const { data } = await this.controlPlane.get('/auth/personal-invitations/preview', { params: { token } });
    return data;
  }

  /** Preview a Runtime one-click approval link — read-only, no session required. */
  async previewRuntimeApproval(token) {
    const { data } = await this.controlPlane.get(`/v1/hq/approvals/${encodeURIComponent(token)}`);
    return data;
  }

  /** Approve a Runtime one-click approval link — the only mutating call, no session required. */
  async approveRuntimeApproval(token) {
    const { data } = await this.controlPlane.post(`/v1/hq/approvals/${encodeURIComponent(token)}/approve`);
    return data;
  }

  /**
   * Bootstrap response shape from control plane:
   * {
   *   user: { id, email, display_name, zitadel_user_id },
   *   organization: { id, name, slug } | null,
   *   onboarding: { needs_org_setup, has_api_key },
   *   connectivity: { core_api_base_url, core_health },
   *   client_support: ['claude', 'antigravity', 'vscode', 'remote-mcp', 'notebooklm']
   * }
   */
  async bootstrap() {
    const { data } = await this.controlPlane.get('/v1/bootstrap');
    // Set core API base from bootstrap connectivity
    if (data.connectivity?.core_api_base_url) {
      this.setCoreBaseUrl(data.connectivity.core_api_base_url);
    }
    // Session bootstrap must override any stale locally persisted key so org/plan changes
    // take effect immediately for the signed-in user.
    if (data.session_api_key) {
      this.setApiKey(data.session_api_key);
    }
    return data;
  }

  /**
   * Fire the post-login welcome email. Recipient is resolved server-side from
   * the session (never client-supplied). Idempotent per login session and
   * fire-and-forget — safe to call on every Overview mount.
   */
  async sendWelcomeEmail() {
    const { data } = await this.controlPlane.post('/v1/notifications/welcome', {});
    return data;
  }

  /** HyperAgents onboarding — Polsia-style company genesis. */
  async startHyperOnboarding(payload) {
    const { data } = await this.controlPlane.post('/v1/hyper/onboarding/start', payload);
    return data;
  }

  async hyperOnboardingStatus() {
    const { data } = await this.controlPlane.get('/v1/hyper/onboarding/status');
    return data;
  }

  /** Dated, source-backed growth snapshot. Runs independently from Rooms. */
  async runGrowthBaseline(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/hyper/growth-baseline', payload);
    return data;
  }

  async getGrowthBaselines(limit = 12) {
    const { data } = await this.controlPlane.get('/v1/hyper/growth-baselines', { params: { limit } });
    return data;
  }

  async getGrowthOperatingState() {
    const { data } = await this.controlPlane.get('/v1/hyper/growth-operating-state');
    return data;
  }

  async runGrowthPlan(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/hyper/growth-plan', payload);
    return data;
  }

  async getGrowthPlans(limit = 12) {
    const { data } = await this.controlPlane.get('/v1/hyper/growth-plans', { params: { limit } });
    return data;
  }

  async createGrowthGoal(payload) {
    const { data } = await this.controlPlane.post('/v1/hyper/growth-goals', payload);
    return data;
  }

  async getHqRuntime() {
    const { data } = await this.controlPlane.get('/v1/hq/runtime');
    return data;
  }

  async updateHqAuthorityPolicy(payload) {
    const { data } = await this.controlPlane.patch('/v1/hq/authority-policy', payload);
    return data;
  }

  async activateHqRuntime(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/hq/activate', payload);
    return data;
  }

  async launchHqRuntime(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/hq/launch', payload);
    return data;
  }

  async pauseHqRuntime(reason) {
    const { data } = await this.controlPlane.post('/v1/hq/pause', { reason });
    return data;
  }

  async resumeHqRuntime() {
    const { data } = await this.controlPlane.post('/v1/hq/resume', {});
    return data;
  }

  async wakeHqRuntime() {
    const { data } = await this.controlPlane.post('/v1/hq/wake', {});
    return data;
  }

  async restartHqRuntime() {
    const { data } = await this.controlPlane.post('/v1/hq/restart', {});
    return data;
  }

  async getHqEvents(after = '0', limit = 100) {
    const { data } = await this.controlPlane.get('/v1/hq/events', { params: { after, limit } });
    return data;
  }

  async getHqWork() {
    // HQ work is a live lifecycle projection. Browsers and intermediary caches
    // must never reuse an earlier authority or activation-sprint snapshot.
    const { data } = await this.controlPlane.get('/v1/hq/work', {
      params: { _ts: Date.now() },
    });
    return data;
  }

  async getCurrentHqActivationSprint() {
    const { data } = await this.controlPlane.get('/v1/hq/activation-sprints/current');
    return data;
  }

  async getCurrentHqFirstLife() {
    const { data } = await this.controlPlane.get('/v1/hq/first-life/current');
    return data;
  }

  async reviewHqActivationSprint(sprintId, preference = 'manual') {
    const { data } = await this.controlPlane.post(`/v1/hq/activation-sprints/${encodeURIComponent(sprintId)}/review`, { preference });
    return data;
  }

  async setHqFirstLifePolicy(firstLifeId, preference = 'manual') {
    const { data } = await this.controlPlane.post(`/v1/hq/first-life/${encodeURIComponent(firstLifeId)}/policy`, { preference });
    return data;
  }

  async startHqFirstLife(firstLifeId, decision = 'start') {
    const { data } = await this.controlPlane.post(`/v1/hq/first-life/${encodeURIComponent(firstLifeId)}/start`, { decision });
    return data;
  }

  async decideHqFirstLifeAdminCheckin(decision, sessionId = null) {
    const { data } = await this.controlPlane.post('/v1/hq/first-life/admin-checkin', {
      decision,
      ...(sessionId ? { session_id: sessionId } : {}),
    });
    return data;
  }

  async decideHqPlaybookAuthority(runId, { gate, preference, approve }) {
    const { data } = await this.controlPlane.post(`/v1/hq/playbooks/runs/${encodeURIComponent(runId)}/authority`, {
      gate, preference, approve,
    });
    return data;
  }

  async startHqOutreachCalls(runId) {
    const { data } = await this.controlPlane.post(`/v1/hq/outreach/runs/${encodeURIComponent(runId)}/calls`, {});
    return data;
  }

  async getHqPlaybookSnapshot(runId) {
    const { data } = await this.controlPlane.get(`/v1/hq/playbooks/runs/${encodeURIComponent(runId)}/snapshot`);
    return data;
  }

  async provideHqPlaybookInput(runId, inputKey, value) {
    const { data } = await this.controlPlane.post(`/v1/hq/playbooks/runs/${encodeURIComponent(runId)}/inputs/${encodeURIComponent(inputKey)}`, { value });
    return data;
  }

  async addHqInstruction(instruction) {
    const { data } = await this.controlPlane.post('/v1/hq/instructions', { instruction });
    return data;
  }

  async recheckHqCapabilities() {
    const { data } = await this.controlPlane.post('/v1/hq/capabilities/recheck', {});
    return data;
  }

  async deferHqCapabilityRequest(requestId) {
    const { data } = await this.controlPlane.post(`/v1/hq/capability-requests/${encodeURIComponent(requestId)}/defer`, {});
    return data;
  }

  async getHqResources() {
    const { data } = await this.controlPlane.get('/v1/hq/resources');
    return data;
  }

  hqEventStreamUrl(after = '0') {
    const base = API_DEFAULTS.controlPlaneBase.replace(/\/$/, '');
    return `${base}/v1/hq/events/stream?after=${encodeURIComponent(after)}`;
  }

  /** Company operating dashboard (HyperAgents hero) — persisted onboarding state. */
  async hyperCompany() {
    const { data } = await this.controlPlane.get('/v1/hyper/company');
    return data;
  }

  /** Claim the one-time Day-0 report after Your Company has rendered. */
  async claimHyperCompanyDayZeroReport() {
    const { data } = await this.controlPlane.post('/v1/hyper/company/day0-report', {});
    return data;
  }

  /** Persistent workspace notification stream used by the global navbar. */
  async listWorkspaceNotifications({ limit = 20, unread = false } = {}) {
    const { data } = await this.controlPlane.get('/v1/workspace/notifications', {
      params: { limit, ...(unread ? { unread: true } : {}) },
    });
    return data;
  }

  async markWorkspaceNotificationRead(notificationId) {
    const { data } = await this.controlPlane.post(`/v1/workspace/notifications/${encodeURIComponent(notificationId)}/read`, {});
    return data;
  }

  /** Confirm the organization's headquarters before entering its workspace. */
  async updateHyperCompanyLocation(location) {
    const { data } = await this.controlPlane.patch('/v1/hyper/company/location', { location });
    return data;
  }

  async updateHyperCompanyContacts(payload) {
    const { data } = await this.controlPlane.patch('/v1/hyper/company/contacts', payload);
    return data;
  }

  /** Closed-loop outcome counters (emails sent / replies / calls / bookings, 7d+30d). */
  async hyperOutcomes() {
    const { data } = await this.controlPlane.get('/v1/hyper/outcomes');
    return data;
  }

  /** Open (or create) the workroom for a dashboard task. */
  async openHyperTask(taskId) {
    const { data } = await this.controlPlane.post('/v1/hyper/tasks/open', { task_id: taskId });
    return data;
  }

  /** Approve a proposed call contract → Start the campaign (fires the first-contact dial). */
  async startOutreachCampaign(campaignId, preference) {
    const { data } = await this.controlPlane.post(`/v1/outreach-campaigns/${campaignId}/start`,
      preference ? { preference } : {});
    return data;
  }

  /** Reject/pause a proposed call contract. */
  async stopOutreachCampaign(campaignId) {
    const { data } = await this.controlPlane.post(`/v1/outreach-campaigns/${campaignId}/stop`, {});
    return data;
  }

  /** Clear onboarding artifacts (company/mission/tasks/screenshot) — rooms kept. */
  async resetHyperOnboarding() {
    const { data } = await this.controlPlane.post('/v1/hyper/onboarding/reset', {});
    return data;
  }

  async logout() {
    await this.controlPlane.post('/auth/logout');
  }

  async deleteAccount(confirm = 'DELETE') {
    const { data } = await this.controlPlane.delete(ACCOUNT_DELETE_ENDPOINT, {
      data: { confirm },
      timeout: 300000,
    });
    return data;
  }

  // ─── Control Plane: Organizations ────────────────────────────

  async createOrg(payload) {
    const request = typeof payload === 'string' ? { name: payload } : payload;
    const { data } = await this.controlPlane.post('/v1/orgs', request);
    return data;
  }

  async getOrganizationProfile(orgId) {
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/profile`);
    return data;
  }

  // Rebuild the user/org profile: re-run the LLM profile-dreamer over the
  // caller's memories and persist the grounded facts. Server-gated to
  // admin/owner. Returns { perUser: [{ applied, ... }] }.
  async rebuildProfile() {
    const { data } = await this.controlPlane.post('/v1/proxy/profiles/dream', { apply: true });
    return data;
  }

  async updateOrganizationProfile(orgId, companyProfile) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/profile`, {
      company_profile: companyProfile,
    });
    return data;
  }

  async previewReferral(code) {
    const { data } = await this.controlPlane.get('/v1/referrals/preview', { params: { code } });
    return data;
  }

  async listMembers(orgId) {
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/members`);
    return data;
  }

  // Alias used by AdminUsers page (P0-4)
  async listOrgMembers(orgId) {
    return this.listMembers(orgId);
  }

  async updateMemberRole(orgId, userId, role) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/members/${userId}`, { role });
    return data;
  }

  // P0-4: set full roles[] array (multi-role RBAC)
  async updateMemberRoles(orgId, userId, roles) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/members/${userId}/roles`, { roles });
    return data;
  }

  async deactivateMember(orgId, userId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/members/${userId}/deactivate`, {});
    return data;
  }

  async reactivateMember(orgId, userId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/members/${userId}/reactivate`, {});
    return data;
  }

  async removeMember(orgId, userId) {
    const { data } = await this.controlPlane.delete(`/v1/orgs/${orgId}/members/${userId}`);
    return data;
  }

  async createInvite(orgId, payload = {}) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/invites`, payload);
    return data;
  }

  async listInvites(orgId, { status = 'all', projectId = null } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.set('status', status);
    if (projectId) params.set('project_id', projectId);
    const qs = params.toString();
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/invites${qs ? `?${qs}` : ''}`);
    return data;
  }

  async revokeInvite(orgId, inviteId) {
    const { data } = await this.controlPlane.delete(`/v1/orgs/${orgId}/invites/${inviteId}`);
    return data;
  }

  async resendInvite(orgId, inviteId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/invites/${inviteId}/resend`, {});
    return data;
  }

  async acceptInvite(token) {
    const { data } = await this.controlPlane.post(`/v1/join/${token}`);
    return data;
  }

  async getInvitePreview(token) {
    const { data } = await this.controlPlane.get(`/v1/join/${token}`);
    return data;
  }

  async declineInvite(token) {
    const { data } = await this.controlPlane.post(`/v1/join/${token}/decline`);
    return data;
  }

  async listProjects(orgId) {
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/projects`);
    return data;
  }

  async createProject(orgId, payload) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/projects`, payload);
    return data;
  }

  async updateProject(orgId, projectId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/projects/${projectId}`, payload);
    return data;
  }

  async deleteProject(orgId, projectId) {
    const { data } = await this.controlPlane.delete(`/v1/orgs/${orgId}/projects/${projectId}`);
    return data;
  }

  // ─── Control Plane: Teams + Projects (V2) ────────────────────

  async listTeams() {
    const { data } = await this.controlPlane.get('/v1/teams');
    return data;
  }

  async createTeam(payload) {
    const { data } = await this.controlPlane.post('/v1/teams', payload);
    return data;
  }

  async getTeam(teamId) {
    const { data } = await this.controlPlane.get(`/v1/teams/${teamId}`);
    return data;
  }

  async updateTeam(teamId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/teams/${teamId}`, payload);
    return data;
  }

  async archiveTeam(teamId) {
    const { data } = await this.controlPlane.delete(`/v1/teams/${teamId}`);
    return data;
  }

  async listTeamMembers(teamId) {
    const { data } = await this.controlPlane.get(`/v1/teams/${teamId}/members`);
    return data;
  }

  async addTeamMember(teamId, payload) {
    const { data } = await this.controlPlane.post(`/v1/teams/${teamId}/members`, payload);
    return data;
  }

  async removeTeamMember(teamId, userId) {
    const { data } = await this.controlPlane.delete(`/v1/teams/${teamId}/members/${userId}`);
    return data;
  }

  async listTeamProjects(teamId) {
    const { data } = await this.controlPlane.get(`/v1/teams/${teamId}/projects`);
    return data;
  }

  async createTeamProject(teamId, payload) {
    const { data } = await this.controlPlane.post(`/v1/teams/${teamId}/projects`, payload);
    return data;
  }

  async listAccessibleProjects() {
    const { data } = await this.controlPlane.get('/v1/projects');
    return data;
  }

  async getProjectV2(projectId) {
    const { data } = await this.controlPlane.get(`/v1/projects/${projectId}`);
    return data;
  }

  async getProjectActivity(projectId) {
    const { data } = await this.controlPlane.get(`/v1/projects/${projectId}/activity`);
    return data;
  }

  async updateProjectV2(projectId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/projects/${projectId}`, payload);
    return data;
  }

  async archiveProjectV2(projectId) {
    const { data } = await this.controlPlane.delete(`/v1/projects/${projectId}`);
    return data;
  }

  async updateProjectMemberRole(projectId, userId, role) {
    const { data } = await this.controlPlane.patch(`/v1/projects/${projectId}/members/${userId}`, { role });
    return data;
  }

  async listProjectMembers(projectId) {
    const { data } = await this.controlPlane.get(`/v1/projects/${projectId}/members`);
    return data;
  }

  async addProjectMember(projectId, payload) {
    const { data } = await this.controlPlane.post(`/v1/projects/${projectId}/members`, payload);
    return data;
  }

  async removeProjectMember(projectId, userId) {
    const { data } = await this.controlPlane.delete(`/v1/projects/${projectId}/members/${userId}`);
    return data;
  }

  async setMemoryScope(memoryId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/memories/${memoryId}/scope`, payload);
    return data;
  }

  // ─── Hyper Agents — Rooms (WhatsApp-style CSI swarm) ────────

  async listHyperRooms() {
    const { data } = await this.controlPlane.get('/v1/hyper-rooms');
    return data;
  }

  async ensureHyperDomainRooms() {
    const { data } = await this.controlPlane.post('/v1/hyper/domain-rooms/ensure', {});
    return data;
  }

  async createHyperRoom(payload) {
    const { data } = await this.controlPlane.post('/v1/hyper-rooms', payload);
    return data;
  }

  async getHyperRoom(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}`);
    return data;
  }

  async getHyperRoomWorkPlan(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/work-plan`);
    return data;
  }

  async resumeHyperRoomWorkStep(roomId, workOrderId, resolution) {
    const { data } = await this.controlPlane.post(
      `/v1/hyper-rooms/${roomId}/work-plan/${workOrderId}/resume`,
      { resolution },
    );
    return data;
  }

  async acceptHyperRoomWorkHandoff(roomId, workOrderId) {
    const { data } = await this.controlPlane.post(
      `/v1/hyper-rooms/${roomId}/work-plan/${workOrderId}/handoff`,
      { decision: 'accept' },
    );
    return data;
  }

  async updateHyperRoom(roomId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/hyper-rooms/${roomId}`, payload);
    return data;
  }

  // Room-level connector toggles (HyperAgents×Connectors) — flat list, like the
  // web tool. ["github","gmail","google_docs",...]
  async getRoomConnectors(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/connectors`);
    return data; // { enabled_connectors }
  }
  async setRoomConnectors(roomId, enabledConnectors) {
    const { data } = await this.controlPlane.patch(`/v1/hyper-rooms/${roomId}/connectors`, {
      enabled_connectors: enabledConnectors,
    });
    return data; // { ok, enabled_connectors }
  }

  // Resolve a queued connector write (Phase 7 approval card). decision = "approve"|"deny".
  // HQ control-room feed — agent reports from every non-HQ room run.
  async getHqActivity(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/hq-activity`);
    return data; // { activity: [...] }
  }

  // "Your Leads" board — one row per prospect with outreach state + outcomes.
  async getLeads() {
    const { data } = await this.controlPlane.get('/v1/hyper/leads');
    return data; // { leads: [...], summary: {...} }
  }

  // ── Outreach campaign runner (batch email/call over a turn's prospects) ──
  async createOutreachCampaign(roomId, channel, turnId) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/outreach-campaigns`, {
      channel, turn_id: turnId,
    });
    return data; // { campaign: {…, targets: […]} }
  }

  async getOutreachCampaign(campaignId) {
    const { data } = await this.controlPlane.get(`/v1/outreach-campaigns/${campaignId}`);
    return data;
  }

  async controlOutreachCampaign(campaignId, action /* 'start' | 'stop' */, payload = {}) {
    const { data } = await this.controlPlane.post(`/v1/outreach-campaigns/${campaignId}/${action}`, payload);
    return data;
  }

  async patchOutreachTarget(campaignId, targetId, patch /* {selected?, payload?} */) {
    const { data } = await this.controlPlane.patch(
      `/v1/outreach-campaigns/${campaignId}/targets/${targetId}`, patch,
    );
    return data;
  }

  async generateOutreachTarget(campaignId, targetId) {
    const { data } = await this.controlPlane.post(
      `/v1/outreach-campaigns/${campaignId}/targets/${targetId}/generate`,
    );
    return data;
  }

  async executeOutreachTarget(campaignId, targetId) {
    const { data } = await this.controlPlane.post(
      `/v1/outreach-campaigns/${campaignId}/targets/${targetId}/execute`,
    );
    return data;
  }

  async reconcileOutreachTarget(campaignId, targetId) {
    const { data } = await this.controlPlane.post(
      `/v1/outreach-campaigns/${campaignId}/targets/${targetId}/reconcile`,
    );
    return data;
  }

  async approveHyperRoomWrite(roomId, approvalId, decision) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/approve`, {
      approval_id: approvalId,
      decision,
    });
    return data; // { ok, approval_id, decision, result }
  }

  // One-click send from the in-app draft preview (possibly edited). Sends via the
  // core Gmail bridge with markdown→HTML polish + optional image attachments
  // (client-rendered mermaid PNGs). Resolves the approval card when approvalId given.
  async sendHyperRoomEmail(roomId, { to, subject, bodyMd, attachments = [], approvalId = null }) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/send-email`, {
      to, subject, body_md: bodyMd, attachments, approval_id: approvalId || undefined,
    });
    return data; // { ok, sent, to, subject, result }
  }

  async callHyperRoom(roomId, { to, goal = '' }) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/call`, {
      to,
      goal: goal || undefined,
    });
    return data; // { ok, dialing, session_id, call_leg_id }
  }

  // Mint a short-lived Cartesia agent access token (server holds the key).
  async mintCartesiaToken() {
    const { data } = await this.controlPlane.post('/v1/tara/cartesia-token', {});
    return data;
  }

  async archiveHyperRoom(roomId) {
    const { data } = await this.controlPlane.delete(`/v1/hyper-rooms/${roomId}`);
    return data;
  }

  // Permanent delete — removes the room and cascades its turns + activity.
  async deleteHyperRoom(roomId, { force = false } = {}) {
    const { data } = await this.controlPlane.delete(`/v1/hyper-rooms/${roomId}?hard=true${force ? '&force=true' : ''}`);
    return data;
  }

  // Clear the whole discussion (all turns / agent activity); keeps the room.
  async clearHyperRoomTurns(roomId) {
    const { data } = await this.controlPlane.delete(`/v1/hyper-rooms/${roomId}/turns`);
    return data;
  }

  // Remove a single turn (e.g. one whose answer was wrong / time-stale).
  async deleteHyperTurn(roomId, turnId) {
    const { data } = await this.controlPlane.delete(`/v1/hyper-rooms/${roomId}/turns/${turnId}`);
    return data;
  }

  async postHyperTurn(roomId, { user_message, idempotency_key, turn_id, user_signal, language }) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/turns`, {
      user_message, idempotency_key, turn_id,
      ...(user_signal ? { user_signal } : {}),
      ...(language ? { language } : {}),  // run-wide output language (navbar i18n locale)
    });
    return data;
  }

  async decideHyperRoomFlyby(roomId, turnId, { decision, flyby_spec }) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/turns`, {
      action: 'flyby-decision', turn_id: turnId, decision, flyby_spec,
    });
    return data;
  }

  async getHyperTurn(roomId, turnId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/turns/${turnId}`);
    return data;
  }

  async controlHyperTurn(roomId, turnId, action, message = '') {
    const { data } = await this.controlPlane.post(
      `/v1/hyper-rooms/${roomId}/turns/${turnId}/control`,
      { action, ...(message ? { message } : {}) },
    );
    return data;
  }

  async listHyperAgentRoutines(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/routines`);
    return data;
  }

  async createHyperAgentRoutine(roomId, payload) {
    const { data } = await this.controlPlane.post(`/v1/hyper-rooms/${roomId}/routines`, payload);
    return data;
  }

  async getHyperRoomArtifacts(roomId, { type = 'all', limit = 200 } = {}) {
    const qs = new URLSearchParams({ type, limit: String(limit) }).toString();
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}/artifacts?${qs}`);
    return data;
  }

  // ── TARA call history / insights / usage (org-scoped) ──
  async listTaraCalls(limit = 30) {
    const { data } = await this.controlPlane.get(`/v1/proxy/tara/calls?limit=${limit}`);
    return data?.calls || [];
  }

  async getTaraCall(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/tara/calls/${id}`);
    return data; // { call, turns, insight }
  }

  async getTaraRuntimeConfig() {
    const { data } = await this.controlPlane.get('/v1/tara/runtime-config');
    return data?.config;
  }

  async updateTaraRuntimeConfig({ default_provider, grok, deepgram, expected_revision }) {
    const { data } = await this.controlPlane.patch('/v1/tara/runtime-config', {
      default_provider, grok, deepgram, expected_revision,
    });
    return data?.config;
  }

  async createTaraVoiceSession(payload) {
    const { data } = await this.controlPlane.post('/v1/tara/voice-sessions', payload);
    return data;
  }

  async listTaraVoices(provider) {
    const { data } = await this.controlPlane.get(`/v1/tara/voices?provider=${encodeURIComponent(provider)}`);
    return data;
  }

  // Browser-initiated outbound dial. Goes through the control plane, NOT the
  // adapter: the adapter's dial gate needs a shared key that must never reach a
  // browser (it authorizes calling anyone). The session cookie proves who is
  // asking and the tenant is pinned server-side.
  async startTaraOutbound({ to, language, voice_id, goal, company }) {
    const { data } = await this.controlPlane.post('/v1/tara/outbound', {
      to, language, voice_id, goal, company,
    });
    return data;
  }

  async hangupTaraOutbound(callLegId) {
    const { data } = await this.controlPlane.post(`/v1/tara/outbound/${encodeURIComponent(callLegId)}/hangup`, {});
    return data;
  }

  // Post-call state for specific sessions: post_call is 'live' | 'processing' |
  // 'ready', and `insight` carries summary + outcome + leads + learnings in one
  // shot. Lets the campaign panel show a truthful "analysing" state instead of a
  // timer-driven spinner, and render everything the moment it lands.
  async listTaraCallsBySessions(sessionIds) {
    const ids = (sessionIds || []).filter(Boolean);
    if (!ids.length) return { calls: [] };
    const { data } = await this.controlPlane.get(
      `/v1/proxy/tara/calls?session_ids=${encodeURIComponent(ids.join(','))}`,
    );
    return data;
  }

  // Short-lived, session-scoped live-listen capability. Core verifies the
  // caller's org owns the call before signing, so the privileged adapter dial
  // key never reaches the browser. 404 = not this org's call / no longer live.
  async createTaraListenToken(sessionId) {
    const { data } = await this.controlPlane.post('/v1/proxy/tara/calls/listen-token', {
      session_id: sessionId,
    });
    return data;
  }

  // ── TARA Skills (named prompt presets, org-scoped) ──
  async listTaraSkills() {
    const { data } = await this.controlPlane.get('/v1/proxy/tara/skills');
    return data; // { skills: [...], selected: { external_skill_id, internal_skill_id } }
  }

  async createTaraSkill({ kind, name, primary_prompt, secondary_prompt }) {
    const { data } = await this.controlPlane.post('/v1/proxy/tara/skills', { kind, name, primary_prompt, secondary_prompt });
    return data?.skill;
  }

  async updateTaraSkill(id, { name, primary_prompt, secondary_prompt }) {
    const { data } = await this.controlPlane.put(`/v1/proxy/tara/skills/${id}`, { name, primary_prompt, secondary_prompt });
    return data?.skill;
  }

  async deleteTaraSkill(id) {
    const { data } = await this.controlPlane.delete(`/v1/proxy/tara/skills/${id}`);
    return data;
  }

  async selectTaraSkill(skillId) {
    const { data } = await this.controlPlane.post('/v1/proxy/tara/skills/select', { skill_id: skillId });
    return data; // { selected, kind }
  }

  // SSE — caller manages EventSource lifecycle, we just expose URL.
  hyperTurnStreamUrl(roomId, turnId) {
    const base = API_DEFAULTS.controlPlaneBase.replace(/\/$/, '');
    return `${base}/v1/hyper-rooms/${roomId}/turns/${turnId}/stream`;
  }

  hyperArtifactAssetUrl(path) {
    const value = String(path || '');
    if (!value.startsWith('/v1/hyper-artifacts/')) return '';
    return `${API_DEFAULTS.controlPlaneBase.replace(/\/$/, '')}${value}`;
  }

  async getHyperArtifact(path) {
    const value = String(path || '');
    if (!value.startsWith('/v1/hyper-artifacts/')) throw new Error('Invalid HyperRoom artifact path');
    const { data } = await this.controlPlane.get(value, { responseType: 'text' });
    return String(data || '');
  }

  // ─── Control Plane: Digital Employees ───────────────────────

  async listEmployees() {
    const { data } = await this.controlPlane.get('/v1/employees');
    return data;
  }

  async createEmployee(payload) {
    const { data } = await this.controlPlane.post('/v1/employees', payload);
    return data;
  }

  async optimizeEmployeePersona(payload) {
    const { data } = await this.controlPlane.post('/v1/employees/optimize-persona', payload);
    return data;
  }

  // Rank a marketplace field's professions by relevance to the caller's org (org-grounded).
  async rankProfessions(field, professions) {
    const { data } = await this.controlPlane.post('/v1/marketplace/rank-professions', { field, professions });
    return data;
  }

  // ─── OAuth client registry (ChatGPT, Claude Desktop, custom GPTs, ...) ─

  async listOAuthClients() {
    const { data } = await this.controlPlane.get('/v1/oauth/clients');
    return data;
  }

  async createOAuthClient(payload) {
    const { data } = await this.controlPlane.post('/v1/oauth/clients', payload);
    return data;
  }

  async deleteOAuthClient(clientId) {
    const { data } = await this.controlPlane.delete(`/v1/oauth/clients/${encodeURIComponent(clientId)}`);
    return data;
  }

  async remintEmployeeKey(employeeId) {
    const { data } = await this.controlPlane.post(`/v1/employees/${employeeId}/remint-key`);
    return data;
  }

  async remintAllEmployeeKeys(orgId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/employees/remint-all-keys`);
    return data;
  }

  async getEmployee(id) {
    const { data } = await this.controlPlane.get(`/v1/employees/${id}`);
    return data;
  }

  async updateEmployee(id, payload) {
    const { data } = await this.controlPlane.patch(`/v1/employees/${id}`, payload);
    return data;
  }

  async pauseEmployee(id) {
    const { data } = await this.controlPlane.post(`/v1/employees/${id}/pause`);
    return data;
  }

  async resumeEmployee(id) {
    const { data } = await this.controlPlane.post(`/v1/employees/${id}/resume`);
    return data;
  }

  // Take a draft/errored employee live: ensures a scoped key + sets status
  // 'deploying'; the sidecar reconcile builds the agent and flips to running.
  async deployEmployee(id) {
    const { data } = await this.controlPlane.post(`/v1/employees/${id}/deploy`);
    return data;
  }

  async archiveEmployee(id) {
    const { data } = await this.controlPlane.delete(`/v1/employees/${id}`);
    return data;
  }

  // Kick off a prompt-tuning run for an employee that has hit its eval
  // threshold (hyper.state === 'ready_for_tuning'). Server runs the Groq
  // teacher loop and flips state to 'optimized' with a new prompt version.
  async tuneEmployee(id) {
    const { data } = await this.controlPlane.post(`/v1/employees/${id}/tune`);
    return data;
  }

  async pauseAllEmployees(orgId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/employees/pause-all`);
    return data;
  }

  // ─── Team Tasks (Playground — multi-employee runs) ────────────

  /**
   * Kick off a multi-employee team task. Returns immediately with
   *   { task_id, status: "running", roster }
   * Poll getTeamTask + getTeamTaskTranscript for live progress.
   *
   * payload: {
   *   brief, roster_slugs[], max_rounds?,
   *   slack_channel?, slack_thread_ts?, slack_api_key?
   * }
   * org_id + requested_by are attached server-side from the session.
   */
  async createTeamTask(payload) {
    const { data } = await this.controlPlane.post('/v1/team-tasks', payload);
    return data;
  }

  async listTeamTasks(limit = 12) {
    const { data } = await this.controlPlane.get('/v1/team-tasks', { params: { limit } });
    return data;
  }

  async getTeamTask(taskId) {
    const { data } = await this.controlPlane.get(`/v1/team-tasks/${taskId}`);
    return data;
  }

  /**
   * @param {string} taskId
   * @param {{ limit?: number, afterTs?: string }} [opts]
   */
  async getTeamTaskTranscript(taskId, opts = {}) {
    const params = {};
    if (opts.limit) params.limit = opts.limit;
    if (opts.afterTs) params.after_ts = opts.afterTs;
    const { data } = await this.controlPlane.get(`/v1/team-tasks/${taskId}/transcript`, { params });
    return data;
  }

  // ─── Per-employee 1-on-1 chat (Playground DM panel) ───────────

  /**
   * One ReAct turn against a single employee. conversation_id keeps
   * agent memory across multiple calls; omit to start fresh.
   * Returns { employee_slug, conversation_id, reply }
   */
  async chatWithEmployee(slug, textOrPayload, conversationId = null) {
    const payload = typeof textOrPayload === 'string'
      ? { text: textOrPayload, conversation_id: conversationId }
      : textOrPayload;
    const { data } = await this.controlPlane.post(`/v1/employees/${slug}/chat`, payload);
    return data;
  }

  // ─── Billing (Stripe-backed) ──────────────────────────────────

  /**
   * Current plan + usage + limits + subscription state.
   * Returns:
   *   {
   *     plan: { id, name, price, currency, limits, features, support, sla },
   *     subscription: { status, stripe_customer_id, stripe_subscription_id,
   *                     current_period_end, trial_ends_at },
   *     usage,
   *     warnings, exceeded,
   *     stripe_enabled,
   *     all_plans: [{ id, name, price, ..., available_self_serve }]
   *   }
   */
  async getBillingPlan() {
    const { data } = await this.controlPlane.get('/v1/billing/plan');
    return data;
  }

  /**
   * High-level platform usage for the current org this period.
   * Proxies core GET /api/billing/usage → planEnforcer.getUsageSummary:
   *   { plan, planName, period:{month}, tokens:{used,limit}, searches, uploads,
   *     memories, deepResearch, webIntel:{...,isDaily}, graphQueries, tara, ... }
   */
  async getUsage() {
    const { data } = await this.controlPlane.get('/v1/proxy/billing/usage');
    return data;
  }

  /**
   * Per-day usage series for the Usage page graphs (last `days`, default 30).
   * → { days, series: [{ day, tokens, memories, searches, ... }] }
   */
  async getDailyUsage(days = 30) {
    const { data } = await this.controlPlane.get('/v1/proxy/billing/usage/daily', { params: { days } });
    return data;
  }

  /**
   * Start a Stripe Checkout session for a plan upgrade. Returns
   *   { checkout_url, session_id }
   * Caller redirects window.location to checkout_url.
   */
  async createBillingCheckout(planId, referralCode = '') {
    const { data } = await this.controlPlane.post('/v1/billing/checkout', {
      plan: planId,
      ...(referralCode ? { referral_code: referralCode } : {}),
    });
    return data;
  }

  /** Reconcile a completed hosted Checkout with Stripe before webhooks arrive. */
  async reconcileBillingCheckout() {
    const { data } = await this.controlPlane.post('/v1/billing/reconcile', {});
    return data;
  }

  async confirmDummyBillingCheckout(checkoutId) {
    const { data } = await this.controlPlane.post('/v1/billing/dummy/confirm', { checkout_id: checkoutId });
    return data;
  }

  /**
   * Open Stripe Customer Portal. Returns { portal_url } — redirect there.
   */
  async createBillingPortal() {
    const { data } = await this.controlPlane.post('/v1/billing/portal', {});
    return data;
  }

  /** List recent invoices from Stripe. */
  async listInvoices() {
    const { data } = await this.controlPlane.get('/v1/billing/invoices');
    return data;
  }

  /** Returns a direct URL to the CSV invoice export endpoint. */
  invoiceCsvUrl() {
    return `${this.controlPlane.defaults.baseURL}/v1/billing/invoices.csv`;
  }

  // ─── Control Plane: API Keys ─────────────────────────────────

  /**
   * Returns { keys: [{ id, name, key_prefix, scopes, expires_at, last_used_at, created_at }] }
   */
  async listApiKeys() {
    const { data } = await this.controlPlane.get('/v1/api-keys');
    return data;
  }

  /**
   * Create key. Body: { name, description?, scopes?, expires_at?, rate_limit_per_minute? }
   * Returns { success, api_key (raw), key: { id, name, key_prefix, scopes, created_at }, descriptors }
   */
  async createApiKey(name, options = {}) {
    const { data } = await this.controlPlane.post('/v1/api-keys', {
      name,
      ...options,
    });
    return data;
  }

  /**
   * Returns { success, key_id, revoked_at }
   */
  async revokeApiKey(id) {
    const { data } = await this.controlPlane.post(`/v1/api-keys/${id}/revoke`);
    return data;
  }

  /**
   * Create a short-lived, single-use enrollment credential for the active
   * self-hosted organization. Authentication comes from the browser session.
   */
  async createSelfHostBootstrap() {
    const { data } = await this.controlPlane.post('/v1/selfhost/bootstrap');
    return data;
  }

  /**
   * Explicit, server-side allowlisted canary enrollment. This does not weaken
   * the stable release gate; unauthorized organizations receive 403.
   */
  async createSelfHostCanaryBootstrap() {
    const { data } = await this.controlPlane.post('/v1/selfhost/canary-bootstrap');
    return data;
  }

  /**
   * Self-host connection status (polled during onboarding).
   * Returns { registered, reachable, kind?, transport? }
   */
  async selfHostStatus(apiKey) {
    const { data } = await this.controlPlane.post('/v1/selfhost/status', apiKey ? { apiKey } : {});
    return data;
  }

  async unlockPlatformAdmin(passcode) {
    const { data } = await this.controlPlane.post('/admin/api/platform/unlock', { passcode });
    return data;
  }

  async listPlatformUsers({ q = '', limit = 200 } = {}) {
    const { data } = await this.controlPlane.get('/admin/api/platform/users', { params: { q, limit } });
    return data;
  }

  async listPlatformLogs() {
    const { data } = await this.controlPlane.get('/admin/api/platform/logs');
    return data;
  }

  async getPlatformMetrics() {
    const { data } = await this.controlPlane.get('/admin/api/platform/metrics');
    return data;
  }

  async getPlatformModels() {
    const { data } = await this.controlPlane.get('/admin/api/platform/models');
    return data;
  }

  async updatePlatformModel(payload) {
    const { data } = await this.controlPlane.put('/admin/api/platform/models', payload);
    return data;
  }

  async updatePlatformModelPrice(payload) {
    const { data } = await this.controlPlane.put('/admin/api/platform/model-prices', payload);
    return data;
  }

  async getPlatformAiCosts({ q = '', limit = 200, period = 'month' } = {}) {
    const { data } = await this.controlPlane.get('/admin/api/platform/ai-costs', { params: { q, limit, period } });
    return data;
  }

  async getPlatformAiCostDetail(orgId, { period = 'month' } = {}) {
    const { data } = await this.controlPlane.get(`/admin/api/platform/ai-costs/${encodeURIComponent(orgId)}`, { params: { period } });
    return data;
  }

  async listPlatformPlans({ planId } = {}) {
    const { data } = await this.controlPlane.get('/admin/api/platform/plans', {
      params: planId ? { plan_id: planId } : undefined,
    });
    return data;
  }

  async updatePlatformPlanCaps(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/plans', payload);
    return data;
  }

  async listPlatformPromotions() {
    const { data } = await this.controlPlane.get('/admin/api/platform/promotions');
    return data;
  }

  async createPlatformPromotion(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/promotions', payload);
    return data;
  }

  async revokePlatformPromotion(id) {
    const { data } = await this.controlPlane.post(`/admin/api/platform/promotions/${id}/revoke`);
    return data;
  }

  async listPlatformEnterpriseInvitations() {
    const { data } = await this.controlPlane.get('/admin/api/platform/invitations');
    return data;
  }

  async createPlatformEnterpriseInvitation(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/invitations', payload);
    return data;
  }

  async createPlatformPersonalInvitationLink(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/personal-invitation-link', payload);
    return data;
  }

  async listPlatformAccessApplications(params = {}) {
    const { data } = await this.controlPlane.get('/admin/api/platform/access-applications', { params });
    return data;
  }

  async accessApplicationAction(id, action, payload = {}) {
    const { data } = await this.controlPlane.post(`/admin/api/platform/access-applications/${id}/${action}`, payload);
    return data;
  }

  async getPlatformEnterpriseInvitation(id) {
    const { data } = await this.controlPlane.get(`/admin/api/platform/invitations/${id}`);
    return data;
  }

  async enterpriseInvitationAction(id, action, payload = {}) {
    const { data } = await this.controlPlane.post(`/admin/api/platform/invitations/${id}/${action}`, payload);
    return data;
  }

  async previewPlatformEmail(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/email/preview', payload);
    return data;
  }

  async getPlatformEmailTemplates() {
    const { data } = await this.controlPlane.get('/admin/api/platform/email/templates');
    return data;
  }

  async sendPlatformEmail(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/email/send', payload);
    return data;
  }

  async listPlatformReferralCampaigns() {
    const { data } = await this.controlPlane.get('/admin/api/platform/referral-campaigns');
    return data;
  }

  async createPlatformReferralCampaign(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/referral-campaigns', payload);
    return data;
  }

  async revokePlatformReferralCampaign(id) {
    const { data } = await this.controlPlane.post(`/admin/api/platform/referral-campaigns/${id}/revoke`);
    return data;
  }

  async listPlatformPilots() {
    const { data } = await this.controlPlane.get('/admin/api/platform/pilots');
    return data;
  }

  async listPlatformOrganizations() {
    const { data } = await this.controlPlane.get('/admin/api/platform/organizations');
    return data;
  }

  async grantPlatformPilot(payload) {
    const { data } = await this.controlPlane.post('/admin/api/platform/pilots/grant', payload);
    return data;
  }

  async amendPlatformPilot(grantId, payload) {
    const { data } = await this.controlPlane.post(`/admin/api/platform/pilots/${grantId}/entitlement`, payload);
    return data;
  }

  async listPlatformRedemptions() {
    const { data } = await this.controlPlane.get('/admin/api/platform/redemptions');
    return data;
  }

  async createEnterpriseCheckout() {
    const { data } = await this.controlPlane.post('/v1/billing/enterprise-checkout');
    return data;
  }

  // ─── Control Plane: Client Descriptors ───────────────────────

  /**
   * Returns { core_api_base_url, descriptors: { claude, antigravity, vscode, remote_mcp } }
   */
  async getDescriptors() {
    const { data } = await this.controlPlane.get('/v1/clients/descriptors');
    if (Array.isArray(data?.descriptors)) {
      return {
        ...data,
        descriptors: data.descriptors.reduce((acc, descriptor) => {
          if (descriptor?.client) {
            acc[descriptor.client] = descriptor.config || {};
          }
          return acc;
        }, {}),
      };
    }
    return data;
  }

  async getDescriptor(client) {
    const { data } = await this.controlPlane.get(`/v1/clients/descriptors/${client}`);
    return data;
  }

  // ─── Core: Health ────────────────────────────────────────────

  async health() {
    const { data } = await this.controlPlane.get('/v1/proxy/health', {
      // TopBar confirms repeated failures before displaying Offline.
      suppressServiceError: true,
    });
    return data;
  }

  // ─── Core: Memories ──────────────────────────────────────────

  async listMemories(params = {}) {
    const { data } = await this.controlPlane.get('/v1/proxy/memories', { params });
    return data;
  }

  // Dashboard totals across the user's ENTIRE visible set (personal +
  // org-wide + accessible projects + teams): { memories, relations }.
  async getMemoryStats() {
    const { data } = await this.controlPlane.get('/v1/proxy/memory/stats');
    return data;
  }

  async getMemory(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/memories/${id}`);
    return data;
  }

  async createMemory(memory) {
    const { data } = await this.controlPlane.post('/v1/proxy/memories', memory);
    return data;
  }

  // Save a finished research report as ONE atomic canonical memory (the
  // high-level save_memory path — NOT the KB evidence/segment pipeline; those
  // segments are reserved for KB uploads). Scoped via scope + project_id so
  // org / project saves land where the dropdown chose. Returns { ok, scope }.
  async saveResearchAsMemory({ title, markdown, sources = [], tags = [], jobId, targetScope = 'personal', projectId = null }) {
    const sourcesMd = sources.length
      ? '\n\n---\n\n## Sources\n\n' + sources.map((s, i) => `${i + 1}. [${s.title || s.url}](${s.url})`).join('\n')
      : '';
    const scope = targetScope === 'organization' ? 'organization'
      : (targetScope === 'project' && projectId) ? 'project'
      : 'personal';
    const payload = {
      title: (title || 'Research report').slice(0, 200),
      content: (markdown || '') + sourcesMd,
      memory_type: 'fact',
      tags: ['web-research', ...(jobId ? [`research-job:${jobId}`] : []), ...tags],
      scope,
      // Org saves must be org-visible (scope + visibility both). Personal stays
      // private; project rows inherit project visibility via project_id.
      visibility: scope === 'organization' ? 'organization' : 'private',
      ...(scope === 'project' ? { project_ids: [projectId], project_id: projectId } : {}),
    };
    const data = await this.createMemory(payload);
    return { ok: true, scope, raw: data };
  }

  async deleteMemory(id, { hard = true } = {}) {
    const { data } = await this.controlPlane.delete(`/v1/proxy/memories/${id}${hard ? '?hard=true' : ''}`);
    return data;
  }

  // ─── Research session ephemeral buffers (Phase 3) ──────────────

  /** List active research sessions with buffered proposal counts. */
  async listResearchSessions() {
    const { data } = await this.controlPlane.get('/v1/proxy/research/sessions');
    return data;
  }

  /** Pending buffered proposals for a session — counts + samples. */
  async getResearchPendingProposals(sessionId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/research/sessions/${sessionId}/pending-proposals`);
    return data;
  }

  /**
   * Approve subset (or all) buffered proposals → flush to memories table.
   * @param {string} sessionId
   * @param {object} [opts]
   * @param {string[]} [opts.kinds]
   * @param {string[]} [opts.ids]
   */
  async approveResearchProposals(sessionId, opts = {}) {
    const { data } = await this.controlPlane.post(
      `/v1/proxy/research/sessions/${sessionId}/approve`,
      { kinds: opts.kinds, ids: opts.ids }
    );
    return data;
  }

  /** Drop buffer without persisting. */
  async discardResearchProposals(sessionId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/research/sessions/${sessionId}/discard`);
    return data;
  }

  /**
   * Bulk delete memories matching tag + date filter.
   * Used by AgentSwarm when NL intent is destructive + has tag filter.
   * Default dry_run:true so callers can preview match count before nuke.
   *
   * @param {object} filter
   * @param {string[]} filter.tags - required, OR-matched against memory.tags
   * @param {string|null} filter.date_from - ISO, optional
   * @param {string|null} filter.date_to - ISO, optional
   * @param {string|null} filter.project - optional project scope
   * @param {boolean} filter.dry_run - default true
   * @returns {Promise<{matched_count?:number, deleted?:number, sample?:object[], filter:object}>}
   */
  async bulkDeleteByTag(filter = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/memories/bulk-delete-by-tag', {
      tags: filter.tags || [],
      date_from: filter.date_from || null,
      date_to: filter.date_to || null,
      project: filter.project || null,
      dry_run: filter.dry_run !== false,
    });
    return data;
  }

  async searchMemories(query, params = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/memories/search', { query, ...params });
    return data;
  }

  async quickSearch(query) {
    const { data } = await this.controlPlane.post('/v1/proxy/search/quick', { query });
    return data;
  }

  // ─── Core: Documents & Evidence (Phase 1) ───────────────────

  async listDocuments(params = {}) {
    const { data } = await this.controlPlane.get('/v1/proxy/documents', { params });
    return data;
  }

  async getDocument(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/documents/${id}`);
    return data;
  }

  async searchDocuments(query, params = {}) {
    const { data } = await this.controlPlane.get('/v1/proxy/documents/search', { 
      params: { q: query, ...params } 
    });
    return data;
  }

  async searchEvidence(query, params = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/evidence/search', { 
      query, ...params 
    });
    return data;
  }

  async listEvidence(params = {}) {
    const { data } = await this.controlPlane.get('/v1/proxy/evidence', { params });
    return data;
  }

  async hybridSearch(query, params = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/evidence/hybrid', { 
      query, ...params 
    });
    return data;
  }

  async getMemoryEvidence(memoryId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/evidence/memory`, {
      params: { memoryId }
    });
    return data;
  }

  async getDocumentEvidence(documentId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/evidence/document`, {
      params: { documentId }
    });
    return data;
  }

  // ─── Core: Resident Agents ──────────────────────────────────

  async listResidentAgents() {
    const { data } = await this.controlPlane.get('/v1/proxy/swarm/resident/agents');
    return data;
  }

  async runResidentAgent(agentId, payload = {}) {
    const { data } = await this.controlPlane.post(
      `/v1/proxy/swarm/resident/agents/${agentId}/run`,
      payload,
    );
    return data;
  }

  async getResidentRun(runId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/swarm/resident/runs/${runId}`);
    return data;
  }

  async listResidentRunObservations(runId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/swarm/resident/runs/${runId}/observations`);
    return data;
  }

  async cancelResidentRun(runId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/swarm/resident/runs/${runId}/cancel`);
    return data;
  }

  // ─── Core: Governance (Phase 2+3) ────────────────────────────

  async runGovernanceCycle(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/swarm/resident/cycle', payload);
    return data;
  }

  async getGovernanceMetrics(days = 7) {
    const { data } = await this.controlPlane.get(`/v1/proxy/governance/metrics?days=${days}`);
    return data;
  }

  async getGovernanceActionLog({ status, limit = 50 } = {}) {
    const q = [];
    if (status) q.push(`status=${encodeURIComponent(status)}`);
    q.push(`limit=${limit}`);
    const { data } = await this.controlPlane.get(`/v1/proxy/governance/action-log?${q.join('&')}`);
    return data;
  }

  async approveGovernanceAction(actionId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/governance/actions/${actionId}/approve`);
    return data;
  }

  async rejectGovernanceAction(actionId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/governance/actions/${actionId}/reject`);
    return data;
  }

  async rollbackGovernanceBatch(batchId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/governance/rollback/${batchId}`);
    return data;
  }

  // ─── Core: Context & Profile ─────────────────────────────────

  async getContext(query) {
    const { data } = await this.controlPlane.post('/v1/proxy/context', { query });
    return data;
  }

  async getProfile() {
    const { data } = await this.controlPlane.get('/v1/proxy/profile');
    return data;
  }

  // ─── Core: Connectors (MCP) ─────────────────────────────────

  async getConnectorStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/mcp/status');
    return data;
  }

  // Per-tenant OAuth/Nango connection status across the connector catalog.
  // Returns { connectors: [{ id, name, connection: {...}|null }] } — connected iff
  // connection != null. This is the authoritative "is X connected" source (overlays
  // active Nango connections), unlike listOAuthConnectors.
  async getConnectorConnectionStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/status');
    return data;
  }

  async listConnectorJobs() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/mcp/jobs');
    return data;
  }

  async registerMcpEndpoint(endpoint) {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/mcp/endpoints', endpoint);
    return data;
  }

  // ─── Control Plane: OAuth Connectors ──────────────────────

  async listOAuthConnectors() {
    const { data } = await this.controlPlane.get('/v1/connectors');
    return data;
  }

  /**
   * Begin OAuth flow for a connector.
   * @param {string} provider - Provider id (e.g. 'slack', 'gmail')
   * @param {string} returnTo - Redirect path after OAuth completes
   * @param {Object} [options]
   * @param {string} [options.target_scope='personal'] - 'personal' | 'team' | 'organization'
   * @param {string} [options.team_id] - Required when target_scope is 'team'
   */
  async startConnectorOAuth(provider, returnTo, { target_scope = 'personal', team_id } = {}) {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/start`, {
      return_to: returnTo,
      target_scope,
      ...(team_id ? { team_id } : {}),
    });
    return data;
  }

  /**
   * Change the memory scope of an already-connected connector.
   * Proxied through control plane → core /api/connectors/:provider/scope.
   * @param {string} provider
   * @param {Object} options
   * @param {string} options.target_scope - 'personal' | 'team' | 'organization'
   * @param {string} [options.team_id] - Required when target_scope is 'team'
   */
  async changeConnectorScope(provider, { target_scope, team_id } = {}) {
    const { data } = await this.controlPlane.patch(
      `/v1/proxy/connectors/${provider}/scope`,
      { target_scope, ...(team_id ? { team_id } : {}) },
    );
    return data;
  }

  async getConnectorProviderStatus(provider) {
    const { data } = await this.controlPlane.get(`/v1/connectors/${provider}/status`);
    return data;
  }

  async disconnectConnector(provider) {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/disconnect`);
    return data;
  }

  async resyncConnector(provider, { incremental = true, targetScope } = {}) {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/resync`, { incremental, target_scope: targetScope });
    return data;
  }

  // ─── Core: Knowledge Base ────────────────────────────────────

  // Accepts either a raw id string OR an object { memoryId?, uploadId? }.
  // Just-uploaded docs carry an upload_id (not a memory_id UUID), so we
  // forward whichever fields the caller has — the core endpoint resolves
  // them server-side.
  async deleteDocument(idOrPayload) {
    let payload;
    if (idOrPayload && typeof idOrPayload === 'object') {
      payload = {};
      if (idOrPayload.memoryId || idOrPayload.memory_id) payload.memory_id = idOrPayload.memoryId || idOrPayload.memory_id;
      if (idOrPayload.uploadId || idOrPayload.upload_id) payload.upload_id = idOrPayload.uploadId || idOrPayload.upload_id;
    } else {
      // Send the same value in BOTH slots so the server tries memory_id
      // first and falls back to upload_id without a second round-trip.
      payload = { memory_id: idOrPayload, upload_id: idOrPayload };
    }

    const attempts = [];
    const addAttempt = (candidate) => {
      if (!candidate || Object.keys(candidate).length === 0) return;
      const key = JSON.stringify(candidate);
      if (!attempts.some((entry) => entry.key === key)) {
        attempts.push({ key, payload: candidate });
      }
    };

    addAttempt(payload);
    if (payload.memory_id) addAttempt({ memory_id: payload.memory_id });
    if (payload.upload_id) addAttempt({ upload_id: payload.upload_id });

    let lastError;
    for (const attempt of attempts) {
      try {
        const { data } = await this.controlPlane.delete('/v1/proxy/knowledge/document', {
          data: attempt.payload,
        });
        return data;
      } catch (error) {
        lastError = error;
        const status = error?.response?.status;
        // Retry only on server-side mismatch; 4xx should surface immediately.
        if (status && status < 500) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  // ─── Connector catalog + status (canonical, mode-aware) ──────────
  // Renamed to *Catalog suffix to avoid collision with legacy methods:
  //   - getConnectorStatus()  → MCP queue status (different endpoint)
  //   - disconnectConnector() → control-plane OAuth disconnect

  /** Static catalog of all connectors HIVEMIND knows about. */
  async getConnectorCatalog() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/catalog');
    return data;
  }

  /**
   * Merged view: catalog × tenant connection state. Each entry has
   * { id, name, mode, authType, catalogStatus, connection|null }.
   */
  async getConnectorsCatalogStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/status');
    return data;
  }

  /** Per-connector status from canonical catalog endpoint. */
  async getCatalogConnector(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/connectors/${encodeURIComponent(id)}/status`);
    return data;
  }

  /**
   * Begin connect flow via canonical dispatcher. For OAuth: returns
   * { oauthStartUrl }. For api_key/connection_string: pass `body`.
   */
  async connectCatalogConnector(id, body = {}) {
    const { data } = await this.controlPlane.post(`/v1/proxy/connectors/${encodeURIComponent(id)}/connect`, body);
    return data;
  }

  /** Revoke + delete tokens via canonical dispatcher. */
  async disconnectCatalogConnector(id) {
    const { data } = await this.controlPlane.post(`/v1/proxy/connectors/${encodeURIComponent(id)}/disconnect`);
    return data;
  }

  // ─── Nango Connect (OAuth bridge) ──────────────────────────────
  // For connectors backed by Nango (slack, notion, github, linear, jira,
  // confluence, etc). Flow:
  //   1. FE asks backend for a short-lived connect session token
  //   2. FE opens Nango popup with @nangohq/frontend → nango.auth(provider)
  //   3. On popup success FE calls finalize so backend persists the
  //      (provider_key, connection_id) row to nango_connections.

  /**
   * Request a Nango Connect session for the given connector.
   * Backend looks up nango_provider from data/mcp-connectors.json.
   * Returns { connect_session_token, provider, host? }.
   */
  async getNangoConnectSession(connectorId) {
    const { data } = await this.controlPlane.post(
      '/v1/proxy/connectors/connect-session',
      { connector_id: connectorId },
    );
    return data;
  }

  /**
   * Persist the established Nango connection after the popup resolves.
   * Backend upserts NangoConnection row scoped by (userId, providerKey, orgId).
   */
  async finalizeNangoConnection(provider_key, connection_id) {
    const { data } = await this.controlPlane.post(
      '/v1/proxy/connectors/connect',
      { provider_key, connection_id },
    );
    return data;
  }

  /**
   * Start a Composio managed-auth connect flow for one toolkit (e.g.
   * 'linkedin'). Redirect-out, not a popup SDK like Nango — Composio hosts
   * its own OAuth consent page. Returns { redirect_url, connected_account_id,
   * expires_at }; caller opens redirect_url and polls GET /v1/connectors
   * (already the existing refetchOAuth) for the account to flip 'connected'.
   */
  async createComposioConnectLink(toolkitSlug, opts = {}) {
    const { toolkitMeta, callbackUrl } = opts;
    const { data } = await this.controlPlane.post(
      `/v1/connectors/composio/${encodeURIComponent(toolkitSlug)}/connect`,
      {
        ...(toolkitMeta ? {
          toolkit_meta: {
            composio_managed_auth_schemes: toolkitMeta.composioManagedAuthSchemes,
            no_auth: toolkitMeta.noAuth,
          },
        } : {}),
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      },
    );
    return data;
  }

  /** Connect a plain-API-key Composio toolkit (SerpApi, Firecrawl, ...). */
  async createComposioApiKeyConnection(toolkitSlug, apiKey) {
    const { data } = await this.controlPlane.post(
      `/v1/connectors/composio/${encodeURIComponent(toolkitSlug)}/connect-api-key`,
      { api_key: apiKey },
    );
    return data;
  }

  /** Browse Composio's full toolkit catalog (~1,100 toolkits), paginated. */
  async listComposioToolkits({ search = '', cursor = null, limit = 40, catalog = false } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set('search', search);
    if (cursor) params.set('cursor', cursor);
    if (catalog) params.set('catalog', 'all');
    const { data } = await this.controlPlane.get(`/v1/connectors/composio/toolkits?${params.toString()}`);
    return data;
  }

  /** Full tool list (name + description) for one Composio toolkit. */
  async getComposioToolkitTools(toolkitSlug) {
    const { data } = await this.controlPlane.get(`/v1/connectors/composio/toolkits/${encodeURIComponent(toolkitSlug)}/tools`);
    return data;
  }

  /** Disconnect a Composio toolkit connection for the current org. */
  async disconnectComposioToolkit(toolkitSlug) {
    const { data } = await this.controlPlane.post(`/v1/connectors/composio/${encodeURIComponent(toolkitSlug)}/disconnect`, {});
    return data;
  }

  // ─── Standalone X paid campaigns ─────────────────────────────
  async startXAdsOAuth(kind) {
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/oauth/${kind}/start`, {});
    return data;
  }

  async disconnectXAdsOAuth(kind) {
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/oauth/${kind}/disconnect`, {});
    return data;
  }

  async createXPost(text) {
    const { data } = await this.controlPlane.post('/v1/proxy/x-ads/posts', { text, confirmed: true });
    return data;
  }

  async deleteXPost(id) {
    const { data } = await this.controlPlane.delete(`/v1/proxy/x-ads/posts/${id}`, { data: { confirmed: true } });
    return data;
  }

  async getXAdsStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/x-ads/status');
    return data;
  }

  async getXAdsAccounts() {
    const { data } = await this.controlPlane.get('/v1/proxy/x-ads/accounts');
    return data;
  }

  async getXAdsFundingInstruments(accountId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/x-ads/accounts/${encodeURIComponent(accountId)}/funding-instruments`);
    return data;
  }

  async searchXAdsTargets(type, params = {}) {
    const { data } = await this.controlPlane.get(`/v1/proxy/x-ads/targeting/${type}`, { params });
    return data;
  }

  async getXAdsCampaigns() {
    const { data } = await this.controlPlane.get('/v1/proxy/x-ads/campaigns');
    return data;
  }

  async getXAdsCampaign(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/x-ads/campaigns/${id}`);
    return data;
  }

  async createXAdsCampaign(payload) {
    const { data } = await this.controlPlane.post('/v1/proxy/x-ads/campaigns', payload);
    return data;
  }

  async updateXAdsCampaign(id, payload) {
    const { data } = await this.controlPlane.patch(`/v1/proxy/x-ads/campaigns/${id}`, payload);
    return data;
  }

  async uploadXAdsCampaignImage(id, file) {
    const form = new FormData();
    form.append('image', file);
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/campaigns/${id}/image`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  async prepareXAdsCampaign(id) {
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/campaigns/${id}/prepare`, {});
    return data;
  }

  async publishXAdsCampaign(id, confirmationToken) {
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/campaigns/${id}/publish`, { confirmation_token: confirmationToken });
    return data;
  }

  async controlXAdsCampaign(id, action) {
    const { data } = await this.controlPlane.post(`/v1/proxy/x-ads/campaigns/${id}/${action}`, {});
    return data;
  }

  // ─── Unified AI Campaigns ───────────────────────────────────
  async getCampaignCapabilities() {
    const { data } = await this.controlPlane.get('/v1/campaigns/capabilities');
    return data;
  }

  async getCampaignSettings() {
    const { data } = await this.controlPlane.get('/v1/campaigns/settings');
    return data;
  }

  async updateCampaignSettings(autonomyMode) {
    const { data } = await this.controlPlane.patch('/v1/campaigns/settings', { autonomy_mode: autonomyMode });
    return data;
  }

  async getCampaignConnections() {
    const { data } = await this.controlPlane.get('/v1/campaigns/connections');
    return data;
  }

  async provisionCampaignConnections() {
    const { data } = await this.controlPlane.post('/v1/campaigns/connections/provision', {});
    return data;
  }

  async syncCampaignConnections() {
    const { data } = await this.controlPlane.post('/v1/campaigns/connections/sync', {});
    return data;
  }

  async startCampaignConnection(platform, returnPath, connectionKind = 'organic', accountRef = null) {
    const { data } = await this.controlPlane.post('/v1/campaigns/connections/connect', {
      platform,
      return_path: returnPath,
      connection_kind: connectionKind,
      account_ref: accountRef,
    });
    return data;
  }

  async disconnectCampaignConnection(accountRef) {
    const { data } = await this.controlPlane.post('/v1/campaigns/connections/disconnect', {
      account_ref: accountRef,
    });
    return data;
  }

  async getCampaignAdAccounts(accountRef) {
    const params = new URLSearchParams({ account_ref: accountRef });
    const { data } = await this.controlPlane.get(`/v1/campaigns/connections/ad-accounts?${params.toString()}`);
    return data;
  }

  async selectCampaignAdAccount(channel, accountRef, adAccountRef) {
    const { data } = await this.controlPlane.post('/v1/campaigns/connections/ad-accounts/select', {
      channel, account_ref: accountRef, ad_account_ref: adAccountRef,
    });
    return data;
  }

  async getCampaigns() {
    const { data } = await this.controlPlane.get('/v1/campaigns');
    return data;
  }

  async getCampaign(id) {
    const { data } = await this.controlPlane.get(`/v1/campaigns/${id}`);
    return data;
  }

  async getRuntimeArtifact(id) {
    const { data } = await this.controlPlane.get(`/v1/hq/artifacts/${encodeURIComponent(id)}`);
    return data;
  }

  async createCampaign(payload) {
    const { data } = await this.controlPlane.post('/v1/campaigns', payload);
    return data;
  }

  async deleteCampaign(id) {
    const { data } = await this.controlPlane.delete(`/v1/campaigns/${id}`);
    return data;
  }

  async controlCampaign(id, action) {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/${action}`, {});
    return data;
  }

  async approveCampaignAction(id, actionId) {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/actions/${actionId}/approve`, {});
    return data;
  }

  async controlCampaignAction(id, actionId, action) {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/actions/${actionId}/${action}`, {});
    return data;
  }

  async editCampaignAction(id, actionId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/campaigns/${id}/actions/${actionId}`, payload);
    return data;
  }

  async removeCampaignAction(id, actionId) {
    const { data } = await this.controlPlane.delete(`/v1/campaigns/${id}/actions/${actionId}`);
    return data;
  }

  async generateCampaignImage(id, actionId, payload = {}) {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/actions/${actionId}/assets/generate`, payload);
    return data;
  }

  async uploadCampaignImage(id, actionId, file, altText = '') {
    const form = new FormData();
    form.append('image', file); form.append('alt_text', altText);
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/actions/${actionId}/assets/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  }

  async selectCampaignImage(id, actionId, assetId) {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/actions/${actionId}/assets/${assetId}`, {});
    return data;
  }

  async removeCampaignImage(id, actionId, assetId) {
    const { data } = await this.controlPlane.delete(`/v1/campaigns/${id}/actions/${actionId}/assets/${assetId}`);
    return data;
  }

  async getCampaignImageBlob(contentUrl) {
    const { data } = await this.controlPlane.get(contentUrl, { responseType: 'blob' });
    return data;
  }

  async regenerateCampaign(id, feedback = '') {
    const { data } = await this.controlPlane.post(`/v1/campaigns/${id}/regenerate`, { feedback });
    return data;
  }

  /**
   * Batch relations summary for KB documents.
   * Returns { summaries: { <docId>: { total, byType:{Updates,Extends,Derives,...}, cluster_size } }}
   */
  async knowledgeRelationsSummary(docIds = []) {
    const { data } = await this.controlPlane.post('/v1/proxy/knowledge/relations-summary', { doc_ids: docIds });
    return data;
  }

  // Poll async ingest job status. Returns { status, progress, metadata:{stage,segments,promoted,document_id,...} }.
  async getKnowledgeStatus(jobId) {
    const { data } = await this.controlPlane.get('/v1/proxy/knowledge/status', {
      params: { job_id: jobId },
      timeout: 15000,
      // This durable loop retries transient failures. One missed poll is not a
      // user-action failure and must not raise a global outage notification.
      suppressServiceError: true,
    });
    return data;
  }

  // Async upload: the server returns a job id immediately (no 152s sync
  // request → no proxy 502 on large PDFs) and ingests in the background; we
  // poll status to completion. Transparent to callers — same return shape
  // ({ documentId, segmentCount, promotedCount }). Pass options.onStatus to
  // surface live stage/progress, options.signal to cancel.
  async uploadDocument(file, options = {}) {
    // Capture the selected mode once. Every poll and terminal response is
    // checked against this value so a later modal interaction cannot alter an
    // in-flight file's intended pipeline.
    const requestedIngestMode = normalizeIngestMode(options.ingestMode);
    const formData = new FormData();
    formData.append('file', file);
    if (options.tags) formData.append('tags', options.tags);
    if (options.containerTag) formData.append('containerTag', options.containerTag);
    if (options.targetScope) formData.append('targetScope', options.targetScope);
    // The upload route reads targetScope + projectId/projectIds for scope; it does
    // NOT read containerTag. Without this a project-scoped DOCUMENT arrived as
    // targetScope=project with an empty project list and was refused 404
    // scope_not_found — logged verbatim on a real batch as
    // "DENY project_scope_without_project_id targetScope=project projectIds=[]".
    // Images already sent it, which is why they succeeded in the same batch.
    if (options.projectId) formData.append('projectId', options.projectId);
    if (options.primaryTeamId) formData.append('primaryTeamId', options.primaryTeamId);
    formData.append('ingestMode', requestedIngestMode);
    // force=true re-ingests past the same-scope duplicate gate (user approved the
    // "upload anyway" prompt shown on a 409 duplicate_document).
    if (options.force) formData.append('force', 'true');
    formData.append('async', 'true');

    // 1. Kick off — fast 202 with job_id (only the byte-upload is awaited here).
    const { data: started } = await this.controlPlane.post('/v1/proxy/knowledge/upload?async=true', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // byte upload only; ingestion runs server-side
      maxBodyLength: 110 * 1024 * 1024, // 110MB
      maxContentLength: 110 * 1024 * 1024,
      onUploadProgress: options.onUploadProgress,
      signal: options.signal,
    });
    const startedMode = responseIngestMode(started);
    if (hasIngestModeMismatch(requestedIngestMode, startedMode)) {
      const error = new Error(`Ingest mode mismatch: requested ${requestedIngestMode}, server returned ${startedMode}.`);
      error.code = 'INGEST_MODE_MISMATCH';
      throw error;
    }

    // Back-compat: an older core (no async support) returns the sync result
    // directly (has documentId, no job_id) — pass it straight through.
    if (!started?.job_id) {
      if (hasIngestModeMismatch(requestedIngestMode, startedMode, { requireReturned: true })) {
        const error = new Error(`Ingest mode mismatch: requested ${requestedIngestMode}, server returned ${startedMode}.`);
        error.code = 'INGEST_MODE_MISMATCH';
        throw error;
      }
      return { ...started, ingestMode: startedMode };
    }

    // 2. Poll status until terminal.
    const jobId = started.job_id;
    // THE BYTES ARE IN AND THE SERVER OWNS THE JOB. Tell the caller now, so an upload QUEUE can
    // release its slot here instead of holding it for the whole server-side ingest. That ingest is
    // long and variable — measured `promote=134118ms` on one document — and the caller's slot was
    // pinned for all of it, so with a concurrency of 4 the 5th file sat untouched for minutes while
    // the user watched "Waiting to upload". The server already has its own BullMQ queue (cap 6),
    // which is the real throughput limit; gating on the client too just hid progress.
    options.onQueued?.({ job_id: jobId });
    const deadline = Date.now() + (options.timeoutMs || 10 * 60 * 1000);
    const pollMs = options.pollMs || 2500;
    let reportedMode = startedMode;
    // Terminal SUCCESS states. Keep this the single source of truth for "the job is done".
    const TERMINAL_OK = new Set(['ready', 'indexed', 'complete', 'completed']);
    while (Date.now() < deadline) {
      if (options.signal?.aborted) throw new Error('Upload cancelled');
      await new Promise((r) => setTimeout(r, pollMs));
      let st;
      try {
        st = await this.getKnowledgeStatus(jobId);
      } catch {
        continue; // transient — keep polling
      }
      const meta = st?.metadata || {};
      const counts = st?.counts || {};
      const detail = st?.progress_detail || meta?.progress_detail || {};
      // Doc fields may arrive nested under `metadata` (in-memory tracker path)
      // or flat at the top level (durable-queue Redis mirror). Read both so a
      // queued upload still resolves a real documentId.
      const docId = meta.document_id ?? st.document_id;
      const segs = meta.segmentCount ?? st.segmentCount ?? counts.segments;
      const promoted = meta.promotedCount ?? st.promotedCount ?? counts.memories;
      const candidates = meta.candidateCount ?? st.candidateCount ?? counts.candidates;
      const returnedMode = responseIngestMode(st);
      if (hasIngestModeMismatch(requestedIngestMode, returnedMode)) {
        const error = new Error(`Ingest mode mismatch: requested ${requestedIngestMode}, server returned ${returnedMode}.`);
        error.code = 'INGEST_MODE_MISMATCH';
        throw error;
      }
      if (returnedMode != null) reportedMode = returnedMode;
      if (options.onStatus) {
        options.onStatus({
          status: st.status, progress: st.progress, stage: meta.stage ?? st.stage,
          segments: segs ?? meta.segments, promoted: promoted ?? meta.promoted,
          processed: detail.processed ?? st.processed,
          total: detail.total ?? st.total,
          elapsedMs: detail.elapsed_ms,
          startedAt: detail.started_at ?? st.started_at ?? st.created_at,
          stageStartedAt: detail.stage_started_at,
          timings: detail.timings_ms,
          ingestMode: returnedMode ?? reportedMode ?? requestedIngestMode,
          evidenceOnly: st.evidence_only ?? meta.evidenceOnly,
          evidenceOnlyReason: st.evidence_only_reason ?? meta.evidenceOnlyReason,
        });
      }
      // ACCEPT EVERY TERMINAL SPELLING. The server marks a finished job `ready`; this waited only
      // for `indexed`, so a COMPLETED upload never satisfied the loop — it kept polling a finished
      // job until the 10-minute deadline and then threw "Ingestion timed out". Measured on a real
      // upload: `[kb-queue] ✓ … segs=44 promoted=11`, job status `ready` after ~26s, and the row sat
      // on "Processing" for ten minutes before reporting a failure that never happened.
      // Both words are in use historically (`ready` from the durable queue, `indexed` from the older
      // in-memory tracker), which is exactly how the two sides drifted apart. Accept both, and treat
      // any unrecognised terminal-looking state as terminal rather than hanging on it.
      if (TERMINAL_OK.has(st.status)) {
        if (hasIngestModeMismatch(requestedIngestMode, reportedMode, { requireReturned: true })) {
          const error = new Error(`Ingest mode mismatch: requested ${requestedIngestMode}, server returned ${reportedMode}.`);
          error.code = 'INGEST_MODE_MISMATCH';
          throw error;
        }
        return {
          documentId: docId,
          segmentCount: segs,
          candidateCount: candidates,
          promotedCount: promoted,
          ingestMode: reportedMode,
          evidenceOnly: st.evidence_only === true,
          evidenceOnlyReason: st.evidence_only_reason || null,
          memoryGenerationFailed: hasMemoryGenerationFailure(st),
          job_id: jobId,
        };
      }
      if (st.status === 'failed') {
        const failure = ingestFailureDetails(st);
        const error = new Error(failure.message);
        error.code = failure.code;
        throw error;
      }
    }
    throw new Error('Ingestion timed out');
  }

  // ─── Core: Image Ingestion (Groq vision pipeline) ─────────────
  // Single .jpg / .png / .webp → classify + extract via Groq Llama 4 Scout,
  // then route through the same ingest pipeline as text memories.
  // Hint is an optional "what is this" string the user types at upload to
  // bias the classifier (e.g. "Saturn receipt from Tuesday").
  async uploadImage(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.hint) formData.append('hint', options.hint);
    if (options.projectId) formData.append('projectId', options.projectId);
    const { data } = await this.controlPlane.post('/v1/proxy/ingest/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      maxBodyLength: 25 * 1024 * 1024,
      maxContentLength: 25 * 1024 * 1024,
      onUploadProgress: options.onUploadProgress,
      signal: options.signal,
    });
    return data;
  }

  // ─── Core: Enterprise Upload ────────────────────────────────

  async enterpriseDetect(file) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.controlPlane.post('/v1/proxy/enterprise/upload/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  }

  async enterpriseIngest(options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/enterprise/upload/ingest', {
      upload_id: options.upload_id,
      confirmed_type: options.confirmed_type,
      sheet_configs: options.sheet_configs,
      tags: options.tags,
      targetScope: options.targetScope,
      containerTag: options.containerTag,
      model: options.model,
    }, {
      timeout: 300000,
    });
    return data;
  }

  async getEnterpriseModel() {
    const { data } = await this.controlPlane.get('/v1/proxy/enterprise/model', {
      timeout: 5000,
    });
    return data;
  }

  // ─── Core: Gmail Connector (direct) ─────────────────────────

  async gmailConnect(targetScope = 'personal', services = null) {
    // services: 'all' or comma-separated subset, e.g. 'gmail,drive,calendar'
    const params = { target_scope: targetScope };
    if (services && services !== 'all') params.services = services;
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/gmail/connect', { params });
    return data;
  }

  async gmailStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/gmail/status');
    return data;
  }

  async gmailSync(settings = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/sync', settings);
    return data;
  }

  async regenerateMeetingIntelligence(id) {
    const { data } = await this.core.post(`/api/meetings/${id}/intelligence`, {});
    return data;
  }

  async gmailDisconnect() {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/disconnect');
    return data;
  }

  // ─── Connector auto-sync cadence (per-connector interval) ───
  async getConnectorCadence() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/cadence');
    return data;
  }

  // sync_interval_minutes: null = use global default; 15-43200 = override; pass null to also mean "off" alongside auto_sync=false handling client-side.
  async setConnectorCadence(provider, syncIntervalMinutes) {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/cadence', {
      provider,
      sync_interval_minutes: syncIntervalMinutes,
    });
    return data;
  }

  // ─── Claude.ai remote-MCP connector status + disconnect ────
  async claudeWebStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/claude-web/status');
    return data;
  }

  async claudeWebDisconnect() {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/claude-web/disconnect', {});
    return data;
  }

  // ─── Gmail v2: preview / ingest-selected / flush ────────────
  // Approval flow: caller fetches a preview with filter config applied,
  // user picks threads, caller posts thread_ids to /ingest-selected.
  // Flush nukes all Gmail-sourced memories (soft delete).
  async gmailPreview(filterConfig = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/preview', filterConfig);
    return data;
  }

  async gmailIngestSelected(threadIds, threadMode = 'thread') {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/ingest-selected', {
      thread_ids: threadIds,
      thread_mode: threadMode,
    });
    return data;
  }

  async gmailFlush() {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/flush', {});
    return data;
  }

  // ─── Core: Google Workspace (multi-service) ────────────────

  async googleWorkspaceStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/google/status');
    return data;
  }

  async googleWorkspaceDisconnect(provider) {
    // provider: 'gmail' | 'google_drive' | 'google_calendar' | ... | 'all'
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/google/disconnect', { provider });
    return data;
  }

  async searchConsoleStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/seo/search-console/status');
    return data;
  }

  async searchConsoleProperties() {
    const { data } = await this.controlPlane.get('/v1/proxy/seo/search-console/properties');
    return data;
  }

  async selectSearchConsoleProperty(siteUrl) {
    const { data } = await this.controlPlane.post('/v1/proxy/seo/search-console/property', { site_url: siteUrl });
    return data;
  }

  async collectSearchConsoleEvidence() {
    const { data } = await this.controlPlane.post('/v1/proxy/seo/search-console/collect', {});
    return data;
  }

  // Per-service sync config + run trigger
  async googleServiceSync(provider, config = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/google/sync', { provider, config });
    return data;
  }

  async workspaceHealth() {
    const { data } = await this.controlPlane.get('/v1/proxy/workspace/health');
    return data;
  }

  async workspaceCall(tool, args = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/workspace/call', { tool, args });
    return data;
  }

  async workspaceLiveQuery(query, options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/workspace/live-query', {
      query,
      memory_results: options.memoryResults || [],
      force_services: options.forceServices || null,
    });
    return data;
  }

  // ─── Core: Web Intelligence ─────────────────────────────────

  async submitWebSearch(params) {
    const { data } = await this.controlPlane.post('/v1/proxy/web/search/jobs', params);
    return data;
  }

  async submitWebCrawl(params) {
    const { data } = await this.controlPlane.post('/v1/proxy/web/crawl/jobs', params);
    return data;
  }

  // Tavily Research — async comprehensive report with citations.
  async submitWebResearch(params) {
    const { data } = await this.controlPlane.post('/v1/proxy/web/research/jobs', params);
    return data;
  }

  // Save a research report through the same canonical pipeline as the
  // Knowledge Base upload (POST /api/knowledge/upload) so it gets
  // document_first chunking, segment promotion, and relationship
  // enrichment. Returns { documentId, segmentCount, promotedCount,
  // promotedMemoryIds[] }.
  async saveResearchToKnowledge({ title, markdown, sources = [], tags = [], jobId, projectId, containerTag, targetScope = 'personal' }) {
    const formData = new FormData();
    // Build a synthetic markdown file. Append sources at the end so the
    // segmenter captures them as their own bibliography section.
    const safeTitle = (title || 'Research report').replace(/[\\/]/g, '-').slice(0, 120);
    const filename = `${safeTitle}.md`;
    const sourcesMd = sources.length
      ? '\n\n---\n\n## Sources\n\n' + sources.map((s, i) => `${i + 1}. [${s.title || s.url}](${s.url})`).join('\n')
      : '';
    const file = new File([(markdown || '') + sourcesMd], filename, { type: 'text/markdown' });
    formData.append('file', file);
    const allTags = ['web-research', ...(jobId ? [`research-job:${jobId}`] : []), ...tags].join(',');
    if (allTags) formData.append('tags', allTags);
    if (containerTag) formData.append('containerTag', containerTag);
    if (targetScope) formData.append('targetScope', targetScope);
    if (projectId) formData.append('projectId', projectId);
    const { data } = await this.controlPlane.post('/v1/proxy/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
    return data;
  }

  async getMemoryRelations(memoryId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/memories/${memoryId}/relationships`);
    return data;
  }

  async getMemoryClaims(memoryId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/memories/${encodeURIComponent(memoryId)}/claims`);
    return data;
  }

  async getWebJob(jobId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/web/jobs/${jobId}`);
    return data;
  }

  async listWebJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data } = await this.controlPlane.get(`/v1/proxy/web/jobs${qs ? '?' + qs : ''}`);
    return data;
  }

  async getWebUsage() {
    const { data } = await this.controlPlane.get('/v1/proxy/web/usage');
    return data;
  }

  async retryWebJob(jobId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/web/jobs/${jobId}/retry`);
    return data;
  }

  async saveWebResultToMemory(jobId, { resultIndex, title, tags } = {}) {
    const { data } = await this.controlPlane.post(`/v1/proxy/web/jobs/${jobId}/save-to-memory`, {
      resultIndex,
      title,
      tags,
    });
    return data;
  }

  async getWebAdminMetrics() {
    const { data } = await this.controlPlane.get('/v1/proxy/web/admin/metrics');
    return data;
  }

  async getWebMonthlyUsage() {
    const { data } = await this.controlPlane.get('/v1/proxy/web/usage/monthly');
    return data;
  }

  async getWebUsageExport({ from, to } = {}) {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await this.controlPlane.get('/v1/proxy/web/usage/export', { params });
    return data;
  }

  async getWebLimits() {
    const { data } = await this.controlPlane.get('/v1/proxy/web/limits');
    return data;
  }

  async checkDomainPolicy(url) {
    const { data } = await this.controlPlane.post('/v1/proxy/web/policy/check-domain', { url });
    return data;
  }

  // ─── Core: Memory Graph ─────────────────────────────────────

  async getGraph({ project, limit, scope, includeSuperseded = true } = {}) {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (scope) params.set('scope', scope);
    // Default ON: include superseded nodes so Updates chains render both
    // endpoints. FE dims is_latest=false rows + draws the Updates edge so
    // users see the full timeline instead of only the current revision.
    if (includeSuperseded) params.set('include_superseded', 'true');
    const qs = params.toString();
    const { data } = await this.controlPlane.get(`/v1/proxy/graph${qs ? `?${qs}` : ''}`);
    return data;
  }

  // Intelligent graph: memories + documents + entities + typed edges
  async getIntelligentGraph({ limit = 500, entity, memoryType, documentId, project } = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (entity) params.set('entity', entity);
    if (memoryType) params.set('memory_type', memoryType);
    if (documentId) params.set('document_id', documentId);
    if (project) params.set('project', project);
    const { data } = await this.controlPlane.get(`/v1/proxy/graph/intelligent?${params.toString()}`);
    return data;
  }

  // ─── Core: Evaluation ────────────────────────────────────────

  async runEvaluation(params) {
    const { data } = await this.controlPlane.post('/v1/proxy/evaluate/retrieval', params);
    return data;
  }

  async getEvalResults() {
    const { data } = await this.controlPlane.get('/v1/proxy/evaluate/results');
    return data;
  }

  async getEvalHistory() {
    const { data } = await this.controlPlane.get('/v1/proxy/evaluate/history');
    return data;
  }

  // ─── Core: MCP ───────────────────────────────────────────────

  async getMcpDescriptor(userId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/mcp/servers/${userId}`);
    return data;
  }

  async getStats() {
    const { data } = await this.controlPlane.get('/v1/proxy/stats');
    return data;
  }

  // ─── Core: SOTA Engine — Cognitive Frame ────────────────────

  async getCognitiveFrame(query, options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/cognitive-frame', {
      query,
      max_tokens: options.maxTokens || 4000,
      context_budget: options.contextBudget || 2000,
      project: options.project,
    });
    return data;
  }

  async checkCoherence(content, memoryType = 'fact') {
    const { data } = await this.controlPlane.post('/v1/proxy/coherence-check', { content, memory_type: memoryType });
    return data;
  }

  // ─── Core: SOTA Engine — Context Autopilot ──────────────────

  async monitorContext(sessionId, tokenCount) {
    const { data } = await this.controlPlane.post('/v1/proxy/context/monitor', { session_id: sessionId, token_count: tokenCount });
    return data;
  }

  async archiveContext(sessionId, turns) {
    const { data } = await this.controlPlane.post('/v1/proxy/context/archive', { session_id: sessionId, turns });
    return data;
  }

  async compactContext(sessionId, options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/context/compact', {
      session_id: sessionId,
      project: options.project,
      recent_messages: options.recentMessages,
    });
    return data;
  }

  // ─── Core: SOTA Engine — Bi-Temporal ────────────────────────

  async temporalAsOf({ transactionTime, validTime } = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/temporal/as-of', {
      transaction_time: transactionTime,
      valid_time: validTime,
    });
    return data;
  }

  async temporalDiff(timeA, timeB) {
    const { data } = await this.controlPlane.post('/v1/proxy/temporal/diff', { time_a: timeA, time_b: timeB });
    return data;
  }

  async temporalTimeline(memoryId) {
    const { data } = await this.controlPlane.post('/v1/proxy/temporal/timeline', { memory_id: memoryId });
    return data;
  }

  // ─── Core: SOTA Engine — Swarm (Stigmergic CoT) ────────────

  async swarmRecordThought(agentId, content, options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/swarm/thought', {
      agent_id: agentId,
      content,
      task_id: options.taskId,
      parent_thought_id: options.parentThoughtId,
      reasoning_type: options.reasoningType || 'step',
    });
    return data;
  }

  async swarmDepositTrace(agentId, { action, result, success, taskId } = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/swarm/trace', {
      agent_id: agentId,
      action,
      result,
      success,
      task_id: taskId,
    });
    return data;
  }

  async swarmFollowTraces(options = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/swarm/follow', {
      task_id: options.taskId,
      action: options.action,
      limit: options.limit || 20,
    });
    return data;
  }

  async swarmPrune(maxAgeDays) {
    const { data } = await this.controlPlane.post('/v1/proxy/swarm/prune', { max_age_days: maxAgeDays });
    return data;
  }

  // ─── Core: SOTA Engine — Byzantine Consensus ────────────────

  async evaluateConsensus(content, memoryType = 'fact', externalVotes = []) {
    const { data } = await this.controlPlane.post('/v1/proxy/consensus/evaluate', {
      content,
      memory_type: memoryType,
      external_votes: externalVotes,
    });
    return data;
  }

  // ─── Core: PageIndex (Hierarchical Memory Index) ─────────────

  async getPageIndexTree(options = {}) {
    const { depth = 4, rootPath = '/hivemind' } = options;
    const params = new URLSearchParams();
    if (depth) params.set('depth', String(depth));
    if (rootPath) params.set('rootPath', rootPath);
    const qs = params.toString();
    const { data } = await this.controlPlane.get(`/v1/proxy/pageindex/tree${qs ? `?${qs}` : ''}`);
    return data.tree || [];
  }

  async getPageIndexNodesForMemory(memoryId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/pageindex/memory/${memoryId}/nodes`);
    return data.nodes || [];
  }

  async moveMemoryToNode(memoryId, nodeId) {
    const { data } = await this.controlPlane.post(`/v1/proxy/pageindex/memory/${memoryId}/move`, {
      target_node_id: nodeId,
    });
    return data;
  }

  async searchPageIndex(query, options = {}) {
    const { limit = 20 } = options;
    const { data } = await this.controlPlane.post('/v1/proxy/search/pageindex', {
      query,
      limit,
    });
    return data.results || [];
  }

  async createPageIndexNode({ parentId, label, nodeType = 'topic' }) {
    const { data } = await this.controlPlane.post('/v1/proxy/pageindex/nodes', {
      parent_id: parentId,
      label,
      node_type: nodeType,
    });
    return data.node;
  }

  async deletePageIndexNode(nodeId, { reassignMemories = false, targetNodeId = null } = {}) {
    const { data } = await this.controlPlane.post(`/v1/proxy/pageindex/nodes/${nodeId}/delete`, {
      reassign_memories: reassignMemories,
      target_node_id: targetNodeId,
    });
    return data;
  }

  // ─── SSO Config (P0-5) ───────────────────────────────────────

  async getSsoConfig(orgId) {
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/sso`);
    return data;
  }

  async updateSsoConfig(orgId, payload) {
    const { data } = await this.controlPlane.put(`/v1/orgs/${orgId}/sso`, payload);
    return data;
  }

  async generateScimToken(orgId) {
    const { data } = await this.controlPlane.post(`/v1/orgs/${orgId}/sso/scim-token`);
    return data;
  }

  async revokeScimToken(orgId) {
    const { data } = await this.controlPlane.delete(`/v1/orgs/${orgId}/sso/scim-token`);
    return data;
  }

  // ─── Cognitive Layer (Cognition Settings) ──────────────────

  /**
   * GET /api/governance/cognition-settings
   * Returns { org_enabled: bool, personal_enabled: bool, projects: [{ id, name, self_evolve_enabled }] }
   */
  async getCognitionSettings() {
    const { data } = await this.controlPlane.get('/v1/proxy/governance/cognition-settings');
    return data;
  }

  /**
   * POST /api/governance/cognition-settings
   * Body variants:
   *   { org_enabled: bool }
   *   { personal_enabled: bool }
   *   { project_id: string, self_evolve_enabled: bool }
   * Returns { ok: true } or { error }
   */
  async updateCognitionSettings(payload) {
    const { data } = await this.controlPlane.post('/v1/proxy/governance/cognition-settings', payload);
    return data;
  }

  /**
   * POST /api/cognition/synthesize-now — dev one-shot dream trigger.
   * Admin/owner gated. Optional { lookback_hours } for a wide cross-time dream.
   * Returns { triggered, synth, compact, ms, skipped, reason }.
   */
  async triggerDreamNow(lookbackHours) {
    const body = Number(lookbackHours) > 0 ? { lookback_hours: Number(lookbackHours) } : {};
    // Server soft-races at ~25s and returns 202 {async:true} if the dream is still
    // running; give the request a little headroom above that so the inline path
    // (fast orgs returning counts) always lands rather than tripping the timeout.
    const { data } = await this.controlPlane.post('/v1/proxy/cognition/synthesize-now', body, { timeout: 35000 });
    return data;
  }

  /**
   * GET /api/cognition/status — loop health + per-org last run counts.
   * Used to poll for the result of an async (background) Dream-now run.
   */
  async getCognitionStatus() {
    const { data } = await this.controlPlane.get('/v1/proxy/cognition/status');
    return data;
  }

  /** GET /api/cognition/runs — audit history of dream runs (single-line stack). */
  async getCognitionRuns(limit = 20) {
    const { data } = await this.controlPlane.get(`/v1/proxy/cognition/runs?limit=${encodeURIComponent(limit)}`);
    return data;
  }

  /** GET /api/cognition/run-dreams?run_id=… — dreams a specific run produced. */
  async getCognitionRunDreams(runId) {
    const { data } = await this.controlPlane.get(`/v1/proxy/cognition/run-dreams?run_id=${encodeURIComponent(runId)}`);
    return data;
  }

  /** POST /api/cognition/run-delete — delete a run entry (admin); withDreams hard-deletes its dreams. */
  async deleteCognitionRun(runId, withDreams = false) {
    const { data } = await this.controlPlane.post(
      `/v1/proxy/cognition/run-delete?run_id=${encodeURIComponent(runId)}&with_dreams=${withDreams ? 'true' : 'false'}`,
      {},
    );
    return data;
  }

  // ─── Hermes: Agents ──────────────────────────────────────────

  /** GET /hermes/agents → { agents: [{id,org_id,tenant_id,name,config,status,created_at,updated_at}] } */
  async listHermesAgents() {
    const { data } = await this.controlPlane.get('/hermes/agents');
    return data;
  }

  /** POST /hermes/agents { name, config } → 201 { id, name, config, status } */
  async createHermesAgent(payload) {
    const { data } = await this.controlPlane.post('/hermes/agents', payload);
    return data;
  }

  /** PATCH /hermes/agents/:id { name?, config? } → 200 { id, name, config, status } */
  async updateHermesAgent(id, payload) {
    const { data } = await this.controlPlane.patch(`/hermes/agents/${encodeURIComponent(id)}`, payload);
    return data;
  }

  /** POST /hermes/agents/:id/run { task, context? } → 200 { job_id, status, result } | 502 | 409 */
  async runHermesAgent(id, payload) {
    const { data } = await this.controlPlane.post(`/hermes/agents/${encodeURIComponent(id)}/run`, payload);
    return data;
  }

  /** POST /hermes/agents/:id/pause → 200 { id, status:'paused' } */
  async pauseHermesAgent(id) {
    const { data } = await this.controlPlane.post(`/hermes/agents/${encodeURIComponent(id)}/pause`);
    return data;
  }

  /** POST /hermes/agents/:id/resume → 200 { id, status:'active' } */
  async resumeHermesAgent(id) {
    const { data } = await this.controlPlane.post(`/hermes/agents/${encodeURIComponent(id)}/resume`);
    return data;
  }

  /** GET /hermes/agents/:id/runs → { runs: [{id,action,status,payload,result,created_at,updated_at}] } */
  async listHermesRuns(id) {
    const { data } = await this.controlPlane.get(`/hermes/agents/${encodeURIComponent(id)}/runs`);
    return data;
  }

  /** Absolute URL to a run's HTML view (authed via session cookie on navigation). */
  hermesRunHtmlUrl(agentId, jobId) {
    const base = API_DEFAULTS.controlPlaneBase.replace(/\/$/, '');
    return `${base}/hermes/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(jobId)}/html`;
  }

  /** POST /hermes/agents/:id/runs/:jobId/share → { url, expires_at, ttl_days } (public temp link) */
  async shareHermesRun(agentId, jobId) {
    const { data } = await this.controlPlane.post(`/hermes/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(jobId)}/share`);
    return data;
  }

  /** POST /hermes/agents/:id/runs/:jobId/unshare → { ok } (revoke all links for the run) */
  async unshareHermesRun(agentId, jobId) {
    const { data } = await this.controlPlane.post(`/hermes/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(jobId)}/unshare`);
    return data;
  }

  /** GET /hermes/agents/:id/approvals → { approvals: [{id,action,status,payload,created_at}] } */
  async listHermesApprovals(id) {
    const { data } = await this.controlPlane.get(`/hermes/agents/${encodeURIComponent(id)}/approvals`);
    return data;
  }

  /** POST /hermes/agents/:id/approvals/:aid { decision:'approve'|'reject' } → { id, status } */
  async decideHermesApproval(id, aid, decision) {
    const { data } = await this.controlPlane.post(
      `/hermes/agents/${encodeURIComponent(id)}/approvals/${encodeURIComponent(aid)}`,
      { decision },
    );
    return data;
  }

  // ─── Hermes: Agent (single-tenant, v2) ──────────────────────

  /**
   * GET /hermes/agent → { agent: { id, name, status, config, … } }
   * Returns the tenant's single Hermes profile agent.
   * 404 when Hermes is not enabled (treat as notEnabled, not an error).
   */
  async getHermesAgent() {
    const { data } = await this.controlPlane.get('/hermes/agent');
    return data;
  }

  /**
   * GET /hermes/library → { items: [{ id, name, description, version, … }] }
   * Returns the tenant's library of runnable Hermes task templates.
   */
  async getHermesLibrary() {
    const { data } = await this.controlPlane.get('/hermes/library');
    return data;
  }

  /**
   * POST /hermes/library/:id/run { …payload } → { job_id, status, result? }
   * Runs a specific library item against the tenant's Hermes agent.
   * @param {string} id - Library item id
   * @param {object} payload - Arbitrary run parameters (task, context, …)
   */
  async runHermesLibrary(id, payload) {
    const { data } = await this.controlPlane.post(
      `/hermes/library/${encodeURIComponent(id)}/run`,
      payload,
    );
    return data;
  }

  // ─── Hermes: Persona (P2) ────────────────────────────────────

  /** PUT /hermes/agent/persona { name?, role?, behavior? } → { persona } */
  async getHermesPersona() {
    const { data } = await this.controlPlane.get('/hermes/agent/persona');
    return data;
  }

  async updateHermesPersona(payload) {
    const { data } = await this.controlPlane.put('/hermes/agent/persona', payload);
    return data;
  }

  // ─── Hermes: Skills (P2) ─────────────────────────────────────

  /** GET /hermes/agent/skills → { skills: [{ id, label, description, enabled }] } */
  async getHermesSkills() {
    const { data } = await this.controlPlane.get('/hermes/agent/skills');
    return data;
  }

  /** PUT /hermes/agent/skills [{ id, enabled }] → { skills } */
  async updateHermesSkills(skills) {
    const { data } = await this.controlPlane.put('/hermes/agent/skills', { skills });
    return data;
  }

  // ─── Hermes: Schedules (P2) ──────────────────────────────────

  /** GET /hermes/agent/schedules → { schedules: [...] } */
  async getHermesSchedules() {
    const { data } = await this.controlPlane.get('/hermes/agent/schedules');
    return data;
  }

  /** POST /hermes/agent/schedules { cron, prompt, name? } → { schedule } */
  async addHermesSchedule(payload) {
    const { data } = await this.controlPlane.post('/hermes/agent/schedules', payload);
    return data;
  }

  /** DELETE /hermes/agent/schedules/:jobId → { ok: true } */
  async deleteHermesSchedule(jobId) {
    const { data } = await this.controlPlane.delete(`/hermes/agent/schedules/${encodeURIComponent(jobId)}`);
    return data;
  }

  /** GET /hermes/agent/channels → { channels: [...] } */
  async getHermesChannels() {
    const { data } = await this.controlPlane.get('/hermes/agent/channels');
    return data;
  }

  /** POST /hermes/agent/channels { type, token } → { channel } */
  async connectHermesChannel(type, token) {
    const { data } = await this.controlPlane.post('/hermes/agent/channels', { type, token });
    return data;
  }

  /** GET /hermes/agent/memory → { memory: [...] } */
  async getHermesMemory() {
    const { data } = await this.controlPlane.get('/hermes/agent/memory');
    return data;
  }

  // ─── Hermes: Model (provider + model picker) ─────────────────

  /** GET /hermes/agent/model → { model: { provider, model } } */
  async getHermesModel() {
    const { data } = await this.controlPlane.get('/hermes/agent/model');
    return data;
  }

  /** GET /hermes/providers/:provider/models → { provider, models: [{id,name}] } */
  async getHermesProviderModels(provider) {
    const { data } = await this.controlPlane.get(`/hermes/providers/${encodeURIComponent(provider)}/models`);
    return data;
  }

  /** PUT /hermes/agent/model { provider, model, apiKey? } → { model } */
  async updateHermesModel(payload) {
    const { data } = await this.controlPlane.put('/hermes/agent/model', payload);
    return data;
  }

  // ─── Hermes: Web automation (browser pairing) ────────────────

  /** GET /hermes/agent/browser → { paired, online } */
  async getHermesBrowser() {
    const { data } = await this.controlPlane.get('/hermes/agent/browser');
    return data;
  }

  /** POST /hermes/agent/browser/pair → { token, connect_command, relay } */
  async pairHermesBrowser() {
    const { data } = await this.controlPlane.post('/hermes/agent/browser/pair');
    return data;
  }

  /** DELETE /hermes/agent/browser → { ok } */
  async unpairHermesBrowser() {
    const { data } = await this.controlPlane.delete('/hermes/agent/browser');
    return data;
  }

  // ─── WhatsApp QR Connector ──────────────────────────────────

  async whatsappQr(payload = {}) {
    const { data } = await this.controlPlane.post('/v1/connectors/whatsapp/qr', payload);
    return data;
  }

  async whatsappStatus() {
    const { data } = await this.controlPlane.get('/v1/connectors/whatsapp/status');
    return data;
  }

  async whatsappDisconnect() {
    const { data } = await this.controlPlane.post('/v1/connectors/whatsapp/disconnect');
    return data;
  }

  /**
   * sha256 of a File, in the browser. Used to ask the server "do you already have
   * this?" BEFORE spending the upload.
   *
   * crypto.subtle needs a secure context; on http:// it is undefined. Returns null
   * there so callers skip the pre-check and upload normally rather than breaking.
   */
  async fileChecksum(file) {
    try {
      if (!window.crypto?.subtle?.digest) return null;
      const buf = await file.arrayBuffer();
      const hash = await window.crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  }
  /**
   * Ask whether a checksum is already ingested, before uploading the bytes.
   *
   * Without this the client had to transfer an entire file to learn it was a
   * duplicate — a full 8.3 MB transfer to be told "already have it", and across a
   * 27-file batch, most of the elapsed time. Sends only the hash.
   *
   * Returns { duplicate, in_progress, stage, existing_document_id, existing_title,
   * promoted_count }. Fails OPEN: any error resolves to duplicate:false so a
   * pre-check problem can never block a real upload.
   */
  async precheckUpload(checksum, { scopeKey = null, targetScope = null, projectId = null, primaryTeamId = null } = {}) {
    if (!checksum) return { duplicate: false, in_progress: false };
    try {
      // Duplicates are PER-SCOPE. Without a scope the server matches the checksum
      // anywhere in the org, so uploading a file to a project was reported as a
      // duplicate because a copy already sat in My Space — and the client skipped
      // it before the scope-aware upload was ever attempted. Send the same scope
      // the upload will use so the pre-flight answers the same question.
      const { data } = await this.core.post('/api/knowledge/upload/precheck', {
        checksum,
        ...(scopeKey ? { scope_key: scopeKey } : {}),
        ...(targetScope ? { target_scope: targetScope } : {}),
        ...(projectId ? { project_id: projectId } : {}),
        ...(primaryTeamId ? { primary_team_id: primaryTeamId } : {}),
      });
      return data || { duplicate: false, in_progress: false };
    } catch {
      return { duplicate: false, in_progress: false };
    }
  }
  /**
   * Runway self-serve: server-authoritative price for a scope config.
   * config = { mode:'managed'|'self-hosted', dataGb, seats, tokens }.
   * Returns { mode, config, currency, rows:[{label,detail,amount}], monthly_total, setup_one_time }.
   */
  async runwayQuote(config) {
    const { data } = await this.controlPlane.post('/v1/billing/runway/quote', config);
    return data;
  }
  /**
   * Runway self-serve: start checkout for the configured scope. Returns
   * { checkout_url, session_id, monthly_total }. Caller redirects to checkout_url.
   */
  async runwayCheckout(config) {
    const { data } = await this.controlPlane.post('/v1/billing/runway/checkout', config);
    return data;
  }

}

const apiClient = new HiveMindApiClient();
export default apiClient;
