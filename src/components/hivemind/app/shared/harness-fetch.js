import { isNativeApp } from './native-app';
/** Keep packaged app requests on the authenticated native runner transport. */
export function fetchHarness(input, init) {
  if (!isNativeApp()) return fetch(input, init);
  return import('./native-chat-session').then(({ fetchNativeChat }) => fetchNativeChat(input, init));
}
