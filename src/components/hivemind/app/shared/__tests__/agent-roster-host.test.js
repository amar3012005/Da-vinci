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
