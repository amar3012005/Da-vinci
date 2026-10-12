const OPEN_DOT_EMPLOYEE_ORIGIN = 'https://dots.singulancelabs.com';

/** Return the authenticated Dot entry only for a canonical employee whose binding is ready. */
export function openDotEmployeeHref(employee) {
  if (!employee || typeof employee.id !== 'string' || !employee.id || employee.id === 'runtime') return null;

  const policyRules = employee.policy_rules ?? employee.policyRules;
  const binding = policyRules?.open_dot_employee;
  const lifecycle = policyRules?.native_lifecycle ?? policyRules?.nativeLifecycle;
  const ready = binding?.version === 1
    && binding.state === 'bound'
    && employee.archived_at == null
    && employee.archivedAt == null
    && employee.status !== 'paused'
    && (!lifecycle || lifecycle.phase === 'active');

  return ready
    ? `${OPEN_DOT_EMPLOYEE_ORIGIN}/employees/${encodeURIComponent(employee.id)}`
    : null;
}

/** Versioned Open Dot metadata claims this identity even while its route is provisioning. */
export function hasOpenDotEmployeeBinding(employee) {
  if (!employee || employee.id === 'runtime') return false;
  const policyRules = employee?.policy_rules ?? employee?.policyRules;
  return policyRules?.open_dot_employee?.version === 1;
}
