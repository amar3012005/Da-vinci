import React, { useRef, useState } from 'react';

export function CRMRecordDrawer({ record, entity, title, onClose, onUpdateRecord }) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(record.data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(null);
  const editable = entity.fields.filter(field => (!field.source || field.source.type === 'local') && field.type !== 'reference');
  const save = async event => {
    event.preventDefault(); setSaving(true); setError('');
    const body = Object.fromEntries(editable.map(field => [field.id, data[field.id] ?? null]));
    const fingerprint = JSON.stringify(body);
    if (!operation.current || operation.current.fingerprint !== fingerprint) operation.current = { fingerprint, id: `crm-ui-${crypto.randomUUID()}` };
    try { await onUpdateRecord(record, body, operation.current.id); onClose(); }
    catch (cause) { setError(cause.message || 'The change could not be confirmed. Retry the same change or reopen the record.'); }
    finally { setSaving(false); }
  };
  return <div className="crm-dialog-backdrop" onClick={() => { if (!saving) onClose(); }}><section className="crm-record-detail" role="dialog" aria-modal="true" aria-label="Record details" onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape' && !saving) onClose(); }}>
    <button type="button" className="crm-close" autoFocus disabled={saving} onClick={onClose} aria-label="Close record">×</button><h2>{title}</h2>
    {editing ? <form onSubmit={save}>{editable.map(field => <label className="crm-edit-field" key={field.id}>{field.name}
      {field.type === 'enum' ? <select value={data[field.id] ?? ''} required={field.required} onChange={event => setData(old => ({ ...old, [field.id]: event.target.value || null }))}><option value="">Select…</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'boolean' ? <input type="checkbox" checked={data[field.id] === true} onChange={event => setData(old => ({ ...old, [field.id]: event.target.checked }))} /> : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} step={field.type === 'number' ? 'any' : undefined} required={field.required} value={data[field.id] ?? ''} onChange={event => setData(old => ({ ...old, [field.id]: field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value }))} />}
    </label>)}{error && <p role="alert" className="crm-error">{error}</p>}<button className="crm-more" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</button><button type="button" disabled={saving} onClick={() => setEditing(false)}>Cancel</button></form> : <><dl>{entity.fields.map(field => <React.Fragment key={field.id}><dt>{field.name}</dt><dd>{record.data[field.id] == null ? '—' : String(record.data[field.id])}</dd></React.Fragment>)}</dl>{onUpdateRecord && editable.length > 0 && <button className="crm-more" type="button" onClick={() => setEditing(true)}>Edit record</button>}<p>Change the workspace structure through Runtime or your HyperAgent.</p></>}
  </section></div>;
}
