import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../shared/api-client';
import './YourCRM.css';
import { CRMWorkspace } from './CRMWorkspace';
export { CRMWorkspace } from './CRMWorkspace';

export const CRM_ENABLED = process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true';
const ROOT = '/v1/proxy/app-runtime/apps';

export default function YourCRM() {
  const [apps, setApps] = useState([]);
  const [appId, setAppId] = useState('');
  const [app, setApp] = useState(null);
  const [viewId, setViewId] = useState('');
  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestGeneration = useRef(0);
  useEffect(() => {
    if (!CRM_ENABLED) { setLoading(false); return undefined; }
    const controller = new AbortController();
    apiClient.controlPlane.get(ROOT, { signal: controller.signal, params: { published: true } }).then(({ data }) => {
      const published = (data.apps || []).filter(item => item.publishedVersion != null);
      setApps(published); setAppId(published[0]?.id || '');
    }).catch(() => { if (!controller.signal.aborted) setError('Your CRM could not be opened. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    requestGeneration.current += 1;
    if (!appId) return undefined;
    const controller = new AbortController();
    setApp(null); setLoading(true); setError('');
    apiClient.controlPlane.get(`${ROOT}/${appId}/published`, { signal: controller.signal }).then(({ data }) => { setApp(data.app); setViewId(data.app.spec.views[0]?.id || ''); }).catch(() => { if (!controller.signal.aborted) setError('This workspace could not be loaded.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appId]);
  const entityId = app?.spec.views.find(view => view.id === viewId)?.entityId;
  useEffect(() => {
    requestGeneration.current += 1;
    setRecords([]); setCursor(null); setWorkflows([]);
    if (!app) return undefined;
    const controller = new AbortController();
    const path = viewId === 'workflows' ? `${ROOT}/${app.id}/workflows` : `${ROOT}/${app.id}/records`;
    if (!entityId && viewId !== 'workflows') return undefined;
    setLoadingMore(true); setError('');
    apiClient.controlPlane.get(path, { signal: controller.signal, params: entityId ? { entityId, limit: 25 } : undefined }).then(({ data }) => {
      if (viewId === 'workflows') setWorkflows(data.workflows || []);
      else { setRecords(data.records); setCursor(data.nextCursor); }
    }).catch(() => { if (!controller.signal.aborted) setError('Activity could not be loaded. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoadingMore(false); });
    return () => controller.abort();
  }, [app, entityId, viewId]);
  const loadMore = async () => {
    const generation = requestGeneration.current;
    setLoadingMore(true);
    try { const { data } = await apiClient.controlPlane.get(`${ROOT}/${app.id}/records`, { params: { entityId, limit: 25, after: cursor } }); if (requestGeneration.current === generation) { setRecords(old => [...old, ...data.records]); setCursor(data.nextCursor); } }
    catch { if (requestGeneration.current === generation) setError('More records could not be loaded.'); }
    finally { if (requestGeneration.current === generation) setLoadingMore(false); }
  };
  if (!CRM_ENABLED) return <div className="crm-empty"><h1>Your CRM</h1><p>This workspace is not enabled in this environment yet.</p></div>;
  return <main className="crm-page">{error && <div role="alert" className="crm-error">{error} <button type="button" onClick={() => window.location.reload()}>Try again</button></div>}{loading ? <div role="status" className="crm-empty">Opening your CRM…</div> : !appId ? <div className="crm-empty"><h1>Your CRM</h1><p>Your published workspace will appear here. Describe what you need in your Runtime or HyperAgent conversation.</p><Link to="/hivemind/app/employee/harness">Open Runtime ↗</Link></div> : app && <>{apps.length > 1 && <label className="crm-app-picker">Workspace <select value={appId} onChange={event => setAppId(event.target.value)}>{apps.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<CRMWorkspace app={app} records={records} workflows={workflows} viewId={viewId} onViewChange={setViewId} onLoadMore={cursor ? loadMore : undefined} loadingMore={loadingMore} />{loadingMore && !records.length && <p role="status">Loading activity…</p>}</>}</main>;
}
