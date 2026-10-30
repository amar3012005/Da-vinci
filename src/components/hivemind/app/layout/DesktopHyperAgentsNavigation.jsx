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
import { hyperAgentsStartPlacement } from './get-started-placement';
import { useSidebarCopy } from './sidebar-copy';
import './desktop-hyperagents-navigation.css';

const GetStartedCard = React.lazy(() => import('./GetStartedCard'));

export { HYPERAGENT_WIDTHS } from './hyperagent-widths';
export const columnsForWidth = width => width < 145 ? 0 : width < 278 ? 1 : width < 391 ? 2 : 3;
export const createEmployeeSpan = (count, columns) => columns - (count % columns);
export const employeeProfession = (agent, fallback = 'Team member') => String(agent.role || agent.job_title || agent.role_archetype || agent.roleArchetype || fallback).replace(/_/g, ' ');

/** Every roster employee except the Runtime lead is removed through Control's native lifecycle `remove`; computer employees use the same call. */
export const isRemovableEmployee = agent => !!agent && agent.id !== 'runtime';
/** A native employee has no computer workspace. */
export const isNativeEmployee = agent => !!agent && agent.id !== 'runtime' && !hasOpenDotEmployeeBinding(agent);

function LiveStatus({ room, collapsed }) {
  const s = useSidebarCopy();
  return <span className="ha-live-status">
    <AgentRoomStatus room={room} compact={collapsed}/>
    {room?.activeCall && !room.stale && !collapsed && <span className="ha-call-label">{s('inCall', 'In call')}</span>}
  </span>;
}

export default function DesktopHyperAgentsNavigation({ team, rooms, selectedAgent, openingAgent, onOpenAgent, onCreate, onCompany, columns, collapsed, user, planLabel, credits, logout, orgId, runtimeEnabled = true, onDeleteEmployee }) {
  const location = useLocation();
  const { t } = useTranslation('dashboard');
  const s = useSidebarCopy();
  const runtimeRole = s('runtimeRole', 'AI Chief of Staff');
  const computerWorkspace = s('computerWorkspace', 'Computer workspace');
  const createLabel = s('createEmployee', 'Create employee');
  const accountLabel = s('accountSettings', 'Account & Settings');
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
      {!collapsed && <div className="ha-team-heading"><h2>{s('yourTeam', 'Your team')}</h2><span>{team.length === 1 ? s('employeeCountOne', '{{count}} employee', { count: team.length }) : s('employeeCountMany', '{{count}} employees', { count: team.length })}</span></div>}
      {runtimeEnabled && <button type="button" data-agent-room-link className={`ha-runtime-card${!selectedAgent ? ' is-selected' : ''}`} aria-label={s('runtimeAria', 'Runtime, {{role}}', { role: runtimeRole })} aria-busy={openingAgent === 'runtime' || undefined} onClick={event => onOpenAgent(event, { id: 'runtime' })} title={collapsed ? `Runtime · ${runtimeRole}` : undefined}>
        <RuntimeAvatar alt="" room={runtimeRoom}/>
        {!collapsed && <span className="ha-runtime-identity"><strong>Runtime</strong><small>{runtimeRole}</small><LiveStatus room={runtimeRoom}/></span>}
        {collapsed && <LiveStatus room={runtimeRoom} collapsed/>}
      </button>}
      <div className="ha-employee-grid" role="region" style={{ gridTemplateColumns: `repeat(${collapsed ? 1 : columns}, minmax(0, 1fr))` }} aria-label={s('employeesRegion', 'Employees')}>
        {team.map(agent => {
          const profession = employeeProfession(agent, s('teamMemberFallback', 'Team member'));
          const room = roomFor(agent.id);
          const removable = !collapsed && !!onDeleteEmployee && isRemovableEmployee(agent);
          const confirming = removable && confirmId === agent.id;
          return <div key={agent.id} className="ha-employee-cell">
          <button type="button" data-agent-room-link className={`ha-employee-tile${selectedAgent === agent.id ? ' is-selected' : ''}`} aria-label={`${agent.name}, ${profession}`} aria-busy={openingAgent === agent.id || undefined} onClick={event => onOpenAgent(event, agent)} title={collapsed ? `${agent.name} · ${profession}` : undefined}>
            <span className="ha-avatar-wrap"><AgentAvatar agent={agent} size={collapsed ? 34 : 72}/>
              {!collapsed && <span className="ha-profession" role="tooltip">{profession}</span>}
              {openDotEmployeePath(agent) && <Monitor size={12} className="ha-dot-marker" role="img" aria-label={computerWorkspace}/>}
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
        <button type="button" className={`ha-create-employee${span === columns ? ' full-row' : ''}`} style={{ gridColumn: `span ${collapsed ? 1 : span}` }} onClick={onCreate} aria-label={createLabel}><Plus size={23}/>{!collapsed && <span>{createLabel}</span>}</button>
      </div>
    </div>
    {/* In a room the checklist is a sidebar chip, so it never covers the composer. */}
    {!collapsed && user?.id && hyperAgentsStartPlacement({ pathname: location.pathname, phone: false }) === 'sidebar' && <div className="ha-get-started-seat" data-get-started-seat><React.Suspense fallback={null}><GetStartedCard variant="home" userId={user.id} orgId={orgId} /></React.Suspense></div>}
    <div className="ha-autonomy-seat"><AutonomyDial collapsed={collapsed} orgId={orgId} runtimeEnabled={runtimeEnabled}/></div>
    <nav className="ha-workspace-shortcuts" aria-label={s('workspaceTools', 'Workspace tools')}>
      <NavLink to={employeeAppsPath(location)} title={collapsed ? s('apps', 'Apps') : undefined}><Cable size={18}/>{!collapsed && <span>{s('apps', 'Apps')}</span>}</NavLink>
      <NavLink to={CALENDAR_PATH} data-sidebar-tool="calendar" title={collapsed ? s('calendar', 'Calendar') : undefined}><CalendarDays size={18}/>{!collapsed && <span>{s('calendar', 'Calendar')}</span>}</NavLink>
      <button type="button" onClick={onCompany} title={collapsed ? s('companyHq', 'Company HQ') : undefined}><Building2 size={18}/>{!collapsed && <span>{s('companyHq', 'Company HQ')}</span>}</button>
      <NavLink to={LIBRARY_PATH} data-sidebar-tool="library" title={collapsed ? s('library', 'Library') : undefined}><Library size={18}/>{!collapsed && <span>{s('library', 'Library')}</span>}</NavLink>
      {process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true' && <NavLink to="/hivemind/app/crm" title={collapsed ? 'CRM' : undefined}><FolderKanban size={18}/>{!collapsed && <span>CRM</span>}</NavLink>}
    </nav>
    <div className="ha-account-area">
      <button type="button" className="ha-account-settings" onClick={() => window.dispatchEvent(new Event('hm:open-account-settings'))} title={accountLabel}><Settings size={18}/>{!collapsed && <span>{accountLabel}</span>}</button>
      {user && !collapsed && <div className="ha-account-identity"><span className="ha-account-initial">{(user.display_name || user.email || 'U')[0].toUpperCase()}</span><div><strong>{user.display_name || user.email}</strong><small>{planLabel}</small><CreditBalance credits={credits} inline/></div></div>}
      {collapsed && <CreditBalance credits={credits} compact collapsed/>}
      <button type="button" className="ha-sign-out" onClick={logout} title={s('signOutShort', 'Sign out')}><LogOut size={16}/>{!collapsed && <span>{s('signOutShort', 'Sign out')}</span>}</button>
    </div>
  </div>;
}
