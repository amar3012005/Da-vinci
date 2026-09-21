import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

test('lifecycle popup is owned by durable workspace notifications', () => {
  const dashboard = fs.readFileSync(path.join(dir, 'CompanyDashboard.jsx'), 'utf8');
  const notifications = fs.readFileSync(path.join(dir, '../layout/WorkspaceNotifications.jsx'), 'utf8');
  assert.doesNotMatch(dashboard, /claimHyperCompanyDayZeroReport/);
  assert.doesNotMatch(dashboard, /day0_report_email\?\.status/);
  assert.doesNotMatch(dashboard, /hm_day0_pipeline_done:/);
  assert.match(notifications, /listWorkspaceNotifications/);
  assert.match(notifications, /notice\.type !== 'lifecycle\.email\.sent'/);
  assert.match(notifications, /hm_lifecycle_notice_seen:/);
  assert.match(notifications, /variant="toast"/);
  assert.match(notifications, /<GmailMark/);
  assert.match(notifications, /createPortal/);
  assert.match(notifications, /markWorkspaceNotificationRead/);
  assert.match(notifications, /await markRead\(notice\)/);
  assert.match(notifications, /DAY 0 TASK FINISHED/);
  assert.match(notifications, /y: 'calc\(100% - 34px\)'/);
  assert.match(notifications, /-bottom-3 left-4/);
  assert.match(notifications, /apiClient\.hyperCompany\(\)/);
  assert.match(notifications, /<AgentAvatar/);
  assert.match(notifications, /company\.mission/);
  assert.match(notifications, /company\.icp/);
  assert.match(notifications, /company\.positioning/);
  const surface = fs.readFileSync(path.join(dir, '../shared/WorkspacePopupSurface.jsx'), 'utf8');
  assert.match(notifications, /z-\[2147483647\]/);
  assert.match(surface, /max-h-\[calc\(100dvh-28px\)\]/);
});

test('company web artifacts open in the shared in-app reader', () => {
  const dashboard = fs.readFileSync(path.join(dir, 'CompanyDashboard.jsx'), 'utf8');
  assert.match(dashboard, /setSelectedWebArtifact\(artifact\)/);
  assert.match(dashboard, /variant="reader"/);
  assert.match(dashboard, /hyperCompanyWebArtifactPreviewUrl/);
  assert.match(dashboard, /<iframe/);
  assert.match(dashboard, /hivemind — onboarding evidence/);
});

test('Runtime introduction uses the shared page-guide popup surface', () => {
  const dashboard = fs.readFileSync(path.join(dir, 'CompanyDashboard.jsx'), 'utf8');
  assert.match(dashboard, /hivemind — page guide/);
  assert.match(dashboard, /This is where Runtime operates your company/);
  assert.match(dashboard, /Choose priorities/);
});
