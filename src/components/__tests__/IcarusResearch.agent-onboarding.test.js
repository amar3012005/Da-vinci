import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

jest.mock('lucide-react', () => ({
  Check: () => null, Copy: () => null,
}), { virtual: true });
jest.mock('../research/NewsArticleLayout', () => {
  const Layout = ({ children }) => <main>{children}</main>;
  const Section = ({ children }) => <section>{children}</section>;
  return { __esModule: true, default: Layout, H2: Section, P: Section, Table: () => null, FullBleed: Section };
});
jest.mock('../research/InteractiveByteSlot', () => () => null);

import IcarusResearch from '../IcarusResearch';

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue({ matches: false, addListener: jest.fn(), removeListener: jest.fn() }),
  });
});

test('research hero exposes a copyable ICARUS coding-agent onboarding prompt', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => { root.render(<IcarusResearch />); });
  const banner = container.querySelector('[aria-label="Copy the ICARUS coding-agent onboarding prompt"]');
  expect(container.textContent).toContain('Onboard your coding agent to ICARUS');
  expect(banner).not.toBeNull();
  expect(container.querySelector('img[alt="OpenAI Codex logo"]')).not.toBeNull();
  expect(container.querySelector('img[alt="Claude Code logo"]')).not.toBeNull();
  expect(container.querySelector('img[alt="Cursor logo"]')).not.toBeNull();

  await act(async () => { banner.click(); });
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://icarus.singulancelabs.com/agent-setup/prompt.md'));
  await act(async () => { root.unmount(); });
});
