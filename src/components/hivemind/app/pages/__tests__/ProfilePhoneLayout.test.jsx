import React from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
const mockLogout = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('framer-motion', () => {
  const React = require('react');
  const strip = ({ variants, initial, animate, exit, transition, ...rest }) => rest;
  const motion = new Proxy({}, { get: (_, tag) => ({ children, ...props }) => React.createElement(tag, strip(props), children) });
  return { motion, AnimatePresence: ({ children }) => children };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, options) => (typeof options === 'string' ? options : options?.defaultValue) ?? key }) }));
jest.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ logout: mockLogout, org: { id: 'o1', name: 'SINGULANCE' }, user: { display_name: 'AMAR', email: 'support@singulancelabs.com', role: 'owner' } }),
}));
jest.mock('../../shared/api-client', () => ({ __esModule: true, default: { controlPlane: { get: () => Promise.resolve({ data: {} }) }, getProfile: () => Promise.resolve({}), getBillingPlan: () => Promise.resolve({ plan: { id: 'enterprise_onboarding', name: 'Enterprise Onboarding' } }), getOrganizationProfile: () => Promise.resolve(null) } }));
jest.mock('../../shared/hooks', () => ({ useApiQuery: () => ({ data: null, loading: false, refetch: () => {} }) }));
jest.mock('../../shared/WorkspaceAccessCard', () => ({ __esModule: true, default: () => null }));

import Profile from '../Profile';

function phone(matches) {
  window.matchMedia = query => ({ matches, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}
afterEach(() => { cleanup(); mockNavigate.mockClear(); mockLogout.mockClear(); });

describe('Profile on a phone', () => {
  beforeEach(() => phone(true));

  test('sub-tabs are one horizontally scrollable, non-wrapping pill row', () => {
    render(<Profile />);
    const row = screen.getByRole('tablist');
    expect(row.className).toContain('overflow-x-auto');
    expect(row.className).not.toContain('flex-wrap');
    expect(row).toHaveAttribute('data-layout', 'pills');
    for (const tab of screen.getAllByRole('tab')) expect(tab.className).toContain('whitespace-nowrap');
    expect(screen.getByRole('tab', { name: 'Account' }).className).toContain('bg-[#111]');
  });

  test('email truncates on one line and is a copy button', () => {
    render(<Profile />);
    const email = screen.getByTitle('support@singulancelabs.com');
    expect(email.className).toContain('truncate');
    expect(email.tagName).toBe('BUTTON');
  });

  test('Sign Out is its own full-width row and signs out', () => {
    render(<Profile />);
    const out = screen.getByRole('button', { name: 'Sign Out' });
    expect(out.className).toContain('w-full');
    expect(out.className).toContain('text-[#dc2626]');
    fireEvent.click(out);
    expect(mockLogout).toHaveBeenCalled();
  });

  test('billing and settings rows are full-width buttons; plan pill does not wrap', () => {
    render(<Profile />);
    const billing = screen.getByRole('button', { name: 'Manage billing' });
    expect(billing.className).toContain('w-full');
    fireEvent.click(billing);
    expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/billing');
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    expect(mockNavigate).toHaveBeenCalledWith('/hivemind/app/settings');
    expect(screen.getByText(/Not available|Enterprise/).closest('span.inline-flex').className).toContain('whitespace-nowrap');
  });
});

describe('Profile on desktop', () => {
  test('keeps the underlined tabs and inline Sign Out', () => {
    phone(false);
    render(<Profile />);
    expect(screen.getByRole('tablist')).toHaveAttribute('data-layout', 'underline');
    expect(screen.getByRole('button', { name: 'Sign Out' }).className).not.toContain('w-full');
  });
});
