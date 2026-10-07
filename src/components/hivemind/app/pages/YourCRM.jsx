import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { openCompanyRuntime } from '../shared/openCompanyRuntime';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import './YourCRM.css';
import { CRMWorkspace } from './CRMWorkspace';
export { CRMWorkspace } from './CRMWorkspace';

export const CRM_ENABLED = process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true';
const ROOT = '/v1/proxy/app-runtime/apps';

export function CRMRuntimeLink({ onError, children }) {
  const navigate = useNavigate();
  const opening = useRef(false);
  const openRuntime = async event => {
    event.preventDefault();
    if (opening.current) return;
    opening.current = true;
    try { await openCompanyRuntime(navigate); }
    catch { onError?.('Runtime could not be opened. Please try again.'); }
    finally { opening.current = false; }
  };
  return <Link to="/hivemind/app/employee/harness" onClick={openRuntime}>{children || 'Ask Runtime ↗'}</Link>;
}

export default function YourCRM() {
  const { user, org } = useAuth();
  const location = useLocation();
  const fullscreen = new URLSearchParams(location.search).get('fullscreen') === 'true';
  const tenantKey = `${org?.id || ''}:${user?.id || ''}`;
  const [workspaceTenant, setWorkspaceTenant] = useState('');
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
    requestGeneration.current += 1;
    setWorkspaceTenant(''); setApps([]); setAppId(''); setApp(null); setRecords([]); setWorkflows([]); setCursor(null); setError(''); setLoading(true);
    if (!CRM_ENABLED) { setLoading(false); return undefined; }
    const controller = new AbortController();
    apiClient.controlPlane.get(ROOT, { signal: controller.signal, params: { published: true } }).then(({ data }) => {
      const published = (data.apps || []).filter(item => item.publishedVersion != null);
      if (controller.signal.aborted) return;
      setWorkspaceTenant(tenantKey); setApps(published); setAppId(published[0]?.id || '');
    }).catch(() => { if (!controller.signal.aborted) setError('Your CRM could not be opened. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantKey]);
  useEffect(() => {
    requestGeneration.current += 1;
    if (!appId || workspaceTenant !== tenantKey) return undefined;
    const controller = new AbortController();
    setApp(null); setLoading(true); setError('');
    apiClient.controlPlane.get(`${ROOT}/${appId}/published`, { signal: controller.signal }).then(({ data }) => { if (controller.signal.aborted) return; setApp(data.app); setViewId(data.app.spec.views[0]?.id || ''); }).catch(() => { if (!controller.signal.aborted) setError('This workspace could not be loaded.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appId, workspaceTenant, tenantKey]);
  const entityId = app?.spec.views.find(view => view.id === viewId)?.entityId;
  useEffect(() => {
    requestGeneration.current += 1;
    setRecords([]); setCursor(null); setWorkflows([]);
    if (!app || workspaceTenant !== tenantKey) return undefined;
    const controller = new AbortController();
    const path = viewId === 'workflows' ? `${ROOT}/${app.id}/workflows` : `${ROOT}/${app.id}/records`;
    if (!entityId && viewId !== 'workflows') return undefined;
    setLoadingMore(true); setError('');
    apiClient.controlPlane.get(path, { signal: controller.signal, params: entityId ? { entityId, limit: 25 } : undefined }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (viewId === 'workflows') setWorkflows(data.workflows || []);
      else { setRecords(data.records); setCursor(data.nextCursor); }
    }).catch(() => { if (!controller.signal.aborted) setError(viewId === 'workflows' ? 'Activity could not be loaded. Please try again.' : 'Your items could not be loaded. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoadingMore(false); });
    return () => controller.abort();
  }, [app, entityId, viewId, workspaceTenant, tenantKey]);
  const loadMore = async () => {
    const generation = requestGeneration.current;
    setLoadingMore(true);
    try { const { data } = await apiClient.controlPlane.get(`${ROOT}/${app.id}/records`, { params: { entityId, limit: 25, after: cursor } }); if (requestGeneration.current === generation) { setRecords(old => [...old, ...data.records]); setCursor(data.nextCursor); } }
    catch { if (requestGeneration.current === generation) setError('More records could not be loaded.'); }
    finally { if (requestGeneration.current === generation) setLoadingMore(false); }
  };
  const updateRecord = async (record, data, operationId) => {
    const generation = requestGeneration.current;
    try {
      const result = await apiClient.controlPlane.patch(`${ROOT}/${app.id}/records/${record.id}`, { expectedVersion: record.version, data, operationId });
      if (generation === requestGeneration.current) setRecords(old => old.map(item => item.id === record.id ? result.data.record : item));
    } catch (cause) {
      if (cause.response?.status === 403) throw new Error('You don’t have permission to edit this item.');
      if (cause.response?.status === 409) throw new Error('Someone updated this item. Refresh to see their changes before editing.');
      throw new Error('The change could not be confirmed. Try saving again. We’ll check whether your change was already saved.');
    }
  };
  if (!CRM_ENABLED) return <div className="crm-empty"><h1>Your CRM</h1><p>Your CRM will be available here soon.</p></div>;
  return <main className="crm-page"><div className="crm-toolbar"><CRMRuntimeLink onError={setError} /><Link to={fullscreen ? "/hivemind/app/crm" : "/hivemind/app/crm?fullscreen=true"}>{fullscreen ? "Exit full screen" : "Expand ↗"}</Link></div>{error && <div role="alert" className="crm-error">{error} <button type="button" onClick={() => window.location.reload()}>Try again</button></div>}{loading || (!error && workspaceTenant !== tenantKey) ? <div role="status" className="crm-empty">Opening your CRM…</div> : error && !app ? null : !appId ? <div className="crm-empty"><h1>Your CRM</h1><p>Keep your companies, contacts and deals together. Tell Runtime what your team needs, and your CRM will appear here.</p></div> : app && <>{apps.length > 1 && <label className="crm-app-picker">Workspace <select value={appId} onChange={event => setAppId(event.target.value)}>{apps.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<CRMWorkspace key={`${tenantKey}:${app.id}`} app={app} records={records} workflows={workflows} viewId={viewId} onViewChange={setViewId} onLoadMore={cursor ? loadMore : undefined} loadingMore={loadingMore} onUpdateRecord={updateRecord} /></>}</main>;
}
