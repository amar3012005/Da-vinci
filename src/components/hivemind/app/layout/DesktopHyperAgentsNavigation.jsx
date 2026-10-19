import { employeeAppsPath } from '../shared/workspace-mode';
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus, Cable, Building2, FolderKanban, Monitor, FolderOpen, Settings, LogOut } from 'lucide-react';
import AgentAvatar from '../hyperagents/AgentAvatar';
import AgentRoomStatus, { aggregateAgentRooms } from './AgentRoomStatus';
import CreditBalance from '../shared/CreditBalance';
import { openDotEmployeePath } from '../shared/open-dot-employee-route';
import './desktop-hyperagents-navigation.css';

export const HYPERAGENT_WIDTHS = { 1: 216, 2: 330, 3: 452 };
export const columnsForWidth = width => width < 145 ? 0 : width < 278 ? 1 : width < 391 ? 2 : 3;
export const createEmployeeSpan = (count, columns) => columns - (count % columns);
export const employeeProfession = agent => String(agent.role || agent.job_title || agent.role_archetype || agent.roleArchetype || 'Team member').replace(/_/g, ' ');

function LiveStatus({ room, collapsed }) {
  return <span className="ha-live-status">
    <AgentRoomStatus room={room} compact={collapsed}/>
    {room?.activeCall && !room.stale && !collapsed && <span className="ha-call-label">In call</span>}
    {!room && !collapsed && <span className="ha-status-unknown">Status unavailable</span>}
  </span>;
}

export default function DesktopHyperAgentsNavigation({ team, rooms, selectedAgent, openingAgent, onOpenAgent, onCreate, onCompany, columns, collapsed, user, planLabel, credits, logout }) {
  const location = useLocation();
  const roomFor = id => {
    const room = aggregateAgentRooms(rooms, id);
    return openingAgent === id ? { ...room, loading: true } : room;
  };
  const runtimeRoom = roomFor('runtime');
  const span = createEmployeeSpan(team.length, columns);
  return <div className={`desktop-hyperagents-navigation${collapsed ? ' is-collapsed' : ''}`} data-columns={columns}>
    <div className="ha-team-scroll">
      {!collapsed && <div className="ha-team-heading"><h2>Your team</h2><span>{team.length} {team.length === 1 ? 'employee' : 'employees'}</span></div>}
      <button type="button" data-agent-room-link className={`ha-runtime-card${!selectedAgent ? ' is-selected' : ''}`} aria-label="Runtime, AI Chief of Staff" aria-busy={openingAgent === 'runtime' || undefined} onClick={event => onOpenAgent(event, { id: 'runtime' })} title={collapsed ? 'Runtime · AI Chief of Staff' : undefined}>
        <img src="/assets/runtime-computer-c2305f5b.webp?v=c2305f5b" alt=""/>
        {!collapsed && <span className="ha-runtime-identity"><strong>Runtime</strong><small>AI Chief of Staff</small><LiveStatus room={runtimeRoom}/></span>}
        {collapsed && <LiveStatus room={runtimeRoom} collapsed/>}
      </button>
      <div className="ha-employee-grid" role="region" style={{ gridTemplateColumns: `repeat(${collapsed ? 1 : columns}, minmax(0, 1fr))` }} aria-label="Employees">
        {team.map(agent => {
          const profession = employeeProfession(agent);
          const room = roomFor(agent.id);
          return <button key={agent.id} type="button" data-agent-room-link className={`ha-employee-tile${selectedAgent === agent.id ? ' is-selected' : ''}`} aria-label={`${agent.name}, ${profession}`} aria-busy={openingAgent === agent.id || undefined} onClick={event => onOpenAgent(event, agent)} title={collapsed ? `${agent.name} · ${profession}` : undefined}>
            <span className="ha-avatar-wrap"><AgentAvatar agent={agent} size={collapsed ? 34 : 72}/>
              {!collapsed && <span className="ha-profession" role="tooltip">{profession}</span>}
              {openDotEmployeePath(agent) && <Monitor size={12} className="ha-dot-marker" role="img" aria-label="Open Dot workspace"/>}
            </span>
            {!collapsed && <span className="ha-employee-name">{agent.name}</span>}
            <LiveStatus room={room} collapsed={collapsed}/>
          </button>;
        })}
        <button type="button" className={`ha-create-employee${span === columns ? ' full-row' : ''}`} style={{ gridColumn: `span ${collapsed ? 1 : span}` }} onClick={onCreate} aria-label="Create employee"><Plus size={23}/>{!collapsed && <span>Create employee</span>}</button>
      </div>
    </div>
    <nav className="ha-workspace-shortcuts" aria-label="Workspace tools">
      <NavLink to={employeeAppsPath(location)} title={collapsed ? 'Apps' : undefined}><Cable size={18}/>{!collapsed && <span>Apps</span>}</NavLink>
      <div className="ha-artifact-cell"><div className="ha-artifacts-action" data-hivemind-artifacts-seat data-collapsed={collapsed || undefined}/><button type="button" className="ha-artifacts-unavailable" disabled title="Artifacts become available when the Runtime workspace connects"><FolderOpen size={18}/>{!collapsed && <span>Artifacts</span>}</button></div>
      <button type="button" onClick={onCompany} title={collapsed ? 'Company HQ' : undefined}><Building2 size={18}/>{!collapsed && <span>Company HQ</span>}</button>
      {process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true' && <NavLink to="/hivemind/app/crm" title={collapsed ? 'CRM' : undefined}><FolderKanban size={18}/>{!collapsed && <span>CRM</span>}</NavLink>}
    </nav>
    <div className="ha-account-area">
      <button type="button" className="ha-account-settings" onClick={() => window.dispatchEvent(new Event('hm:open-account-settings'))} title="Account & Settings"><Settings size={18}/>{!collapsed && <span>Account &amp; Settings</span>}</button>
      {user && !collapsed && <div className="ha-account-identity"><span className="ha-account-initial">{(user.display_name || user.email || 'U')[0].toUpperCase()}</span><div><strong>{user.display_name || user.email}</strong><small>{planLabel}</small><CreditBalance credits={credits} inline/></div></div>}
      {collapsed && <CreditBalance credits={credits} compact collapsed/>}
      <button type="button" className="ha-sign-out" onClick={logout} title="Sign out"><LogOut size={16}/>{!collapsed && <span>Sign out</span>}</button>
    </div>
  </div>;
}
