import assert from 'node:assert/strict';
import test from 'node:test';
import { isCompanyOnboardingPath, normalizeWorkspacePath, requiresWorkspaceModeAccess } from '../src/components/hivemind/app/shared/workspace-mode-policy.mjs';

test('the workspace-mode gate matches case-insensitively', () => {
  for (const path of ['/hivemind/app/Employee/harness', '/hivemind/app/EMPLOYEE/dots', '/HIVEMIND/APP/CRM', '/hivemind/app/Tara', '/hivemind/app/Employees/MyCompany/agents']) {
    assert.equal(requiresWorkspaceModeAccess(path), true, path);
  }
});

test('the workspace-mode gate decodes escapes and collapses slashes', () => {
  for (const path of ['/hivemind/app/%45mployee/harness', '/hivemind/app/%2565mployee/harness', '//hivemind//app///employee/harness', '/hivemind/app%2Femployee/harness', '/hivemind/app/crm%2F', '/hivemind\\app\\tara']) {
    assert.equal(requiresWorkspaceModeAccess(path), true, path);
  }
  assert.equal(normalizeWorkspacePath('//HiveMind//App/%45mployee'), '/hivemind/app/employee');
  assert.equal(requiresWorkspaceModeAccess('/hivemind/app/%E0%A4%A/employee'), false);
});

test('company onboarding stays open in every spelling and other routes stay ungated', () => {
  for (const path of ['/hivemind/app/employees', '/hivemind/app/Employees/', '/hivemind/app/employees/MyCompany', '//hivemind/app/employees/mycompany/']) {
    assert.equal(isCompanyOnboardingPath(path), true, path);
    assert.equal(requiresWorkspaceModeAccess(path), false, path);
  }
  for (const path of ['/hivemind/app/overview', '/hivemind/app/Overview/new', '/hivemind/app/employeeship', '/hivemind/app/crmx']) {
    assert.equal(requiresWorkspaceModeAccess(path), false, path);
  }
});
