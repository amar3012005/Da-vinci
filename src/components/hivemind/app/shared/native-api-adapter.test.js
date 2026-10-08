/** @jest-environment node */
import { createNativeApiAdapter } from './native-api-adapter';
jest.mock('axios', () => ({ __esModule: true, default: { CanceledError: class extends Error {}, AxiosError: class extends Error { constructor(message,code,config,request,response) { super(message);this.response=response; } } } }));

test('native JSON uses authenticated CP transport without exposing a bearer or caller auth headers', async () => {
  const plugin = { request: jest.fn(async () => ({status:200,headers:{},data:'{"ok":true}'})) };
  const adapter = createNativeApiAdapter(plugin);
  const response = await adapter({url:'/v1/mobile/privacy/ai-consent',method:'post',headers:{Authorization:'do-not-forward'},data:{granted:true},params:{v:'1'}});
  expect(response.data.ok).toBe(true);
  const request = plugin.request.mock.calls[0][0];
  expect(request.url).toBe('https://api.singulancelabs.com/v1/mobile/privacy/ai-consent?v=1');
  expect(request.authorize).toBe(true); expect(request.headers.Authorization).toBeUndefined();
});

test('only Core /api paths are mapped through CP proxy; foreign URLs and ambiguous paths fail closed', async () => {
  const plugin = {request:jest.fn(async()=>({status:200,data:'{}'}))};
  const adapter = createNativeApiAdapter(plugin,{coreProxy:true});
  await adapter({url:'/api/entities/123/profile?evidence=true',method:'get'});
  expect(plugin.request.mock.calls[0][0].url).toBe('https://api.singulancelabs.com/v1/proxy/entities/123/profile?evidence=true');
  for (const url of ['https://evil.example/v1/bootstrap','//evil.example/api/entities','/not-core','/api/\\evil']) await expect(adapter({url})).rejects.toThrow();
  expect(plugin.request).toHaveBeenCalledTimes(1);
});

test('native HTTP failure preserves Axios status and a canceled request is not submitted', async () => {
  const plugin = {request:jest.fn(async()=>({status:401,data:'{"error":"signed_out"}'}))};
  const adapter = createNativeApiAdapter(plugin);
  await expect(adapter({url:'/v1/bootstrap'})).rejects.toMatchObject({response:{status:401,data:{error:'signed_out'}}});
  await expect(adapter({url:'/v1/bootstrap',signal:{aborted:true}})).rejects.toThrow('canceled');
  expect(plugin.request).toHaveBeenCalledTimes(1);
});
