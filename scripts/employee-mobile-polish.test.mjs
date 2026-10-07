import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = name => readFileSync(new URL(`../src/components/hivemind/app/layout/${name}`, import.meta.url), 'utf8');
test('employee phone uses Brain native Add/Apps seam while legacy outer routing stays untouched', () => {
 const app = source('AppShell.jsx');
 assert.match(app, /if \(!nativeChatRoom \|\| !brainPhone\) return undefined/);
 assert.match(app, /legacy=\{brainPhone\}/);
 assert.match(app, /nativeChatRoom && brainPhone && <MobileBrainAddSheet/);
 assert.match(app, /hivemind:mobile-brain-add/);
});
test('phone roster reuses authenticated team, room opening and employee creation', () => {
 const sidebar=source('Sidebar.jsx');
 assert.match(sidebar, /mobileRoster = false/);
 assert.match(sidebar, /team.slice\(0, 3\).map/);
 assert.match(sidebar, /openAgent\(event, agent\)/);
 assert.match(sidebar, /setCreateEmployeeOpen\(true\)/);
 assert.match(sidebar, /Search your team/);
 assert.doesNotMatch(sidebar, /Auto-review Rules|Set Time Zone Automatically/);
 const css=source('employee-mobile-roster.css');
 assert.match(css, /@media \(max-width:600px\)/);
 assert.match(css, /--hm-app-viewport-height/);
});
test('profile sheet links only existing authenticated pages and retains Humation creator', () => {
 const sidebar=source('Sidebar.jsx');
 for (const path of ['profile','usage','connectors']) assert.ok(sidebar.includes(`/hivemind/app/${path}`));
 assert.match(source('EmployeeMobileNavigation.jsx'), /querySelector\('\[data-mobile-roster-profile\]'\)/);
 assert.match(source('CreateEmployeeDialog.jsx'), /@humation\/react/);
 assert.match(source('CreateEmployeeDialog.jsx'), /data-create-employee-card/);
});
