import apiClient from './api-client';
import { Capacitor } from '@capacitor/core';
import { nativePlugin } from './native-auth';
import { createNativeHarnessFetch } from './native-harness-transport';
import { createNativeSessionRecovery, nativeAdmissionMessage } from './native-session-recovery';

const request = createNativeHarnessFetch(nativePlugin);
let compatibility;
export function checkNativeChatBridge() {
  if (Capacitor.getPlatform() !== 'ios') return Promise.resolve();
  compatibility ||= Promise.all([
    nativePlugin.getCapabilities(),
    fetch('/mobile-build.json').then(response => { if (!response.ok) throw new Error('Missing app manifest'); return response.json(); }),
  ]).then(([value, packaged]) => {
    if (value?.transportVersion !== 1 || value?.platform !== 'ios'
      || !/^[a-f0-9]{40}$/.test(packaged?.frontendSha || '') || packaged.frontendSha !== value.frontendSha) {
      throw new Error('Update the iPhone app to use this version of chat.');
    }
  }).catch(() => {
    compatibility = undefined;
    throw new Error('Update the iPhone app to use this version of chat.');
  });
  return compatibility;
}
const session = createNativeSessionRecovery({
  request,
  checkBridge: checkNativeChatBridge,
  admit: async () => {
    try { return (await apiClient.controlPlane.post('/v1/harness-chat/bootstrap', {}, { suppressServiceError: true })).data; }
    catch (error) { throw new Error(nativeAdmissionMessage(error)); }
  },
  establish: async ticket => {
    const response = await request('/api/hivemind/session/establish', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket, request_id: crypto.randomUUID() }),
    });
    if (!response.ok) throw new Error('Your iPhone could not establish a secure chat session.');
    window.dispatchEvent(new Event('hivemind:session-established'));
  },
});
window.addEventListener('hm:tenant-changed', () => session.reset());
export const refreshNativeChatSession = () => session.refresh();
export const fetchNativeChat = (input, init) => session.fetch(input, init);
