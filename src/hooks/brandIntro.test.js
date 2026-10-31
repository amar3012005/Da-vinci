import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react';
import { useBrandIntroReady } from './useBrandIntroReady';

const html = fs.readFileSync(path.join(__dirname, '../../public/index.html'), 'utf8');
const overlay = /<div id="sgi"[\s\S]*?<\/div><\/div><\/div>/.exec(html)[0];
const script = /<script id="sgi-script">([\s\S]*?)<\/script>/.exec(html)[1];

let animateCalls;
function fakeAnimate() {
  animateCalls += 1;
  const a = { onfinish: null, cancel() {}, play() {}, pause() {} };
  return a;
}

function boot({ url = '/hivemind/m/chat', reduce = false, native = false, animate = true, ua } = {}) {
  document.body.innerHTML = overlay;
  document.querySelectorAll('#sgi-style').forEach((n) => n.remove());
  document.head.insertAdjacentHTML('beforeend', '<style id="sgi-style"></style>');
  window.history.replaceState({}, '', url);
  animateCalls = 0;
  window.matchMedia = () => ({ matches: reduce, addEventListener() {}, removeEventListener() {} });
  window.Capacitor = native ? { isNativePlatform: () => true } : undefined;
  if (ua) Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
  Element.prototype.animate = animate ? fakeAnimate : undefined;
  delete window.__sgIntro;
  // eslint-disable-next-line no-new-func
  new Function(script).call(window);
}
const shown = () => !!document.getElementById('sgi');

beforeEach(() => { jest.useFakeTimers(); window.sessionStorage.clear(); window.localStorage.clear(); });
afterEach(() => { jest.useRealTimers(); });

describe('brand intro show rules', () => {
  test('shows on a cold start and records session + 12h markers', () => {
    boot();
    expect(shown()).toBe(true);
    expect(window.sessionStorage.getItem('sg.intro.session')).toBe('1');
    expect(window.localStorage.getItem('sg.intro.last')).toBeTruthy();
    expect(animateCalls).toBeGreaterThan(10);
  });

  test('does not show twice in one app session', () => {
    boot();
    jest.advanceTimersByTime(5000);
    boot();
    expect(shown()).toBe(false);
  });

  test('web: not again within 12 hours, again after 12 hours', () => {
    window.localStorage.setItem('sg.intro.last', String(Date.now() - 11 * 3600e3));
    boot();
    expect(shown()).toBe(false);
    window.sessionStorage.clear();
    window.localStorage.setItem('sg.intro.last', String(Date.now() - 13 * 3600e3));
    boot();
    expect(shown()).toBe(true);
  });

  test('native app ignores the 12 hour rule and shows once per session', () => {
    window.localStorage.setItem('sg.intro.last', String(Date.now() - 3600e3));
    boot({ native: true });
    expect(shown()).toBe(true);
  });

  test('deep links into a room go straight there', () => {
    boot({ url: '/hivemind/app/employees/operating-rooms/room-123' });
    expect(shown()).toBe(false);
    boot({ url: '/hivemind/m/chat?room=abc' });
    expect(shown()).toBe(false);
  });

  test('auth returns are never covered', () => {
    boot({ url: '/hivemind/login?code=abc&state=xyz' });
    expect(shown()).toBe(false);
    boot({ url: '/auth/callback' });
    expect(shown()).toBe(false);
  });

  test('storage failures do not throw and still show once', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => boot()).not.toThrow();
    expect(shown()).toBe(true);
    spy.mockRestore(); setSpy.mockRestore();
  });

  test('?intro=force shows regardless; ?intro=off never', () => {
    window.sessionStorage.setItem('sg.intro.session', '1');
    boot({ url: '/?intro=force' });
    expect(shown()).toBe(true);
    window.sessionStorage.clear();
    boot({ url: '/?intro=off' });
    expect(shown()).toBe(false);
  });
});

describe('brand intro dismissal', () => {
  test('tap skips and removes the overlay', () => {
    boot();
    document.getElementById('sgi').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    jest.advanceTimersByTime(200);
    expect(shown()).toBe(false);
  });

  test('Escape skips', () => {
    boot();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    jest.advanceTimersByTime(200);
    expect(shown()).toBe(false);
  });

  test('reduced motion runs a 600 ms static fade and removes the overlay', () => {
    boot({ reduce: true });
    expect(shown()).toBe(true);
    expect(animateCalls).toBeLessThanOrEqual(2);
    jest.advanceTimersByTime(720);
    expect(shown()).toBe(false);
  });

  test('without WAAPI the overlay still goes away at the timeline end', () => {
    boot({ animate: false });
    expect(shown()).toBe(true);
    jest.advanceTimersByTime(3300);
    expect(shown()).toBe(false);
  });

  test('app not ready: holds, then force-dismisses by 4 s', () => {
    boot();
    jest.advanceTimersByTime(3900);
    expect(shown()).toBe(true);
    jest.advanceTimersByTime(800);
    expect(shown()).toBe(false);
  });

  test('the ready hook signals the overlay after load', () => {
    boot();
    const ready = jest.spyOn(window.__sgIntro, 'ready');
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(); return 1; });
    function Probe() { useBrandIntroReady(); return null; }
    render(<Probe />);
    expect(ready).toHaveBeenCalled();
    window.requestAnimationFrame.mockRestore();
  });

  test('finishing the dissolve animation removes overlay and style', () => {
    boot();
    const el = document.getElementById('sgi');
    expect(el).not.toBeNull();
    jest.advanceTimersByTime(4700);
    expect(shown()).toBe(false);
    expect(document.getElementById('sgi-style')).toBeNull();
  });
});
