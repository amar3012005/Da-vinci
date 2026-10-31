jest.mock('../runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn() }));

const original = window.location;
const visit = href => { delete window.location; window.location = new URL(href); };
afterEach(() => { window.location = original; jest.resetModules(); });

const json = body => ({ ok: true, headers: { get: () => 'application/json' }, json: async () => body });
const html = { ok: true, headers: { get: () => 'text/html' }, json: async () => { throw new SyntaxError('Unexpected token <'); } };
const team = { profiles: [{ id: 'turing', name: 'Turing' }, { id: 'runtime', name: 'Runtime' }] };

const loadOn = async (href, ...responses) => {
  visit(href);
  const { fetchWithRuntimeAdmission } = require('../runtime-admission');
  fetchWithRuntimeAdmission.mockReset();
  responses.forEach(response => fetchWithRuntimeAdmission.mockResolvedValueOnce(response));
  const { agentRoster } = require('../agent-roster');
  return { profiles: await agentRoster.load(`scope-${href}`, { force: true }), urls: fetchWithRuntimeAdmission.mock.calls.map(call => call[0]) };
};

test('every host reads the company roster, so the sidebar never needs Runtime', async () => {
  for (const href of ['https://next.singulancelabs.com/hivemind/app/overview', 'https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness']) {
    const { profiles, urls } = await loadOn(href, json(team));
    expect(urls).toEqual(['/api/hivemind/workspace-shell?resource=roster']);
    expect(profiles).toEqual([{ id: 'turing', name: 'Turing' }]);
  }
});

test('Runtime host falls back to the native employee API when the company roster answers HTML', async () => {
  const { profiles, urls } = await loadOn('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness', html, json(team));
  expect(urls).toEqual(['/api/hivemind/workspace-shell?resource=roster', '/api/hivemind/employees']);
  expect(profiles).toEqual([{ id: 'turing', name: 'Turing' }]);
});

test('an HTML answer from both sources is an error, never a parse crash', async () => {
  await expect(loadOn('https://runtime-runner.singulancelabs.com/x', html, html)).rejects.toThrow('not JSON');
});

describe('packaged app without a runner session', () => {
  const company = { onboarded: true, company: { team: [
    { id: 'u1', name: 'Feynmann', role: 'User & Market Researcher', policy_rules: { appearance: { seed: 'x' } } },
    { id: 'runtime', name: 'Runtime' }, { name: 'no id' },
  ] } };
  const unauthorized = { ok: false, status: 401, headers: { get: () => 'application/json' } };

  test('falls back to the Control team, mapped to sidebar profiles', async () => {
    jest.doMock('../native-app', () => ({ isNativeApp: () => true }));
    jest.doMock('../api-client', () => ({ __esModule: true, default: { hyperCompany: jest.fn().mockResolvedValue(company) } }));
    const { profiles } = await loadOn('https://next.singulancelabs.com/hivemind/app/overview', unauthorized);
    expect(profiles).toEqual([{ id: 'u1', name: 'Feynmann', role: 'User & Market Researcher', policy_rules: { appearance: { seed: 'x' } }, policyRules: { appearance: { seed: 'x' } } }]);
  });

  test('still reports the runner error when Control has no team', async () => {
    jest.doMock('../native-app', () => ({ isNativeApp: () => true }));
    jest.doMock('../api-client', () => ({ __esModule: true, default: { hyperCompany: jest.fn().mockResolvedValue({ onboarded: false }) } }));
    await expect(loadOn('https://next.singulancelabs.com/hivemind/app/overview', unauthorized)).rejects.toThrow('team unavailable');
  });

  test('web never reads the Control team', async () => {
    const hyperCompany = jest.fn().mockResolvedValue(company);
    jest.doMock('../native-app', () => ({ isNativeApp: () => false }));
    jest.doMock('../api-client', () => ({ __esModule: true, default: { hyperCompany } }));
    await expect(loadOn('https://next.singulancelabs.com/hivemind/app/overview', unauthorized)).rejects.toThrow('team unavailable');
    expect(hyperCompany).not.toHaveBeenCalled();
  });
});
