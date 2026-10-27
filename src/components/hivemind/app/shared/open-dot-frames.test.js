import { postOpenDotSignOut, registerOpenDotFrame } from './open-dot-frames';

const DOT_SRC = 'https://runtime-runner.singulancelabs.com/employees/9f1c2b3a-4d5e-4f60-8a71-b2c3d4e5f607?embed=hivemind';

function fakeFrame(src = DOT_SRC) {
  return { src, isConnected: true, contentWindow: { postMessage: jest.fn() } };
}

afterEach(() => {
  // Each test registers its own frames; disposers keep the module-level registry empty between tests.
  document.body.innerHTML = '';
});

test('sign-out is posted to each registered frame with that frame origin and never a wildcard', () => {
  const turing = fakeFrame();
  const room = fakeFrame('https://runtime-runner.singulancelabs.com/dots/dot_turing-room?embed=hivemind');
  const disposeTuring = registerOpenDotFrame(turing);
  const disposeRoom = registerOpenDotFrame(room);

  expect(postOpenDotSignOut()).toBe(2);

  for (const frame of [turing, room]) {
    expect(frame.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(
      { type: 'hivemind.open-dot.sign-out', version: 1 },
      'https://runtime-runner.singulancelabs.com',
    );
  }
  for (const frame of [turing, room]) {
    for (const call of frame.contentWindow.postMessage.mock.calls) expect(call[1]).not.toBe('*');
  }
  disposeTuring();
  disposeRoom();
});

test('a disposed registration receives no sign-out', () => {
  const frame = fakeFrame();
  const dispose = registerOpenDotFrame(frame);
  dispose();

  expect(postOpenDotSignOut()).toBe(0);
  expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
});

test('a frame that is no longer connected is skipped and dropped', () => {
  const frame = fakeFrame();
  frame.isConnected = false;
  registerOpenDotFrame(frame);

  expect(postOpenDotSignOut()).toBe(0);
  expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
});

test('a frame without an exact origin is not posted to', () => {
  const frame = fakeFrame('not a url');
  const dispose = registerOpenDotFrame(frame);

  expect(postOpenDotSignOut()).toBe(0);
  expect(frame.contentWindow.postMessage).not.toHaveBeenCalled();
  dispose();
});

test('an account or company switch (hm:tenant-changed) signs the frames out', () => {
  const frame = fakeFrame();
  const dispose = registerOpenDotFrame(frame);

  window.dispatchEvent(new CustomEvent('hm:tenant-changed'));

  expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(
    { type: 'hivemind.open-dot.sign-out', version: 1 },
    'https://runtime-runner.singulancelabs.com',
  );
  dispose();
});
