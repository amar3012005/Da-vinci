/** Opt-in local diagnostics: only phase names, durations and HTTP status. */
export async function measureHarnessBoot(phase, operation) {
  const enabled = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('hiveBootTiming') === '1';
  if (!enabled) return operation();
  const started = performance.now();
  let outcome = 'failed';
  let status;
  try {
    const result = await operation();
    outcome = 'completed';
    if (Number.isInteger(result?.status)) status = result.status;
    return result;
  } finally {
    console.info('[hive-boot-timing]', JSON.stringify({ phase, outcome,
      ms: Math.round(performance.now() - started), ...(status === undefined ? {} : { status }) }));
  }
}
