import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2,
  Sliders,
  Plus,
  X,
  Trash2,
  Lock,
  Check,
  Shield,
  Briefcase,
  Headphones,
  Calendar,
  FolderOpen,
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';
import AaasVoiceWidget from '../../AaasVoiceWidget';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Config Editor ──────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars -- replaced by SkillsManager; kept for reference
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
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
              {t('taraconfig.clinicalPromptActive', 'Active')}
            </span>
          )}
        </div>
        <textarea
          value={clinicalPrompt}
          onChange={(e) => setClinicalPrompt(e.target.value)}
          rows={5}
          className="w-full p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['JetBrains_Mono','Fira_Code',monospace] focus:outline-none focus:border-blue-400/40 focus:ring-2 focus:ring-blue-400/10 resize-y"
          placeholder={t('taraconfig.clinicalPromptPlaceholder', 'Leave empty to disable clinical reasoning. When set, a background reasoning model analyzes each turn and provides strategic insights to the main agent...')}
        />
        {clinicalPrompt && (
          <div className="mt-3">
            <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">{t('taraconfig.reasoningModelLabel', 'Reasoning Model')}</label>
            <select
              value={clinicalModel}
              onChange={(e) => setClinicalModel(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/30 text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-blue-400/40"
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

// eslint-disable-next-line no-unused-vars -- WIP component, kept for upcoming wiring
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
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
            <Brain size={16} className="text-blue-600" />
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

// eslint-disable-next-line no-unused-vars -- WIP component, kept for upcoming wiring
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

// ─── Skills Manager ───────────────────────────────────────────────────────
// Two sections (External / Internal). Each is a horizontal stack of selectable
// skill cards. Click a card → popup with its prompt(s) (external = primary +
// secondary; internal = single). "+" creates a skill. Checkbox selects one per
// section; "Save selection" finalises (copies the skill's prompts into config).

// Pick a lucide icon per skill (by kind + name heuristic).
function skillIcon(skill) {
  if (skill.kind === 'internal') return Brain;
  const n = (skill.name || '').toLowerCase();
  if (n.includes('sales')) return Briefcase;
  if (n.includes('support') || n.includes('customer')) return Headphones;
  if (n.includes('book') || n.includes('schedul')) return Calendar;
  return FolderOpen;
}

// Compact "file folder" card — wide + short, with a folder tab on top.
function SkillCard({ skill, selected, onOpen, onToggle }) {
  const isInternal = skill.kind === 'internal';
  const chars = (skill.primary_prompt || '').length + (skill.secondary_prompt || '').length;
  const accent = isInternal ? '#117dff' : '#117dff';
  const tabBg = isInternal ? '#f3ecff' : '#eef5ff';
  const Icon = skillIcon(skill);
  return (
    <div onClick={onOpen} className="relative shrink-0 w-[330px] cursor-pointer">
      {/* Folder tab */}
      <div
        className="absolute -top-[6px] left-5 h-[7px] w-16 rounded-t-[6px] border-x border-t border-[#e3e0db]"
        style={{ background: tabBg }}
      />
      {/* Folder body — single compact row */}
      <div className={`relative flex items-center gap-3 rounded-xl rounded-tl-[6px] border border-[#e3e0db] px-3.5 py-3 transition-all hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] ${
        selected ? 'bg-[#fbfcff]' : 'bg-white'}`}>
        {/* Glassmorphism icon tile */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md ring-1 ring-white/70 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.6)]"
          style={{ background: isInternal
            ? 'linear-gradient(135deg, rgba(243,236,255,0.9), rgba(221,214,254,0.55))'
            : 'linear-gradient(135deg, rgba(238,245,255,0.9), rgba(219,234,254,0.55))' }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[#0a0a0a] text-[14px] font-bold font-['Space_Grotesk'] leading-tight truncate">{skill.name}</p>
            {skill.builtin && <Lock size={10} className="text-[#a3a3a3] shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: accent }}>
              <Shield size={10} /> {isInternal ? 'Internal' : 'External'}
            </span>
            <span className="text-[#d4d0ca]">·</span>
            <span className="text-[#a3a3a3] tabular-nums">{chars.toLocaleString()} chars</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
            selected ? 'bg-[#117dff] border-[#117dff]' : 'border-[#d4d0ca] hover:border-[#117dff]'}`}
          aria-label="select skill"
        >
          {selected && <Check size={13} className="text-white" />}
        </button>
      </div>
    </div>
  );
}

function SkillSection({ title, hint, kind, skills, selectedId, onSelect, onOpen, onAdd }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h4 className="text-[#0a0a0a] text-[13px] font-bold font-['Space_Grotesk'] uppercase tracking-wide">{title}</h4>
        <span className="text-[11px] text-[#a3a3a3]">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-3 pt-2 pb-1">
        {skills.map((s) => (
          <SkillCard key={s.id} skill={s} selected={selectedId === s.id}
            onOpen={() => onOpen(s)} onToggle={() => onSelect(s.id)} />
        ))}
        <button onClick={() => onAdd(kind)}
          className="shrink-0 w-[330px] rounded-xl border border-dashed border-[#d4d0ca] flex items-center justify-center gap-1.5 text-[#a3a3a3] hover:border-[#117dff] hover:text-[#117dff] hover:bg-[#fafbff] transition-colors self-stretch min-h-[66px]">
          <Plus size={16} /><span className="text-[12px] font-medium">New skill</span>
        </button>
      </div>
    </div>
  );
}

function SkillModal({ skill, kind, onClose, onCreated, onUpdated, onDeleted }) {
  const isCreate = !skill;
  const isInternal = (skill?.kind || kind) === 'internal';
  const readOnly = !!skill?.builtin;
  const [name, setName] = useState(skill?.name || '');
  const [primary, setPrimary] = useState(skill?.primary_prompt || '');
  const [secondary, setSecondary] = useState(skill?.secondary_prompt || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (isCreate) {
        await apiClient.createTaraSkill({ kind, name, primary_prompt: primary, secondary_prompt: isInternal ? null : secondary });
        onCreated();
      } else {
        await apiClient.updateTaraSkill(skill.id, { name, primary_prompt: primary, secondary_prompt: isInternal ? null : secondary });
        onUpdated();
      }
    } catch (e) { setErr(e?.response?.data?.message || e.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (!window.confirm(`Delete skill "${skill.name}"?`)) return;
    setBusy(true);
    try { await apiClient.deleteTaraSkill(skill.id); onDeleted(); }
    catch (e) { setErr(e?.response?.data?.message || e.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-[#e3e0db] shadow-xl w-full max-w-[640px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f1ec] sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252]">{isInternal ? 'Internal' : 'External'}</span>
            <h3 className="text-[#0a0a0a] text-[15px] font-bold font-['Space_Grotesk']">{isCreate ? 'New skill' : skill.name}{readOnly && <Lock size={12} className="inline ml-1.5 text-[#a3a3a3]" />}</h3>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#0a0a0a]"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly}
              placeholder="e.g. Sales Agent"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[14px] focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] flex justify-between"><span>{isInternal ? 'Prompt (voice of HIVEMIND)' : 'Primary prompt (persona)'}</span><span className="tabular-nums">{primary.length.toLocaleString()} chars</span></label>
            <textarea value={primary} onChange={(e) => setPrimary(e.target.value)} disabled={readOnly} rows={8}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[13px] font-mono leading-relaxed focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
          </div>
          {!isInternal && (
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#a3a3a3] flex justify-between"><span>Secondary prompt (clinical / reasoning)</span><span className="tabular-nums">{secondary.length.toLocaleString()} chars</span></label>
              <textarea value={secondary} onChange={(e) => setSecondary(e.target.value)} disabled={readOnly} rows={6}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#e3e0db] text-[13px] font-mono leading-relaxed focus:border-[#117dff] outline-none disabled:bg-[#faf9f4] disabled:text-[#737373]" />
            </div>
          )}
          {err && <p className="text-red-500 text-[12px]">{err}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#f3f1ec] sticky bottom-0 bg-white">
          {!isCreate && !readOnly
            ? <button onClick={del} disabled={busy} className="flex items-center gap-1.5 text-red-500 text-[13px] hover:text-red-600"><Trash2 size={14} /> Delete</button>
            : <span />}
          {!readOnly && (
            <button onClick={submit} disabled={busy || !name || !primary}
              className="flex items-center gap-1.5 bg-[#117dff] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0e6ae0] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isCreate ? 'Create' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillsManager() {
  const [data, setData] = useState({ skills: [], selected: { external_skill_id: null, internal_skill_id: null } });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { skill } | { create: kind }
  const [pending, setPending] = useState({ external: null, internal: null });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = () => {
    setLoading(true);
    return apiClient.listTaraSkills()
      .then((d) => {
        const sel = d?.selected || {};
        setData({ skills: d?.skills || [], selected: sel });
        setPending({ external: sel.external_skill_id || null, internal: sel.internal_skill_id || null });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const external = data.skills.filter((s) => s.kind === 'external');
  const internal = data.skills.filter((s) => s.kind === 'internal');
  const dirty = pending.external !== data.selected.external_skill_id || pending.internal !== data.selected.internal_skill_id;

  const saveSelection = async () => {
    setSaving(true);
    try {
      if (pending.external && pending.external !== data.selected.external_skill_id) await apiClient.selectTaraSkill(pending.external);
      if (pending.internal && pending.internal !== data.selected.internal_skill_id) await apiClient.selectTaraSkill(pending.internal);
      await load();
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2500);
    } catch { /* surfaced by reload */ }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 size={20} className="text-[#117dff] animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Top bar — title + Save selection (top-right) */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[#0a0a0a] text-[15px] font-bold font-['Space_Grotesk']">Skills</h3>
          <p className="text-[#a3a3a3] text-[12px]">Pick the active persona per side, then save to finalise.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedFlash && <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold"><CheckCircle size={14} /> Saved</span>}
          {dirty && !savedFlash && <span className="text-[11px] text-[#a3a3a3]">Unsaved selection</span>}
          <button onClick={saveSelection} disabled={!dirty || saving}
            className="flex items-center gap-1.5 bg-[#117dff] text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-[#0e6ae0] disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save selection
          </button>
        </div>
      </div>

      <SkillSection title="External" hint="Customer-facing personas (primary + secondary prompt)"
        kind="external" skills={external} selectedId={pending.external}
        onSelect={(id) => setPending((p) => ({ ...p, external: p.external === id ? null : id }))}
        onOpen={(s) => setModal({ skill: s })} onAdd={(kind) => setModal({ create: kind })} />

      <SkillSection title="Internal" hint="Voice of HIVEMIND — full-recall, internal use"
        kind="internal" skills={internal} selectedId={pending.internal}
        onSelect={(id) => setPending((p) => ({ ...p, internal: p.internal === id ? null : id }))}
        onOpen={(s) => setModal({ skill: s })} onAdd={(kind) => setModal({ create: kind })} />

      {modal && (
        <SkillModal
          skill={modal.skill || null}
          kind={modal.create || modal.skill?.kind}
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); load(); }}
          onUpdated={() => { setModal(null); load(); }}
          onDeleted={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

export default function TaraConfig() {
  const { t } = useTranslation('dashboard');

  // Identity for the self-hosted AaaS voice widget (tenant = user_id).
  const [identity, setIdentity] = useState({ userId: null, orgId: null });
  const [activeTab, setActiveTab] = useState('skills');
  const [calls, setCalls] = useState([]);
  const [callDetail, setCallDetail] = useState(null); // { call, turns, insight }

  const refreshCalls = () => apiClient.listTaraCalls(30).then(setCalls).catch(() => {});
  useEffect(() => { refreshCalls(); }, []);

  const openCall = (id) => apiClient.getTaraCall(id).then(setCallDetail).catch(() => {});

  // Aggregates for stat cards + usage tab
  const now = Date.now();
  const weekCount = calls.filter((c) => now - new Date(c.startedAt).getTime() < 7 * 864e5).length;
  const totalTurns = calls.reduce((a, c) => a + (c.turnCount || 0), 0);
  const totalTokens = calls.reduce((a, c) => a + (c.promptTokens || 0) + (c.completionTokens || 0), 0);
  const lastCall = calls[0] ? new Date(calls[0].startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  useEffect(() => {
    apiClient.bootstrap()
      .then((d) => setIdentity({ userId: d?.user?.id || null, orgId: d?.organization?.id || null }))
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      className="max-w-[1200px] mx-auto space-y-6"
    >
      {/* Header — eyebrow + big title + subtitle (Workspace-Admin style) */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[#a3a3a3] mb-1">
            <Mic size={12} className="text-[#117dff]" /> HIVEMIND
          </div>
          <h1 className="text-[#0a0a0a] text-3xl font-bold font-['Space_Grotesk'] leading-tight">TARA × HIVEMIND</h1>
          <p className="text-[#737373] text-[14px] mt-1">{t('taraconfig.subtitle', 'Voice agent conversational runtime — real-time STT, recall-grounded answers, TTS.')}</p>
        </div>
      </motion.div>

      {/* Talk to TARA — self-hosted AaaS (STT→tara_stream→TTS, one service).
          The ONE Start. Voice/lang config + current-turn chat live inside. */}
      <motion.div variants={fadeUp}>
        <AaasVoiceWidget userId={identity.userId} orgId={identity.orgId} language="en" />
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Play, label: 'Total Calls', value: String(calls.length), color: '#117dff' },
          { icon: Clock, label: 'This Week', value: String(weekCount), color: '#117dff' },
          { icon: MessageSquare, label: 'Turns', value: String(totalTurns), color: '#16a34a' },
          { icon: Zap, label: 'Tokens', value: totalTokens.toLocaleString(), color: '#117dff' },
          { icon: Clock, label: 'Last Call', value: lastCall, color: '#a3a3a3' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e3e0db] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <s.icon size={15} style={{ color: s.color }} />
            <p className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tabular-nums mt-2">{s.value}</p>
            <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-1 border-b border-[#e3e0db] mb-4">
          {[
            { id: 'skills', label: 'Skills', icon: Sliders },
            { id: 'history', label: 'Call History', icon: Clock },
            { id: 'insights', label: 'Insights', icon: Brain },
            { id: 'usage', label: 'Usage', icon: Zap },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id ? 'border-[#117dff] text-[#0a0a0a]' : 'border-transparent text-[#a3a3a3] hover:text-[#525252]'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'skills' && <SkillsManager />}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex justify-end"><button onClick={refreshCalls} className="text-[11px] text-[#117dff] hover:underline">Refresh</button></div>
            {calls.length === 0 ? (
              <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center text-[13px] text-[#a3a3a3]">
                <Clock size={20} className="mx-auto mb-2 text-[#d4d0ca]" /> No calls yet.
              </div>
            ) : calls.map((c) => (
              <div key={c.id} className="bg-white border border-[#e3e0db] rounded-xl">
                <button onClick={() => (callDetail?.call?.id === c.id ? setCallDetail(null) : openCall(c.id))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#faf9f4] transition-colors text-left">
                  <div>
                    <span className="text-[13px] font-['Space_Grotesk'] font-semibold text-[#0a0a0a]">{new Date(c.startedAt).toLocaleString()}</span>
                    <span className="text-[11px] text-[#a3a3a3] ml-2">· {c.mode} · {c.turnCount} turns · {Math.round((c.durationMs||0)/1000)}s</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.status==='completed'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{c.status}</span>
                </button>
                {callDetail?.call?.id === c.id && (
                  <div className="border-t border-[#f3f1ec] px-4 py-3 space-y-2 max-h-[320px] overflow-y-auto">
                    {callDetail.insight?.summary && <p className="text-[12px] text-[#525252] italic mb-2">{callDetail.insight.summary}</p>}
                    {(callDetail.turns||[]).map((tn) => (
                      <div key={tn.id} className="text-[12px]">
                        {tn.userText && <div><span className="text-[#a3a3a3] font-mono text-[10px] uppercase">You </span>{tn.userText}</div>}
                        {tn.agentText && <div><span className="text-[#117dff] font-mono text-[10px] uppercase">TARA </span>{tn.agentText}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeTab === 'insights' && (
          calls.find((c) => c.id) && callDetail?.insight ? (
            <div className="bg-white border border-[#e3e0db] rounded-xl p-5 space-y-3">
              <p className="text-[13px] text-[#0a0a0a]">{callDetail.insight.summary}</p>
              {(callDetail.insight.data?.action_items||[]).length>0 && (
                <div><p className="text-[10px] font-mono uppercase text-[#a3a3a3] mb-1">Action Items</p>
                  <ul className="list-disc pl-5 text-[12px] text-[#525252]">{callDetail.insight.data.action_items.map((a,i)=><li key={i}>{a.task}{a.owner?` · @${a.owner}`:''}</li>)}</ul></div>
              )}
              {(callDetail.insight.data?.topics||[]).length>0 && (
                <div className="flex flex-wrap gap-1.5">{callDetail.insight.data.topics.map((tp,i)=><span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#f3f1ec] text-[#525252]">{tp}</span>)}</div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#e3e0db] rounded-xl p-8 text-center text-[13px] text-[#a3a3a3]">
              <Brain size={20} className="mx-auto mb-2 text-[#d4d0ca]" /> Open a call in Call History to see its insights.
            </div>
          )
        )}
        {activeTab === 'usage' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Calls', value: String(calls.length) },
              { label: 'Total Turns', value: String(totalTurns) },
              { label: 'Total Tokens', value: totalTokens.toLocaleString() },
              { label: 'Avg Turns/Call', value: calls.length ? (totalTurns/calls.length).toFixed(1) : '0' },
            ].map((u) => (
              <div key={u.label} className="bg-white border border-[#e3e0db] rounded-xl p-4">
                <p className="text-[#0a0a0a] text-xl font-bold font-['Space_Grotesk'] tabular-nums">{u.value}</p>
                <p className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mt-0.5">{u.label}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
