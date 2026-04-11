/**
 * Type declarations for api-client.js
 */
declare const apiClient: {
  controlPlane: any;
  core: any;
  bootstrap: () => Promise<any>;
  logout: () => Promise<void>;
  getPageIndexTree: () => Promise<any>;
};

export default apiClient;
