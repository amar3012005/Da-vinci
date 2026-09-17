import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'AppShell.jsx'), 'utf8');

test('native Harness plan-limit turns use the shared app upgrade modal', () => {
  expect(source).toContain("window.addEventListener('dsh:turn-error', onHarnessTurnError);");
  expect(source).toContain("window.removeEventListener('dsh:turn-error', onHarnessTurnError);");
  expect(source).toContain("detail?.code !== PLAN_LIMIT_CODE");
  expect(source).toContain("plan: org?.plan || 'free'");
  expect(source).toContain("upgradeUrl: '/hivemind/app/billing'");
});
