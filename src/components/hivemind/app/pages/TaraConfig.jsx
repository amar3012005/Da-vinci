import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Mic,
  Settings2,
  Send,
  Save,
  Play,
  Clock,
  MessageSquare,
  Zap,
  Brain,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sliders,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import AaasVoiceWidget from '../../AaasVoiceWidget';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Config Editor ──────────────────────────────────────────────────────────

function ConfigEditor({ config, onSave, saving }) {
  const { t } = useTranslation('dashboard');
  const [systemPrompt, setSystemPrompt] = useState(config?.system_prompt || '');
  const [model, setModel] = useState(config?.model || 'openai/gpt-oss-120b');
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.max_tokens ?? 300);
  const [voiceOptimized, setVoiceOptimized] = useState(config?.voice_optimized !== false);
  const [clinicalPrompt, setClinicalPrompt] = useState(config?.clinical_prompt || '');
  const [clinicalModel, setClinicalModel] = useState(config?.clinical_model || '');

  useEffect(() => {
    if (config) {
      setSystemPrompt(config.system_prompt || '');
      setClinicalPrompt(config.clinical_prompt || '');
      setClinicalModel(config.clinical_model || '');
      setModel(config.model || 'llama-3.3-70b-versatile');
      setTemperature(config.temperature ?? 0.7);
      setMaxTokens(config.max_tokens ?? 300);
      setVoiceOptimized(config.voice_optimized !== false);
    }
  }, [config]);

  const handleSave = () => {
    onSave({ system_prompt: systemPrompt, clinical_prompt: clinicalPrompt, clinical_model: clinicalModel, model, temperature, max_tokens: maxTokens, voice_optimized: voiceOptimized });
  };

  const MODELS = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gpt-4o-mini',
  ];

  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#117dff]" />
          <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">{t('taraconfig.systemPromptHeading', 'System Prompt')}</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? t('taraconfig.btnSaving', 'Saving...') : t('taraconfig.btnSave', 'Save')}
        </button>
      </div>

      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={8}
        className="w-full p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['JetBrains_Mono','Fira_Code',monospace] focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/10 resize-y"
        placeholder={t('taraconfig.systemPromptPlaceholder', 'Enter the system prompt for your voice agent...')}
      />

      {/* Clinical Reasoning Prompt (optional) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider">
            {t('taraconfig.clinicalPromptLabel', 'Clinical Reasoning Prompt (optional — enables background analysis)')}
          </label>
          {clinicalPrompt && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">
              {t('taraconfig.clinicalPromptActive', 'Active')}
            </span>
          )}
        </div>
        <textarea
          value={clinicalPrompt}
          onChange={(e) => setClinicalPrompt(e.target.value)}
          rows={5}
          className="w-full p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['JetBrains_Mono','Fira_Code',monospace] focus:outline-none focus:border-purple-400/40 focus:ring-2 focus:ring-purple-400/10 resize-y"
          placeholder={t('taraconfig.clinicalPromptPlaceholder', 'Leave empty to disable clinical reasoning. When set, a background reasoning model analyzes each turn and provides strategic insights to the main agent...')}
        />
        {clinicalPrompt && (
          <div className="mt-3">
            <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">{t('taraconfig.reasoningModelLabel', 'Reasoning Model')}</label>
            <select
              value={clinicalModel}
              onChange={(e) => setClinicalModel(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 rounded-lg border border-purple-200 bg-purple-50/30 text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-purple-400/40"
            >
              <option value="">{t('taraconfig.reasoningModelSameAsMain', 'Same as main model')}</option>
              <optgroup label={t('taraconfig.reasoningGroupRecommended', 'Reasoning (recommended for clinical)')}>
                <option value="openai/gpt-oss-120b">{t('taraconfig.modelGptOss120b', 'GPT-OSS 120B (reasoning)')}</option>
                <option value="openai/gpt-oss-20b">{t('taraconfig.modelGptOss20b', 'GPT-OSS 20B (fast reasoning)')}</option>
              </optgroup>
              <optgroup label={t('taraconfig.reasoningGroupGroq', 'Groq Models')}>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                <option value="qwen/qwen3-32b">Qwen3-32B</option>
                <option value="llama-3.1-8b-instant">{t('taraconfig.modelLlamaInstant', 'llama-3.1-8b-instant (fastest)')}</option>
                <option value="meta-llama/llama-4-scout-17b-16e-instruct">{t('taraconfig.modelLlama4Scout', 'Llama-4 Scout 17B')}</option>
              </optgroup>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">{t('taraconfig.labelModel', 'Model')}</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-[#117dff]/40"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">{t('taraconfig.labelTemperature', 'Temperature')}</label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
            min={0} max={2} step={0.1}
            className="w-full px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-[#117dff]/40"
          />
        </div>
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">{t('taraconfig.labelMaxTokens', 'Max Tokens')}</label>
          <input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 300)}
            min={50} max={2000} step={50}
            className="w-full px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-[#117dff]/40"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceOptimized}
              onChange={(e) => setVoiceOptimized(e.target.checked)}
              className="rounded border-[#e3e0db]"
            />
            <span className="text-[#525252] text-xs font-['Space_Grotesk']">{t('taraconfig.labelVoiceOptimized', 'Voice optimized')}</span>
          </label>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Live Test ──────────────────────────────────────────────────────────────

function LiveTest() {
  const { t } = useTranslation('dashboard');
  const [query, setQuery] = useState('');
  const [sessionId] = useState(() => `test_${Date.now()}`);
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [statusSteps, setStatusSteps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const responseRef = useRef(null);

  const handleTest = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse('');
    setMetrics(null);
    setStatusSteps([]);
    setAnalytics(null);

    try {
      const resp = await fetch(
        `${apiClient.controlPlane.defaults.baseURL}/v1/proxy/tara/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',  // Send session cookie
          body: JSON.stringify({
            query: query.trim(),
            session_id: sessionId,
            surface: 'web_test',
          }),
        }
      );

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'text') {
              fullText += event.content;
              setResponse(fullText);
            } else if (event.type === 'status') {
              setStatusSteps(prev => [...prev, event]);
            } else if (event.type === 'done') {
              setMetrics(event);
            } else if (event.type === 'error') {
              setResponse(prev => prev + `\n[Error: ${event.message}]`);
            }
          } catch {}
        }
      }
    } catch (err) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setStreaming(false);
    }
  };

  const handleEndSession = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalytics(null);

    try {
      const resp = await fetch(
        `${apiClient.controlPlane.defaults.baseURL}/v1/proxy/tara/end_session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId }),
        }
      );
      const data = await resp.json();
      setAnalytics(data.report);
    } catch (err) {
      setAnalytics({ error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-5">
        <Play size={16} className="text-[#117dff]" />
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">{t('taraconfig.liveTestHeading', 'Live Test')}</h3>
        <span className="text-[#a3a3a3] text-xs font-mono ml-auto">{t('taraconfig.liveTestSession', 'Session: {{id}}...', { id: sessionId.slice(0, 15) })}</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          placeholder={t('taraconfig.liveTestPlaceholder', 'Type a message to test stream_tara...')}
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['Space_Grotesk'] focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/10"
        />
        <button
          onClick={handleTest}
          disabled={streaming || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#117dff] text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-[#0066e0] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {streaming ? t('taraconfig.btnStreaming', 'Streaming...') : t('taraconfig.btnSend', 'Send')}
        </button>
      </div>

      {/* Status steps */}
      {statusSteps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {statusSteps.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20">
              <Zap size={8} />
              {s.step} {s.ms != null ? `${s.ms}ms` : ''} {s.recall_count != null ? `(${s.recall_count} memories)` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Response */}
      {(response || streaming) && (
        <div ref={responseRef} className="p-4 rounded-xl bg-[#faf9f4] border border-[#eae7e1] min-h-[60px]">
          <p className="text-[#0a0a0a] text-sm font-['Space_Grotesk'] whitespace-pre-wrap">
            {response || (streaming ? '...' : '')}
            {streaming && <span className="inline-block w-1.5 h-4 bg-[#117dff] ml-0.5 animate-pulse" />}
          </p>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-[#e3e0db]">
          {[
            { label: t('taraconfig.metricTtfb', 'TTFB'), value: `${metrics.ttfb_ms}ms`, icon: Zap },
            { label: t('taraconfig.metricTotal', 'Total'), value: `${metrics.latency_ms}ms`, icon: Clock },
            { label: t('taraconfig.metricMemories', 'Memories'), value: metrics.recall_count, icon: Brain },
            { label: t('taraconfig.metricTurns', 'Turns'), value: metrics.session_turns, icon: MessageSquare },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon size={12} className="text-[#a3a3a3]" />
              <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{label}</span>
              <span className="text-[#0a0a0a] text-xs font-mono font-semibold">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* End Session Button */}
      {metrics && !analytics && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleEndSession}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
            {analyzing ? t('taraconfig.btnRunningAnalytics', 'Running Analytics...') : t('taraconfig.btnEndSession', 'End Session & Run Analytics')}
          </button>
        </div>
      )}

      {/* Analytics Report */}
      {analytics && (
        <div className="mt-5 p-4 rounded-xl bg-[#faf9f4] border border-[#e3e0db]">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-purple-600" />
            <h4 className="text-[#0a0a0a] text-sm font-bold font-['Space_Grotesk']">{t('taraconfig.analyticsReportHeading', 'Session Analytics Report')}</h4>
          </div>

          {analytics.error ? (
            <p className="text-red-600 text-sm">{analytics.error}</p>
          ) : (
            <div className="space-y-3">
              {/* Brief Context */}
              <div>
                <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.analyticsContext', 'Context')}</span>
                <p className="text-[#0a0a0a] text-sm mt-1">{analytics.brief_context}</p>
              </div>

              {/* Analysis */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded-lg bg-white border border-[#e3e0db]">
                  <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.analyticsSentiment', 'Sentiment')}</span>
                  <p className={`text-lg font-bold mt-1 ${
                    analytics.analysis?.overall_sentiment > 0.3 ? 'text-green-600' :
                    analytics.analysis?.overall_sentiment < -0.3 ? 'text-red-600' : 'text-[#a3a3a3]'
                  }`}>
                    {analytics.analysis?.overall_sentiment?.toFixed(2) ?? 'N/A'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#e3e0db]">
                  <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.analyticsResolution', 'Resolution')}</span>
                  <p className="text-lg font-bold mt-1 capitalize">{analytics.analysis?.resolution_status ?? 'N/A'}</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#e3e0db]">
                  <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.analyticsAgentIq', 'Agent IQ')}</span>
                  <p className="text-lg font-bold mt-1">{analytics.metrics?.agent_iq ?? 'N/A'}</p>
                </div>
              </div>

              {/* Business Signals */}
              <div className="flex flex-wrap gap-2">
                {analytics.business_signals?.is_hot_lead && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-green-100 text-green-700 border border-green-200">
                    {t('taraconfig.signalHotLead', 'Hot Lead')}
                  </span>
                )}
                {analytics.business_signals?.is_churn_risk && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-mono bg-red-100 text-red-700 border border-red-200">
                    {t('taraconfig.signalChurnRisk', 'Churn Risk')}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-[10px] font-mono border ${
                  analytics.business_signals?.priority_level === 'HIGH' ? 'bg-red-100 text-red-700 border-red-200' :
                  analytics.business_signals?.priority_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {t('taraconfig.signalPriority', 'Priority: {{level}}', { level: analytics.business_signals?.priority_level ?? 'N/A' })}
                </span>
              </div>

              {/* Memory Stats */}
              {analytics.hivemind_updates && (
                <div className="pt-2 border-t border-[#e3e0db]">
                  <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.hivemindUpdates', 'HIVEMIND Updates')}</span>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs font-mono">{t('taraconfig.updatesSaved', 'Saved:')} <strong>{analytics.hivemind_updates.chunks_saved || 0}</strong></span>
                    <span className="text-xs font-mono">{t('taraconfig.updatesCandidates', 'Candidates:')} <strong>{analytics.hivemind_updates.chunks_candidates || 0}</strong></span>
                    <span className="text-xs font-mono">{t('taraconfig.updatesSkipped', 'Skipped:')} <strong>{analytics.hivemind_updates.chunks_skipped || 0}</strong></span>
                  </div>
                </div>
              )}

              {/* Pain Points */}
              {analytics.analysis?.customer_pain_points?.length > 0 && (
                <div className="pt-2 border-t border-[#e3e0db]">
                  <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{t('taraconfig.analyticsPainPoints', 'Pain Points')}</span>
                  <ul className="list-disc list-inside text-sm mt-1 text-[#525252]">
                    {analytics.analysis.customer_pain_points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Active Sessions ────────────────────────────────────────────────────────

function ActiveSessions() {
  const { t } = useTranslation('dashboard');
  const { data: sessions, loading } = useApiQuery(
    () => apiClient.controlPlane.get('/v1/proxy/tara/sessions').then(r => r.data?.sessions || []).catch(() => []),
    []
  );

  if (loading) return null;
  if (!sessions?.length) return null;

  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-[#525252]" />
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">{t('taraconfig.activeSessionsHeading', 'Active Sessions')}</h3>
        <span className="text-[#a3a3a3] text-xs font-mono ml-auto">{t('taraconfig.activeSessionsCount', '{{count}} sessions', { count: sessions.length })}</span>
      </div>
      <div className="space-y-2">
        {sessions.slice(0, 10).map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#faf9f4] border border-[#eae7e1]">
            <div className="flex items-center gap-3">
              <span className="text-[#0a0a0a] text-xs font-mono">{s.session_id?.slice(0, 20)}...</span>
              {s.current_goal && (
                <span className="text-[#525252] text-xs font-['Space_Grotesk']">{s.current_goal}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#a3a3a3] text-[10px] font-mono">{t('taraconfig.sessionTurns', '{{count}} turns', { count: s.turn_count })}</span>
              {s.language && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#117dff]/10 text-[#117dff] border border-[#117dff]/20">
                  {s.language}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TaraConfig() {
  const { t } = useTranslation('dashboard');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const { data: config, loading, refetch } = useApiQuery(
    () => apiClient.controlPlane.get('/v1/proxy/tara/config').then(r => r.data?.config || r.data).catch(() => null),
    []
  );

  // Identity for the self-hosted AaaS voice widget (tenant = user_id).
  const [identity, setIdentity] = useState({ userId: null, orgId: null });
  const [showPrompt, setShowPrompt] = useState(false);
  useEffect(() => {
    apiClient.bootstrap()
      .then((d) => setIdentity({ userId: d?.user?.id || null, orgId: d?.organization?.id || null }))
      .catch(() => {});
  }, []);

  const handleSave = async (newConfig) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      await apiClient.controlPlane.post('/v1/proxy/tara/config', newConfig);
      setSaveStatus('saved');
      refetch();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#117dff] to-[#6366f1] flex items-center justify-center shadow-lg">
            <Mic size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk']">TARA × HIVEMIND</h1>
            <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">{t('taraconfig.subtitle', 'Voice agent conversational runtime')}</p>
          </div>
        </div>
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-['Space_Grotesk'] font-semibold">
            <CheckCircle size={14} /> {t('taraconfig.saveStatusSaved', 'Saved')}
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-red-500 text-xs font-['Space_Grotesk'] font-semibold">
            <AlertTriangle size={14} /> {t('taraconfig.saveStatusError', 'Save failed')}
          </span>
        )}
      </motion.div>

      {/* Talk to TARA — self-hosted AaaS (STT→tara_stream→TTS, one service).
          The ONE Start. Voice/lang config + current-turn chat live inside. */}
      <motion.div variants={fadeUp}>
        <AaasVoiceWidget userId={identity.userId} orgId={identity.orgId} language="en" />
      </motion.div>

      {/* System Prompt — collapsible */}
      <motion.div variants={fadeUp}>
        <button
          onClick={() => setShowPrompt((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#e3e0db] rounded-xl hover:border-[#d4d0ca] transition-colors"
        >
          <span className="flex items-center gap-2 text-[13px] font-['Space_Grotesk'] font-semibold text-[#0a0a0a]">
            <Sliders size={15} className="text-[#117dff]" /> {t('taraconfig.systemPrompt', 'System Prompt')}
          </span>
          {showPrompt ? <ChevronDown size={16} className="text-[#a3a3a3]" /> : <ChevronRight size={16} className="text-[#a3a3a3]" />}
        </button>
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="text-[#117dff] animate-spin" />
                </div>
              ) : (
                <ConfigEditor config={config} onSave={handleSave} saving={saving} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
