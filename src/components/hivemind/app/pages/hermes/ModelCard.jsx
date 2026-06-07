import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, RefreshCw, Check, ChevronDown } from 'lucide-react';

// Model picker (Home). Choose provider (Groq / OpenRouter) → fetch that provider's
// models → pick one → save. OpenRouter requires the tenant's own API key (stored
// server-side in the profile, never shown back). Groq uses the platform key.
// Backend: GET /hermes/agent/model, GET /hermes/providers/:provider/models,
// PUT /hermes/agent/model { provider, model, apiKey? }.

function errMessage(e) {
  return e?.response?.data?.error || e?.message || 'Something went wrong';
}

const PROVIDERS = [
  { id: 'groq', label: 'Groq', blurb: 'Fast, platform key included.' },
  { id: 'openrouter', label: 'OpenRouter', blurb: 'Claude, GPT, Gemini & more — needs your key.' },
];

export default function ModelCard({ agent, apiClient }) {
  const [provider, setProvider] = useState('groq');
  const [model, setModel] = useState('');
  const [current, setCurrent] = useState(null);
  const [models, setModels] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load the current provider/model on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiClient.getHermesModel();
        if (!alive) return;
        const m = data?.model;
        if (m?.provider) { setProvider(m.provider); setCurrent(m); setModel(m.model || ''); }
      } catch { /* ignore — defaults stand */ }
    })();
    return () => { alive = false; };
  }, [apiClient]);

  const loadModels = useCallback(async (prov) => {
    setLoadingModels(true);
    setError(null);
    try {
      const data = await apiClient.getHermesProviderModels(prov);
      setModels(Array.isArray(data?.models) ? data.models : []);
    } catch (e) {
      setError(errMessage(e));
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [apiClient]);

  useEffect(() => { loadModels(provider); }, [provider, loadModels]);

  async function save() {
    if (!model || saving) return;
    if (provider === 'openrouter' && !apiKey.trim() && current?.provider !== 'openrouter') {
      setError('Enter your OpenRouter API key'); return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = { provider, model };
      if (provider === 'openrouter' && apiKey.trim()) payload.apiKey = apiKey.trim();
      const data = await apiClient.updateHermesModel(payload);
      setCurrent(data?.model || { provider, model });
      setApiKey('');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(errMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[10px] border border-[#e3e0db] bg-white p-5" aria-label="Model">
      <div className="flex items-center gap-2 mb-3">
        <Cpu size={15} className="text-[#117dff]" />
        <h3 className="text-[13px] font-semibold text-[#0a0a0a]">Model</h3>
        {current?.model && (
          <span className="ml-auto text-[10px] font-mono text-[#737373] truncate max-w-[55%]">
            {current.provider} · {current.model}
          </span>
        )}
      </div>

      {/* Provider toggle */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => { setProvider(p.id); setModel(''); setSaved(false); }}
            className={`text-left rounded-[8px] border p-2.5 transition-colors ${
              provider === p.id
                ? 'border-[#117dff] bg-[#117dff]/5'
                : 'border-[#e3e0db] hover:border-[#d4d0ca]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {provider === p.id && <Check size={12} className="text-[#117dff]" />}
              <span className="text-[12px] font-semibold text-[#0a0a0a]">{p.label}</span>
            </div>
            <p className="text-[10px] text-[#737373] mt-0.5">{p.blurb}</p>
          </button>
        ))}
      </div>

      {/* OpenRouter key */}
      {provider === 'openrouter' && (
        <div className="mb-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">
            OpenRouter API key {current?.provider === 'openrouter' && <span className="text-[#16a34a]">(saved — leave blank to keep)</span>}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 text-[12px] font-mono outline-none focus:border-[#117dff]"
          />
        </div>
      )}

      {/* Model select */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a3a3a3] mb-1">Model</label>
        <div className="relative">
          <select
            value={model}
            onChange={(e) => { setModel(e.target.value); setSaved(false); }}
            disabled={loadingModels}
            className="w-full appearance-none rounded-[8px] border border-[#e3e0db] bg-[#faf9f4] px-3 py-2 pr-8 text-[12px] outline-none focus:border-[#117dff] disabled:opacity-60"
          >
            <option value="">{loadingModels ? 'Loading models…' : 'Select a model…'}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.id}</option>
            ))}
          </select>
          {loadingModels
            ? <RefreshCw size={13} className="animate-spin absolute right-2.5 top-2.5 text-[#a3a3a3]" />
            : <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-[#a3a3a3] pointer-events-none" />}
        </div>
        <p className="text-[10px] text-[#a3a3a3] mt-1">{models.length} models available</p>
      </div>

      {error && <div className="mb-2 text-[11px] text-[#dc2626]">{error}</div>}

      <button
        onClick={save}
        disabled={saving || !model}
        className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#117dff] px-3.5 py-1.5 text-[11px] font-medium text-white hover:bg-[#0066e0] disabled:opacity-50"
      >
        {saving ? <><RefreshCw size={12} className="animate-spin" /> Applying…</> : saved ? <><Check size={12} /> Saved</> : 'Save model'}
      </button>
      <p className="text-[10px] text-[#a3a3a3] mt-2">Changing the model restarts the agent (a few seconds).</p>
    </section>
  );
}
