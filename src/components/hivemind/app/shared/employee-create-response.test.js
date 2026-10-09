import { createEmployeeAndRefresh, employeeFromCreateResponse, mergeCreatedEmployee } from './employee-create-response';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

describe('authoritative employee creation response', () => {
  test('closes the creation workflow while the roster refresh is still pending', async () => {
    const creation = deferred();
    const roster = deferred();
    const response = { employee: { id: 'new-employee', name: 'Monny', status: 'setup' } };
    const create = jest.fn(() => creation.promise);
    const accept = jest.fn();
    const refresh = jest.fn(() => roster.promise);
    const onRefreshError = jest.fn();
    const result = createEmployeeAndRefresh({ create, payload: { name: 'Monny' }, accept, refresh, onRefreshError });
    expect(accept).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    creation.resolve(response);
    expect(await result).toBe(response);
    expect(accept).toHaveBeenCalledWith(response);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    roster.resolve();
    await Promise.resolve();
    expect(onRefreshError).not.toHaveBeenCalled();
  });

  test('handles refresh failure without rejecting creation or retrying its POST', async () => {
    const error = Error('roster unavailable');
    const create = jest.fn(async () => ({ employee: { id: 'new-employee', status: 'setup' } }));
    const onRefreshError = jest.fn();
    await expect(createEmployeeAndRefresh({ create, payload: {}, accept: jest.fn(),
      refresh: async () => { throw error; }, onRefreshError })).resolves.toHaveProperty('employee.id', 'new-employee');
    await Promise.resolve();
    await Promise.resolve();
    expect(onRefreshError).toHaveBeenCalledWith(error);
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('failed POST never inserts an employee or starts a roster reconciliation', async () => {
    const accept = jest.fn();
    const refresh = jest.fn();
    await expect(createEmployeeAndRefresh({ create: async () => { throw Error('create rejected'); },
      payload: {}, accept, refresh, onRefreshError: jest.fn() })).rejects.toThrow('create rejected');
    expect(accept).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test('merges a server-returned record once without inventing ready or awake state', () => {
    const existing = [{ id: 'old', name: 'Existing' }];
    const response = { employee: { id: 'new', name: 'Monny', status: 'setup', onboarding_phase: 'responsibilities' } };
    const once = mergeCreatedEmployee(existing, response);
    const twice = mergeCreatedEmployee(once, response);
    expect(existing).toHaveLength(1);
    expect(twice).toHaveLength(2);
    expect(twice[1]).toEqual(response.employee);
    expect(employeeFromCreateResponse({ employee_id: 'direct', status: 'pending' })).toEqual({ employee_id: 'direct', id: 'direct', status: 'pending' });
    expect(mergeCreatedEmployee(existing, { status: 'accepted' })).toBe(existing);
  });

  test('updates an existing record instead of duplicating it', () => {
    expect(mergeCreatedEmployee([{ id: 'same', name: 'Monny', status: 'setup' }],
      { employee: { id: 'same', status: 'waiting' } })).toEqual([{ id: 'same', name: 'Monny', status: 'waiting' }]);
  });
});
