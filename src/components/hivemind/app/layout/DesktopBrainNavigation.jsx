import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, CornerDownLeft, LogOut, Settings } from 'lucide-react';
import BrainKeyboardFace from './BrainKeyboardFace';
import BrainUpdateBanner from './BrainUpdateBanner';
import CreditBalance from '../shared/CreditBalance';
import { brainSidebarBanner } from './brain-sidebar-banner';
import './desktop-brain-navigation.css';

const destinations = [
  ['memories', '/memories'], ['uploads', '/knowledge'], ['connectors', '/connectors'],
  ['notes', '/meeting-notes'], ['graph', '/graph'],
];

export default function DesktopBrainNavigation({ sections, user, planLabel, credits, logout, banner = brainSidebarBanner }) {
  const { pathname } = useLocation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedId = useId();
  const advancedButton = useRef(null);
  const destinationsScroll = useRef(null);
  const flyout = useRef(null);
  const [flyoutPosition, setFlyoutPosition] = useState(null);
  useEffect(() => setAdvancedOpen(false), [pathname]);
  useLayoutEffect(() => {
    if (!advancedOpen) return undefined;
    const position = () => {
      const trigger = advancedButton.current?.getBoundingClientRect();
      const sidebar = advancedButton.current?.closest('aside')?.getBoundingClientRect();
      if (!trigger) return;
      const width = flyout.current?.offsetWidth || 228;
      // The web shell applies CSS zoom. DOM rects are scaled, while fixed
      // left/top use the portal's CSS units; convert between those spaces.
      const scale = (flyout.current?.getBoundingClientRect().width / width) || 1;
      const height = (flyout.current?.offsetHeight || 166) * scale;
      setFlyoutPosition({
        left: Math.min((sidebar?.right || trigger.right) + 10 * scale, window.innerWidth - width * scale - 12) / scale,
        top: Math.max(12, Math.min(trigger.top, window.innerHeight - height - 12)) / scale,
      });
    };
    const dismiss = event => {
      if (!flyout.current?.contains(event.target) && !advancedButton.current?.contains(event.target)) setAdvancedOpen(false);
    };
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setAdvancedOpen(false); advancedButton.current?.focus(); }
    };
    position();
    flyout.current?.querySelector('a')?.focus();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', keydown);
    };
  }, [advancedOpen]);
  const items = sections.flatMap(section => section.items);
  const advanced = items.filter(item => ['/mcp', '/keys', '/evaluation'].some(path => item.to.endsWith(path)));
  const advancedActive = advanced.some(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const keyboardDestinations = [...destinations, ['dreaming', '/overview/dreaming'], ['workspace', '/workspace']]
    .map(([, suffix]) => items.find(item => item.to.endsWith(suffix))).filter(Boolean);
  const currentIndex = keyboardDestinations.findIndex(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const previous = keyboardDestinations[(currentIndex < 0 ? keyboardDestinations.length - 1 : currentIndex - 1 + keyboardDestinations.length) % keyboardDestinations.length];
  const next = keyboardDestinations[(currentIndex + 1) % keyboardDestinations.length];

  return <div className="desktop-brain-slice" data-desktop-brain>
    <nav ref={destinationsScroll} className="brain-destinations" aria-label="Brain navigation">
      <div className="brain-icon-grid">{destinations.map(([kind, suffix]) => {
        const item = items.find(entry => entry.to.endsWith(suffix));
        return item ? <NavLink key={kind} to={item.to} className={({ isActive }) => `brain-icon-link brain-key brain-key-${kind}${isActive ? ' is-current' : ''}`}><BrainKeyboardFace kind={kind} label={kind === 'uploads' ? 'Uploads' : item.label}/></NavLink> : null;
      })}
        <button ref={advancedButton} type="button" aria-haspopup="dialog" className={`brain-icon-link brain-key brain-key-advanced${advancedActive ? ' is-current' : ''}`} aria-expanded={advancedOpen} aria-controls={advancedId} onClick={() => setAdvancedOpen(value => !value)}><BrainKeyboardFace kind="advanced" label="Advanced"/></button>
        {[['dreaming', '/hivemind/app/overview/dreaming'], ['workspace', '/hivemind/app/workspace']].map(([kind, path]) => {
          const item = items.find(entry => entry.to === path);
          return item ? <NavLink key={kind} to={item.to} className={({ isActive }) => `brain-icon-link brain-key brain-key-${kind}${isActive ? ' is-current' : ''}`}><BrainKeyboardFace kind={kind} label={item.label}/></NavLink> : null;
        })}
        <NavLink to="/hivemind/app/overview/new" className="brain-key brain-key-return" aria-label="Open Brain chat"><span className="brain-key-face"><CornerDownLeft size={20} aria-hidden="true"/></span></NavLink>
        {previous && <NavLink to={previous.to} className="brain-key brain-key-arrow brain-key-previous" aria-label={`Previous Brain page: ${previous.label}`}><span className="brain-key-face"><ArrowLeft size={22} aria-hidden="true"/></span></NavLink>}
        <button type="button" className="brain-key brain-key-arrow brain-key-top" aria-label="Scroll Brain navigation to top" onClick={() => destinationsScroll.current?.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}><span className="brain-key-face"><ArrowUp size={22} aria-hidden="true"/></span></button>
        {next && <NavLink to={next.to} className="brain-key brain-key-arrow brain-key-next" aria-label={`Next Brain page: ${next.label}`}><span className="brain-key-face"><ArrowRight size={22} aria-hidden="true"/></span></NavLink>}
      </div>
      {advancedOpen && createPortal(<div ref={flyout} role="dialog" aria-label="Advanced features" id={advancedId} className="brain-advanced-flyout" style={{ ...flyoutPosition, visibility: flyoutPosition ? 'visible' : 'hidden' }}>
        <nav aria-label="Advanced destinations">{advanced.map(item => <NavLink key={item.to} to={item.to} onClick={() => setAdvancedOpen(false)}><item.icon size={17}/><span>{item.label}</span><ChevronRight size={14}/></NavLink>)}</nav>
      </div>, document.body)}
    </nav>
    <footer className="brain-bottom">
      <div className="brain-account-actions">
        <button type="button" className="brain-footer-link" onClick={() => window.dispatchEvent(new Event('hm:open-account-settings'))}><Settings size={19}/><span>Account &amp; Settings</span></button>
      </div>
      <BrainUpdateBanner slides={banner}/>
      {user && <div className="brain-account-usage"><div className="brain-account-name"><span className="brain-account-initial" aria-hidden="true">{(user.display_name || user.email || 'U')[0].toUpperCase()}</span><div><strong>{user.display_name || user.email || 'User'}</strong><span>{planLabel}</span></div></div><CreditBalance credits={credits} inline/></div>}
      <button type="button" onClick={logout} className="brain-footer-link brain-sign-out"><LogOut size={17}/><span>Sign out</span></button>
    </footer>
  </div>;
}
