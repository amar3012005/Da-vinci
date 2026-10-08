/** @jest-environment node */
import { webcrypto } from 'crypto';
import { createNativeHarnessFetch, createNativeHarnessStream, trustedHarnessUrl } from './native-harness-transport';
import { nativeRequestBody } from './native-body';
global.crypto = webcrypto;
global.DOMException = require('vm').runInThisContext('DOMException');
const { TextEncoder, TextDecoder } = require('util');
Object.assign(global, { Blob: require('buffer').Blob, File: require('buffer').File, TextEncoder, TextDecoder, ...require('stream/web'), MessagePort: require('worker_threads').MessagePort, MessageChannel: require('worker_threads').MessageChannel });
const { Headers, Request, Response, FormData } = require('undici');
Object.assign(global, { Headers, Request, Response, FormData, Blob: require('buffer').Blob });

test('native runner fetch accepts packaged local paths but refuses foreign origins and private non-Harness paths', async () => {
 expect(trustedHarnessUrl('capacitor://localhost/api/remote.invoke')).toBe('https://next.singulancelabs.com/api/remote.invoke');
 expect(trustedHarnessUrl('https://localhost/plugins/??bundle/client.js')).toBe('https://next.singulancelabs.com/plugins/??bundle/client.js');
 for (const url of ['https://evil.test/api/remote.invoke','https://next.singulancelabs.com/auth/login','https://user:secret@next.singulancelabs.com/api/foo']) expect(()=>trustedHarnessUrl(url)).toThrow();
 const plugin={request:jest.fn(async()=>({status:200,headers:{'Content-Type':'application/json'},encoding:'base64',data:btoa('{"ok":true}')}))};
 const response=await createNativeHarnessFetch(plugin)('/api/hivemind/boot');expect(await response.json()).toEqual({ok:true});
 expect(plugin.request.mock.calls[0][0].authorize).toBe(false);
});

test('multipart and audio preserve their binary bytes and exact browser-generated boundary', async () => {
 const form=new FormData();form.append('file',new Blob([new Uint8Array([0,1,255])],{type:'application/octet-stream'}),'sample.bin');
 const multipart=await nativeRequestBody(form,'multipart/form-data');
 expect(multipart.contentType).toMatch(/^multipart\/form-data; boundary=/);
 expect(multipart.bodyEncoding).toBe('base64');expect(atob(multipart.body)).toContain('filename="sample.bin"');
 const blob=await nativeRequestBody(new Blob([new Uint8Array([0,1,255])],{type:'audio/webm'}),'audio/webm');
 expect([...Buffer.from(blob.body,'base64')]).toEqual([0,1,255]);expect(blob.contentType).toBe('audio/webm');
 await expect(nativeRequestBody(new Blob([new Uint8Array(8*1024*1024+1)]),'application/octet-stream')).rejects.toThrow('native_request_body_too_large');
});

function streamPlugin(frames){let listener;return{addListener:jest.fn(async(_,fn)=>{listener=fn;return{remove:jest.fn()};}),closeStream:jest.fn(async()=>{}),openStream:jest.fn(async({id})=>{for(const frame of frames)listener({id,type:'frame',data:JSON.stringify({...frame,streamId:id})});})};}
test('native Remote stream preserves item payloads, ends, and closes its OS carrier', async () => {
 const plugin=streamPlugin([{type:'item',value:{generation:'g'}},{type:'item',value:'result'},{type:'end'}]);const signal=new AbortController().signal;
 const values=[];for await(const value of createNativeHarnessStream(plugin)('remotes.events',{},signal))values.push(value);
 expect(values).toEqual([{generation:'g'},'result']);expect(plugin.closeStream).toHaveBeenCalledTimes(1);
});
test('native stream rejects malformed frames and preserves source Remote errors', async () => {
 const bad=streamPlugin([{type:'item',value:'no',extra:true}]);await expect(createNativeHarnessStream(bad)('events',{},new AbortController().signal).next()).rejects.toThrow('Invalid native Harness stream frame');
 const failure=streamPlugin([{type:'error',error:{code:'gateway/context-unavailable',message:'Unavailable',details:{retry:true}}}]);await expect(createNativeHarnessStream(failure)('events',{},new AbortController().signal).next()).rejects.toMatchObject({code:'gateway/context-unavailable',details:{retry:true}});
});
test('abort cancels a waiting native stream and releases its listener', async()=>{
 const plugin=streamPlugin([]);const controller=new AbortController();const iterator=createNativeHarnessStream(plugin)('events',{},controller.signal);const next=iterator.next();await new Promise(setImmediate);controller.abort(new Error('deliberate_stop'));await expect(next).rejects.toThrow('deliberate_stop');expect(plugin.closeStream).toHaveBeenCalledTimes(1);
});
