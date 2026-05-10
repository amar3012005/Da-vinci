import axios from 'axios';
import { API_DEFAULTS } from './theme';

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
    if (url && url !== this._coreBaseUrl) {
      this._coreBaseUrl = url;
      this.core.defaults.baseURL = url;
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
    const { data } = await this.controlPlane.post('/v1/account/delete', {
      confirm,
    }, {
      timeout: 300000,
    });
    return data;
  }

  /**
   * Delete account with SSE progress streaming.
   * @param {(progress: number, step: string) => void} onProgress
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  deleteAccountStreaming(onProgress) {
    return new Promise((resolve, reject) => {
      const baseURL = this.controlPlane.defaults.baseURL;
      const url = `${baseURL}/v1/account/delete`;

      fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ confirm: 'DELETE', stream: true }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          return reject(new Error(err.error || `HTTP ${res.status}`));
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (onProgress) onProgress(data.progress, data.step);
                if (data.done) {
                  if (data.success) {
                    resolve({ success: true });
                  } else {
                    reject(new Error(data.error || 'Deletion failed'));
                  }
                }
              } catch {
                // Ignore malformed SSE lines
              }
            }
          }
        }

        // If stream ended without a done event
        resolve({ success: true });
      }).catch(reject);
    });
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

  async updateMemberRole(orgId, userId, role) {
    const { data } = await this.controlPlane.patch(`/v1/orgs/${orgId}/members/${userId}`, { role });
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

  async listInvites(orgId) {
    const { data } = await this.controlPlane.get(`/v1/orgs/${orgId}/invites`);
    return data;
  }

  async revokeInvite(orgId, inviteId) {
    const { data } = await this.controlPlane.delete(`/v1/orgs/${orgId}/invites/${inviteId}`);
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

  async searchMemories(query, params = {}) {
    const { data } = await this.controlPlane.post('/v1/proxy/memories/search', { query, ...params });
    return data;
  }

  async quickSearch(query) {
    const { data } = await this.controlPlane.post('/v1/proxy/search/quick', { query });
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

  async startConnectorOAuth(provider, returnTo, targetScope = 'personal') {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/start`, {
      return_to: returnTo,
      target_scope: targetScope,
    });
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

  async deleteDocument(memoryId) {
    const { data } = await this.controlPlane.delete('/v1/proxy/knowledge/document', {
      data: { memory_id: memoryId },
    });
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

  async gmailConnect(targetScope = 'personal') {
    const { data } = await this.controlPlane.get('/v1/proxy/connectors/gmail/connect', {
      params: { target_scope: targetScope },
    });
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
    // limit semantics:
    //   undefined → omit param, server applies its default (large)
    //   0         → explicit "no cap" — server clamps to its 50k hard ceiling
    //   >0        → exact node budget
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (scope) params.set('scope', scope);
    const qs = params.toString();
    const { data } = await this.controlPlane.get(`/v1/proxy/graph${qs ? `?${qs}` : ''}`);
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
}

const apiClient = new HiveMindApiClient();
export default apiClient;
