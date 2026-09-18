import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

test('onboarding start sends preferred_language and keeps the navbar LangSwitcher', () => {
  const onboarding = fs.readFileSync(path.join(dir, 'HyperOnboarding.jsx'), 'utf8');
  const topbar = fs.readFileSync(path.join(dir, '../layout/TopBar.jsx'), 'utf8');
  assert.match(onboarding, /preferred_language/);
  assert.match(onboarding, /<LangSwitcher \/>/);
  assert.match(topbar, /<LangSwitcher \/>/);
  assert.doesNotMatch(onboarding, /<form[\s\S]*<LangSwitcher \/>/);
});

test('awakening still is absolutely positioned so framer-motion transform cannot hide it', () => {
  const onboarding = fs.readFileSync(path.join(dir, 'HyperOnboarding.jsx'), 'utf8');
  assert.match(onboarding, /<picture className="fixed inset-0 block h-full w-full">/);
  assert.match(onboarding, /awakening-1920\.webp/);
});

test('company dashboard shows a one-shot Day 0 pipeline popup when the email is already sent', () => {
  const dashboard = fs.readFileSync(path.join(dir, 'CompanyDashboard.jsx'), 'utf8');
  assert.match(dashboard, /day0_report_email\?\.status !== 'sent'/);
  assert.match(dashboard, /hm_day0_pipeline_done:/);
  assert.match(dashboard, /Check your pipeline/);
  assert.match(dashboard, /Your HyperAgents have finished their first task/);
});
