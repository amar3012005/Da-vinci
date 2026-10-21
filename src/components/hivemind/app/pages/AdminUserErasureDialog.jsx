import React, { useEffect, useState } from 'react';
import apiClient from '../shared/api-client';
const failure = error => error.response?.data?.error || error.message;
export default function AdminUserErasureDialog({ user, onClose, onCompleted }) {
  const [preview, setPreview] = useState(null), [email, setEmail] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [operation, setOperation] = useState(null), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    apiClient.getPlatformUserErasure(user.id).then(result => {
      if (!active) return;
      if (result.user && (result.user.id !== user.id || result.user.email.toLowerCase() !== user.email.toLowerCase())) throw new Error('This user changed. Close and reload the directory before deleting.');
      setPreview(result);setOperation(result.operation);
      if (result.operation?.status === 'completed') onCompleted();
    }).catch(reason => { if (active) setError(failure(reason)); });
    return () => { active = false; };
  }, [user.id, user.email, refresh]);
  useEffect(() => {
    if (!operation || !['pending','processing','reconciled','blocked'].includes(operation.status)) return undefined;
    let active = true, pending = false;
    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await apiClient.getPlatformUserErasure(user.id);
        if (!active) return;
        if (result.operation?.id !== operation.id) throw new Error('The erasure receipt changed. Refresh status before continuing.');
        setOperation(result.operation);setError('');
        if (result.operation.status === 'completed') onCompleted();
      } catch (reason) { if (active) setError(`Status unavailable; deletion has not been repeated. ${failure(reason)}`); }
      finally { pending = false; }
    };
    const timer = window.setInterval(poll, operation.status === 'blocked' ? 10000 : 2500);void poll();
    return () => { active = false;window.clearInterval(timer); };
  }, [operation?.id, operation?.status, user.id, onCompleted]);
  const submit = async event => {
    event.preventDefault();if (busy || email.trim().toLowerCase() !== user.email.toLowerCase() || !preview?.user) return;
    setBusy(true);setError('');
    try {
      const result = await apiClient.erasePlatformUser(user.id, email.trim());
      setOperation(result.operation);
      if (result.operation?.status === 'completed') onCompleted();
    } catch (reason) { setError(`Request outcome must be checked before retrying. ${failure(reason)}`);setPreview(null);setRefresh(value => value + 1); }
    finally { setBusy(false); }
  };
  const inProgress = operation && ['pending','processing','reconciled'].includes(operation.status);
  const done = operation?.status === 'completed';
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-erasure-title"><section className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-xl">
    <div className="flex items-start justify-between gap-4"><h2 id="admin-erasure-title" className="text-xl font-semibold text-red-800">Permanently delete user</h2><button autoFocus type="button" onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button></div>
    <p className="mt-3 break-all text-sm font-medium">{user.email}</p>
    <p className="mt-3 text-sm text-[#525252]">This starts permanent erasure of this account and its owned HIVEMIND data, including memories and source files. It cannot be undone. Shared organization data requires ownership reconciliation; other members’ data is protected.</p>
    <p className="mt-3 text-xs text-[#737373]">Original files in external providers are not deleted. Audit records and backups follow their existing retention policies. Remote or unresolved shared data may block completion.</p>
    {!preview && !error && <p role="status" className="mt-4 text-sm">Checking account and deletion scope…</p>}
    {preview?.counts && <dl className="mt-4 grid grid-cols-3 gap-2">{Object.entries(preview.counts).map(([key,value]) => <div key={key} className="rounded-lg bg-[#faf9f4] p-3"><dt className="text-xs capitalize text-[#737373]">{key}</dt><dd className="mt-1 font-semibold">{Number(value).toLocaleString()}</dd></div>)}</dl>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}<button type="button" className="ml-2 underline" onClick={() => { setError('');setRefresh(value => value + 1); }}>Refresh status</button></p>}
    {operation && <div role="status" className="mt-4 rounded-lg border p-3 text-sm"><strong>{done ? 'Account erasure completed' : operation.status === 'blocked' ? 'Erasure blocked — not completed' : 'Erasure in progress'}</strong>{operation.failureCode && <p className="mt-1 break-words">{operation.failureCode}</p>}<p className="mt-2 break-all text-xs text-[#737373]">Receipt: {operation.id}</p></div>}
    {preview?.user && (!operation || operation.status === 'blocked') && <form onSubmit={submit} className="mt-5"><label className="block text-sm font-medium">Type {user.email} to confirm<input aria-label="Confirm deletion email" autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-lg border p-2"/></label><button disabled={busy || email.trim().toLowerCase() !== user.email.toLowerCase()} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Requesting erasure…' : operation?.status === 'blocked' ? 'Retry permanent deletion' : 'Permanently delete this user'}</button></form>}
    {inProgress && <p className="mt-3 text-xs text-[#737373]">You may close this window. The server retains the operation and its progress; closing does not cancel or repeat it.</p>}
  </section></div>;
}
