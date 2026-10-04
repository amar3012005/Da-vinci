/**
 * Type declarations for api-client.js
 */
declare const apiClient: {
  controlPlane: any;
  core: any;
  connectedEventSubscriptions: (args: Record<string, unknown>) => Promise<any>;
  bootstrap: () => Promise<any>;
  logout: () => Promise<void>;
  getPageIndexTree: () => Promise<any>;
};

export default apiClient;
