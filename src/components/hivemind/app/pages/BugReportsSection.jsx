import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import apiClient from '../shared/api-client';

const when = value => (value ? new Date(value).toLocaleString() : '—');
const message = error => error.response?.data?.error || error.message;
const STATUS_TONE = { new: 'bg-red-50 text-red-700', seen: 'bg-amber-50 text-amber-700', fixed: 'bg-emerald-50 text-emerald-700' };
const STATUS_FILTERS = [['', 'All'], ['new', 'New'], ['seen', 'Seen'], ['fixed', 'Fixed']];
const PLATFORM_FILTERS = [['', 'All platforms'], ['web', 'Web'], ['ios', 'iOS'], ['macos', 'macOS']];
const PAGE_SIZE = 25;

export function StatusChip({ status }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status] || 'bg-[#f3f1ec] text-[#525252]'}`}>{status}</span>;
}

function ReportDrawer({ id, onClose, onStatus }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setReport(null);setError('');
    apiClient.getBugReport(id).then(value => { if (active) setReport(value); }).catch(failure => { if (active) setError(message(failure)); });
    return () => { active = false; };
  }, [id]);
  const mark = async status => {
    setBusy(true);setError('');
    try {
      await apiClient.setBugReportStatus(id, status);
      setReport(current => ({ ...current, status }));
      onStatus();
    } catch (failure) { setError(message(failure)); } finally { setBusy(false); }
  };
  const fields = report ? [
    ['Platform', report.platform], ['Company (org id)', report.orgId || '—'], ['User id', report.userId], ['Route', report.route || '—'],
    ['Version', `${report.appVersion || '—'}${report.build ? ` (build ${report.build})` : ''}`], ['User agent', report.userAgent || '—'], ['Received', when(report.at)],
  ] : [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="bug-report-title">
      <button type="button" aria-label="Close bug report" onClick={onClose} className="absolute inset-0 cursor-default" />
      <section className="relative h-full w-full overflow-y-auto bg-[#faf9f4] shadow-2xl sm:max-w-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e3e0db] bg-[#faf9f4]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#117dff]">Bug report</p>
            <h2 id="bug-report-title" className="mt-1 flex items-center gap-2 text-lg font-semibold text-[#111]">Report details {report && <StatusChip status={report.status} />}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-[6px] p-2 text-[#525252] hover:bg-[#f0eee8]" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="space-y-4 p-5">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {!report && !error && <p className="text-sm text-[#737373]">Loading report…</p>}
          {report && <>
            <div className="flex gap-2">
              <button type="button" disabled={busy || report.status === 'seen'} onClick={() => mark('seen')} className="rounded-[6px] border border-[#e3e0db] bg-white px-3 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#f3f1ec] disabled:opacity-50">Mark seen</button>
              <button type="button" disabled={busy || report.status === 'fixed'} onClick={() => mark('fixed')} className="rounded-[6px] bg-[#117dff] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50">Mark fixed</button>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-[10px] border border-[#e3e0db] bg-white p-4 font-sans text-sm leading-6 text-[#111]">{report.text}</pre>
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 rounded-[10px] border border-[#e3e0db] bg-white p-4 text-xs">
              {fields.map(([label, value]) => <React.Fragment key={label}><dt className="text-[#737373]">{label}</dt><dd className="break-words text-[#111]">{value}</dd></React.Fragment>)}
            </dl>
          </>}
        </div>
      </section>
    </div>
  );
}

/** Admin inbox for in-app bug reports. `onCounts` receives the per-status totals so the navigation can show unread. */
export default function BugReportsSection({ onCounts }) {
  const [status, setStatus] = useState('');
  const [platform, setPlatform] = useState('');
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const load = useCallback(() => {
    setLoading(true);setError('');
    return apiClient.listBugReports({ status, platform, offset, limit: PAGE_SIZE }).then(value => {
      setResult(value);
      onCounts?.(value.counts);
    }).catch(failure => setError(message(failure))).finally(() => setLoading(false));
  }, [status, platform, offset, onCounts]);
  useEffect(() => { load(); }, [load]);
  const counts = result?.counts || { new: 0, seen: 0, fixed: 0 };
  const select = (setter, value) => { setter(value);setOffset(0); };
  return (
    <section id="admin-bug-reports" className="scroll-mt-20" aria-label="Bug reports">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bug reports</h1>
          <p className="text-sm text-[#737373]">{counts.new} new · {counts.seen} seen · {counts.fixed} fixed · newest 500 across all companies</p>
        </div>
        <button type="button" onClick={load} className="rounded-lg border px-3 py-2 text-sm">Refresh</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(([id, label]) => (
          <button key={label} type="button" onClick={() => select(setStatus, id)} aria-pressed={status === id} className={`rounded-full border px-3 py-1 text-xs ${status === id ? 'border-[#117dff] bg-[#117dff] text-white' : 'border-[#e3e0db] bg-white text-[#525252]'}`}>{label}</button>
        ))}
        <select aria-label="Platform filter" value={platform} onChange={event => select(setPlatform, event.target.value)} className="rounded-full border border-[#e3e0db] bg-white px-3 py-1 text-xs text-[#525252]">
          {PLATFORM_FILTERS.map(([id, label]) => <option key={label} value={id}>{label}</option>)}
        </select>
      </div>
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white">
        {loading && !result ? <p className="p-4 text-sm text-[#737373]">Loading bug reports…</p> : !result?.reports.length ? <p className="p-4 text-sm text-[#737373]">No bug reports match.</p> : (
          <ul>
            {result.reports.map(report => (
              <li key={report.id} className="border-t border-[#f0ede8] first:border-t-0">
                <button type="button" onClick={() => setSelected(report.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-[#faf9f4]">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                    <StatusChip status={report.status} />
                    <span className="font-mono uppercase">{report.platform}</span>
                    <span>{report.orgId || 'no company'}</span>
                    <span className="ml-auto">{when(report.at)}</span>
                  </span>
                  <span className="truncate text-sm text-[#111]">{report.preview.split('\n')[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {result && (offset > 0 || result.nextOffset != null) && (
        <div className="mt-3 flex items-center justify-between text-xs text-[#737373]">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Newer</button>
          <span>{result.total} matching</span>
          <button type="button" disabled={result.nextOffset == null} onClick={() => setOffset(result.nextOffset)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Older</button>
        </div>
      )}
      {selected && <ReportDrawer id={selected} onClose={() => setSelected(null)} onStatus={load} />}
    </section>
  );
}
