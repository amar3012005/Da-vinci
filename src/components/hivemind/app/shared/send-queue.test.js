import { createSendQueue } from './send-queue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a message sent before the connection opens stays queued and is not transported', async () => {
  const transport = jest.fn(async () => 'ack');
  const queue = createSendQueue({ transport });
  const { id } = queue.enqueue({ text: 'hello' });
  await flush();
  expect(transport).not.toHaveBeenCalled();
  expect(queue.entries().find((entry) => entry.id === id).state).toBe('queued');
});

test('opening the connection flushes queued messages in send order', async () => {
  const delivered = [];
  const queue = createSendQueue({ transport: async (payload) => { delivered.push(payload.text); return 'ok'; } });
  queue.enqueue({ text: 'one' });
  queue.enqueue({ text: 'two' });
  queue.enqueue({ text: 'three' });
  queue.open();
  await flush();
  expect(delivered).toEqual(['one', 'two', 'three']);
});

test('after the connection is open, a message is delivered immediately', async () => {
  const transport = jest.fn(async () => 'ok');
  const queue = createSendQueue({ transport });
  queue.open();
  const { done } = queue.enqueue({ text: 'now' });
  await expect(done).resolves.toBe('ok');
  expect(transport).toHaveBeenCalledWith({ text: 'now' });
});

test('an optimistic state change is emitted when a message is enqueued', () => {
  const states = [];
  const queue = createSendQueue({ transport: async () => 'ok', onChange: (entry) => states.push(entry.state) });
  queue.enqueue({ text: 'x' });
  expect(states[0]).toBe('queued');
});

test('a failed delivery is marked failed with its error and can be retried', async () => {
  let attempts = 0;
  const queue = createSendQueue({
    transport: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('runner_unreachable');
      return 'ok';
    },
  });
  queue.open();
  const { id, done } = queue.enqueue({ text: 'retry me' });
  await expect(done).rejects.toThrow('runner_unreachable');
  const failed = queue.entries().find((entry) => entry.id === id);
  expect(failed.state).toBe('failed');
  expect(failed.error).toBe('runner_unreachable');
  expect(queue.retry(id)).toBe(true);
  await flush();
  expect(queue.entries().find((entry) => entry.id === id).state).toBe('sent');
});

test('retry is refused for a message that is not failed', () => {
  const queue = createSendQueue({ transport: async () => 'ok' });
  const { id } = queue.enqueue({ text: 'x' });
  expect(queue.retry(id)).toBe(false);
  expect(queue.retry('missing')).toBe(false);
});

test('closing the connection holds new messages until it reopens', async () => {
  const transport = jest.fn(async () => 'ok');
  const queue = createSendQueue({ transport });
  queue.open();
  queue.close();
  queue.enqueue({ text: 'held' });
  await flush();
  expect(transport).not.toHaveBeenCalled();
  queue.open();
  await flush();
  expect(transport).toHaveBeenCalledTimes(1);
});
