import { bindNativeChatViewport } from './mobile-chat-viewport';
test('resizes native canvas for the keyboard and restores its prior owner', () => {
  const browser = new EventTarget();
  const viewport = new EventTarget();
  Object.assign(viewport, { height: 844, scale: 1 });
  Object.assign(browser, { innerHeight: 844, visualViewport: viewport });
  const style = document.documentElement.style;
  style.setProperty('--hm-app-viewport-height', '100dvh');
  const dispose = bindNativeChatViewport(browser, style);
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('844px');
  viewport.height = 420;
  viewport.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('420px');
  viewport.scale = 2;
  viewport.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('844px');
  dispose();
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('100dvh');
  viewport.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('100dvh');
});


test('native keyboard viewport falls back to browser resize without VisualViewport', () => {
  const browser = new EventTarget(); browser.innerHeight = 700;
  const style = document.documentElement.style; style.removeProperty('--hm-app-viewport-height');
  const dispose = bindNativeChatViewport(browser, style);
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('700px');
  browser.innerHeight = 350; browser.dispatchEvent(new Event('resize'));
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('350px');
  dispose(); expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('');
});


test('a mobile shell owns its viewport without changing embedded chat height', () => {
  const browser = new EventTarget(); browser.innerHeight = 500;
  const style = document.createElement('div').style;
  style.setProperty('--hm-app-viewport-height', '420px');
  const dispose = bindNativeChatViewport(browser, style, '--hm-mobile-shell-height');
  expect(style.getPropertyValue('--hm-mobile-shell-height')).toBe('500px');
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('420px');
  dispose();
  expect(style.getPropertyValue('--hm-mobile-shell-height')).toBe('');
  expect(style.getPropertyValue('--hm-app-viewport-height')).toBe('420px');
});
