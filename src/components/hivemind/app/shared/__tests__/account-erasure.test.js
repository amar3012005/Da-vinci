import { awaitAccountErasure } from '../account-erasure';
const initial = { status: 'pending', operationId: '00000000-0000-4000-8000-000000000001', receiptToken: 'test-receipt' };
test('acceptance waits for exact completion receipt', async () => {
 const read = jest.fn().mockResolvedValue({ status: 'completed', operationId: initial.operationId });
 expect(await awaitAccountErasure(initial, read, { sleep: async () => {} })).toMatchObject({ success: true });
 expect(read).toHaveBeenCalledWith(initial.operationId, 'test-receipt');
});
test('blocked, wrong operation and lost auth never become success', async () => {
 await expect(awaitAccountErasure({ ...initial, status: 'blocked' }, jest.fn())).rejects.toThrow('remains active');
 await expect(awaitAccountErasure(initial, async () => ({ status: 'completed', operationId: 'other' }), { sleep: async () => {} })).rejects.toThrow('does not match');
 await expect(awaitAccountErasure(initial, async () => { throw new Error('401'); }, { sleep: async () => {} })).rejects.toThrow('401');
});
test('pending timeout preserves login and can resume same operation', async () => {
 await expect(awaitAccountErasure(initial, jest.fn(), { timeoutMs: 0 })).rejects.toMatchObject({ code: 'ACCOUNT_ERASURE_PENDING' });
 expect(await awaitAccountErasure({ success: true }, jest.fn())).toEqual({ success: true });
});
