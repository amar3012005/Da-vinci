import React, { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, ChevronDown, LogOut, Settings } from 'lucide-react';
import BrainFabricIcon from './BrainFabricIcon';
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
  const items = sections.flatMap(section => section.items);
  const advanced = items.filter(item => ['/mcp', '/keys', '/evaluation'].some(path => item.to.endsWith(path)));
  const advancedActive = advanced.some(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const workspace = items.find(item => item.to === '/hivemind/app/workspace');
  const core = sections[0]?.items || [];
  return <div className="desktop-brain-slice" data-desktop-brain>
    <nav className="brain-destinations" aria-label="Brain navigation">
      <div className="brain-primary-links">{core.map(item => <NavLink key={item.to} to={item.to} end={item.to.endsWith('/overview')} className={({ isActive }) => `brain-primary-link${isActive ? ' is-current' : ''}`}><item.icon size={19} strokeWidth={1.6}/><span>{item.label}</span></NavLink>)}</div>
      <h2 className="brain-section-title">Your Brain</h2>
      <div className="brain-icon-grid">{destinations.map(([kind, suffix]) => {
        const item = items.find(entry => entry.to.endsWith(suffix));
        return item ? <NavLink key={kind} to={item.to} className={({ isActive }) => `brain-icon-link${isActive ? ' is-current' : ''}`}><BrainFabricIcon kind={kind}/><span>{kind === 'uploads' ? 'Uploads' : item.label}</span></NavLink> : null;
      })}
        <button type="button" className={`brain-icon-link${advancedActive ? ' is-current' : ''}`} aria-expanded={advancedOpen} aria-controls={advancedId} onClick={() => setAdvancedOpen(value => !value)}><BrainFabricIcon kind="advanced"/><span>Advanced <ChevronDown size={12} className={advancedOpen ? 'is-open' : ''}/></span></button>
      </div>
      <div id={advancedId} hidden={!advancedOpen} className="brain-advanced-links">{advanced.map(item => <NavLink key={item.to} to={item.to}><item.icon size={16}/>{item.label}</NavLink>)}</div>
    </nav>
    <footer className="brain-bottom">
      <div className="brain-account-actions">
        {workspace && <NavLink to={workspace.to} className={({ isActive }) => `brain-footer-link${isActive ? ' is-current' : ''}`}><Building2 size={19}/><span>{workspace.label}</span></NavLink>}
        <button type="button" className="brain-footer-link" onClick={() => window.dispatchEvent(new Event('hm:open-account-settings'))}><Settings size={19}/><span>Account &amp; Settings</span></button>
      </div>
      {banner && <NavLink className="brain-update-banner" to={banner.href} aria-label={banner.label}>
        <img src={banner.image} alt="" width="268" height="112" loading="lazy"/>
        <div><strong>{banner.title}</strong><span>{banner.label}</span></div>
      </NavLink>}
      {user && <div className="brain-account-usage"><div className="brain-account-name"><span className="brain-account-initial" aria-hidden="true">{(user.display_name || user.email || 'U')[0].toUpperCase()}</span><div><strong>{user.display_name || user.email || 'User'}</strong><span>{planLabel}</span></div></div><CreditBalance credits={credits} inline/></div>}
      <button type="button" onClick={logout} className="brain-footer-link brain-sign-out"><LogOut size={17}/><span>Sign out</span></button>
    </footer>
  </div>;
}
