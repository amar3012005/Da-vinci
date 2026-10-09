/** @jest-environment node */
import { applyNativeAppearance, observeNativeAppearance } from './native-appearance-policy';

function fixture() {
  const values = new Map();
  const events = new Map();
  const root = { setAttribute: (key, value) => values.set(key, value), removeAttribute: key => values.delete(key) };
  const document = { documentElement: root, visibilityState: 'visible', addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) };
  return { root, document, values, events };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('iOS display settings map to bounded UI attributes; unsupported Android settings clear', () => {
  const { root, values } = fixture();
  expect(applyNativeAppearance(root, { platform: 'ios', reduceMotion: true, reduceTransparency: true, increaseContrast: true })).toEqual({ reduceMotion: true });
  expect(values.get('data-native-reduce-transparency')).toBe('true');
  applyNativeAppearance(root, { platform: 'android', reduceMotion: false });
  expect(values.get('data-native-platform')).toBe('android');
  expect(values.get('data-native-reduce-motion')).toBe('false');
  expect(values.has('data-native-reduce-transparency')).toBe(false);
  expect(values.has('data-native-increase-contrast')).toBe(false);
});

test('malformed hints do not override browser defaults or create arbitrary attributes', () => {
  const { root, values } = fixture();
  for (const value of [null, {}, { platform: 'web', reduceMotion: true }, { platform: 'ios', reduceMotion: 'true' }]) expect(applyNativeAppearance(root, value)).toBeNull();
  expect(values.size).toBe(0);
});

test('resume refresh wins over an older in-flight appearance result', async () => {
  const { document, values } = fixture();
  let finishOld;
  let lifecycle;
  const remove = jest.fn(async () => {});
  const app = { addListener: jest.fn(async (_, handler) => { lifecycle = handler; return { remove }; }) };
  const plugin = { getAppearance: jest.fn().mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({ platform: 'ios', reduceMotion: true }) };
  const onChange = jest.fn();
  const stop = observeNativeAppearance({ document, app, plugin, onChange });
  lifecycle({ isActive: true });
  await flush();
  finishOld({ platform: 'ios', reduceMotion: false });
  await flush();
  expect(values.get('data-native-reduce-motion')).toBe('true');
  expect(onChange).toHaveBeenCalledTimes(1);
  stop();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('unmounted observers ignore pending reads and remove late lifecycle listeners', async () => {
  const { document, values, events } = fixture();
  let finishRead;
  let finishListener;
  const remove = jest.fn(async () => {});
  const app = { addListener: () => new Promise(resolve => { finishListener = resolve; }) };
  const plugin = { getAppearance: () => new Promise(resolve => { finishRead = resolve; }) };
  const stop = observeNativeAppearance({ document, app, plugin, onChange: jest.fn() });
  stop();
  finishRead({ platform: 'ios', reduceMotion: true });
  finishListener({ remove });
  await flush();
  expect(values.size).toBe(0);
  expect(events.size).toBe(0);
  expect(remove).toHaveBeenCalledTimes(1);
});

test('older shells without appearance or lifecycle support retain usable browser UI', async () => {
  const { document, values } = fixture();
  const stop = observeNativeAppearance({ document, plugin: {}, app: { addListener: () => { throw new Error('unavailable'); } }, onChange: jest.fn() });
  await flush();
  expect(values.size).toBe(0);
  stop();
});
