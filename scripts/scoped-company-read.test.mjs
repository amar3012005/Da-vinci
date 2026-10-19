import test from 'node:test';
import assert from 'node:assert/strict';
import {scopedCompanyRead,clearCompanyRead,companyReadOwner} from '../src/components/hivemind/app/shared/company-read-cache.js';
test('same authenticated scope coalesces parent and pane reads; other scopes never share',async()=>{
 const owner={};let calls=0;const read=()=>{calls++;return {company:{id:1}}};
 const a=scopedCompanyRead('user:org',read,owner,100);
 assert.equal(scopedCompanyRead('user:org',read,owner,101),a);
 await scopedCompanyRead('other:org',read,owner,101);await a;assert.equal(calls,2);
 clearCompanyRead('user:org',owner);await scopedCompanyRead('user:org',read,owner,102);assert.equal(calls,3);
 await scopedCompanyRead('user:org',read,owner,30103);assert.equal(calls,4);
});
test('failed reads are not retained and cross-origin parent is not used',async()=>{
 const owner={};await assert.rejects(scopedCompanyRead('scope',()=>Promise.reject(Error('offline')),owner));
 assert.equal(await scopedCompanyRead('scope',()=>42,owner),42);
 const win={location:{origin:'https://a'},parent:{location:{origin:'https://b'}}};assert.equal(companyReadOwner(win),win);
});
