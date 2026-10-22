import { validRuntimePresentation, readRuntimeRoute } from './runtime-presentation-cache';
const scope='11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222';
const value={scope,sessionId:'session-fixture',generation:2000,at:1000,messages:[{role:'user',text:'hello',seq:1}]};
it('binds cached text to exact user, organization, room and bounded generation',()=>{
 expect(validRuntimePresentation(value,scope,'session-fixture',2000)).toBe(true);
 expect(validRuntimePresentation(value,scope.replace('11111111','aaaaaaaa'),'session-fixture',2000)).toBe(false);
 expect(validRuntimePresentation(value,scope,'session-other',2000)).toBe(false);
 expect(validRuntimePresentation({...value,generation:0},scope,'session-fixture',2000)).toBe(false);
 expect(validRuntimePresentation({...value,messages:[{role:'system',text:'hidden',seq:1}]},scope,'session-fixture',2000)).toBe(false);
 expect(validRuntimePresentation(value,scope,'session-fixture',100000000)).toBe(false);
});
it('never accepts a remote or non-Runtime cached route',()=>{
 localStorage.setItem(`hivemind.runtime.route.v1:${scope}`,'https://other.example/');expect(readRuntimeRoute(scope)).toBeNull();
 localStorage.setItem(`hivemind.runtime.route.v1:${scope}`,'/hivemind/app/overview/session/session-other');expect(readRuntimeRoute(scope)).toBeNull();
});
