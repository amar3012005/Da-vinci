import axios from 'axios';
import { API_DEFAULTS } from './theme';

/**
 * HIVEMIND API Client
 * Talks to both control-plane (auth, keys, descriptors) and core (memories, search, MCP).
 * The core API base URL is resolved from bootstrap, never hardcoded.
 */

class HiveMindApiClient {
  constructor() {
    this.controlPlane = axios.create({
      baseURL: API_DEFAULTS.controlPlaneBase,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });

    this.core = axios.create({
      baseURL: API_DEFAULTS.coreApiBase,
      headers: { 'Content-Type': 'application/json' },
    });

    this._apiKey = null;
    this._coreBaseUrl = null;
  }

  /** Set the API key for core requests (from bootstrap or key creation) */
  setApiKey(key) {
    this._apiKey = key;
    this.core.defaults.headers['X-API-Key'] = key;
  }

  /** Update core base URL from bootstrap response */
  setCoreBaseUrl(url) {
    if (url && url !== this._coreBaseUrl) {
      this._coreBaseUrl = url;
      this.core.defaults.baseURL = url;
    }
  }

  // ─── Control Plane: Auth ─────────────────────────────────────

  getLoginUrl() {
    return `${this.controlPlane.defaults.baseURL}/auth/login`;
  }

  async bootstrap() {
    const { data } = await this.controlPlane.get('/v1/bootstrap');
    if (data.core_api_base_url) {
      this.setCoreBaseUrl(data.core_api_base_url);
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

  async listApiKeys() {
    const { data } = await this.controlPlane.get('/v1/api-keys');
    return data;
  }

  async createApiKey(label) {
    const { data } = await this.controlPlane.post('/v1/api-keys', { label });
    return data;
  }

  async revokeApiKey(id) {
    const { data } = await this.controlPlane.post(`/v1/api-keys/${id}/revoke`);
    return data;
  }

  // ─── Control Plane: Client Descriptors ───────────────────────

  async getDescriptors() {
    const { data } = await this.controlPlane.get('/v1/clients/descriptors');
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

  // ─── Core: Connectors ────────────────────────────────────────

  async getConnectorStatus() {
    const { data } = await this.core.get('/api/connectors/mcp/status');
    return data;
  }

  async listConnectorJobs() {
    const { data } = await this.core.get('/api/connectors/mcp/jobs');
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

// Singleton
const apiClient = new HiveMindApiClient();
export default apiClient;
