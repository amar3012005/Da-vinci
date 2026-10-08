import { createNativeHarnessFetch } from '../../src/components/hivemind/app/shared/native-harness-transport';
import { createNativeHarnessLoader } from '../../src/components/hivemind/app/shared/native-harness-loader';
import { bytesToBase64 } from '../../src/components/hivemind/app/shared/native-body';
const plugin={request:async({url})=>{const parsed=new URL(url);if(parsed.pathname==='/plugins/fixture/client.js')return{status:200,headers:{'Content-Type':'text/javascript'},encoding:'base64',data:btoa('window.__nativeClassicLoaded=true;')};const res=await fetch('/native-files/'+parsed.pathname.slice('/assets/'.length));return{status:res.status,headers:{'Content-Type':res.headers.get('content-type')},encoding:'base64',data:bytesToBase64(new Uint8Array(await res.arrayBuffer()))};}};
window.__loader=createNativeHarnessLoader(createNativeHarnessFetch(plugin));
window.__fetchUnchanged=fetch;
