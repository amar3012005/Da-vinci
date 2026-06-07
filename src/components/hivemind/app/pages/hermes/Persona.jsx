import React, { useState, useEffect, useCallback } from 'react';
import { User, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

function errMessage(e) {
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}

export default function Persona({ apiClient, refresh }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [behavior, setBehavior] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiClient.getHermesPersona();
      const p = data?.persona || data || {};
      setName(p.name || '');
      setRole(p.role || '');
      setBehavior(p.behavior || p.instructions || p.description || '');
    } catch (e) {
      setLoadError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await apiClient.updateHermesPersona({
        name: name.trim(),
        role: role.trim(),
        behavior: behavior.trim(),
      });
      showToast('success', 'Persona saved. The gateway is restarting — this may take a few seconds.');
      if (typeof refresh === 'function') refresh();
    } catch (err) {
      showToast('error', errMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const isDirty = name.trim() || role.trim() || behavior.trim();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#a3a3a3]">
        <RefreshCw size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl border bg-[#117dff]/10 border-[#117dff]/20 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-[#117dff]" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-[#0a0a0a]">Agent Persona</h2>
          <p className="text-[12px] text-[#737373]">
            Define who your agent is and how it should respond.
          </p>
        </div>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-[#dc2626]">
          <AlertCircle size={14} className="flex-shrink-0" />
          {loadError}
          <button
            onClick={load}
            className="ml-auto text-[#dc2626] underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`mb-5 flex items-start gap-2 rounded-[10px] border px-4 py-3 text-[12px] ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-[#14532d]'
              : 'border-red-200 bg-red-50 text-[#dc2626]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          )}
          {toast.message}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white border border-[#e3e0db] rounded-[10px] p-5 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aria"
            className="w-full rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] transition-colors"
          />
          <p className="mt-1 text-[11px] text-[#a3a3a3]">
            What your agent calls itself in conversations.
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1.5">
            Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Support Specialist, Sales Assistant, Research Analyst"
            className="w-full rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[13px] text-[#0a0a0a] outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] transition-colors"
          />
          <p className="mt-1 text-[11px] text-[#a3a3a3]">
            A short title that describes what this agent does.
          </p>
        </div>

        {/* Behavior */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1.5">
            How should it behave?
          </label>
          <textarea
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            rows={6}
            placeholder={
              'Write in plain English — no special syntax needed.\n\n' +
              'Example: Be concise and friendly. Always greet users by name when possible. ' +
              'Escalate billing questions to a human agent. Avoid technical jargon.'
            }
            className="w-full resize-y rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[13px] text-[#0a0a0a] leading-relaxed outline-none placeholder:text-[#a3a3a3] focus:border-[#117dff] transition-colors"
          />
          <p className="mt-1 text-[11px] text-[#a3a3a3]">
            Describe the agent's tone, priorities, and any rules it should follow.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-[#eae7e1]">
          {saving ? (
            <p className="text-[11px] text-[#737373] flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" />
              Saving and restarting gateway — this may take a few seconds…
            </p>
          ) : (
            <p className="text-[11px] text-[#a3a3a3]">
              Saving restarts the gateway. Responses will resume in a few seconds.
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#117dff] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#0066e0] disabled:opacity-50 transition-colors ml-4 flex-shrink-0"
          >
            {saving ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={12} />
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
