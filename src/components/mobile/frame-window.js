// A small, demand-driven decode window: never download an entire film on idle.
export function createFrameWindow({ count, srcFor, onLoad, createImage = () => new Image(), concurrency = 3, capacity = 24 }) {
  const images = new Map();
  const failed = new Set();
  let queue = [], active = 0, target = 0, disposed = false;
  const valid = image => image?.complete && image.naturalWidth > 0;
  const trim = () => {
    const removable = [...images.keys()].filter(i => valid(images.get(i))).sort((a, b) => Math.abs(b - target) - Math.abs(a - target));
    while (images.size > capacity && removable.length) images.delete(removable.shift());
  };
  const pump = () => {
    while (!disposed && active < concurrency && queue.length) {
      const i = queue.shift();
      if (images.has(i) || failed.has(i)) continue;
      const image = createImage();
      images.set(i, image);
      active++;
      const finish = () => {
        image.onload = image.onerror = null;
        active--;
        if (disposed) return;
        if (!valid(image)) { images.delete(i); failed.add(i); }
        trim();
        if (valid(image)) onLoad(i);
        pump();
      };
      image.onload = image.onerror = finish;
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = srcFor(i);
    }
  };
  return {
    request(index) {
      if (disposed) return;
      target = Math.max(0, Math.min(count - 1, Math.round(index)));
      // Replace stale queued work when a visitor jumps forward or back.
      queue = [target, ...Array.from({length: 6}, (_, k) => target + k + 1), target - 1, target - 2]
        .filter(i => i >= 0 && i < count && !images.has(i) && !failed.has(i));
      pump();
    },
    nearest(index) {
      if (valid(images.get(index))) return images.get(index);
      const nearest = [...images.keys()].filter(i => valid(images.get(i))).sort((a,b) => Math.abs(a-index)-Math.abs(b-index))[0];
      return images.get(nearest);
    },
    dispose() {
      disposed = true; queue = [];
      images.forEach(image => { image.onload = image.onerror = null; });
      images.clear();
    },
    stats: () => ({ cached: images.size, active, queued: queue.length }),
  };
}
