/** Wait only for a verified server completion; acceptance and lost auth are not deletion. */
export async function awaitAccountErasure(initial, readStatus, { onStatus, timeoutMs = 60000, intervalMs = 2000, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (initial?.success === true && !initial.operationId) return initial;
  const operationId = initial?.operationId;
  if (typeof operationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(operationId) || typeof initial.receiptToken !== 'string' || !initial.receiptToken) {
    throw new Error('Account cleanup response could not be verified. Your sign-in has been preserved.');
  }
  const deadline = now() + timeoutMs;
  let current = initial;
  while (true) {
    if (current.operationId !== operationId) throw new Error('Account cleanup receipt does not match this request.');
    onStatus?.(current.status);
    if (current.status === 'completed') return { ...current, success: true };
    if (current.status === 'blocked' || current.status === 'failed') {
      const messages = {
        SHARED_OWNER_TRANSFER_REQUIRED: 'Transfer ownership of your shared organization before deleting your account.',
        SHARED_MEMORY_TRANSFER_REQUIRED: 'Shared company memories need an ownership review before this account can be deleted.',
        SHARED_SOURCE_TRANSFER_REQUIRED: 'Shared company source records need an ownership review before this account can be deleted.',
        ERASURE_INGEST_DRAIN_REQUIRED: 'An upload is still being reconciled. Your account remains active; cleanup will retry automatically.',
      };
      throw Object.assign(new Error(messages[current.failureCode] || current.error || 'Account cleanup needs attention. Your account remains active.'), { code: 'ACCOUNT_ERASURE_BLOCKED' });
    }
    if (!['pending', 'processing', 'reconciled'].includes(current.status)) throw new Error('Account cleanup status could not be verified.');
    if (now() >= deadline) throw Object.assign(new Error('Account cleanup is still running. Your account remains active until cleanup is verified; checking again resumes the same request.'), { code: 'ACCOUNT_ERASURE_PENDING' });
    await sleep(intervalMs);
    current = await readStatus(operationId, initial.receiptToken);
  }
}
