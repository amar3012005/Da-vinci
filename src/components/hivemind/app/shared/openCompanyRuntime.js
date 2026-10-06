/** Open the existing native Runtime room; never sends an awakening message. */
export async function openCompanyRuntime(navigate, browser = window) {
  const previous = browser.__HIVEMIND_START_AGENT__;
  const mounted = /^\/hivemind\/app\/employee\/harness(?:\/|$)/.test(browser.location.pathname);
  if (!mounted) navigate('/hivemind/app/employee/harness', { replace: true });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const start = browser.__HIVEMIND_START_AGENT__;
    if (typeof start === 'function' && (mounted || start !== previous)) {
      if (await start('runtime')) return;
      throw new Error('Could not open Runtime. Please try again from the sidebar.');
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Runtime is still loading. Please try again from the sidebar.');
}
