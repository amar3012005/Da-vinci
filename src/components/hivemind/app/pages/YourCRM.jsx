import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { openCompanyRuntime } from '../shared/openCompanyRuntime';
import apiClient from '../shared/api-client';
import { LOCAL_FIRST } from '../shared/sync/catalog';
import { useLocalCopy } from '../shared/sync/use-local-first';
import { useAuth } from '../auth/AuthProvider';
import { runtimeEnabledFor } from '../shared/runtime-enabled';
import './YourCRM.css';
import { CRMWorkspace } from './CRMWorkspace';
export { CRMWorkspace } from './CRMWorkspace';

export const CRM_ENABLED = process.env.REACT_APP_HIVE_APP_RUNTIME_ENABLED === 'true';
const ROOT = '/v1/proxy/app-runtime/apps';

export function CRMRuntimeLink({ onError, children }) {
  const navigate = useNavigate();
  const { org } = useAuth() || {};
  const opening = useRef(false);
  const openRuntime = async event => {
    event.preventDefault();
    if (opening.current) return;
    opening.current = true;
    try { await openCompanyRuntime(navigate); }
    catch { onError?.('Runtime could not be opened. Please try again.'); }
    finally { opening.current = false; }
  };
  // A company without Runtime has no Chief of Staff to ask.
  if (!runtimeEnabledFor(org)) return null;
  return <Link to="/hivemind/app/employee/harness" onClick={openRuntime}>{children || 'Ask Runtime ↗'}</Link>;
}

export default function YourCRM() {
  const { user, org } = useAuth();
  const location = useLocation();
  const fullscreen = new URLSearchParams(location.search).get('fullscreen') === 'true';
  const tenantKey = `${org?.id || ''}:${user?.id || ''}`;
  // The last CRM view of this person and company paints from the device at once; the three reads below replace it.
  const latest = useRef({});
  const refreshHook = useRef(() => {});
  const local = useLocalCopy({ spec: LOCAL_FIRST.crm, key: 'view', onForeground: () => refreshHook.current() });
  const seed = local.cached?.data?.tenantKey === tenantKey ? local.cached.data : null;
  const [workspaceTenant, setWorkspaceTenant] = useState(() => (seed ? tenantKey : ''));
  const [apps, setApps] = useState(() => seed?.apps || []);
  const [appId, setAppId] = useState(() => seed?.appId || '');
  const [app, setApp] = useState(() => seed?.app || null);
  const [viewId, setViewId] = useState(() => seed?.viewId || '');
  const [records, setRecords] = useState(() => seed?.records || []);
  const [cursor, setCursor] = useState(() => seed?.cursor || null);
  const [workflows, setWorkflows] = useState(() => seed?.workflows || []);
  const [loading, setLoading] = useState(() => !seed);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  // Control answers 404 when this company has no CRM yet; that is the same state as a build without the CRM.
  const [companyWithoutCRM, setCompanyWithoutCRM] = useState(false);
  const requestGeneration = useRef(0);
  const appRef = useRef(app);
  appRef.current = app;
  const paintedFromDevice = useRef(Boolean(seed));
  const recordsFor = useRef(seed ? `${seed.app?.id}:${seed.viewId}` : '');
  const [reload, setReload] = useState(0);
  refreshHook.current = () => setReload(count => count + 1);
  useEffect(() => {
    if (!seed || paintedFromDevice.current) return;
    paintedFromDevice.current = true;
    recordsFor.current = `${seed.app?.id}:${seed.viewId}`;
    setWorkspaceTenant(current => current || tenantKey);
    setApps(current => (current.length ? current : seed.apps || []));
    setAppId(current => current || seed.appId || '');
    setApp(current => current || seed.app || null);
    setViewId(current => current || seed.viewId || '');
    setRecords(current => (current.length ? current : seed.records || []));
    setCursor(current => current || seed.cursor || null);
    setWorkflows(current => (current.length ? current : seed.workflows || []));
    setLoading(false);
  }, [seed, tenantKey]);
  useEffect(() => {
    requestGeneration.current += 1;
    if (!paintedFromDevice.current) { setWorkspaceTenant(''); setApps([]); setAppId(''); setApp(null); setRecords([]); setWorkflows([]); setCursor(null); setLoading(true); }
    setError(''); setCompanyWithoutCRM(false);
    if (!CRM_ENABLED) { setLoading(false); return undefined; }
    const controller = new AbortController();
    apiClient.controlPlane.get(ROOT, { signal: controller.signal, params: { published: true } }).then(({ data }) => {
      const published = (data.apps || []).filter(item => item.publishedVersion != null);
      if (controller.signal.aborted) return;
      latest.current = { ...latest.current, tenantKey, apps: published, appId: published.some(item => item.id === latest.current.appId) ? latest.current.appId : published[0]?.id || '' };
      setWorkspaceTenant(tenantKey); setApps(published); setAppId(current => (published.some(item => item.id === current) ? current : published[0]?.id || ''));
      if (!published.length) { setApp(null); setRecords([]); setWorkflows([]); local.save(null); }
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (cause?.response?.status === 404) { setCompanyWithoutCRM(true); local.save(null); }
      else if (!paintedFromDevice.current) setError('Your CRM could not be opened. Please try again.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantKey, reload]);
  useEffect(() => {
    requestGeneration.current += 1;
    if (!appId || workspaceTenant !== tenantKey) return undefined;
    const controller = new AbortController();
    const showing = appRef.current?.id === appId;
    if (!showing) { setApp(null); setLoading(true); }
    setError('');
    apiClient.controlPlane.get(`${ROOT}/${appId}/published`, { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      latest.current = { ...latest.current, tenantKey, appId, app: data.app };
      setApp(data.app);
      setViewId(current => (data.app.spec.views.some(view => view.id === current) ? current : data.app.spec.views[0]?.id || ''));
    }).catch(() => { if (!controller.signal.aborted && !appRef.current) setError('This workspace could not be loaded.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [appId, workspaceTenant, tenantKey, reload]);
  const entityId = app?.spec.views.find(view => view.id === viewId)?.entityId;
  useEffect(() => {
    requestGeneration.current += 1;
    const scopeKey = app ? `${app.id}:${viewId}` : '';
    if (recordsFor.current !== scopeKey) { setRecords([]); setCursor(null); setWorkflows([]); recordsFor.current = scopeKey; }
    if (!app || workspaceTenant !== tenantKey) return undefined;
    const controller = new AbortController();
    const path = viewId === 'workflows' ? `${ROOT}/${app.id}/workflows` : `${ROOT}/${app.id}/records`;
    if (!entityId && viewId !== 'workflows') return undefined;
    setLoadingMore(true); setError('');
    apiClient.controlPlane.get(path, { signal: controller.signal, params: entityId ? { entityId, limit: 25 } : undefined }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (viewId === 'workflows') setWorkflows(data.workflows || []);
      else { setRecords(data.records); setCursor(data.nextCursor); }
      // Only the first page of the open view is kept on the device.
      latest.current = { ...latest.current, tenantKey, viewId, records: viewId === 'workflows' ? [] : (data.records || []).slice(0, 25), cursor: viewId === 'workflows' ? null : data.nextCursor || null, workflows: viewId === 'workflows' ? (data.workflows || []).slice(0, 25) : [] };
      if (latest.current.app?.id === app.id) local.save(latest.current);
    }).catch(() => { if (!controller.signal.aborted) setError(viewId === 'workflows' ? 'Activity could not be loaded. Please try again.' : 'Your items could not be loaded. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoadingMore(false); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (!CRM_ENABLED || companyWithoutCRM) return <div className="crm-empty"><h1>Your CRM</h1><p>Your CRM will be available here soon.</p></div>;
  return <main className="crm-page"><div className="crm-toolbar"><CRMRuntimeLink onError={setError} /><Link to={fullscreen ? "/hivemind/app/crm" : "/hivemind/app/crm?fullscreen=true"}>{fullscreen ? "Exit full screen" : "Expand ↗"}</Link></div>{error && <div role="alert" className="crm-error">{error} <button type="button" onClick={() => window.location.reload()}>Try again</button></div>}{loading || (!error && workspaceTenant !== tenantKey) ? <div role="status" className="crm-empty">Opening your CRM…</div> : error && !app ? null : !appId ? <div className="crm-empty"><h1>Your CRM</h1><p>Keep your companies, contacts and deals together. {runtimeEnabledFor(org) ? 'Tell Runtime what your team needs' : 'Tell your employees what your team needs'}, and your CRM will appear here.</p></div> : app && <>{apps.length > 1 && <label className="crm-app-picker">Workspace <select value={appId} onChange={event => setAppId(event.target.value)}>{apps.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<CRMWorkspace key={`${tenantKey}:${app.id}`} app={app} records={records} workflows={workflows} viewId={viewId} onViewChange={setViewId} onLoadMore={cursor ? loadMore : undefined} loadingMore={loadingMore} onUpdateRecord={updateRecord} /></>}</main>;
}
