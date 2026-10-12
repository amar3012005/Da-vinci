import {normalizeHarnessInjections} from '../harness-transport';
import {needsAgentHarnessNavigation} from '../employee-harness-route';
test('packaged native boot resolves runner assets against the authenticated host',()=>{
 const rows=[{kind:'script-src',src:'https://next.singulancelabs.com/plugins/client.js?rev=release'},{kind:'global',name:'__DSH_BOOT__',value:{entries:[{url:'/plugins/chat.js?rev=release'}],batches:[{url:'/plugins/??chat,sidebar&rev=release'}]}}];
 const normalized=normalizeHarnessInjections(rows,'https://next.singulancelabs.com');
 expect(normalized[0].src).toBe('/plugins/client.js?rev=release');
 expect(normalized[1].value.batches[0].url).toBe('/plugins/??chat,sidebar&rev=release');
 expect(()=>normalizeHarnessInjections([{kind:'script-src',src:'https://foreign.test/app.js'}],'https://next.singulancelabs.com')).toThrow();
});
test('Brain without a mounted handler opens native chat; mounted agent switching reuses it',()=>{
 expect(needsAgentHarnessNavigation('/hivemind/app/overview',undefined)).toBe(true);
 expect(needsAgentHarnessNavigation('/hivemind/app/overview',()=>{})).toBe(false);
 expect(needsAgentHarnessNavigation('/hivemind/app/employee/harness/session/one',()=>{})).toBe(false);
});
