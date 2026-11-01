/* eslint-disable testing-library/no-unnecessary-act -- These tests use React DOM createRoot, not Testing Library render. */
// Arabic right-to-left checks for the shared shell (sidebar, top bar, phone room frame), onboarding and the Brain first-run surfaces:
// no physical left/right utilities or CSS properties remain outside a documented allowlist, and directional icons mirror under [dir=rtl].
import React from 'react';
import fs from 'fs';
import path from 'path';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { PhoneRoomFrame } from '../PhoneRoomFrame';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, fallback) => fallback?.defaultValue || key, i18n: { language: 'ar', dir: () => 'rtl' } }) }));
jest.mock('../BrainModeIcon', () => () => <span data-brain-icon />);

const APP = path.resolve(__dirname, '../..');
const SCOPE = [];
for (const dir of ['layout', 'shared-shell']) {
  for (const name of fs.readdirSync(path.join(APP, dir))) if (/\.(jsx|js|css)$/.test(name) && !/test/.test(name)) SCOPE.push(`${dir}/${name}`);
}
SCOPE.push('hyperagents/HyperOnboarding.jsx', 'hyperagents/OnboardingTerminal.jsx', 'pages/Chat.jsx', 'pages/Brain.jsx', 'pages/BrainChat.css', 'shared/claude-chat.jsx', 'shared/ChatModelConnection.css');

/** Genuine exceptions, `<file>::<match>`; each says why the physical direction is correct. */
const SYMMETRIC = 'Centred with translate -50% against left: 50%: symmetric in both directions.';
const MEASURED = 'Fixed position computed from getBoundingClientRect(): a viewport coordinate, not a text-direction edge.';
const ALLOW = {
  'layout/HyperAgentActivation.jsx::left-1/2': SYMMETRIC, 'layout/HyperAgentActivation.jsx::translate-x-1/2': SYMMETRIC,
  'layout/TopBar.jsx::left-1/2': SYMMETRIC, 'layout/TopBar.jsx::translate-x-1/2': SYMMETRIC,
  'layout/WorkspaceNotifications.jsx::left-1/2': SYMMETRIC, 'layout/WorkspaceNotifications.jsx::translate-x-1/2': SYMMETRIC,
  'pages/Brain.jsx::left-1/2': SYMMETRIC, 'pages/Brain.jsx::translate-x-1/2': SYMMETRIC,
  'layout/OptimisticAppShell.css::left: 50%': SYMMETRIC, 'layout/OptimisticAppShell.css::translateX(-50%)': SYMMETRIC,
  'layout/desktop-hyperagents-navigation.css::left: 50%': SYMMETRIC, 'layout/desktop-hyperagents-navigation.css::translateX(-50%)': SYMMETRIC,
  'shared/ChatModelConnection.css::left: 50%': SYMMETRIC, 'shared/ChatModelConnection.css::translateX(-50%)': SYMMETRIC,
  'layout/AccountRowTools.jsx::left: 8': MEASURED, 'layout/AccountRowTools.jsx::right: 8': MEASURED, 'layout/AccountRowTools.jsx::left: Math.max(8': MEASURED,
  'layout/DesktopBrainNavigation.jsx::left: Math.min((sidebar?.right || trigger.right) + 10 * scale': MEASURED,
  'layout/LangSwitcher.jsx::left: number': MEASURED, 'layout/LangSwitcher.jsx::right: number': MEASURED, 'layout/LangSwitcher.jsx::left: edge - anchor.left': MEASURED,
  'layout/LangSwitcher.jsx::left: placement.left': MEASURED, "layout/LangSwitcher.jsx::right: 'auto'": MEASURED,
  'layout/product-transition.css::translateX(-100%)': 'Sidebar slide-out keyframes; the html[dir=rtl] rules in the same file swap to translateX(100%).',
  'layout/product-transition.css::translateX(100%)': 'The RTL counterpart of the sidebar slide.',
  'layout/employee-mobile-roster.css::translateX(18px)': 'Toggle knob travel; the [dir=rtl] rule on the next line negates it.',
  'layout/employee-mobile-roster.css::translateX(-18px)': 'The RTL negation of the toggle knob travel.',
};

function findings(file) {
  const text = fs.readFileSync(path.join(APP, file), 'utf8');
  const out = [];
  if (file.endsWith('.css')) {
    for (const m of text.matchAll(/\b(?:margin|padding)-(?:left|right)\b|\bborder-(?:left|right)\b(?!-radius)|\bborder-(?:top|bottom)-(?:left|right)-radius\b|\btext-align\s*:\s*(?:left|right)\b|\bfloat\s*:\s*(?:left|right)\b|(?<![-\w])(?:left|right)\s*:\s*[^;{}]+/g)) out.push(m[0].trim().replace(/\s+/g, ' ').replace(/\s*:\s*/, ': '));
    for (const m of text.matchAll(/\btranslateX\([^)]*\)/g)) out.push(m[0]);
    for (const m of text.matchAll(/(?<![-\w])(margin|padding|inset|border-radius)\s*:\s*([^;{}]+);/g)) {
      const v = m[2].trim().match(/(?:[^\s(]|\([^)]*\))+/g);
      if (v.length === 4 && (m[1] === 'border-radius' ? v[0] !== v[1] || v[3] !== v[2] : v[1] !== v[3])) out.push(`${m[1]}: ${m[2].trim()}`);
    }
  } else {
    const prefix = '(?:[\\w[\\]&>*-]+:)*';
    const re = new RegExp(`(?<![\\w-])${prefix}-?(?:ml|mr|pl|pr|left|right)-(?=\\d|\\[|px\\b|auto\\b|full\\b|1/2)[\\w./[\\]%-]*|(?<![\\w-])${prefix}text-(?:left|right)\\b|(?<![\\w-])${prefix}(?:border-[lr]|rounded-(?:[lr]|tl|tr|bl|br))(?:-[\\w[\\]]+)?(?![\\w-])`, 'g');
    for (const m of text.matchAll(re)) out.push(m[0].replace(new RegExp(`^${prefix}`), ''));
    for (const m of text.matchAll(/\b(?:marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight)\b\s*:/g)) out.push(m[0].replace(/\s*:$/, ''));
    for (const m of text.matchAll(/\btextAlign\s*:\s*['"](?:left|right)['"]|[{,]\s*(?:left|right)\s*:\s*[^,}]+/g)) out.push(m[0].replace(/^[{,]\s*/, '').trim());
    for (const m of text.matchAll(/translate-x-[\w[\]./-]+/g)) out.push(m[0]);
  }
  return out.map(entry => `${file}::${entry}`);
}

test('shell, onboarding and Brain first-run files use logical direction only', () => {
  const offenders = []; const used = new Set();
  for (const file of SCOPE) for (const finding of findings(file)) { if (finding in ALLOW) used.add(finding); else offenders.push(finding); }
  expect([...new Set(offenders)]).toEqual([]);
  expect(Object.keys(ALLOW).filter(key => !used.has(key))).toEqual([]);
});

let host, root;
beforeEach(() => {
  window.matchMedia = jest.fn(() => ({ matches: false }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  global.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

test('in Arabic the page is dir=rtl and the room bar back chevron and panel icon mirror', () => {
  document.documentElement.setAttribute('dir', 'rtl');
  act(() => root.render(<PhoneRoomFrame room="brain" />));
  expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  const mirrored = [...host.querySelectorAll('svg')].map(svg => svg.getAttribute('class') || '');
  expect(mirrored.filter(name => name.includes('lucide-chevron-left'))[0]).toContain('rtl:-scale-x-100');
  expect(mirrored.filter(name => name.includes('lucide-panel-right'))[0]).toContain('rtl:-scale-x-100');
  document.documentElement.removeAttribute('dir');
});
