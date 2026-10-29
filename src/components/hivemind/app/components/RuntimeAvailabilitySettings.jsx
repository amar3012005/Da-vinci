import React, { useCallback, useEffect, useRef, useState } from 'react';
import AutonomyDial from '../layout/AutonomyDial';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import { runtimeEnabledFor } from '../shared/runtime-enabled';

/** Owner and admin roles may change company-wide settings. */
const canManage = user => user?.role === 'admin' || user?.role === 'owner';

/**
 * Settings for how the company works with its AI: the "Enable Runtime" switch (owners and admins) and the
 * autonomy level, which stays reachable here when Runtime is hidden from the sidebar.
 * The switch reads and writes Control's `runtime_enabled`; the sidebar updates at once, without a reload.
 */
export default function RuntimeAvailabilitySettings() {
  const { user, org, setRuntimeEnabled } = useAuth();
  const enabled = runtimeEnabledFor(org);
  const admin = canManage(user);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef({ enabled, setRuntimeEnabled });
  latest.current = { enabled, setRuntimeEnabled };

  // Confirm the stored value with Control, so a change made by another admin shows here.
  useEffect(() => {
    if (!admin || !org?.id) return undefined;
    let active = true;
    apiClient.getRuntimeSetting(org.id).then(value => {
      if (active && typeof value?.runtime_enabled === 'boolean' && value.runtime_enabled !== latest.current.enabled) latest.current.setRuntimeEnabled?.(value.runtime_enabled);
    }).catch(() => { /* The bootstrap value stays; saving reports its own failure. */ });
    return () => { active = false; };
  }, [admin, org?.id]);

  const toggle = useCallback(async () => {
    if (saving || !org?.id) return;
    const wanted = !latest.current.enabled;
    setSaving(true); setError('');
    try {
      const saved = await apiClient.setRuntimeSetting(org.id, wanted);
      latest.current.setRuntimeEnabled?.(saved?.runtime_enabled === true);
    } catch {
      setError('The setting could not be saved. Try again.');
    } finally { setSaving(false); }
  }, [saving, org?.id]);

  return <div className="space-y-6" data-runtime-availability-settings>
    {admin && <section aria-labelledby="runtime-enable-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id="runtime-enable-title" className="text-[#0a0a0a] text-base font-semibold font-['Space_Grotesk']">Enable Runtime</h3>
          <p id="runtime-enable-help" className="text-[#525252] text-sm mt-0.5">Runtime, your AI Chief of Staff, plans and coordinates your team. Turn off to work with your employees directly.</p>
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-labelledby="runtime-enable-title" aria-describedby="runtime-enable-help"
          disabled={saving} onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${enabled ? 'bg-[#117dff]' : 'bg-[#cfcac0]'}`}>
          <span aria-hidden="true" className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-[#c2410c]">{error}</p>}
    </section>}
    <section aria-label="Autonomy level">
      <AutonomyDial orgId={org?.id} runtimeEnabled={enabled} />
    </section>
  </div>;
}
