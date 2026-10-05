const fs = require('fs');
const path = require('path');

const topBarSource = fs.readFileSync(path.join(__dirname, '..', 'TopBar.jsx'), 'utf8');

test('product navigation keeps accessible text without character avatars', () => {
  expect(topBarSource).toContain('aria-label="Switch product"');
  expect(topBarSource).toContain("{ key: 'hivemind', label: 'BRAIN'");
  expect(topBarSource).toContain("{ key: 'hyperagents', label: 'OS'");
  expect(topBarSource).toContain("{ key: 'tara', label: 'VOICE'");
  expect(topBarSource).toContain('onSectionChange?.(section.key)');
  expect(topBarSource).toContain("aria-current={active ? 'page' : undefined}");
  expect(topBarSource).not.toContain('AgentAvatar');
  expect(topBarSource).not.toContain('apiClient.listEmployees()');
  expect(topBarSource).not.toContain('hm-system-avatar');
});
