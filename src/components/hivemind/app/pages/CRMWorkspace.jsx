import React, { useEffect, useState } from 'react';
import './YourCRM.css';
import { CRMRecordDrawer } from './CRMRecordDrawer';

function display(value) {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return typeof value === 'object' ? '—' : String(value);
}

/** Restricted published AppSpec renderer: values remain React text, never generated code. */
export function CRMWorkspace({ app, records = [], workflows = [], viewId, onViewChange, onLoadMore, loadingMore = false, onUpdateRecord }) {
  const views = app.spec.views;
  const view = views.find(item => item.id === viewId) || views[0];
  const entity = app.spec.entities.find(item => item.id === view?.entityId);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  useEffect(() => setSelected(null), [app.id, view?.id]);
  useEffect(() => { setQuery(''); setStageFilter(''); }, [app.id, view?.id]);
  const fields = entity?.fields.filter(field => !view.fieldIds || view.fieldIds.includes(field.id)) || [];
  const filterField = entity?.fields.find(field => field.id === view?.groupByFieldId) || entity?.fields.find(field => field.type === 'enum');
  const rows = records.filter(record => record.entityId === entity?.id && Object.values(record.data).some(value => display(value).toLowerCase().includes(query.toLowerCase())) && (!stageFilter || record.data[filterField?.id] === stageFilter));
  const title = record => display(record.data[entity?.fields.find(field => field.type === 'text')?.id] || record.id);
  const group = entity?.fields.find(field => field.id === view?.groupByFieldId);
  const groups = group ? [...(group.options || []), ...(rows.some(row => row.data[group.id] == null) ? ['Unassigned'] : [])] : [];
  const open = record => setSelected(record);
  return <div className="crm-workspace">
    <header className="crm-heading"><div><span className="crm-eyebrow">YOUR CRM</span><h1>{app.spec.name}</h1><p>{app.spec.description || 'Your organization’s shared workspace.'}</p></div><span className="crm-version">Published · version {app.publishedVersion}</span></header>
    <nav className="crm-tabs" aria-label="CRM views">{views.map(item => <button type="button" key={item.id} aria-pressed={item.id === viewId} onClick={() => onViewChange(item.id)}>{item.name}</button>)}<button type="button" aria-pressed={viewId === 'workflows'} onClick={() => onViewChange('workflows')}>Workflows</button></nav>
    {viewId === 'workflows' ? <section className="crm-workflow-list"><h2>Workflow activity</h2><p>Existing workflow receipts associated with this workspace.</p>{workflows.length ? workflows.map(run => <article key={run.id}><strong>{run.name || run.title || 'Workflow'}</strong><span>{run.status}</span>{(run.completedAt || run.startedAt || run.createdAt) && <time>{new Date(run.completedAt || run.startedAt || run.createdAt).toLocaleString()}</time>}</article>) : <p className="crm-empty">No workflow runs linked to this workspace yet. Ask Runtime to set up your workflow.</p>}</section> : <>
      <div className="crm-view-heading"><h2>{entity?.name || view?.name}</h2><span>{rows.length} {rows.length === 1 ? 'record' : 'records'} loaded</span></div>
      <div className="crm-filters"><input aria-label="Filter loaded records" placeholder="Filter loaded records…" value={query} onChange={event => setQuery(event.target.value)} />{filterField?.options && <select aria-label="Filter stage" value={stageFilter} onChange={event => setStageFilter(event.target.value)}><option value="">All stages</option>{filterField.options.map(option => <option key={option} value={option}>{option}</option>)}</select>}</div>
      {!rows.length ? <div className="crm-empty">{query || stageFilter ? 'No matching loaded records.' : 'No records here yet. Ask Runtime or your HyperAgent to add them.'}</div> : view.type === 'kanban' && group ? <div className="crm-kanban">{groups.map(stage => <section key={stage}><h3>{stage}</h3>{rows.filter(row => (row.data[group.id] ?? 'Unassigned') === stage).map(row => <button type="button" key={row.id} onClick={() => open(row)}><strong>{title(row)}</strong>{fields.filter(field => field.id !== group.id).slice(0, 3).map(field => <span key={field.id}>{field.name}: {display(row.data[field.id])}</span>)}</button>)}</section>)}</div> : view.type === 'record' ? <div className="crm-record-grid">{rows.map(row => <button type="button" key={row.id} onClick={() => open(row)}><strong>{title(row)}</strong>{fields.slice(0, 4).map(field => <span key={field.id}>{field.name}: {display(row.data[field.id])}</span>)}</button>)}</div> : <div className="crm-table-wrap"><table><thead><tr>{fields.map(field => <th key={field.id} scope="col">{field.name}</th>)}<th scope="col">Details</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{fields.map(field => <td key={field.id}>{display(row.data[field.id])}</td>)}<td><button type="button" aria-label={`Open ${title(row)}`} onClick={() => open(row)}>Open ↗</button></td></tr>)}</tbody></table></div>}
      {onLoadMore && <button className="crm-more" type="button" disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? 'Loading…' : 'Load more records'}</button>}
    </>}
    {selected && <CRMRecordDrawer record={selected} entity={entity} title={title(selected)} onClose={() => setSelected(null)} onUpdateRecord={onUpdateRecord} />}
  </div>;
}
