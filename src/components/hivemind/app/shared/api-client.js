import axios from 'axios';
import { API_DEFAULTS } from './theme';
import { isPlanLimitError, extractPlanLimit, emitPlanLimit } from './planLimit';

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
    this._apiKeyStorageKey = 'hivemind_core_api_key';

    // Global plan-limit detector: on any 402 (or 403/429) carrying the
    // `plan_limit_exceeded` machine code, emit a window event so the single
    // <PlanLimitModal> mounted in AppShell can surface the upgrade prompt —
    // then re-reject so individual callers behave exactly as before.
    this._attachPlanLimitInterceptor(this.controlPlane);
    this._attachPlanLimitInterceptor(this.core);

    this.loadStoredApiKey();
  }

  _attachPlanLimitInterceptor(instance) {
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isPlanLimitError(error)) {
          emitPlanLimit(extractPlanLimit(error));
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
  getLoginUrl(returnTo, idpHint) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (idpHint) params.set('idp_hint', idpHint); // microsoft | apple | google — federated via ZITADEL
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/login${qs ? `?${qs}` : ''}`;
  }

  getGoogleLoginUrl(returnTo) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/google${qs ? `?${qs}` : ''}`;
  }

  getRegisterUrl(returnTo, idpHint) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (idpHint) params.set('idp_hint', idpHint);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/register${qs ? `?${qs}` : ''}`;
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

  /** Company operating dashboard (HyperAgents hero) — persisted onboarding state. */
  async hyperCompany() {
    const { data } = await this.controlPlane.get('/v1/hyper/company');
    return data;
  }

  /** Open (or create) the workroom for a dashboard task. */
  async openHyperTask(taskId) {
    const { data } = await this.controlPlane.post('/v1/hyper/tasks/open', { task_id: taskId });
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

  async updateOrganizationProfile(orgId, companyProfile) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/profile`, {
      company_profile: companyProfile,
    });
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

  async createHyperRoom(payload) {
    const { data } = await this.controlPlane.post('/v1/hyper-rooms', payload);
    return data;
  }

  async getHyperRoom(roomId) {
    const { data } = await this.controlPlane.get(`/v1/hyper-rooms/${roomId}`);
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
   * Self-host connection status (polled during onboarding).
   * Returns { registered, reachable, kind?, transport? }
   */
  async selfHostStatus(apiKey) {
    const { data } = await this.controlPlane.post('/v1/selfhost/status', { apiKey });
    return data;
  }

  async unlockPlatformAdmin(passkey) {
    const { data } = await this.controlPlane.post('/admin/api/platform/unlock', { passkey });
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
    const { data } = await this.controlPlane.get('/v1/proxy/health');
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
    });
    return data;
  }

  // Async upload: the server returns a job id immediately (no 152s sync
  // request → no proxy 502 on large PDFs) and ingests in the background; we
  // poll status to completion. Transparent to callers — same return shape
  // ({ documentId, segmentCount, promotedCount }). Pass options.onStatus to
  // surface live stage/progress, options.signal to cancel.
  async uploadDocument(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.tags) formData.append('tags', options.tags);
    if (options.containerTag) formData.append('containerTag', options.containerTag);
    if (options.targetScope) formData.append('targetScope', options.targetScope);
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

    // Back-compat: an older core (no async support) returns the sync result
    // directly (has documentId, no job_id) — pass it straight through.
    if (!started?.job_id) return started;

    // 2. Poll status until terminal.
    const jobId = started.job_id;
    const deadline = Date.now() + (options.timeoutMs || 10 * 60 * 1000);
    const pollMs = options.pollMs || 2500;
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
      // Doc fields may arrive nested under `metadata` (in-memory tracker path)
      // or flat at the top level (durable-queue Redis mirror). Read both so a
      // queued upload still resolves a real documentId.
      const docId = meta.document_id ?? st.document_id;
      const segs = meta.segmentCount ?? st.segmentCount;
      const promoted = meta.promotedCount ?? st.promotedCount;
      const candidates = meta.candidateCount ?? st.candidateCount;
      if (options.onStatus) {
        options.onStatus({ status: st.status, progress: st.progress, stage: meta.stage, segments: segs ?? meta.segments, promoted: promoted ?? meta.promoted });
      }
      if (st.status === 'indexed') {
        return {
          documentId: docId,
          segmentCount: segs,
          candidateCount: candidates,
          promotedCount: promoted,
          job_id: jobId,
        };
      }
      if (st.status === 'failed') {
        throw new Error(st.error || 'Ingestion failed');
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

}

const apiClient = new HiveMindApiClient();
export default apiClient;
