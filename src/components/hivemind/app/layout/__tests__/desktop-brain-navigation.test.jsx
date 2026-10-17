import React from 'react';
// CRA Jest 27 predates React Router 7 package exports. Exercise its real router.
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../../../../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Brain } from 'lucide-react';
import DesktopBrainNavigation from '../DesktopBrainNavigation';
import BrainUpdateBanner from '../BrainUpdateBanner';
import { brainSidebarBanner } from '../brain-sidebar-banner';
import '@testing-library/jest-dom';

const link = (path, label) => ({ to: `/hivemind/app/${path}`, label, icon: Brain });
const sections = [
  { items: [link('overview', 'Overview'), link('overview/dreaming', 'Dreaming')] },
  { items: [link('memories', 'Memories'), link('knowledge', 'Upload Everything'), link('connectors', 'Connectors'), link('meeting-notes', 'AI Meeting Notes'), link('graph', 'Memory Graph')] },
  { items: [link('workspace', 'Workspace Admin')] },
  { items: [link('mcp', 'MCP Server'), link('keys', 'API Keys'), link('evaluation', 'Evaluation')] },
];
const testBanner = { image: "/images/brain-sidebar-update.svg", href: "/hivemind/app/overview", title: "Workspace update", label: "Explore your Brain" };
function setup(path = '/hivemind/app/memories', banner = testBanner) {
  return render(<MemoryRouter initialEntries={[path]}><DesktopBrainNavigation sections={sections} user={{ display_name: 'Amar' }} planLabel="Enterprise Plan" credits={{ percent_used: 41, remaining: 2358, included: 4000 }} logout={jest.fn()} banner={banner}/></MemoryRouter>);
}

test('the supplied banner links to Connectors without covering the artwork with duplicate text', () => {
  setup('/hivemind/app/memories', brainSidebarBanner);
  const banner = screen.getByRole('link', { name: 'Connect your apps to HIVEMIND' });
  expect(banner).toHaveAttribute('href', '/hivemind/app/connectors');
  expect(banner.querySelector('img')).toHaveAttribute('src', '/images/feature-banners/connectors.webp');
  expect(banner.textContent).toBe('');
  expect(screen.queryByRole('button', { name: 'Next banner' })).not.toBeInTheDocument();
});

test('future slideshow artwork changes the image and its destination together', () => {
  render(<MemoryRouter><BrainUpdateBanner slides={[...brainSidebarBanner.slice(0, 1), { id: 'next', image: '/next.png', href: '/hivemind/app/knowledge', label: 'See uploads' }]}/></MemoryRouter>);
  fireEvent.keyDown(screen.getByRole('region', { name: 'Workspace updates' }).querySelector('a'), { key: 'ArrowRight' });
  expect(screen.getByRole('link', { name: 'See uploads' })).toHaveAttribute('href', '/hivemind/app/knowledge');
  expect(screen.getByRole('link', { name: 'See uploads' }).querySelector('img')).toHaveAttribute('src', '/next.png');
  fireEvent.keyDown(screen.getByRole('region', { name: 'Workspace updates' }).querySelector('a'), { key: 'ArrowRight' });
  expect(screen.getByRole('link', { name: 'Connect your apps to HIVEMIND' })).toBeInTheDocument();
});

test('slideshow pauses on hover, keyboard focus and the pause control; missing canvas never strands navigation', () => {
  jest.useFakeTimers();
  const media = window.matchMedia;
  window.matchMedia = () => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  const context = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const slides = [...brainSidebarBanner.slice(0, 1), { id: 'next', image: '/next.png', href: '/hivemind/app/knowledge', label: 'See uploads' }];
  let view;
  try {
    view = render(<MemoryRouter><BrainUpdateBanner slides={slides}/></MemoryRouter>);
    const region = screen.getByRole('region', { name: 'Workspace updates' });
    fireEvent.mouseEnter(region);
    act(() => jest.advanceTimersByTime(12000));
    expect(screen.getByRole('link', { name: 'Connect your apps to HIVEMIND' })).toBeInTheDocument();
    fireEvent.mouseLeave(region);
    act(() => jest.advanceTimersByTime(4000));
    expect(screen.getByRole('link', { name: 'See uploads' })).toBeInTheDocument();
    expect(view.container.querySelector('canvas')).toBeNull();
    act(() => screen.getByRole('link', { name: 'See uploads' }).focus());
    fireEvent.mouseEnter(region); fireEvent.mouseLeave(region);
    act(() => jest.advanceTimersByTime(12000));
    expect(screen.getByRole('link', { name: 'See uploads' })).toBeInTheDocument();
    act(() => screen.getByRole('link', { name: 'See uploads' }).blur());
    fireEvent.keyDown(screen.getByRole('link', { name: 'See uploads' }), { key: ' ' });
    act(() => jest.advanceTimersByTime(12000));
    expect(screen.getByRole('link', { name: 'See uploads' })).toBeInTheDocument();
  } finally { view?.unmount(); context.mockRestore(); window.matchMedia = media; jest.useRealTimers(); }
});

test('reduced motion has no autoplay or character animation, while manual navigation remains available', () => {
  jest.useFakeTimers();
  const media = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  let view;
  try {
    view = render(<MemoryRouter><BrainUpdateBanner slides={[...brainSidebarBanner.slice(0, 1), { image: '/next.png', href: '/hivemind/app/knowledge', label: 'See uploads' }]}/></MemoryRouter>);
    act(() => jest.advanceTimersByTime(21000));
    expect(screen.getByRole('link', { name: 'Connect your apps to HIVEMIND' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Workspace updates' }).querySelector('a'), { key: 'ArrowRight' });
    expect(screen.getByRole('link', { name: 'See uploads' })).toBeInTheDocument();
    expect(view.container.querySelector('canvas')).toBeNull();
  } finally { view?.unmount(); window.matchMedia = media; jest.useRealTimers(); }
});

test('advanced destinations stay collapsed until explicitly opened, and keep native routes', () => {
  setup();
  expect(screen.queryByRole('link', { name: 'API Keys' })).not.toBeInTheDocument();
  const advanced = screen.getByRole('button', { name: 'Advanced' });
  fireEvent.click(advanced);
  expect(advanced).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute('href', '/hivemind/app/keys');
  fireEvent.click(advanced);
  expect(screen.queryByRole('link', { name: 'API Keys' })).not.toBeInTheDocument();
});

test('the selected Brain destination has its own active state; banner precedes real account usage', () => {
  const { container } = setup();
  expect(screen.getByRole('link', { name: 'Memories' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Uploads' })).not.toHaveAttribute('aria-current');
  expect(screen.queryByRole('link', { name: /invite/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Workspace Admin' })).toHaveAttribute('href', '/hivemind/app/workspace');
  const banner = screen.getByRole('link', { name: 'Explore your Brain' });
  const usage = screen.getByRole('link', { name: /View credit usage: 41% used/ });
  expect(banner.compareDocumentPosition(usage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(container.querySelectorAll('.brain-icon-grid > *')).toHaveLength(8);
  expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
  expect(container.querySelector('.brain-icon-grid')).toContainElement(screen.getByRole('link', { name: 'Dreaming' }));
  expect(container.querySelector('.brain-icon-grid')).toContainElement(screen.getByRole('link', { name: 'Workspace Admin' }));
});

test('account settings uses the existing account action', () => {
  setup();
  const listener = jest.fn();
  window.addEventListener('hm:open-account-settings', listener);
  fireEvent.click(screen.getByRole('button', { name: 'Account & Settings' }));
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('hm:open-account-settings', listener);
});


test('Advanced opens outside the scroll container, supports Escape and outside dismissal', () => {
  const { container } = setup();
  const trigger = screen.getByRole('button', { name: 'Advanced' });
  fireEvent.click(trigger);
  const flyout = screen.getByRole('dialog', { name: 'Advanced features' });
  expect(container).not.toContainElement(flyout);
  expect(document.body).toContainElement(flyout);
  expect(screen.getByRole('link', { name: 'MCP Server' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Account & Settings' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('link', { name: 'API Keys' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});


test('flyout coordinates account for the production shell CSS zoom', () => {
  const original = HTMLElement.prototype.getBoundingClientRect;
  const measure = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (this.classList.contains('brain-advanced-flyout')) return { width: 205.2, height: 149.4, left: 0, right: 205.2, top: 0, bottom: 149.4 };
    if (this.tagName === 'BUTTON') return { width: 100, height: 90, left: 140, right: 240, top: 300, bottom: 390 };
    return original.call(this);
  });
  const width = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(228);
  setup();
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    const flyout = screen.getByRole('dialog', { name: 'Advanced features' });
    expect(parseFloat(flyout.style.left) * 0.9).toBeCloseTo(249);
    expect(parseFloat(flyout.style.top) * 0.9).toBeCloseTo(300);
  } finally { measure.mockRestore(); width.mockRestore(); }
});


test('an empty banner slot reserves the artwork space without invented content', () => {
  setup('/hivemind/app/memories', null);
  expect(screen.getByRole('img', { name: 'Reserved space for workspace updates' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Explore your Brain' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Your Brain' })).not.toBeInTheDocument();
});
