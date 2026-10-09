// Only a successful create response can enter the roster. Lifecycle state stays
// exactly as reported by the backend; appearing here never means ready or awake.
export function employeeFromCreateResponse(response) {
  const candidate = response?.employee || response;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const id = candidate.id || candidate.employee_id;
  return typeof id === 'string' && id.trim() ? { ...candidate, id } : null;
}

export function mergeCreatedEmployee(employees, response) {
  const created = employeeFromCreateResponse(response);
  if (!created) return employees;
  const existing = employees.findIndex(employee => employee.id === created.id);
  if (existing < 0) return [...employees, created];
  return employees.map((employee, index) => index === existing ? { ...employee, ...created } : employee);
}

// Resolve after the authoritative POST, not after an unrelated roster read.
// A failed background read must never turn a successful creation into a failed
// dialog that encourages another POST and a duplicate employee.
export async function createEmployeeAndRefresh({ create, payload, accept, refresh, onRefreshError }) {
  const response = await create(payload);
  accept(response);
  void Promise.resolve().then(refresh).catch(onRefreshError);
  return response;
}
