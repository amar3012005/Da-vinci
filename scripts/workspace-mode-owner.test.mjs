import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('workspace mode switches keep the public shell on next', () => {
  const source = fs.readFileSync(new URL('../src/components/hivemind/app/shared/workspace-mode.js', import.meta.url), 'utf8');
  const policy = fs.readFileSync(new URL('../src/components/hivemind/app/shared/workspace-mode-policy.mjs', import.meta.url), 'utf8');
  const destination = vm.runInNewContext(`${policy.replaceAll('export function', 'function')}\n${source.replace(/^import .*;\n/m, '').replaceAll('export function', 'function')}; workspaceModeDestination`);
  const brain = 'https://next.singulancelabs.com';
  const runtime = 'https://runtime-runner.singulancelabs.com';
  const room = '/hivemind/app/employee/harness';
  for (const path of ['/hivemind/app/employees', '/hivemind/app/employees/mycompany']) {
    assert.equal(destination(path, brain), path);
    assert.equal(destination(path, runtime), `${brain}${path}`);
  }
  assert.equal(destination(room, brain), room);
  assert.equal(destination(room, runtime), `${brain}${room}`);
  assert.equal(destination('/hivemind/app/overview/new', runtime), `${brain}/hivemind/app/overview/new`);
  assert.equal(destination('/hivemind/app/overview/new', brain), '/hivemind/app/overview/new');
  assert.equal(destination('/hivemind/app/tara', runtime), `${brain}/hivemind/app/tara`);
  assert.equal(destination(room, 'http://localhost:3000'), room);
  const savedBrain = '/hivemind/app/overview/session/saved-brain?view=notes';
  const savedRuntime = '/hivemind/app/employee/harness/session/saved-room';
  assert.equal(destination(savedBrain, runtime), `${brain}${savedBrain}`);
  assert.equal(destination(savedRuntime, brain), savedRuntime);
  const component = fs.readFileSync(new URL('../src/components/hivemind/app/layout/WorkspaceModeSwitcher.jsx', import.meta.url), 'utf8');
  assert.match(component, /window.location.assign\(destination\)/);
  assert.ok(component.indexOf('window.location.assign(destination)') < component.indexOf('if (selected) return;'), 'a selected mode on the wrong host still corrects its owner');
  assert.match(component, /onClick=\{\(\) => chooseMode\(mode.path, mode.selected\)\}/);
});


test('company and organization onboarding run before optional mode admission', () => {
 const shell=fs.readFileSync(new URL('../src/components/hivemind/app/layout/AppShell.jsx',import.meta.url),'utf8');
 assert(shell.indexOf('if (needsOnboarding)')<shell.indexOf('if (!workspaceModesReady &&'));
 assert(shell.indexOf("if (companyStatus !== 'ready')")<shell.indexOf('if (!workspaceModesReady &&'));
 const selector=fs.readFileSync(new URL('../src/components/hivemind/app/layout/WorkspaceModeSwitcher.jsx',import.meta.url),'utf8');
 assert(selector.indexOf('if (!workspaceModesEnabled) return')<selector.indexOf('aria-label="Choose workspace mode"'));
});

test('all mode entry paths use native HyperAgents while Company HQ stays distinct', () => {
 const shell=fs.readFileSync(new URL('../src/components/hivemind/app/layout/AppShell.jsx',import.meta.url),'utf8');
 assert.match(shell,/hyperagents: '\/hivemind\/app\/employee\/harness'/);
 const routes=fs.readFileSync(new URL('../src/components/hivemind/app/HiveMindApp.jsx',import.meta.url),'utf8');
 assert.match(routes,/<Route path="employees" element=\{<Navigate to="\/hivemind\/app\/employee\/harness" replace \/>\} \/>/);
});
