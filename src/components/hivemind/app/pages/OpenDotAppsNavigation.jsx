import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fetchRuntime } from '../shared/runtime-admission';
import { createPortal } from 'react-dom';
import AppsDirectory from './runtime-apps/AppsDirectory';

// Only content mounts here; AppShell and Sidebar retain their React instances.
export default function OpenDotAppsNavigation() {
  const host = useRef(null);
  const [content, setContent] = useState(null);
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetchRuntime('/api/hivemind/apps/catalog', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Apps could not load. Please try again.');
      const value = await response.json();
      if (!Array.isArray(value.apps)) throw new Error('Apps could not load. Please try again.');
      if (!controller.signal.aborted) setApps(value.apps);
    }).catch(() => { if (!controller.signal.aborted) setError('Apps could not load. Please try again.'); });
    return () => controller.abort();
  }, [retry]);
  useLayoutEffect(() => {
    const shadow = host.current.shadowRoot || host.current.attachShadow({ mode: 'open' });
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/api/hivemind/apps/styles?v=native-2';
    const root = document.createElement('div');
    root.className = 'runtime-apps-root';
    let active = true;
    style.onload = () => { if (active) setContent(root); };
    style.onerror = () => { if (active) setError('Apps styles could not load. Please try again.'); };
    shadow.replaceChildren(style, root, document.createElement('slot'));
    return () => { active = false; shadow.replaceChildren(); };
  }, [retry]);
  return <div ref={host} data-runtime-apps-content className="h-full min-h-0 min-w-0">
    {error ? <div role="alert" className="p-6">{error} <button onClick={() => setRetry(value => value + 1)}>Try again</button></div> : (!content || !apps) && <p role="status" className="p-6">Loading Apps…</p>}
    {content && apps && createPortal(<AppsDirectory apps={apps} managedConnections />, content)}
  </div>;
}
