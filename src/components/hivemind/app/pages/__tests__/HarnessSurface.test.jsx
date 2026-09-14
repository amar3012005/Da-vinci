jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: {}, core: {} },
}));

import { harnessShellUrl } from '../HarnessSurface';

describe('HarnessSurface module cache', () => {
  it('keys the native shell by the release graph instead of a random mount id', () => {
    const rows = [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'release-abc' } }];
    expect(harnessShellUrl(rows)).toBe('/assets/harness-shell.js?rev=release-abc');
    expect(harnessShellUrl(rows)).toBe(harnessShellUrl(rows));
  });

  it('uses one stable fallback when an older runner omits a graph revision', () => {
    expect(harnessShellUrl([])).toBe('/assets/harness-shell.js?rev=current');
  });
});
