import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Archive, RotateCcw } from 'lucide-react';
import apiClient from '../shared/api-client';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3484ff]';

/** Fields the read-only view shows; the persona is the employee's saved profile, shown as written. */
export function archivedEmployeeView(employee) {
  const lifecycle = employee?.policyRules?.native_lifecycle || {};
  return {
    id: String(employee.id),
    name: String(employee.name || ''),
    role: String(employee.roleArchetype || ''),
    persona: String(employee.persona || ''),
    archivedAt: lifecycle.archive?.archived_at || employee.archivedAt || null,
  };
}

function formatDate(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
}

/**
 * Library section for employees that were archived: a list, a read-only profile view, and Unarchive.
 * Archived employees keep their chats, memory, files and profile; unarchiving restores them to the team and resumes their duties.
 * Only owners and admins can list or restore them, so the caller shows this section to them alone.
 */
export default function ArchivedEmployees() {
  const { t } = useTranslation('dashboard');
  // The list loads once on mount; a changing translator must not reload it.
  const translate = useRef(t);
  translate.current = t;
  const [employees, setEmployees] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const value = await apiClient.listArchivedEmployees();
      setEmployees((value.employees || []).map(archivedEmployeeView));
      setError('');
    } catch {
      setError(translate.current('library.archived.loadFailed', 'Archived employees couldn’t be loaded. Check your connection and try again.'));
      setEmployees(current => current || []);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const unarchive = async employee => {
    setBusy(true);
    setError('');
    try {
      await apiClient.manageNativeEmployeeLifecycle({ operation: 'unarchive', employee_id: employee.id });
      setEmployees(current => (current || []).filter(item => item.id !== employee.id));
      setOpenId(null);
      setNotice(t('library.archived.restored', '{{name}} is back on your team and its duties have resumed.', { name: employee.name }));
      window.dispatchEvent(new Event('hm:employees-changed'));
    } catch {
      setError(t('library.archived.restoreFailed', 'Unarchiving isn’t confirmed. Reload and try again.'));
    } finally { setBusy(false); }
  };

  const open = employees?.find(employee => employee.id === openId) || null;
  if (open) {
    return <section aria-label={open.name} className="mx-auto max-w-2xl px-4 py-5 md:px-6">
      <button type="button" onClick={() => setOpenId(null)} className={`mb-4 flex h-10 items-center gap-1.5 rounded-lg px-2 text-[13px] text-[#3d4249] hover:bg-[#efede6] ${FOCUS}`}>
        <ArrowLeft size={15} aria-hidden="true" />{t('library.archived.back', 'Archived employees')}
      </button>
      <div className="rounded-2xl border border-[#e7e4dd] bg-white p-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#1f2328]">{open.name}</h2>
        {open.role ? <p className="mt-0.5 text-[13.5px] text-[#5f646b]">{open.role}</p> : null}
        <p className="mt-3 rounded-lg bg-[#f3f1ec] px-3 py-2 text-[12.5px] leading-5 text-[#5f646b]">
          {t('library.archived.readOnly', 'Archived{{date}}. Its chats, memory and files are kept. It does no work and gets no messages until you unarchive it.', { date: open.archivedAt ? ` on ${formatDate(open.archivedAt)}` : '' })}
        </p>
        {open.persona ? <>
          <h3 className="mt-5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#8b8b86]">{t('library.archived.profile', 'Profile')}</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-6 text-[#262626]">{open.persona}</p>
        </> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg bg-[#fbeeee] px-3 py-2 text-[12.5px] text-[#9b2c2c]">{error}</p> : null}
        <button type="button" disabled={busy} onClick={() => unarchive(open)} className={`mt-5 flex h-10 items-center gap-1.5 rounded-full bg-[#111] px-4 text-[13px] font-medium text-white disabled:opacity-40 ${FOCUS}`}>
          <RotateCcw size={15} aria-hidden="true" />{busy ? t('library.archived.restoring', 'Unarchiving…') : t('library.archived.unarchive', 'Unarchive')}
        </button>
      </div>
    </section>;
  }

  return <section aria-label={t('library.archived.title', 'Archived employees')} className="px-4 pb-8 pt-4 md:px-6">
    {notice ? <p role="status" className="mb-3 rounded-lg bg-[#ebf4ee] px-3 py-2 text-[12.5px] text-[#2f6b45]">{notice}</p> : null}
    {error ? <p role="alert" className="mb-3 rounded-lg bg-[#fbeeee] px-3 py-2 text-[12.5px] text-[#9b2c2c]">{error}</p> : null}
    {employees === null ? <p className="py-10 text-center text-[13px] text-[#7a7f86]" aria-busy="true">{t('library.archived.loading', 'Loading…')}</p> : null}
    {employees && employees.length === 0 && !error ? <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f1efe9] text-[#8b8b86]"><Archive size={24} aria-hidden="true" /></span>
      <h3 className="mt-4 text-[15px] font-semibold text-[#1f2328]">{t('library.archived.emptyTitle', 'No archived employees')}</h3>
      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{t('library.archived.emptyBody', 'Employees you archive from their details panel appear here. You can restore them at any time.')}</p>
    </div> : null}
    {employees && employees.length > 0 ? <ul className="divide-y divide-[#ece9e2] overflow-hidden rounded-xl border border-[#e7e4dd] bg-white">
      {employees.map(employee => <li key={employee.id} className="flex min-h-[60px] items-center gap-3 px-3 py-2">
        <button type="button" onClick={() => setOpenId(employee.id)} className={`min-w-0 flex-1 rounded-md text-left ${FOCUS}`}>
          <span className="block truncate text-[13.5px] font-medium text-[#20252a]">{employee.name}</span>
          <span className="block truncate text-[11.5px] text-[#7a7f86]">{[employee.role, employee.archivedAt ? formatDate(employee.archivedAt) : ''].filter(Boolean).join(' · ')}</span>
        </button>
        <button type="button" disabled={busy} onClick={() => unarchive(employee)} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#e3e0db] bg-white px-3 text-[13px] font-medium text-[#3d4249] hover:border-[#c9c5bc] disabled:opacity-40 ${FOCUS}`}>
          <RotateCcw size={14} aria-hidden="true" />{t('library.archived.unarchive', 'Unarchive')}
        </button>
      </li>)}
    </ul> : null}
  </section>;
}
