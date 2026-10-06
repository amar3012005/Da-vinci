import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CRMWorkspace } from '../src/components/hivemind/app/pages/CRMWorkspace';

function Demo() {
  const [actor, setActor] = useState('a');
  const [app, setApp] = useState(null);
  const [viewId, setViewId] = useState('');
  const [records, setRecords] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setApp(null); setError('');
    fetch(`/demo-api?actor=${actor}&path=${encodeURIComponent('/api/app-runtime/apps?published=true')}`, { signal: controller.signal }).then(response => response.json()).then(async data => {
      const id = (data.apps.find(item => item.name !== 'Native tool CRM proof') || data.apps[0]).id;
      const response = await fetch(`/demo-api?actor=${actor}&path=${encodeURIComponent(`/api/app-runtime/apps/${id}/published`)}`, { signal: controller.signal });
      const value = await response.json(); setApp(value.app); setViewId(value.app.spec.views[0].id);
    }).catch(() => { if (!controller.signal.aborted) setError('Demo API unavailable'); });
    return () => controller.abort();
  }, [actor]);
  useEffect(() => {
    const controller = new AbortController(); setRecords([]); setWorkflows([]);
    if (!app) return undefined;
    const entityId = app.spec.views.find(view => view.id === viewId)?.entityId;
    const path = viewId === 'workflows' ? `/api/app-runtime/apps/${app.id}/workflows` : `/api/app-runtime/apps/${app.id}/records?entityId=${entityId}`;
    fetch(`/demo-api?actor=${actor}&path=${encodeURIComponent(path)}`, { signal: controller.signal }).then(response => response.json()).then(data => { if (data.error) throw new Error(data.error.message); if (viewId === 'workflows') setWorkflows(data.workflows); else setRecords(data.records); }).catch(() => { if (!controller.signal.aborted) setError('Demo activity unavailable'); });
    return () => controller.abort();
  }, [actor, app, viewId]);
  return <main className="crm-page"><div style={{ padding: '12px 0', marginBottom: 30, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}><span>Isolated CRM demo · artificial data · PostgreSQL</span><label>Organization <select aria-label="Demo organization" value={actor} onChange={event => setActor(event.target.value)}><option value="a">Demo A</option><option value="b">Demo B</option></select></label></div>{error && <p role="alert">{error}</p>}{app ? <CRMWorkspace app={app} records={records} workflows={workflows} viewId={viewId} onViewChange={setViewId} /> : <p role="status">Opening your CRM…</p>}</main>;
}
createRoot(document.getElementById('root')).render(<Demo />);
