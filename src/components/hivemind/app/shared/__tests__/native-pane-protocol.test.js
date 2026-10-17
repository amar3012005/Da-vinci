import { normalizeHarnessInjections } from '../../pages/harness-transport';
import { PANE_ORIGINS, paneForPath, panePath, paneSource, validPaneMessage, rememberPaneRoute, recalledPaneRoute } from '../native-pane-protocol';
test('native clients keep exact fixed runner authority and safe chat routes', () => {
  expect(paneForPath('/hivemind/app/overview/session/brain-id')).toBe('brain');
  expect(paneForPath('/hivemind/app/employee/harness/session/runtime-id')).toBe('runtime');
  expect(paneSource('/hivemind/app/overview/session/brain-id', 'brain')).toBe('https://next.singulancelabs.com/hivemind/app/overview/session/brain-id?native_pane=1');
  for (const input of ['//evil.example/path','https://evil.example','/hivemind/app/employee/harness/session/other','/hivemind/app/overview/session/a/b']) expect(panePath(input, 'brain')).toBeNull();
  expect(panePath('/hivemind/app/overview/session/brain-id?native_pane=1&view=chat', 'brain')).toBe('/hivemind/app/overview/session/brain-id?view=chat');
});
test('messages require exact iframe Window identity, runner origin and authenticated actor scope', () => {
  const frame = { contentWindow: {} }; const data = { type:'hivemind.native-pane', version:1, scope:'user-a:org-a' };
  const event = { source:frame.contentWindow, origin:PANE_ORIGINS.brain, data };
  expect(validPaneMessage(event,frame,'brain','user-a:org-a')).toBe(true);
  for (const bad of [{...event,source:{}},{...event,origin:PANE_ORIGINS.runtime},{...event,data:{...data,scope:'user-b:org-a'}},{...event,data:{...data,scope:'user-a:org-b'}}]) expect(validPaneMessage(bad,frame,'brain','user-a:org-a')).toBe(false);
});
test('mode return paths are scoped and cannot be used as foreign URLs or another runner route', () => {
  rememberPaneRoute('brain','/hivemind/app/overview/session/saved','a:org');
  expect(recalledPaneRoute('brain','a:org')).toBe('/hivemind/app/overview/session/saved');
  expect(recalledPaneRoute('brain','b:org')).toBeNull();
  sessionStorage.setItem('hivemind.native-pane:a:org:brain','https://evil.example');
  expect(recalledPaneRoute('brain','a:org')).toBeNull();
});

it('narrows the legacy embed notification to the actual configured parent without granting an origin', () => {
  const row = Object.freeze({ kind:'global', name:'__HIVEMIND_EMBED_CONFIG__', value:Object.freeze({version:1,parentOrigins:Object.freeze(['https://next.singulancelabs.com'])}) });
  expect(normalizeHarnessInjections([row],'https://next.singulancelabs.com','https://runtime-runner.singulancelabs.com')[0].value.parentOrigins).toEqual([]);
  expect(normalizeHarnessInjections([row],'https://next.singulancelabs.com','https://next.singulancelabs.com')[0].value.parentOrigins).toEqual(['https://next.singulancelabs.com']);
  expect(normalizeHarnessInjections([row],'https://next.singulancelabs.com')[0]).toBe(row);
  expect(row.value.parentOrigins).toEqual(['https://next.singulancelabs.com']);
});
