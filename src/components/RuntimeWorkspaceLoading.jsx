import React from 'react';

/** Visible recovery while the existing Runtime workspace chunk is downloading. */
export default function RuntimeWorkspaceLoading() {
  const [slow, setSlow] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="min-h-screen flex items-center justify-center bg-[#faf9f4] p-6 text-[#333]">
    <div className="text-center" role={slow ? 'alert' : 'status'} aria-live="polite">
      <p className="text-sm">{slow ? 'Your workspace is taking longer to load.' : 'Opening your workspace…'}</p>
      {slow && <><p className="mt-2 text-xs text-[#737373]">Your saved conversations are unchanged.</p><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-[#d4d4d4] bg-white px-4 py-2 text-sm">Retry</button></>}
    </div>
  </div>;
}
