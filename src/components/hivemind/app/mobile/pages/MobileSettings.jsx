import React, { useEffect, useState } from 'react';
import { Bell, Check, Clock3, RefreshCw } from 'lucide-react';
import MobileShell from '../MobileShell';
import apiClient from '../../shared/api-client';

const DEFAULT_SETTINGS = {
  enabled: false,
  timezone: 'UTC',
  quiet_start_hour: 21,
  quiet_end_hour: 8,
};

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Enable email reflections"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-[#117dff]' : 'bg-[#e3e0db]'}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function MobileSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.getProactiveCognitionSettings()
      .then((next) => {
        if (!cancelled && next) setSettings((current) => ({ ...current, ...next }));
      })
      .catch(() => {
        if (!cancelled) setNotice({ type: 'error', text: 'Reminder settings are unavailable right now.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const next = await apiClient.updateProactiveCognitionSettings({
        enabled: settings.enabled === true,
        timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        quiet_start_hour: Number(settings.quiet_start_hour),
        quiet_end_hour: Number(settings.quiet_end_hour),
      });
      setSettings((current) => ({ ...current, ...next }));
      setNotice({ type: 'success', text: 'Reminder preference saved.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.error || 'Could not save your preference.' });
    } finally {
      setSaving(false);
    }
  };

  const disabled = loading || saving;
  return (
    <MobileShell title="Settings">
      <div className="space-y-5 px-4 pt-3 pb-10">
        <header>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#117dff]">HIVEMIND · SETTINGS</p>
          <h1 className="mt-1 font-['Space_Grotesk'] text-[24px] font-semibold text-[#0a0a0a]">Stay in the loop.</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-[#737373]">Choose when HIVE-MIND can follow up on work that needs your attention.</p>
        </header>

        <section className="rounded-[16px] border border-[#e3e0db] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#117dff]/10">
              <Bell size={16} className="text-[#117dff]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-['Space_Grotesk'] text-[14px] font-semibold text-[#0a0a0a]">HIVE-MIND check-ins</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#525252]">Let HIVE-MIND check in when a recent decision or unfinished piece of work needs your attention.</p>
            </div>
            <Toggle checked={settings.enabled === true} disabled={disabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} />
          </div>

          <div className="mt-4 rounded-[10px] border border-[#eae7e1] bg-[#faf9f4] p-3">
            <p className="text-[11px] leading-relaxed text-[#525252]"><strong className="font-semibold text-[#0a0a0a]">In-app reminders</strong> can appear while you use HIVE-MIND and can always be dismissed. <strong className="font-semibold text-[#0a0a0a]">Email reminders</strong> require this opt-in.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wide text-[#737373]"><Clock3 size={10} /> Quiet from</span>
              <select
                value={settings.quiet_start_hour}
                disabled={disabled}
                onChange={(event) => setSettings((current) => ({ ...current, quiet_start_hour: Number(event.target.value) }))}
                className="h-9 w-full rounded-[9px] border border-[#e3e0db] bg-white px-2 text-[11px] text-[#0a0a0a] disabled:opacity-50"
              >
                {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wide text-[#737373]"><Clock3 size={10} /> Until</span>
              <select
                value={settings.quiet_end_hour}
                disabled={disabled}
                onChange={(event) => setSettings((current) => ({ ...current, quiet_end_hour: Number(event.target.value) }))}
                className="h-9 w-full rounded-[9px] border border-[#e3e0db] bg-white px-2 text-[11px] text-[#0a0a0a] disabled:opacity-50"
              >
                {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-[#737373]">Email is limited to one check-in per rolling day. You can turn it off at any time, and every email has a one-click unsubscribe.</p>
          {notice && <p className={`mt-3 text-[10.5px] ${notice.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{notice.text}</p>}
          <button type="button" onClick={save} disabled={disabled} className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[6px] bg-[#117dff] text-[12px] font-semibold text-white transition-colors hover:bg-[#0066e0] disabled:opacity-40">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : notice?.type === 'success' ? <Check size={13} /> : <Bell size={13} />}
            {saving ? 'Saving…' : notice?.type === 'success' ? 'Saved' : 'Save reminder preference'}
          </button>
        </section>
      </div>
    </MobileShell>
  );
}
