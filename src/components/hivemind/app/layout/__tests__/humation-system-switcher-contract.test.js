const fs = require('fs');
const path = require('path');

const topBarSource = fs.readFileSync(path.join(__dirname, '..', 'TopBar.jsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'index.css'), 'utf8');

test('uses the organisation employee roster for the joined Humation switcher', () => {
  expect(topBarSource).toContain('apiClient.listEmployees()');
  expect(topBarSource).toContain('employees[index] || FALLBACK_HUMATION_TEAM[index]');
  expect(topBarSource).toContain('aria-label="Switch product"');
  expect(topBarSource).toContain("{ key: 'hivemind', label: 'BRAIN'");
  expect(topBarSource).toContain("{ key: 'hyperagents', label: 'OS'");
  expect(topBarSource).toContain("{ key: 'tara', label: 'VOICE'");
});

test('animates only the active avatar and honors reduced motion', () => {
  expect(topBarSource).toContain("active ? 'hm-system-avatar-active");
  expect(cssSource).toContain('@keyframes hm-system-attentive-gesture');
  expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)');
  expect(cssSource).toContain('.hm-system-avatar-active { animation: none; }');
});
