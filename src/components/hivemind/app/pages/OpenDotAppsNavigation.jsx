import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { dotAppsUrl } from '../shared-shell/navigation';
export default function OpenDotAppsNavigation() {
  const location = useLocation();
  const target = dotAppsUrl(location.search, location.hash);
  useEffect(() => { window.location.replace(target); }, [target]);
  return <section role="status" className="p-6"><p>Opening Apps…</p><a href={target}>Continue to Apps</a></section>;
}
