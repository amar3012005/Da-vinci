import { openCompanyRuntime } from '../openCompanyRuntime';

test('opens mounted native Runtime without navigation or awakening', async () => {
  const start = jest.fn().mockResolvedValue(true);
  const navigate = jest.fn();
  await openCompanyRuntime(navigate, { location: { pathname: '/hivemind/app/employee/harness' }, __HIVEMIND_START_AGENT__: start });
  expect(navigate).not.toHaveBeenCalled();
  expect(start).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledWith('runtime');
});

test('ignores old resolver until the new route is mounted', async () => {
  const stale = jest.fn();
  const current = jest.fn().mockResolvedValue(true);
  const browser = { location: { pathname: '/hivemind/app/employees/mycompany' }, __HIVEMIND_START_AGENT__: stale };
  const navigate = jest.fn(() => { browser.__HIVEMIND_START_AGENT__ = current; });
  await openCompanyRuntime(navigate, browser);
  expect(navigate).toHaveBeenCalledWith('/hivemind/app/employee/harness', { replace: true });
  expect(stale).not.toHaveBeenCalled();
  expect(current).toHaveBeenCalledWith('runtime');
});

test('reports native selection failure without retrying actions', async () => {
  const start = jest.fn().mockResolvedValue(false);
  await expect(openCompanyRuntime(jest.fn(), { location: { pathname: '/hivemind/app/employee/harness' }, __HIVEMIND_START_AGENT__: start })).rejects.toThrow('Could not open Runtime');
  expect(start).toHaveBeenCalledTimes(1);
});
