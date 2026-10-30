import RuntimeAvatar from '../shared/RuntimeAvatar';
import AutonomyDial from './AutonomyDial';
import { employeeAppsPath } from '../shared/workspace-mode';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus, Trash2, Cable, Building2, FolderKanban, Monitor, CalendarDays, Settings, LogOut, Library } from 'lucide-react';
import { CALENDAR_PATH, LIBRARY_PATH } from './sidebar-tools';
import AgentAvatar from '../hyperagents/AgentAvatar';
import AgentRoomStatus, { aggregateAgentRooms } from './AgentRoomStatus';
import CreditBalance from '../shared/CreditBalance';
import { hasOpenDotEmployeeBinding, openDotEmployeePath } from '../shared/open-dot-employee-route';
import './desktop-hyperagents-navigation.css';

export { HYPERAGENT_WIDTHS } from './hyperagent-widths';
export const columnsForWidth = width => width < 145 ? 0 : width < 278 ? 1 : width < 391 ? 2 : 3;
export const createEmployeeSpan = (count, columns) => columns - (count % columns);
export const employeeProfession = agent => String(agent.role || agent.job_title || agent.role_archetype || agent.roleArchetype || 'Team member').replace(/_/g, ' ');

/** A native employee has no computer workspace; only these can be removed through the native lifecycle. */
export const isNativeEmployee = agent => !!agent && agent.id !== 'runtime' && !hasOpenDotEmployeeBinding(agent);

function LiveStatus({ room, collapsed }) {
  return <span className="ha-live-status">
    <AgentRoomStatus room={room} compact={collapsed}/>
    {room?.activeCall && !room.stale && !collapsed && <span className="ha-call-label">In call</span>}
  </span>;
}

export default function DesktopHyperAgentsNavigation({ team, rooms, selectedAgent, openingAgent, onOpenAgent, onCreate, onCompany, columns, collapsed, user, planLabel, credits, logout, orgId, runtimeEnabled = true, onDeleteEmployee }) {
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const confirmDelete = async agent => {
    setDeletingId(agent.id); setDeleteError('');
    try { await onDeleteEmployee(agent); setConfirmId(null); }
    catch (error) { setDeleteError(error?.response?.data?.error || error?.message || t('sidebar.deleteEmployeeFailed', { defaultValue: 'Delete failed. Try again.' })); }
    finally { setDeletingId(null); }
  };
  const roomFor = id => {
    const room = aggregateAgentRooms(rooms, id);
    return openingAgent === id ? { ...room, loading: true } : room;
  };
  const runtimeRoom = roomFor('runtime');
  const span = createEmployeeSpan(team.length, columns);
  return <div className={`desktop-hyperagents-navigation${collapsed ? ' is-collapsed' : ''}`} data-columns={columns}>
    <div className="ha-team-scroll">
      {!collapsed && <div className="ha-team-heading"><h2>Your team</h2><span>{team.length} {team.length === 1 ? 'employee' : 'employees'}</span></div>}
      {runtimeEnabled && <button type="button" data-agent-room-link className={`ha-runtime-card${!selectedAgent ? ' is-selected' : ''}`} aria-label="Runtime, AI Chief of Staff" aria-busy={openingAgent === 'runtime' || undefined} onClick={event => onOpenAgent(event, { id: 'runtime' })} title={collapsed ? 'Runtime · AI Chief of Staff' : undefined}>
        <RuntimeAvatar alt="" room={runtimeRoom}/>
        {!collapsed && <span className="ha-runtime-identity"><strong>Runtime</strong><small>AI Chief of Staff</small><LiveStatus room={runtimeRoom}/></span>}
        {collapsed && <LiveStatus room={runtimeRoom} collapsed/>}
      </button>}
      <div className="ha-employee-grid" role="region" style={{ gridTemplateColumns: `repeat(${collapsed ? 1 : columns}, minmax(0, 1fr))` }} aria-label="Employees">
        {team.map(agent => {
          const profession = employeeProfession(agent);
          const room = roomFor(agent.id);
          const removable = !collapsed && !!onDeleteEmployee && isNativeEmployee(agent);
          const confirming = removable && confirmId === agent.id;
          return <div key={agent.id} className="ha-employee-cell">
          <button type="button" data-agent-room-link className={`ha-employee-tile${selectedAgent === agent.id ? ' is-selected' : ''}`} aria-label={`${agent.name}, ${profession}`} aria-busy={openingAgent === agent.id || undefined} onClick={event => onOpenAgent(event, agent)} title={collapsed ? `${agent.name} · ${profession}` : undefined}>
            <span className="ha-avatar-wrap"><AgentAvatar agent={agent} size={collapsed ? 34 : 72}/>
              {!collapsed && <span className="ha-profession" role="tooltip">{profession}</span>}
              {openDotEmployeePath(agent) && <Monitor size={12} className="ha-dot-marker" role="img" aria-label="Computer workspace"/>}
            </span>
            {!collapsed && <span className="ha-employee-name">{agent.name}</span>}
            <LiveStatus room={room} collapsed={collapsed}/>
          </button>
            {removable && !confirming && <button type="button" className="ha-employee-delete" aria-label={t('sidebar.deleteEmployee', { defaultValue: 'Delete {{name}}', name: agent.name })} title={t('sidebar.deleteEmployeeTitle', { defaultValue: 'Delete employee' })} onClick={() => { setDeleteError(''); setConfirmId(agent.id); }}><Trash2 size={14}/></button>}
            {confirming && <div className="ha-employee-confirm" role="group" aria-label={t('sidebar.deleteEmployeeGroup', { defaultValue: 'Confirm delete {{name}}', name: agent.name })}>
              <strong>{t('sidebar.deleteEmployeeQuestion', { defaultValue: 'Delete {{name}}?', name: agent.name })}</strong>
              <span>{t('sidebar.deleteEmployeeNote', { defaultValue: 'Their chats and memory are removed. Files they made stay in Library. This cannot be undone.' })}</span>
              {deleteError && <span role="alert" className="ha-employee-confirm-error">{deleteError}</span>}
              <span className="ha-employee-confirm-actions">
                <button type="button" disabled={deletingId === agent.id} onClick={() => setConfirmId(null)}>{t('sidebar.deleteEmployeeCancel', { defaultValue: 'Cancel' })}</button>
                <button type="button" className="is-danger" disabled={deletingId === agent.id} onClick={() => confirmDelete(agent)}>{deletingId === agent.id ? t('sidebar.deleteEmployeeDeleting', { defaultValue: 'Deleting…' }) : t('sidebar.deleteEmployeeConfirm', { defaultValue: 'Delete' })}</button>
              </span>
            </div>}
          </div>;
        })}
        {/* Empty roster: placeholder tiles hold the grid height until the roster read settles. */}
        {!team.length && !collapsed && [0, 1, 2].map(index => <div key={`placeholder-${index}`} aria-hidden="true" className="ha-employee-tile is-placeholder"><span className="ha-avatar-wrap" style={{ width: 72, height: 72 }}/><span className="ha-placeholder-name"/></div>)}
        <button type="button" className={`ha-create-employee${span === columns ? ' full-row' : ''}`} style={{ gridColumn: `span ${collapsed ? 1 : span}` }} onClick={onCreate} aria-label="Create employee"><Plus size={23}/>{!collapsed && <span>Create employee</span>}</button>
      </div>
    </div>
    <div className="ha-autonomy-seat"><AutonomyDial collapsed={collapsed} orgId={orgId} runtimeEnabled={runtimeEnabled}/></div>
    <nav className="ha-workspace-shortcuts" aria-label="Workspace tools">
      <NavLink to={employeeAppsPath(location)} title={collapsed ? 'Apps' : undefined}><Cable size={18}/>{!collapsed && <span>Apps</span>}</NavLink>
      <NavLink to={CALENDAR_PATH} data-sidebar-tool="calendar" title={collapsed ? 'Calendar' : undefined}><CalendarDays size={18}/>{!collapsed && <span>Calendar</span>}</NavLink>
      <button type="button" onClick={onCompany} title={collapsed ? 'Company HQ' : undefined}><Building2 size={18}/>{!collapsed && <span>Company HQ</span>}</button>
      <NavLink to={LIBRARY_PATH} data-sidebar-tool="library" title={collapsed ? 'Library' : undefined}><Library size={18}/>{!collapsed && <span>Library</span>}</NavLink>
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
