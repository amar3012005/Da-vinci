import { importPage } from '../import-page';
test('a transient chunk failure retries the import without reloading the document', async () => {
  const module = { default: () => null };
  const load = jest.fn().mockRejectedValueOnce(new Error('Loading chunk 4367 failed')).mockResolvedValueOnce(module);
  await expect(importPage(load)).resolves.toBe(module);
  expect(load).toHaveBeenCalledTimes(2);
});
test('a persistent download failure stops after one retry', async () => {
  const error = Object.assign(new Error('download failed'), { name: 'ChunkLoadError' });
  const load = jest.fn().mockRejectedValue(error);
  await expect(importPage(load)).rejects.toBe(error);
  expect(load).toHaveBeenCalledTimes(2);
});
test('application errors are not retried', async () => {
  const load = jest.fn().mockRejectedValue(new Error('invalid module'));
  await expect(importPage(load)).rejects.toThrow('invalid module');
  expect(load).toHaveBeenCalledTimes(1);
});
