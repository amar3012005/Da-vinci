import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LangSwitcher, { menuPlacement } from '../LangSwitcher';
import { SUPPORTED_LANGUAGES } from '../../../../../i18n';

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init() {} },
  useTranslation: () => ({ i18n: { language: 'de', changeLanguage: jest.fn() }, t: (_key, fallback) => fallback }),
}));

describe('language menu placement', () => {
  test.each([278, 320, 375, 1024])('stays inside a %ipx viewport for a button at the right edge', (viewport) => {
    const anchor = { left: viewport - 60, right: viewport - 16 };
    const { width, left } = menuPlacement(anchor, viewport);
    const absoluteLeft = anchor.left + left;
    expect(absoluteLeft).toBeGreaterThanOrEqual(16);
    expect(absoluteLeft + width).toBeLessThanOrEqual(viewport - 16);
    expect(width).toBeLessThanOrEqual(220);
  });

  test('a button far from the right edge still keeps the menu on screen and right-aligned when it fits', () => {
    expect(menuPlacement({ left: 100, right: 150 }, 278)).toEqual({ width: 220, left: -84 });
    const wide = menuPlacement({ left: 700, right: 760 }, 1024);
    expect(700 + wide.left + wide.width).toBe(760);
  });

  test('lists every dictionary language, hi, ja and ar included, and opens with the computed placement', () => {
    const { container } = render(<LangSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /Language/ }));
    const items = screen.getAllByRole('menuitemradio').map((item) => item.textContent);
    for (const code of ['hi', 'ja', 'ar', 'de']) expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain(code);
    expect(items).toHaveLength(SUPPORTED_LANGUAGES.length);
    expect(container.querySelector('[role="menu"]').style.width).not.toBe('');
  });
});
