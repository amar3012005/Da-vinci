import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppsDirectory from './runtime-apps/AppsDirectory';
import catalog from './runtime-apps/apps.json';
import styles from './runtime-apps/styles';

// Only the Apps content mounts here. AppShell and its Sidebar remain the same
// React instances when navigating between Apps and employee conversations.
export default function OpenDotAppsNavigation() {
  const host = useRef(null);
  const [content, setContent] = useState(null);
  useLayoutEffect(() => {
    const shadow = host.current.shadowRoot || host.current.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    const root = document.createElement('div');
    root.className = 'runtime-apps-root';
    shadow.replaceChildren(style, root);
    setContent(root);
    return () => shadow.replaceChildren();
  }, []);
  return <div ref={host} data-runtime-apps-content className="h-full min-h-0 min-w-0">
    {content && createPortal(<AppsDirectory apps={catalog.apps} managedConnections />, content)}
  </div>;
}
