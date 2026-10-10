import { rememberHarnessExchange, consumeHarnessExchange } from './harness-admission-handoff';

afterEach(() => { consumeHarnessExchange(''); jest.restoreAllMocks(); });
it('consumes a successful exchange once for only its immediate route', () => {
  rememberHarnessExchange('/hivemind/app/overview/new');
  expect(consumeHarnessExchange('/hivemind/app/overview/new')).toBe(true);
  expect(consumeHarnessExchange('/hivemind/app/overview/new')).toBe(false);
});
it('does not reuse admission for another route', () => {
  rememberHarnessExchange('/hivemind/app/overview/new');
  expect(consumeHarnessExchange('/hivemind/app/employee/harness/new')).toBe(false);
  expect(consumeHarnessExchange('/hivemind/app/overview/new')).toBe(false);
});
it('expires rather than becoming a durable authorization cache', () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
  rememberHarnessExchange('/hivemind/app/overview/new');
  now.mockReturnValue(11001);
  expect(consumeHarnessExchange('/hivemind/app/overview/new')).toBe(false);
});
