import axios from 'axios';
import { API_DEFAULTS } from './theme';

/**
 * HIVEMIND API Client
 *
 * Control plane (api.hivemind.davinciai.eu:8040):
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
 * Core (core.hivemind.davinciai.eu:8050):
 *   All memory, search, MCP, context, profile, evaluation, connector endpoints
 */

class HiveMindApiClient {
  constructor() {
    this.controlPlane = axios.create({
      baseURL: API_DEFAULTS.controlPlaneBase,
      withCredentials: true,
      timeout: 10000,
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
  getLoginUrl(returnTo, { idpHint } = {}) {
    const params = new URLSearchParams();
    if (returnTo) params.set('return_to', returnTo);
    if (idpHint) params.set('idp_hint', idpHint);
    const qs = params.toString();
    return `${this.controlPlane.defaults.baseURL}/auth/login${qs ? `?${qs}` : ''}`;
  }

  /**
   * Bootstrap response shape from control plane:
   * {
   *   user: { id, email, display_name, zitadel_user_id },
   *   organization: { id, name, slug } | null,
   *   onboarding: { needs_org_setup, has_api_key },
   *   connectivity: { core_api_base_url, core_health },
   *   client_support: ['claude', 'antigravity', 'vscode', 'remote-mcp']
   * }
   */
  async bootstrap() {
    const { data } = await this.controlPlane.get('/v1/bootstrap');
    // Set core API base from bootstrap connectivity
    if (data.connectivity?.core_api_base_url) {
      this.setCoreBaseUrl(data.connectivity.core_api_base_url);
    }
    return data;
  }

  async logout() {
    await this.controlPlane.post('/auth/logout');
  }

  // ─── Control Plane: Organizations ────────────────────────────

  async createOrg(name) {
    const { data } = await this.controlPlane.post('/v1/orgs', { name });
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
    const { data } = await this.core.get('/health');
    return data;
  }

  // ─── Core: Memories ──────────────────────────────────────────

  async listMemories(params = {}) {
    const { data } = await this.core.get('/api/memories', { params });
    return data;
  }

  async getMemory(id) {
    const { data } = await this.core.get(`/api/memories/${id}`);
    return data;
  }

  async createMemory(memory) {
    const { data } = await this.core.post('/api/memories', memory);
    return data;
  }

  async deleteMemory(id) {
    const { data } = await this.core.delete(`/api/memories/${id}`);
    return data;
  }

  async searchMemories(query, params = {}) {
    const { data } = await this.core.post('/api/memories/search', { query, ...params });
    return data;
  }

  async quickSearch(query) {
    const { data } = await this.core.post('/api/search/quick', { query });
    return data;
  }

  // ─── Core: Context & Profile ─────────────────────────────────

  async getContext(query) {
    const { data } = await this.core.post('/api/context', { query });
    return data;
  }

  async getProfile() {
    const { data } = await this.core.get('/api/profile');
    return data;
  }

  // ─── Core: Connectors (MCP) ─────────────────────────────────

  async getConnectorStatus() {
    const { data } = await this.core.get('/api/connectors/mcp/status');
    return data;
  }

  async listConnectorJobs() {
    const { data } = await this.core.get('/api/connectors/mcp/jobs');
    return data;
  }

  // ─── Control Plane: OAuth Connectors ──────────────────────

  async listOAuthConnectors() {
    const { data } = await this.controlPlane.get('/v1/connectors');
    return data;
  }

  async startConnectorOAuth(provider, returnTo) {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/start`, {
      return_to: returnTo,
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

  async resyncConnector(provider, { incremental = true } = {}) {
    const { data } = await this.controlPlane.post(`/v1/connectors/${provider}/resync`, { incremental });
    return data;
  }

  // ─── Core: Web Intelligence ─────────────────────────────────

  async submitWebSearch(params) {
    const { data } = await this.core.post('/api/web/search/jobs', params);
    return data;
  }

  async submitWebCrawl(params) {
    const { data } = await this.core.post('/api/web/crawl/jobs', params);
    return data;
  }

  async getWebJob(jobId) {
    const { data } = await this.core.get(`/api/web/jobs/${jobId}`);
    return data;
  }

  async listWebJobs(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const { data } = await this.core.get(`/api/web/jobs${qs ? '?' + qs : ''}`);
    return data;
  }

  async getWebUsage() {
    const { data } = await this.core.get('/api/web/usage');
    return data;
  }

  // ─── Core: Evaluation ────────────────────────────────────────

  async runEvaluation(params) {
    const { data } = await this.core.post('/api/evaluate/retrieval', params);
    return data;
  }

  async getEvalResults() {
    const { data } = await this.core.get('/api/evaluate/results');
    return data;
  }

  async getEvalHistory() {
    const { data } = await this.core.get('/api/evaluate/history');
    return data;
  }

  // ─── Core: MCP ───────────────────────────────────────────────

  async getMcpDescriptor(userId) {
    const { data } = await this.core.get(`/api/mcp/servers/${userId}`);
    return data;
  }

  async getStats() {
    const { data } = await this.core.get('/api/stats');
    return data;
  }
}

const apiClient = new HiveMindApiClient();
export default apiClient;
