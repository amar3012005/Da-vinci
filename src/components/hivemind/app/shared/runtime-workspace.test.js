import { openBrainChat } from './runtime-workspace';

let mockNative = false;
jest.mock('./native-app', () => ({ isNativeApp: () => mockNative }));
const mockOpen = jest.fn();
jest.mock('./native-room', () => ({ openNativeCompanyBrainRoom: (...args) => mockOpen(...args) }));

beforeEach(() => { mockNative = false; mockOpen.mockReset(); });

test('the packaged app opens the Company Brain room natively with the person scope', () => {
  mockNative = true; mockOpen.mockResolvedValue(undefined); const navigate = jest.fn();
  openBrainChat(navigate, { scope: 'o1:u1' });
  expect(mockOpen).toHaveBeenCalledWith({ scope: 'o1:u1' });
  expect(navigate).not.toHaveBeenCalled();
});

test('the packaged app falls back to the harness chat page when the native room is refused', async () => {
  mockNative = true; mockOpen.mockRejectedValue(new Error('Room is not allowed.')); const navigate = jest.fn();
  openBrainChat(navigate);
  await Promise.resolve(); await Promise.resolve();
  expect(navigate).toHaveBeenCalledWith('/hivemind/app/overview/new', { state: { fromTeam: true } });
});
