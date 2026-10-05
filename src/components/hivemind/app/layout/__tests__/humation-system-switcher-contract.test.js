const fs = require('fs');
const path = require('path');

const topBarSource = fs.readFileSync(path.join(__dirname, '..', 'TopBar.jsx'), 'utf8');

test('agent navigation is text only while Brain and Voice retain their existing avatars', () => {
  expect(topBarSource).toContain('aria-label="Switch product"');
  expect(topBarSource).toContain("{ key: 'hivemind', label: 'BRAIN'");
  expect(topBarSource).toContain("{ key: 'hyperagents', label: 'OS'");
  expect(topBarSource).toContain("{ key: 'tara', label: 'VOICE'");
  expect(topBarSource).toContain('onSectionChange?.(section.key)');
  expect(topBarSource).toContain("aria-current={active ? 'page' : undefined}");
  const agentBranch = topBarSource.split("if (activeSection === 'hyperagents') {")[1].split('const active = activeSection === section.key;')[0];
  expect(agentBranch).not.toContain('<AgentAvatar');
  expect(agentBranch).toContain('aria-label={section.label}');
  expect(topBarSource).toContain('<AgentAvatar');
  expect(topBarSource).toContain('apiClient.listEmployees()');
  expect(topBarSource).toContain('hm-system-avatar');
});
