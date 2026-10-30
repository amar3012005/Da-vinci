import React, { useEffect, useId, useRef, useState } from 'react';
import { Cpu, Plus } from 'lucide-react';
import apiClient from './api-client';
import { useAuth } from '../auth/AuthProvider';
import { useCopy, useLocaleFormat, usePluralCopy } from '../layout/sidebar-copy';
import {
  PROTOCOLS, REASONING_OPTIONS, buildPayload, draftFromProvider, draftTestBody, emptyModel, errorMessage, hostOf,
  isFeatureOff, newDraft, protocolLabel, testResultText, validateBaseUrl, validateDraft,
} from './custom-provider-draft';

const button = 'rounded-lg border border-[#dedbd5] px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f7f6f1]';
const input = 'mt-1 block w-full rounded-lg border border-[#dedbd5] bg-white p-2 text-sm';
const without = (object, key) => {
  const { [key]: _removed, ...rest } = object;
  return rest;
};

function Field({ label, error, children }) {
  return <div className="text-sm">
    {label}
    {children}
    {error && <span role="alert" className="mt-1 block text-xs text-red-700">{error}</span>}
  </div>;
}

/** Custom model providers for the Runtime and HyperAgent composer. API keys are write-only and never returned. */
export default function CustomModelProviders() {
  const { org, user } = useAuth();
  const tx = useCopy('outerApp.customProviders');
  const plural = usePluralCopy('outerApp.customProviders');
  const format = useLocaleFormat();
  const errorText = (error, fallback) => errorMessage(error, fallback ?? tx('requestFailed', 'The custom provider request failed. Nothing changed.'), tx);
  const reasoningLabels = { off: tx('reasoningOff', 'None'), low: tx('reasoningLow', 'Low'), medium: tx('reasoningMedium', 'Medium'), high: tx('reasoningHigh', 'High') };
  const formId = useId();
  const [phase, setPhase] = useState('loading');
  const [providers, setProviders] = useState([]);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [results, setResults] = useState({});
  const [confirming, setConfirming] = useState(null);
  const lifetime = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setPhase('loading'); setProviders([]); setEditor(null); setBusy(false);
    setError(''); setNotice(''); setResults({}); setConfirming(null);
    apiClient.listCustomProviders(controller.signal)
      .then(value => { if (!controller.signal.aborted) { setProviders(value.providers || []); setPhase('ready'); } })
      .catch(e => {
        if (controller.signal.aborted) return;
        if (isFeatureOff(e)) setPhase('disabled');
        else { setPhase('error'); setError(errorText(e, tx('loadFailed', 'Custom model providers could not be loaded.'))); }
      });
    return () => controller.abort();
    // Each workspace and account starts with its own list; no provider data is reused across accounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, user?.id]);

  /** Runs one request for the current owner. Returns `{value}`, `{failure}`, or null when the owner changed. */
  async function attempt(work) {
    const controller = lifetime.current;
    setBusy(true); setError(''); setNotice('');
    try {
      return { value: await work() };
    } catch (e) {
      if (controller.signal.aborted) return null;
      if (isFeatureOff(e)) { setPhase('disabled'); setEditor(null); return null; }
      return { failure: e };
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function openEditor(mode, provider) {
    setError(''); setNotice(''); setConfirming(null);
    setEditor({ mode, draft: provider ? draftFromProvider(provider) : newDraft(), errors: {}, formError: '', modelsNote: '', fetched: [] });
  }

  function setField(field, value) {
    setEditor(current => current && { ...current, draft: { ...current.draft, [field]: value }, errors: without(current.errors, field) });
  }

  function patchModel(key, change) {
    setEditor(current => current && { ...current, draft: { ...current.draft, models: current.draft.models.map(model => model.key === key ? change(model) : model) } });
  }

  function removeModel(key) {
    setEditor(current => current && { ...current, draft: { ...current.draft, models: current.draft.models.filter(model => model.key !== key) } });
  }

  function addModel(id = '') {
    setEditor(current => {
      if (!current) return current;
      const models = current.draft.models;
      const next = id && models.length === 1 && !models[0].id.trim() ? [emptyModel(id)] : [...models, emptyModel(id)];
      return { ...current, draft: { ...current.draft, models: next } };
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!editor) return;
    const errors = validateDraft(editor.draft, { creating: editor.mode === 'create', existingNames: providers.map(provider => provider.name), tx });
    if (Object.keys(errors).length) { setEditor(current => current && { ...current, errors, formError: '' }); return; }
    setEditor(current => current && { ...current, errors: {}, formError: '' });
    const result = await attempt(() => apiClient.saveCustomProvider(buildPayload(editor.draft)));
    if (!result) return;
    if (result.failure) { setEditor(current => current && { ...current, formError: errorText(result.failure) }); return; }
    const saved = result.value.provider;
    setProviders(list => list.some(provider => provider.id === saved.id) ? list.map(provider => provider.id === saved.id ? saved : provider) : [...list, saved]);
    setEditor(null);
    setNotice(tx('saved', 'Saved {{name}}.', { name: saved.name }));
  }

  async function fetchModels() {
    const draft = editor.draft;
    const stored = Boolean(draft.id) && !draft.apiKey;
    if (!stored) {
      const urlError = validateBaseUrl(draft.baseUrl, tx);
      if (urlError || !draft.apiKey) {
        setEditor(current => current && { ...current, errors: { ...current.errors, ...(urlError ? { baseUrl: urlError } : {}), ...(draft.apiKey ? {} : { apiKey: tx('keyToFetch', 'Enter the API key to fetch models.') }) } });
        return;
      }
    }
    setEditor(current => current && { ...current, modelsNote: tx('fetching', 'Fetching models…'), fetched: [] });
    const result = await attempt(() => apiClient.testCustomProvider(stored ? {} : draftTestBody(draft), stored ? draft.id : undefined));
    if (!result) return;
    if (result.failure) {
      setEditor(current => current && { ...current, modelsNote: errorText(result.failure, tx('fetchFailed', 'Models could not be fetched.')), fetched: [] });
      return;
    }
    setEditor(current => current && { ...current, modelsNote: testResultText(result.value, tx, format.number), fetched: result.value.ok ? (result.value.models || []).map(model => model.id) : [] });
  }

  async function testStored(provider) {
    const result = await attempt(() => apiClient.testCustomProvider({}, provider.id));
    if (!result) return;
    setResults(current => ({ ...current, [provider.id]: result.failure ? errorText(result.failure, tx('testFailed', 'The connection test failed.')) : testResultText(result.value, tx, format.number) }));
  }

  async function remove(provider) {
    const result = await attempt(() => apiClient.deleteCustomProvider(provider.id));
    if (!result) return;
    setConfirming(null);
    if (result.failure) { setError(errorText(result.failure, tx('deleteFailed', 'The provider could not be deleted.'))); return; }
    setProviders(list => list.filter(item => item.id !== provider.id));
    setNotice(tx('deleted', 'Deleted {{name}}.', { name: provider.name }));
  }

  const headerStatus = phase === 'loading' ? tx('checking', 'Checking…')
    : phase === 'disabled' ? tx('notEnabled', 'Not enabled for this workspace')
    : phase === 'error' ? tx('unavailable', 'Unavailable')
    : tx('savedCount', '{{n}} saved', { n: format.number(providers.length) });
  const editing = editor?.mode === 'edit';
  const creating = editor?.mode === 'create';
  const draft = editor?.draft;
  const errors = editor?.errors || {};
  const ready = phase === 'ready';

  return <section aria-label={tx('title', 'Custom model providers')} className="mb-5 rounded-2xl border border-[#e3e0db] bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold"><Cpu size={18}/>{tx('title', 'Custom model providers')}</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#666]">{tx('subtitle', 'Connect an OpenAI-compatible or Anthropic-compatible endpoint with your own key. Models you add here appear in the Runtime and HyperAgent composer. Keys are stored on the server and never shown again.')}</p>
      </div>
      <div className="flex items-center gap-3">
        <span role="status" className="text-xs text-[#666]">{headerStatus}</span>
        {ready && !editor && <button type="button" className={button + ' inline-flex items-center gap-1.5'} disabled={busy} onClick={() => openEditor('create')}><Plus size={14}/>{tx('add', 'Add custom provider')}</button>}
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
    {phase === 'disabled' && <p className="mt-4 text-sm text-[#666]">{tx('disabledNote', 'Custom model providers are not enabled for this workspace yet.')}</p>}

    {ready && providers.length === 0 && !editor && <p className="mt-4 text-sm text-[#666]">{tx('none', 'No custom providers yet.')}</p>}
    {ready && providers.length > 0 && <ul className="mt-4 space-y-3" aria-label={tx('savedList', 'Saved custom providers')}>
      {providers.map(provider => <li key={provider.id} className="rounded-xl border border-[#e3e0db] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{provider.name}</p>
            <p className="mt-0.5 text-xs text-[#666]">{protocolLabel(provider.protocol)} · {hostOf(provider.baseUrl, tx)} · {plural('modelCount', '{{n}} model', '{{n}} models', provider.models?.length || 0)} · {provider.keyConfigured ? tx('keySaved', 'Key saved') : tx('noKeySaved', 'No key saved')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy} onClick={() => testStored(provider)} aria-label={tx('testAria', 'Test connection to {{name}}', { name: provider.name })}>{tx('test', 'Test connection')}</button>
            <button type="button" className={button} disabled={busy} onClick={() => openEditor('edit', provider)} aria-label={tx('editAria', 'Edit {{name}}', { name: provider.name })}>{tx('edit', 'Edit')}</button>
            <button type="button" className={button} disabled={busy} onClick={() => setConfirming(provider.id)} aria-label={tx('deleteAria', 'Delete {{name}}', { name: provider.name })}>{tx('delete', 'Delete')}</button>
          </div>
        </div>
        {results[provider.id] && <p role="status" className="mt-2 text-xs text-[#555]">{results[provider.id]}</p>}
        {confirming === provider.id && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#faf9f6] p-3 text-sm">
          <span>{tx('deleteConfirm', 'Delete {{name}}? Its models will stop appearing in the composer.', { name: provider.name })}</span>
          <button type="button" className={button + ' border-red-300 text-red-700'} disabled={busy} onClick={() => remove(provider)}>{tx('confirmDelete', 'Confirm delete')}</button>
          <button type="button" className={button} disabled={busy} onClick={() => setConfirming(null)}>{tx('cancel', 'Cancel')}</button>
        </div>}
      </li>)}
    </ul>}

    {editor && <form aria-label={creating ? tx('add', 'Add custom provider') : tx('editAria', 'Edit {{name}}', { name: draft.name || tx('customProvider', 'custom provider') })} noValidate onSubmit={save} className="mt-5 space-y-4 rounded-xl border border-[#e3e0db] bg-[#faf9f6] p-4">
      <h3 className="text-sm font-semibold">{creating ? tx('add', 'Add custom provider') : tx('editTitle', 'Edit custom provider')}</h3>
      <Field label={<label htmlFor={`${formId}-name`}>{tx('displayName', 'Display name')}</label>} error={errors.name}>
        <input id={`${formId}-name`} className={input} value={draft.name} onChange={e => setField('name', e.target.value)} autoComplete="off"/>
      </Field>
      <Field label={<label htmlFor={`${formId}-url`}>{tx('baseUrl', 'Base URL')}</label>} error={errors.baseUrl}>
        <input id={`${formId}-url`} type="url" className={input} value={draft.baseUrl} placeholder="https://api.example.com/v1" onChange={e => setField('baseUrl', e.target.value)} autoComplete="off"/>
      </Field>
      <Field label={<label htmlFor={`${formId}-protocol`}>{tx('protocol', 'Protocol')}</label>} error={errors.protocol}>
        <select id={`${formId}-protocol`} className={input} value={draft.protocol} onChange={e => setField('protocol', e.target.value)}>
          {PROTOCOLS.map(protocol => <option key={protocol.value} value={protocol.value}>{protocol.label}</option>)}
        </select>
      </Field>
      <Field label={<label htmlFor={`${formId}-key`}>{tx('apiKey', 'API key')}</label>} error={errors.apiKey}>
        <input id={`${formId}-key`} type="password" className={input} value={draft.apiKey} autoComplete="new-password" placeholder={editing && draft.keyConfigured ? tx('keepKey', 'Leave blank to keep the saved key') : ''} onChange={e => setField('apiKey', e.target.value)}/>
        <span className="mt-1 block text-xs text-[#777]">{tx('writeOnly', 'Write-only. It is sealed on the server and never shown again.')}</span>
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{tx('models', 'Models')}</legend>
        {errors.models && <span role="alert" className="block text-xs text-red-700">{errors.models}</span>}
        {draft.models.map((model, index) => <div key={model.key} className="rounded-lg border border-[#e3e0db] bg-white p-3">
          <div className="flex items-end gap-2">
            <label className="flex-1 text-sm">{tx('modelId', 'Model id')}<input className={input} aria-label={tx('modelIdAria', 'Model {{n}} id', { n: format.number(index + 1) })} value={model.id} onChange={e => patchModel(model.key, current => ({ ...current, id: e.target.value }))} autoComplete="off"/></label>
            <button type="button" className={button} onClick={() => removeModel(model.key)} aria-label={tx('removeAria', 'Remove model {{n}}', { n: format.number(index + 1) })}>{tx('remove', 'Remove')}</button>
          </div>
          <fieldset className="mt-3">
            <legend className="text-xs text-[#666]">{tx('reasoningLevels', 'Reasoning levels')}</legend>
            <div className="mt-1 flex flex-wrap gap-4 text-sm">
              {REASONING_OPTIONS.map(option => <label key={option.effort} className="flex items-center gap-1.5">
                <input type="checkbox" checked={model.levels[option.effort]} onChange={e => patchModel(model.key, current => ({ ...current, levels: { ...current.levels, [option.effort]: e.target.checked } }))}/>
                {reasoningLabels[option.effort] || option.label}
              </label>)}
            </div>
          </fieldset>
        </div>)}
        <button type="button" className={button} onClick={() => addModel()}>{tx('addModel', 'Add model')}</button>
      </fieldset>

      <div className="space-y-2">
        <button type="button" className={button} disabled={busy} onClick={fetchModels}>{tx('fetch', 'Fetch available models')}</button>
        <span className="block text-xs text-[#777]">{tx('fetchNote', 'Uses the typed key and base URL. When the key is blank on an existing provider, it uses the saved key and base URL. Nothing is saved.')}</span>
        {editor.modelsNote && <p role="status" className="text-xs text-[#555]">{editor.modelsNote}</p>}
        {editor.fetched.length > 0 && <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {editor.fetched.map(id => {
            const present = draft.models.some(model => model.id.trim() === id);
            return <button key={id} type="button" className={button + ' text-xs'} disabled={present} onClick={() => addModel(id)}>{present ? tx('modelAdded', '{{id}} added', { id }) : tx('addNamed', 'Add {{id}}', { id })}</button>;
          })}
        </div>}
      </div>

      {editor.formError && <p role="alert" className="text-sm text-red-700">{editor.formError}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={button + ' bg-[#151515] text-white hover:bg-[#333]'} disabled={busy}>{busy ? tx('saving', 'Saving…') : tx('save', 'Save provider')}</button>
        <button type="button" className={button} disabled={busy} onClick={() => setEditor(null)}>{tx('cancel', 'Cancel')}</button>
      </div>
    </form>}

    {!editor && <p className="mt-4 text-xs text-[#777]">{tx('scope', 'Custom providers are scoped to your account in {{workspace}}. Keys stay on the server.', { workspace: org?.name || tx('thisWorkspace', 'this workspace') })}</p>}
  </section>;
}
