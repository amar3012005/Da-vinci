import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

test('onboarding uses one inline language chooser and sends preferred_language', () => {
  const onboarding = fs.readFileSync(path.join(dir, 'HyperOnboarding.jsx'), 'utf8');
  const topbar = fs.readFileSync(path.join(dir, '../layout/TopBar.jsx'), 'utf8');
  assert.match(onboarding, /preferred_language/);
  assert.match(onboarding, /variant="link"/);
  assert.match(onboarding, /includeAutoDetect/);
  assert.match(onboarding, /choose preferred language/);
  assert.match(topbar, /<LangSwitcher \/>/);
  assert.doesNotMatch(onboarding, /<span[^>]*>Preferred language<\/span>/);
});

test('awakening still is absolutely positioned so framer-motion transform cannot hide it', () => {
  const onboarding = fs.readFileSync(path.join(dir, 'HyperOnboarding.jsx'), 'utf8');
  assert.match(onboarding, /<picture className="fixed inset-0 block h-full w-full">/);
  assert.match(onboarding, /awakening-1920\.webp/);
});

test('company dashboard shows a one-shot Day 0 pipeline popup when the email is already sent', () => {
  const dashboard = fs.readFileSync(path.join(dir, 'CompanyDashboard.jsx'), 'utf8');
  const onboarding = fs.readFileSync(path.join(dir, 'HyperOnboarding.jsx'), 'utf8');
  assert.doesNotMatch(dashboard, /claimHyperCompanyDayZeroReport/);
  assert.match(onboarding, /claimHyperCompanyDayZeroReport/);
  assert.match(dashboard, /day0_report_email\?\.status !== 'sent'/);
  assert.match(dashboard, /hm_day0_pipeline_done:/);
  assert.match(dashboard, /Check your pipeline/);
  assert.match(dashboard, /Your HyperAgents have finished their first task/);
});

test('HyperAgents emits the normalized UI language on every Harness turn', () => {
  const hyperAgents = fs.readFileSync(path.join(dir, '../pages/HyperAgents.jsx'), 'utf8');
  const matches = hyperAgents.match(/language: \(i18n\?\.language \|\| 'en'\)\.slice\(0, 2\)\.toLowerCase\(\)/g) || [];
  assert.equal(matches.length, 3);
});
