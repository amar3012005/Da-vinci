const fs = require('fs');
const path = require('path');

const read = (relative) => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

test('the app shell and sidebar share one collapse state', () => {
  const shell = read('../AppShell.jsx');
  const sidebar = read('../Sidebar.jsx');

  expect(shell).toContain('collapsed={sidebarCollapsed}');
  expect(shell).toContain('onCollapsedChange={setSidebarCollapsed}');
  expect(shell).toContain("sidebarCollapsed ? '68px' : '300px'");
  expect(shell).toContain('sidebarCollapsed ? 34 : 150');
  expect(sidebar).toContain('onClick={() => onCollapsedChange?.(true)}');
  expect(sidebar).toContain('onClick={() => onCollapsedChange?.(false)}');
  expect(sidebar).toContain('const handleClose = () => onCollapsedChange?.(true);');
  expect(sidebar).toContain('const handleOpen = () => onCollapsedChange?.(false);');
  expect(sidebar).not.toContain('const [collapsed, setCollapsed]');
});

 test('expanded agent status has its own line beneath identity', () => {
  const sidebar = read('../Sidebar.jsx');
  const status = read('../AgentRoomStatus.jsx');
  expect(sidebar).toContain('<AgentRoomStatus room={room} />');
  expect(sidebar).toContain('{collapsed && teamMode');
  expect(status).toContain('mt-1 flex min-w-0 flex-wrap');
  expect(status).not.toContain('ml-auto');
 });

test('the embedded Dot route keeps team mode and restores its bound employee selection', () => {
  const sidebar = read('../Sidebar.jsx');
  expect(sidebar).toContain("location.pathname.startsWith('/hivemind/app/employee/dots')");
  expect(sidebar).toContain('openDotEmployeeIdFromPath(location.pathname)');
  expect(sidebar).toContain('setSelectedAgent(agent.id);');
});

test('the embedded Dot iframe receives the full remaining HIVE viewport', () => {
  const shell = read('../AppShell.jsx');
  expect(shell).toContain('buildOpenDotEmbedTarget(location.pathname.slice(openDotPrefix.length), location.search)');
  expect(shell).toContain('onOverview || onOpenDotWorkspace');
  expect(shell).toContain('min-w-0 overflow-hidden');
});
