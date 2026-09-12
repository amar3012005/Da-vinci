const fs = require('fs');
const path = require('path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('the app shell and sidebar share one collapse state', () => {
  const shell = read('../AppShell.jsx');
  const sidebar = read('../Sidebar.jsx');

  expect(shell).toContain('collapsed={sidebarCollapsed}');
  expect(shell).toContain('onCollapsedChange={setSidebarCollapsed}');
  expect(shell).toContain("sidebarCollapsed ? '68px' : '260px'");
  expect(sidebar).toContain('onClick={() => onCollapsedChange?.(!collapsed)}');
  expect(sidebar).not.toContain('const [collapsed, setCollapsed]');
});
