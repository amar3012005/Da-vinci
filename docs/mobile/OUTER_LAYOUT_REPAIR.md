# Mobile outer layout repair — 8 October 2026

Base: 2590aeca. Existing cream canvas, typography and blue controls retained. Desktop positioning preserved.

## Fixed boundaries

- Compact native AppShell now gives its inner frame a bounded flex height and zero-minimum width. Main owns the available canvas without inherited desktop page padding.
- Embedded OS Harness rooms fill their parent's available height instead of subtracting a second 56px header; the floating phone header has no flow height.
- Phone Brain composers no longer use desktop side-rail centering transforms.
- Legacy floating chat popup follows visualViewport while open on compact layouts, respects safe areas and has a bounded history scroller.

No global horizontal overflow masking, route changes, draft changes or native session changes.

## Evidence

- `mobile-chat-viewport.test.js`: 2 tests passed.
- JSX parser: 27 layout files and 105 page files, zero errors.
- `scripts/mobile-layout-evidence/outer-geometry.cjs`: actual Chromium in a disposable, network-disabled container using the installed Playwright image. 15 room cases (320/360/390/430/820px, heights844/568/360px), simulated24px top safe area; 4 phone popup keyboard-height cases. Composer remains inside viewport, history scrolls, no document width expansion.
- Fixture screenshots: `/tmp/mobile-outer-evidence/outer-runtime-390.png`, `/tmp/mobile-outer-evidence/outer-popup-keyboard-430.png`.

The fixtures validate the outer CSS geometry only, not native conversation content or authenticated production UI. Native long links, tables, composer voice/stop states and real phone keyboard interactions need the accompanying Harness changes and live verification.

Existing broader suites could not run with the available reused dependencies: MobileBrainShell imports ESM `@humation/react` through Jest's ignored node_modules, and EmployeeMobileNavigation lacks `@testing-library/dom`. No shared dependency tree was changed. No deployment performed.

## Real outer component visual check

A separate React fixture bundles the unchanged real MobileShell, EmployeeMobileNavigation, Sidebar, ChatPanel and shared message bubbles with compiled application Tailwind. Only authenticated tenant hooks, network and browser dictation are mocked; no production authentication bypass or native-session mock claim.

Four phone widths (320/360/390/430) render populated message history without document horizontal overflow. At400px viewport height the popup composer remains visible. The history scroll is independently exercised. Actual390px navigation drawer renders the existing company/team/Brain controls. Browser runtime errors: zero.

This caught and corrected the real popup header's compressed multi-line identity: mobile now places identity above the utility chips rather than squeezing both onto one row. Desktop stays unchanged.

Screens: `/tmp/mobile-outer-evidence/react-popup-390.png`, `react-popup-keyboard-390.png`, `react-navigation-390.png`. The fixture excludes live authentication, native Harness conversation rendering and production web-font network loading. These are visual component fixtures, not browser-verified production pages.
