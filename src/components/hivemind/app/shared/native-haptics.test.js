import { bindNativeTouchFeedback, HAPTICS_PREFERENCE, touchFeedbackEnabled } from './native-haptics';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<button data-native-mobile-plugin>Apps</button>';
  window.matchMedia = () => ({ matches: true });
});
const setup = () => {
  const plugin = { impact: jest.fn().mockResolvedValue(undefined) };
  let listener;
  const add = jest.spyOn(document, 'addEventListener').mockImplementation((name, callback) => { if (name === 'click') listener = callback; });
  const stop = bindNativeTouchFeedback({ document, storage: localStorage, plugin, available: true });
  add.mockRestore();
  return { plugin, stop, tap: (extra = {}) => listener({ isTrusted: true, target: document.querySelector('button'), ...extra }) };
};
test('acknowledges an intentional plugin tap without claiming success', () => {
  const { plugin, tap, stop } = setup(); tap();
  expect(plugin.impact).toHaveBeenCalledWith({ style: 'LIGHT' }); stop();
});
test('respects the device opt-out', () => {
  localStorage.setItem(HAPTICS_PREFERENCE, 'off');
  const { plugin, tap, stop } = setup(); tap(); expect(plugin.impact).not.toHaveBeenCalled(); stop();
  expect(touchFeedbackEnabled()).toBe(false);
});
test('does not pulse during a voice call', () => {
  document.body.insertAdjacentHTML('beforeend', '<div data-voice-active></div>');
  const { plugin, tap, stop } = setup(); tap(); expect(plugin.impact).not.toHaveBeenCalled(); stop();
});
test('ignores synthetic clicks and disabled controls', () => {
  const { plugin, tap, stop } = setup(); tap({ isTrusted: false });
  document.querySelector('button').disabled = true; tap(); expect(plugin.impact).not.toHaveBeenCalled(); stop();
});
test('unsupported platforms install no listener', () => {
  const add = jest.spyOn(document, 'addEventListener');
  bindNativeTouchFeedback({ document, storage: localStorage, available: false })();
  expect(add).not.toHaveBeenCalled(); add.mockRestore();
});
test('a missing native implementation cannot break the control', () => {
  const { plugin, tap, stop } = setup(); plugin.impact.mockImplementation(() => { throw new Error('unavailable'); });
  expect(() => tap()).not.toThrow(); stop();
});
