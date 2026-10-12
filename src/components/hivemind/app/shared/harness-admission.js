import apiClient from './api-client';
import { fetchHarness } from './harness-fetch';
import { measureHarnessBoot } from './harness-boot-timing';

let pending;
/** Share the existing ticket exchange; this admits a session without starting agent work. */
export function establishHarnessSession({ fresh = false } = {}) {
  if (!fresh && pending) return pending;
  const exchange = async () => {
    const path = fresh ? '/v1/harness-chat/new-session' : '/v1/harness-chat/bootstrap';
    const { data: admission } = await measureHarnessBoot('admission-ticket', () => apiClient.controlPlane.post(path, {}));
    if (admission?.mode === 'legacy') return { mode: 'legacy' };
    if (admission?.mode !== 'harness') throw new Error('HIVEMIND could not open this session.');
    if (typeof admission.ticket !== 'string' || admission.ticket.length === 0) throw new Error('HIVEMIND could not authorize this session.');
    const established = await measureHarnessBoot('session-cookie', () => fetchHarness('/api/hivemind/session/establish', {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket: admission.ticket, request_id: crypto.randomUUID() }),
    }));
    if (!established.ok) throw new Error('Could not open your secure HIVEMIND session.');
    window.dispatchEvent(new Event('hivemind:session-established'));
    return { mode: 'harness' };
  };
  if (fresh) return exchange();
  const current = exchange();
  pending = current;
  void current.finally(() => { if (pending === current) pending = undefined; }).catch(() => {});
  return current;
}
