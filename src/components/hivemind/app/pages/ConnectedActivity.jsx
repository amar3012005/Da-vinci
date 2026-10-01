import React, { useState } from 'react';
import apiClient from '../shared/api-client';
export default function ConnectedActivity() {
  const [catalog, setCatalog] = useState(null);
  const [type, setType] = useState(null);
  const [event, setEvent] = useState('');
  const [account, setAccount] = useState('');
  const [config, setConfig] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async task => {
    setBusy(true); setMessage('');
    try { await task(); } catch (error) { setMessage(error.response?.data?.error || 'Connected activity could not be updated. Please try again.'); }
    finally { setBusy(false); }
  };
  const load = () => run(async () => {
    const [discovered, current] = await Promise.all([apiClient.hivemindTriggers({ operation:'discover' }), apiClient.hivemindTriggers({ operation:'list' })]);
    setCatalog(discovered); setSubscriptions(current.subscriptions || []);
  });
  const inspect = slug => run(async () => {
    setEvent(slug); setType(null); setConfig({});
    if (!slug) return;
    const selected = await apiClient.hivemindTriggers({ operation:'inspect', trigger_slug:slug });
    setType(selected); setAccount(selected.accounts?.[0]?.id || '');
    setConfig(Object.fromEntries(Object.entries(selected.config_schema?.properties || {}).filter(([,spec]) => spec.default !== undefined).map(([key,spec]) => [key,spec.default])));
  });
  const save = () => run(async () => {
    await apiClient.hivemindTriggers({ operation:'create', trigger_slug:event, connected_account_id:account, config });
    const current = await apiClient.hivemindTriggers({ operation:'list' });
    setSubscriptions(current.subscriptions || []); setMessage('Connected activity enabled. New events can appear in your suggestions.');
  });
  const pause = subscription => run(async () => {
    await apiClient.hivemindTriggers({ operation:subscription.status === 'active' ? 'pause' : 'resume', subscription_id:subscription.id });
    setSubscriptions((await apiClient.hivemindTriggers({ operation:'list' })).subscriptions || []);
  });
  return <details className="hm-connected-activity" onToggle={e => { if (e.currentTarget.open && !catalog && !busy) load(); }}>
    <summary>Connected activity</summary>
    <p>Choose which app events may suggest your next question. This reads activity; it never sends messages or starts work automatically.</p>
    {catalog && !catalog.accounts?.length && <p>Connect an app to choose its events.</p>}
    {catalog?.events?.length > 0 && <>
      <label>Event <select value={event} disabled={busy} onChange={e=>inspect(e.target.value)}><option value="">Choose an event</option>{catalog.events.map(item=><option key={item.slug} value={item.slug}>{item.toolkit} · {item.name}</option>)}</select></label>
      {type && <>
        <label>Account <select value={account} disabled={busy} onChange={e=>setAccount(e.target.value)}>{type.accounts.map(item=><option key={item.id} value={item.id}>{item.email || item.toolkit} · {item.id.slice(-5)}</option>)}</select></label>
        {Object.entries(type.config_schema.properties || {}).map(([key,spec])=><label key={key}>{spec.title || key.replaceAll('_',' ')}{type.config_schema.required?.includes(key) ? ' *' : ''}
          {spec.enum ? <select value={config[key] || ''} onChange={e=>setConfig({...config,[key]:e.target.value})}><option value="">Choose</option>{spec.enum.map(value=><option key={value} value={value}>{String(value)}</option>)}</select>
          : spec.type === 'boolean' ? <input type="checkbox" checked={Boolean(config[key])} onChange={e=>setConfig({...config,[key]:e.target.checked})}/>
          : <input value={config[key] === undefined ? '' : typeof config[key] === 'object' ? JSON.stringify(config[key]) : String(config[key])} placeholder={spec.description || ''} onChange={e=>{ let value=e.target.value; if (['integer','number'].includes(spec.type)) value=value === '' ? undefined : Number(value); if (['array','object'].includes(spec.type)) { try { value=JSON.parse(value); } catch { value=e.target.value; } } setConfig({...config,[key]:value}); }}/>}</label>)}
        <button disabled={busy || !account || catalog.events.find(item=>item.slug===event)?.requires_setup} onClick={save}>Use for suggestions</button>
        {catalog.events.find(item=>item.slug===event)?.requires_setup && <p>This event requires additional provider setup.</p>}
      </>}
    </>}
    {subscriptions.map(item=><div key={item.id} className="hm-activity-subscription"><span>{item.toolkit} · {catalog?.events?.find(event=>event.slug===item.trigger_slug)?.name || item.trigger_slug.replaceAll('_',' ')} · {item.status}</span><button disabled={busy || !['active','paused'].includes(item.status)} onClick={()=>pause(item)}>{item.status==='active' ? 'Pause' : item.status==='paused' ? 'Resume' : 'Pending verification'}</button></div>)}
    {busy && <p role="status">Loading connected activity…</p>}
    {message && <p role="status">{message}</p>}
  </details>;
}
