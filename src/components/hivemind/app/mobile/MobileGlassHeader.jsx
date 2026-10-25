import React from 'react';
import { ChevronLeft } from 'lucide-react';
import '../layout/liquid-glass.css';
import './mobile-glass.css';

/**
 * Phone page bar in the room style: a liquid-glass back control that opens the menu and a centered
 * glass identity pill. Pass it to MobileShell as `renderHeader={glassHeader({ icon, title })}`.
 * @param {{ icon: React.ReactNode, title: string, right?: React.ReactNode }} page
 * @returns {(shell: { openDrawer: () => void }) => React.ReactElement}
 */
export function glassHeader({ icon, title, right = null }) {
  return function MobileGlassHeader({ openDrawer }) {
    return <header data-mobile-glass-header className="mg-header">
      <button type="button" onClick={openDrawer} aria-label="Open menu" className="liquid-glass mg-header-icon"><ChevronLeft size={22} strokeWidth={2} /></button>
      <div className="liquid-glass mg-header-pill"><span className="mg-header-mark" aria-hidden="true">{icon}</span><span className="mg-header-title">{title}</span></div>
      <div className="mg-header-right">{right}</div>
    </header>;
  };
}
