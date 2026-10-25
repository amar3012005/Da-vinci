jest.mock('../runtime-admission', () => ({ fetchWithRuntimeAdmission: jest.fn() }));

const original = window.location;
const visit = href => { delete window.location; window.location = new URL(href); };
afterEach(() => { window.location = original; jest.resetModules(); });

const loadOn = async href => {
  visit(href);
  const { fetchWithRuntimeAdmission } = require('../runtime-admission');
  fetchWithRuntimeAdmission.mockResolvedValue({ ok: true, json: async () => ({ profiles: [{ id: 'turing', name: 'Turing' }, { id: 'runtime', name: 'Runtime' }] }) });
  const { agentRoster } = require('../agent-roster');
  return { profiles: await agentRoster.load(`scope-${href}`, { force: true }), url: fetchWithRuntimeAdmission.mock.calls[0][0] };
};

test("Brain's host reads the company roster, which it can serve, outside the Runtime room", async () => {
  const { profiles, url } = await loadOn('https://next.singulancelabs.com/hivemind/app/overview');
  expect(url).toBe('/api/hivemind/workspace-shell?resource=roster');
  expect(profiles).toEqual([{ id: 'turing', name: 'Turing' }]);
});

test("Runtime's host keeps its own employee API", async () => {
  const { url } = await loadOn('https://runtime-runner.singulancelabs.com/hivemind/app/employee/harness');
  expect(url).toBe('/api/hivemind/employees');
});
