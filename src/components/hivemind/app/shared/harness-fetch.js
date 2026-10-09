import { isNativeApp } from './native-app';
import { nativePlugin } from './native-auth';
import { createNativeHarnessFetch } from './native-harness-transport';

let nativeFetch;
/** Keep packaged app requests on the authenticated native runner transport. */
export function fetchHarness(input, init) {
  if (!isNativeApp()) return fetch(input, init);
  nativeFetch ||= createNativeHarnessFetch(nativePlugin);
  return nativeFetch(input, init);
}
