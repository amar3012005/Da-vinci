import React, { useEffect } from 'react';

export default function CampaignDashboardModal({ campaign, loading, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return <div className="fixed inset-0 z-50 bg-black/45 p-0 sm:px-5 sm:pb-5 sm:pt-10 lg:pt-12" role="dialog" aria-modal="true" aria-labelledby="campaign-dashboard-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mx-auto h-full w-full max-w-[1420px] overflow-hidden border border-[#d8d3cc] bg-[#fbfaf6] shadow-2xl sm:h-[calc(100vh-3.75rem)] sm:rounded-lg lg:h-[calc(100vh-4.25rem)]">
      <h2 id="campaign-dashboard-title" className="sr-only">{campaign?.name || (loading ? 'Loading campaign' : 'Campaign dashboard')}</h2>
      {children}
    </div>
  </div>;
}
