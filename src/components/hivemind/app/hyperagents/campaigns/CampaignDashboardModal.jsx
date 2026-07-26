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

  return <div className="fixed inset-0 z-50 bg-black/45 p-0 sm:p-3 lg:p-5" role="dialog" aria-modal="true" aria-labelledby="campaign-dashboard-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="mx-auto h-full w-full max-w-[1500px] overflow-hidden bg-[#fbfaf6] border border-[#d8d3cc] sm:rounded-lg shadow-2xl">
      <h2 id="campaign-dashboard-title" className="sr-only">{campaign?.name || (loading ? 'Loading campaign' : 'Campaign dashboard')}</h2>
      {children}
    </div>
  </div>;
}
