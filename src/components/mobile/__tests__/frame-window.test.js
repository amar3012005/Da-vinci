import { createFrameWindow } from '../frame-window';

function setup() {
  const requested = [];
  const onLoad = jest.fn();
  const frames = createFrameWindow({count:164, srcFor:i=>`frame-${i}`, onLoad, createImage:()=>{
    const image = { complete:false, naturalWidth:0 };
    requested.push(image);
    return image;
  }});
  const settle = (image, success=true) => {
    image.complete = true; image.naturalWidth = success ? 1600 : 0;
    image[success ? 'onload' : 'onerror']?.();
  };
  const drain = () => {
    for (let i=0; i<requested.length; i++) if (!requested[i].complete) settle(requested[i]);
  };
  return {frames, requested, onLoad, settle, drain};
}

test('only a bounded lookahead is fetched, with at most three requests in flight', () => {
  const {frames, requested, drain} = setup();
  expect(requested).toHaveLength(0);
  frames.request(0);
  expect(requested).toHaveLength(3);
  expect(frames.stats().active).toBe(3);
  drain();
  expect(requested).toHaveLength(7);
  expect(frames.stats().active).toBe(0);
});

test('a broken complete image is never returned for canvas drawing', () => {
  const {frames, requested, settle, onLoad} = setup();
  frames.request(0);
  settle(requested[0],false);
  expect(frames.nearest(0)).toBeUndefined();
  expect(onLoad).not.toHaveBeenCalled();
  settle(requested[1]);
  expect(frames.nearest(0)).toBe(requested[1]);
});

test('jumping replaces stale queued work and long scrubs retain a small decode window', () => {
  const {frames, requested, drain, settle} = setup();
  frames.request(0);
  frames.request(120);
  settle(requested[0]);
  expect(requested[3].src).toBe('frame-120');
  drain();
  for (let i=0;i<164;i+=10) { frames.request(i); drain(); }
  expect(frames.stats().cached).toBeLessThanOrEqual(24);
});

test('unmount stops queued work and late load callbacks', () => {
  const {frames, requested, settle, onLoad} = setup();
  frames.request(0); frames.dispose();
  requested.forEach(image=>settle(image));
  frames.request(100);
  expect(requested).toHaveLength(3);
  expect(onLoad).not.toHaveBeenCalled();
});
