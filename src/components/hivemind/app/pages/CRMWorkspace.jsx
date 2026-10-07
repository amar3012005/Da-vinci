import React, { useEffect, useState } from 'react';
import { LayoutList, Columns3, LayoutGrid, Search, Building2, Users, Briefcase, ArrowUpRight, Clock3 } from 'lucide-react';
import './YourCRM.css';
import { CRMRecordDrawer } from './CRMRecordDrawer';

export function displayCRMValue(value, field) {
  if (value == null || value === '') return '—';
  if (field?.type === 'reference') return 'Linked item';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? '—' : String(value);
}
const layouts = { table: { label: 'List', Icon: LayoutList }, kanban: { label: 'Board', Icon: Columns3 }, record: { label: 'Cards', Icon: LayoutGrid } };
const states = { completed: 'Done', succeeded: 'Done', failed: 'Needs attention', running: 'In progress', pending: 'Waiting', queued: 'Waiting', cancelled: 'Cancelled' };
const dateLabel = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };

/** Published workspace renderer; authoring stays in the existing agent conversation. */
export function CRMWorkspace({ app, records = [], workflows = [], viewId, onViewChange, onLoadMore, loadingMore = false, onUpdateRecord }) {
  const views = app.spec.views;
  const view = views.find(item => item.id === viewId) || views[0];
  const entity = app.spec.entities.find(item => item.id === view?.entityId);
  const entities = app.spec.entities.filter(item => views.some(candidate => candidate.entityId === item.id));
  const entityViews = views.filter(item => item.entityId === entity?.id);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  useEffect(() => setSelected(null), [app.id, view?.id]);
  useEffect(() => { setQuery(''); setStageFilter(''); }, [app.id, entity?.id]);
  const fields = entity?.fields.filter(field => !view.fieldIds || view.fieldIds.includes(field.id)) || [];
  const filterField = entity?.fields.find(field => field.id === view?.groupByFieldId) || entity?.fields.find(field => field.type === 'enum');
  const allRows = records.filter(record => record.entityId === entity?.id);
  const rows = allRows.filter(record => Object.entries(record.data).some(([id, value]) => displayCRMValue(value, entity.fields.find(field => field.id === id)).toLowerCase().includes(query.toLowerCase())) && (!stageFilter || record.data[filterField?.id] === stageFilter));
  const titleField = entity?.fields.find(field => field.type === 'text');
  const title = record => record.data[titleField?.id] || 'Untitled item';
  const group = entity?.fields.find(field => field.id === view?.groupByFieldId);
  const groups = group ? [...(group.options || []), ...(rows.some(row => row.data[group.id] == null) ? ['Unassigned'] : [])] : [];
  const cell = (record, field) => field.type === 'enum' && record.data[field.id] ? <span className="crm-status">{displayCRMValue(record.data[field.id], field)}</span> : displayCRMValue(record.data[field.id], field);
  return <div className="crm-workspace">
    <header className="crm-heading"><div><span className="crm-eyebrow">YOUR CRM</span><h1>{app.spec.name}</h1><p>Keep your relationships and next steps in one place.</p></div></header>
    <nav className="crm-tabs" aria-label="Your CRM sections">{entities.map((item) => { const Icon = /contact|people/i.test(item.name) ? Users : /deal|opportun/i.test(item.name) ? Briefcase : Building2; return <button type="button" key={item.id} aria-pressed={viewId !== 'workflows' && item.id === entity?.id} onClick={() => onViewChange(views.find(candidate => candidate.entityId === item.id && candidate.type === view?.type)?.id || views.find(candidate => candidate.entityId === item.id)?.id)}><Icon size={16} />{item.name}</button>; })}<button type="button" aria-pressed={viewId === 'workflows'} onClick={() => onViewChange('workflows')}><Clock3 size={16} />Activity</button></nav>
    {viewId === 'workflows' ? <section className="crm-workflow-list"><h2>Activity</h2><p>Follow the work happening in your CRM.</p>{workflows.length ? workflows.map(run => <article key={run.id}><strong>{run.name || run.title || 'CRM activity'}</strong><span className="crm-status">{states[run.status] || 'Update'}</span>{(run.completedAt || run.startedAt || run.createdAt) && <time>{dateLabel(run.completedAt || run.startedAt || run.createdAt)}</time>}</article>) : <div className="crm-empty"><Clock3 size={28} /><h3>{loadingMore ? 'Getting your activity…' : 'No activity yet'}</h3><p>{loadingMore ? 'One moment while we bring you the latest.' : 'Updates from your team’s CRM work will appear here.'}</p></div>}</section> : <>
      <div className="crm-controls"><div className="crm-filters"><label className="crm-search"><Search size={17} /><input aria-label={`Search ${entity?.name || 'items'} shown here`} placeholder={`Search ${entity?.name?.toLowerCase() || 'items'}…`} value={query} onChange={event => setQuery(event.target.value)} /></label>{filterField?.options && <select aria-label={`Filter by ${filterField.name}`} value={stageFilter} onChange={event => setStageFilter(event.target.value)}><option value="">Any {filterField.name.toLowerCase()}</option>{filterField.options.map(option => <option key={option} value={option}>{option}</option>)}</select>}</div><div className="crm-layouts" aria-label="Choose a view">{entityViews.map(item => { const { label, Icon } = layouts[item.type] || layouts.table; const duplicate = entityViews.filter(candidate => candidate.type === item.type).length > 1; return <button type="button" title={item.name} key={item.id} aria-pressed={item.id === view?.id} onClick={() => onViewChange(item.id)}><Icon size={15} />{duplicate ? item.name : label}</button>; })}</div></div>
      <div className="crm-view-heading"><span>{rows.length} {rows.length === 1 ? 'item' : 'items'} shown</span>{onLoadMore && <span>Search applies to the items shown here.</span>}</div>
      {loadingMore && !records.length ? <div className="crm-empty" role="status">Getting your {entity?.name?.toLowerCase() || 'items'}…</div> : !rows.length ? <div className="crm-empty"><Search size={28} /><h3>{query || stageFilter ? 'No matches' : `No ${entity?.name?.toLowerCase() || 'items'} yet`}</h3><p>{query || stageFilter ? 'Try another search or clear your filters.' : 'Ask Runtime to add your first items from your conversation.'}</p>{(query || stageFilter) && <button className="crm-button" onClick={() => { setQuery(''); setStageFilter(''); }}>Clear filters</button>}</div> : view.type === 'kanban' && group ? <div className="crm-kanban">{groups.map(stage => { const stageRows = rows.filter(row => (row.data[group.id] ?? 'Unassigned') === stage); return <section key={stage}><h3>{stage}<span>{stageRows.length}</span></h3>{stageRows.map(row => <button type="button" key={row.id} onClick={() => setSelected(row)}><strong>{title(row)}</strong>{fields.filter(field => field.id !== group.id && field.id !== titleField?.id && field.type !== 'reference').slice(0, 3).map(field => <span key={field.id}>{field.name}: {displayCRMValue(row.data[field.id], field)}</span>)}</button>)}{!stageRows.length && <p className="crm-column-empty">Nothing here yet</p>}</section>; })}</div> : view.type === 'record' ? <div className="crm-record-grid">{rows.map(row => <button type="button" key={row.id} onClick={() => setSelected(row)}><strong>{title(row)}<ArrowUpRight size={16} /></strong>{fields.filter(field => field.id !== titleField?.id).slice(0, 4).map(field => <span key={field.id}>{field.name}: {cell(row, field)}</span>)}</button>)}</div> : <div className="crm-table-wrap"><table><thead><tr>{fields.map(field => <th key={field.id} scope="col">{field.name}</th>)}<th scope="col"><span className="crm-sr-only">Open details</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{fields.map((field, index) => <td key={field.id}>{index === 0 ? <button className="crm-item-name" onClick={() => setSelected(row)}>{cell(row, field)}</button> : cell(row, field)}</td>)}<td><button type="button" aria-label={`Open ${title(row)}`} onClick={() => setSelected(row)}><ArrowUpRight size={17} /></button></td></tr>)}</tbody></table></div>}
      {onLoadMore && <button className="crm-more" type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? 'Loading…' : `Show more ${entity?.name?.toLowerCase() || 'items'}`}</button>}
    </>}
    {selected && <CRMRecordDrawer record={selected} entity={entity} title={title(selected)} onClose={() => setSelected(null)} onUpdateRecord={onUpdateRecord} />}
  </div>;
}
