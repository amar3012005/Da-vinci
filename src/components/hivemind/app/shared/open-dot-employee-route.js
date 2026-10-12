const CANONICAL_EMPLOYEE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read only a canonical employee UUID from the in-app Dot route. */
export function openDotEmployeeIdFromPath(pathname) {
  const match = /^\/hivemind\/app\/employee\/dots\/employee\/([^/]+)\/?$/.exec(pathname || '');
  return match && CANONICAL_EMPLOYEE_ID.test(match[1]) ? match[1] : null;
}

/** Return the in-app Dot workspace route for a bound canonical employee. */
export function openDotEmployeePath(employee) {
  if (!employee || typeof employee.id !== 'string' || !CANONICAL_EMPLOYEE_ID.test(employee.id)) return null;

  const policyRules = employee.policy_rules ?? employee.policyRules;
  const binding = policyRules?.open_dot_employee;
  const lifecycle = policyRules?.native_lifecycle ?? policyRules?.nativeLifecycle;
  const ready = binding?.version === 1
    && binding.state === 'bound'
    && employee.archived_at == null
    && employee.archivedAt == null
    && employee.status !== 'paused'
    && (!lifecycle || lifecycle.phase === 'active');

  return ready ? `/hivemind/app/employee/dots/employee/${employee.id}` : null;
}

/** Versioned Open Dot metadata claims this identity even while its route is provisioning. */
export function hasOpenDotEmployeeBinding(employee) {
  if (!employee || employee.id === 'runtime') return false;
  const policyRules = employee?.policy_rules ?? employee?.policyRules;
  return policyRules?.open_dot_employee?.version === 1;
}
