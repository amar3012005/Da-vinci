jest.mock('../../shared/api-client', () => ({
  __esModule: true,
  default: { controlPlane: {}, core: {} },
}));

import {
  HARNESS_BOOT_STAGES,
  LoadingSurface,
  harnessBootRevision,
  harnessShellUrl,
  nativeHarnessMounted,
} from '../HarnessSurface';

describe('HarnessSurface module cache', () => {
  beforeAll(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keys the native shell by the release graph instead of a random mount id', () => {
    const rows = [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'release-abc' } }];
    expect(harnessShellUrl(rows)).toBe('/assets/harness-shell.js?rev=release-abc');
    expect(harnessShellUrl(rows)).toBe(harnessShellUrl(rows));
  });

  it('uses one stable fallback when an older runner omits a graph revision', () => {
    expect(harnessShellUrl([])).toBe('/assets/harness-shell.js?rev=current');
  });

  it('uses the boot revision as the in-page module-system identity', () => {
    const rows = [{ kind: 'global', name: '__DSH_BOOT__', value: { rev: 'release-abc' } }];
    expect(harnessBootRevision(rows)).toBe('release-abc');
    expect(harnessBootRevision([])).toBeNull();
  });

  it('shows a bounded native boot progress indicator using real milestones', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { createRoot } = require('react-dom/client');
    const { act } = require('react');
    const reactRoot = createRoot(root);

    act(() => reactRoot.render(<LoadingSurface stage={2} />));

    const progress = root.querySelector('[role="progressbar"]');
    expect(progress).not.toBeNull();
    expect(progress.getAttribute('aria-valuenow')).toBe('3');
    expect(root.textContent).toContain(HARNESS_BOOT_STAGES[2]);
    expect(root.textContent).toContain('███████████████');

    act(() => reactRoot.unmount());
    root.remove();
  });

  it('keeps the host boot surface until native Harness has an interactive chat seat', () => {
    const root = document.createElement('div');
    expect(nativeHarnessMounted(root)).toBe(false);
    root.innerHTML = '<aside aria-label="HIVE chat sessions"></aside><div data-composer-seat=""></div>';
    expect(nativeHarnessMounted(root)).toBe(true);
  });
});
