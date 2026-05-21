import axios from 'axios';
import { API_DEFAULTS } from './theme';

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

    this.loadStoredApiKey();
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
  getLoginUrl(returnTo) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/login${qs ? `?${qs}` : ''}`;
  }

  getGoogleLoginUrl(returnTo) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/google${qs ? `?${qs}` : ''}`;
  }

  getRegisterUrl(returnTo) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
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

  async updateProjectV2(projectId, payload) {
    const { data } = await this.controlPlane.patch(`/v1/projects/${projectId}`, payload);
    return data;
  }

  async archiveProjectV2(projectId) {
    const { data } = await this.controlPlane.delete(`/v1/projects/${projectId}`);
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

  // ─── Control Plane: Digital Employees ───────────────────────

  async listEmployees() {
    const { data } = await this.controlPlane.get('/v1/employees');
    return data;
  }

  async createEmployee(payload) {
    const { data } = await this.controlPlane.post('/v1/employees', payload);
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

  async archiveEmployee(id) {
    const { data } = await this.controlPlane.delete(`/v1/employees/${id}`);
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
   * Start a Stripe Checkout session for a plan upgrade. Returns
   *   { checkout_url, session_id }
   * Caller redirects window.location to checkout_url.
   */
  async createBillingCheckout(planId) {
    const { data } = await this.controlPlane.post('/v1/billing/checkout', { plan: planId });
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

  async getMemory(id) {
    const { data } = await this.controlPlane.get(`/v1/proxy/memories/${id}`);
    return data;
  }

  async createMemory(memory) {
    const { data } = await this.controlPlane.post('/v1/proxy/memories', memory);
    return data;
  }

  async deleteMemory(id) {
    const { data } = await this.controlPlane.delete(`/v1/proxy/memories/${id}`);
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

  async uploadDocument(file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (options.tags) formData.append('tags', options.tags);
    if (options.containerTag) formData.append('containerTag', options.containerTag);
    if (options.targetScope) formData.append('targetScope', options.targetScope);
    const { data } = await this.controlPlane.post('/v1/proxy/knowledge/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large file uploads
      maxBodyLength: 110 * 1024 * 1024, // 110MB
      maxContentLength: 110 * 1024 * 1024,
      // Parallel upload pool support — caller can pass progress + cancel signal
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

  async gmailDisconnect() {
    const { data } = await this.controlPlane.post('/v1/proxy/connectors/gmail/disconnect');
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

  async getGraph({ project, limit, scope } = {}) {
    const params = new URLSearchParams();
    if (project) params.set('project', project);
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (scope) params.set('scope', scope);
    const qs = params.toString();
    const { data } = await this.controlPlane.get(`/v1/proxy/graph${qs ? `?${qs}` : ''}`);
    return data;
  }

  // Intelligent graph: memories + documents + entities + typed edges
  async getIntelligentGraph({ limit = 500, entity, memoryType, documentId } = {}) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (entity) params.set('entity', entity);
    if (memoryType) params.set('memory_type', memoryType);
    if (documentId) params.set('document_id', documentId);
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
