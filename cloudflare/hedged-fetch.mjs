/**
 * Read-only fetch that starts one identical second attempt when the first has not responded
 * within `hedgeAfterMs`, and resolves with whichever responds first. The slower attempt is
 * aborted. Only for idempotent GET requests; a rejection is returned only when both fail.
 * @param {string} url - request URL.
 * @param {RequestInit} init - GET options; `signal` aborts both attempts.
 * @param {number} hedgeAfterMs - delay before the second attempt.
 * @param {typeof fetch} fetcher - fetch implementation.
 * @returns {Promise<Response>} the first response.
 */
export function hedgedFetch(url, init = {}, hedgeAfterMs = 2500, fetcher = fetch) {
  return new Promise((resolve, reject) => {
    const controllers = [];
    let settled = false, pending = 0, timer;
    const finish = (action, value) => { if (settled) return false; settled = true; clearTimeout(timer); action(value); return true; };
    const launch = () => {
      const controller = new AbortController();
      controllers.push(controller);
      pending += 1;
      const signal = init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
      fetcher(url, { ...init, signal }).then(response => {
        pending -= 1;
        if (finish(resolve, response)) { for (const other of controllers) if (other !== controller) other.abort(); }
        else response.body?.cancel().catch(() => {});
      }, error => {
        pending -= 1;
        // A failed first attempt hedges at once; reject when no attempt remains or the caller aborted.
        if (controllers.length === 1 && !init.signal?.aborted) { clearTimeout(timer); launch(); }
        else if (pending === 0 || init.signal?.aborted) finish(reject, error);
      });
    };
    timer = setTimeout(() => { if (!settled && controllers.length === 1) launch(); }, hedgeAfterMs);
    launch();
  });
}
