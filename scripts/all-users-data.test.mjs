import test from 'node:test';
import assert from 'node:assert/strict';
import { activeUserOrganizations, userUsageFromAccount, creditAllowancePatch } from '../src/components/hivemind/app/pages/all-users-data.mjs';
test('organization membership excludes inactive records and deduplicates shared pools',()=>{
 assert.deepEqual(activeUserOrganizations({organizations:[{isActive:true,org:{id:'a',name:'A'}},{isActive:true,org:{id:'a',name:'A'}},{isActive:false,org:{id:'b'}}]}),[{id:'a',name:'A'}]);
});
test('usage stays attributed to the selected user, not another member or system',()=>{
 const detail={attribution:{by_user:[{user_id:'a',calls:'7'},{user_id:'system',calls:'90'}]}};
 assert.equal(userUsageFromAccount(detail,'a').calls,'7');assert.equal(userUsageFromAccount(detail,'b').calls,'0');assert.equal(userUsageFromAccount({},'a'),null);
});
test('credit edits change only allowance with revision and audit reason; zero, unlimited and inheritance work',()=>{
 const settings={organization:{id:'org'},revision:4,usage:{credits:{used:9,reserved:2}}};
 for(const [value,expected]of [['0',0],['100',100],['-1',-1],['',null]]) assert.deepEqual(creditAllowancePatch(settings,'org',value,'Support adjustment'),{revision:4,limits:{monthlyCredits:expected},reason:'Support adjustment'});
 assert.equal(settings.usage.credits.used,9);
 for(const invalid of ['1.5','-2','1e3','Infinity','9007199254740992']) assert.throws(()=>creditAllowancePatch(settings,'org',invalid,'Reason'));
 assert.throws(()=>creditAllowancePatch(settings,'foreign','100','Reason'));assert.throws(()=>creditAllowancePatch(settings,'org','100',''));
});
