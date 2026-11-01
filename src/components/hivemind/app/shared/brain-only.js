import { COMPANY_BRAIN_DOT_ID } from './company-brain-room';

/**
 * Roster entries that are HyperAgent employees: everything except Runtime and the Company Brain.
 * @param {Array<object> | undefined} roster - The cached employee roster.
 * @returns {Array<object>} The HyperAgent employees.
 */
export function hyperAgentEmployees(roster) {
  return (roster || []).filter(employee => {
    if (!employee || employee.id === 'runtime' || employee.id === COMPANY_BRAIN_DOT_ID) return false;
    const binding = (employee.policy_rules ?? employee.policyRules)?.open_dot_employee;
    return binding?.dot_id !== COMPANY_BRAIN_DOT_ID;
  });
}

/**
 * Whether the company is Brain-only: it has no HyperAgent employee and HyperAgents are not part of its plan.
 * Control carries no product entitlement today, so the rule is derived. `org.hyperagents_enabled === true` is the explicit
 * field a plan can set later to keep HyperAgent surfaces for a company that has no employee yet.
 * An unread roster never counts as empty, so a full company never flashes the Brain-only layout.
 * @param {{ org?: { hyperagents_enabled?: boolean } | null, roster?: Array<object>, rosterKnown?: boolean }} input - Company, roster and whether the roster was read.
 * @returns {boolean} True for a Brain-only company.
 */
export function brainOnlyFor({ org, roster, rosterKnown }) {
  if (org?.hyperagents_enabled === true) return false;
  return rosterKnown === true && hyperAgentEmployees(roster).length === 0;
}
