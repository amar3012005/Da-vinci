import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import HarnessChatSurface from '../HarnessChatSurface';
import apiClient from '../../shared/api-client';
jest.mock('../../shared/api-client', () => ({__esModule: true, default: {controlPlane: {post: jest.fn()}}}));
jest.mock('../../shared/harness-fetch', () => ({fetchHarness: jest.fn()}));
jest.mock('../../shared/native-app', () => ({isNativeApp: () => true}));
jest.mock('react-router-dom', () => ({useNavigate: () => jest.fn()}), {virtual: true});
jest.mock('react-i18next', () => ({useTranslation: () => ({t: (key, fallback) => fallback})}));
test('server-disabled iPhone admission shows a terminal explanation instead of an endless loader', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  apiClient.controlPlane.post.mockRejectedValue({response: {status: 503, data: {code: 'MOBILE_RUNNER_NOT_READY'}}});
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => {root.render(<HarnessChatSurface />);});
    expect(host.querySelector('[role="alert"]').textContent).toContain('Signing in again will not resolve');
    expect(host.querySelector('.animate-pulse')).toBeNull();
    expect(apiClient.controlPlane.post).toHaveBeenCalledTimes(1);
  } finally {act(() => root.unmount()); host.remove();}
});
