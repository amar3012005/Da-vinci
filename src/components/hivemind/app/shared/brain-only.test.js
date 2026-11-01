import { brainOnlyFor, hyperAgentEmployees } from './brain-only';

const ravi = { id: 'emp-1', name: 'Ravi' };
const brainBound = { id: 'emp-brain', name: 'Company Brain', policy_rules: { open_dot_employee: { version: 1, dot_id: 'dot_company_brain', state: 'ready' } } };

test('a company with no HyperAgent employee is Brain-only once its roster was read', () => {
  expect(brainOnlyFor({ org: {}, roster: [], rosterKnown: true })).toBe(true);
  expect(brainOnlyFor({ org: {}, roster: [{ id: 'runtime' }, { id: 'dot_company_brain' }], rosterKnown: true })).toBe(true);
});

test('the Company Brain bound to an employee row is not a HyperAgent employee', () => {
  expect(hyperAgentEmployees([brainBound, ravi])).toEqual([ravi]);
});

test('a company with any HyperAgent employee is full', () => {
  expect(brainOnlyFor({ org: {}, roster: [ravi], rosterKnown: true })).toBe(false);
});

test('an unread roster never counts as empty, so a full company does not flash the Brain-only layout', () => {
  expect(brainOnlyFor({ org: {}, roster: [], rosterKnown: false })).toBe(false);
  expect(brainOnlyFor({ org: {}, roster: undefined, rosterKnown: undefined })).toBe(false);
});

test('a plan that carries HyperAgents keeps the full layout for a company with no employee yet', () => {
  expect(brainOnlyFor({ org: { hyperagents_enabled: true }, roster: [], rosterKnown: true })).toBe(false);
});
