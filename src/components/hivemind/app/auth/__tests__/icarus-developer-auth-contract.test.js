import fs from 'node:fs';
import path from 'node:path';

const authDir = path.resolve(__dirname, '..');
const login = fs.readFileSync(path.join(authDir, 'LoginPage.jsx'), 'utf8');
const verified = fs.readFileSync(path.join(authDir, 'CliVerified.jsx'), 'utf8');

test('ICARUS login is labeled as developer mode and never advertises platform account creation', () => {
  expect(login).toContain('Connect to HIVEMIND to continue ICARUS');
  expect(login).toContain('no HIVEMIND workspace, subscription, or enterprise account will be created');
  expect(login).toContain("intent: isIcarusDeveloperFlow(location.search) ? 'developer' : emailIntent");
});

test('ICARUS confirmation explains local memory and returns control to terminal', () => {
  expect(verified).toContain("mode === 'icarus'");
  expect(verified).toContain('Your ICARUS developer identity is ready');
  expect(verified).toContain('Save durable decisions');
  expect(verified).toContain('Best of luck building');
});
