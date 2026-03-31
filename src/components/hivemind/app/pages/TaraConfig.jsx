import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery } from '../shared/hooks';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Config Editor ──────────────────────────────────────────────────────────

function ConfigEditor({ config, onSave, saving }) {
  const [systemPrompt, setSystemPrompt] = useState(config?.system_prompt || '');
  const [model, setModel] = useState(config?.model || 'llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.max_tokens ?? 300);
  const [voiceOptimized, setVoiceOptimized] = useState(config?.voice_optimized !== false);

  useEffect(() => {
    if (config) {
      setSystemPrompt(config.system_prompt || '');
      setModel(config.model || 'llama-3.3-70b-versatile');
      setTemperature(config.temperature ?? 0.7);
      setMaxTokens(config.max_tokens ?? 300);
      setVoiceOptimized(config.voice_optimized !== false);
    }
  }, [config]);

  const handleSave = () => {
    onSave({ system_prompt: systemPrompt, model, temperature, max_tokens: maxTokens, voice_optimized: voiceOptimized });
  };

  const MODELS = [
    'llama-3.3-70b-versatile',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gpt-4o-mini',
    'gpt-5.2',
  ];

  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#117dff]" />
          <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">System Prompt</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-['Space_Grotesk'] font-semibold bg-[#117dff] text-white hover:bg-[#0066e0] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={8}
        className="w-full p-4 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['JetBrains_Mono','Fira_Code',monospace] focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/10 resize-y"
        placeholder="Enter the system prompt for your voice agent..."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-[#117dff]/40"
          >
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">Temperature</label>
          <input
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
            min={0} max={2} step={0.1}
            className="w-full px-3 py-2 rounded-lg border border-[#e3e0db] bg-white text-[#0a0a0a] text-xs font-mono focus:outline-none focus:border-[#117dff]/40"
          />
        </div>
        <div>
          <label className="text-[#a3a3a3] text-[10px] font-mono uppercase tracking-wider mb-1 block">Max Tokens</label>
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
            <span className="text-[#525252] text-xs font-['Space_Grotesk']">Voice optimized</span>
          </label>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Live Test ──────────────────────────────────────────────────────────────

function LiveTest() {
  const [query, setQuery] = useState('');
  const [sessionId] = useState(() => `test_${Date.now()}`);
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [statusSteps, setStatusSteps] = useState([]);
  const responseRef = useRef(null);

  const handleTest = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse('');
    setMetrics(null);
    setStatusSteps([]);

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

  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#e3e0db] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-5">
        <Play size={16} className="text-[#117dff]" />
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">Live Test</h3>
        <span className="text-[#a3a3a3] text-xs font-mono ml-auto">Session: {sessionId.slice(0, 15)}...</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          placeholder="Type a message to test stream_tara..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#e3e0db] bg-[#faf9f4] text-[#0a0a0a] text-sm font-['Space_Grotesk'] focus:outline-none focus:border-[#117dff]/40 focus:ring-2 focus:ring-[#117dff]/10"
        />
        <button
          onClick={handleTest}
          disabled={streaming || !query.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#117dff] text-white text-sm font-['Space_Grotesk'] font-semibold hover:bg-[#0066e0] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {streaming ? 'Streaming...' : 'Send'}
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
            { label: 'TTFB', value: `${metrics.ttfb_ms}ms`, icon: Zap },
            { label: 'Total', value: `${metrics.latency_ms}ms`, icon: Clock },
            { label: 'Memories', value: metrics.recall_count, icon: Brain },
            { label: 'Turns', value: metrics.session_turns, icon: MessageSquare },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon size={12} className="text-[#a3a3a3]" />
              <span className="text-[#a3a3a3] text-[10px] font-mono uppercase">{label}</span>
              <span className="text-[#0a0a0a] text-xs font-mono font-semibold">{value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Active Sessions ────────────────────────────────────────────────────────

function ActiveSessions() {
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
        <h3 className="text-[#0a0a0a] text-lg font-bold font-['Space_Grotesk']">Active Sessions</h3>
        <span className="text-[#a3a3a3] text-xs font-mono ml-auto">{sessions.length} sessions</span>
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
              <span className="text-[#a3a3a3] text-[10px] font-mono">{s.turn_count} turns</span>
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
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const { data: config, loading, refetch } = useApiQuery(
    () => apiClient.controlPlane.get('/v1/proxy/tara/config').then(r => r.data?.config || r.data).catch(() => null),
    []
  );

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
      console.error('Save failed:', err);
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
            <p className="text-[#a3a3a3] text-xs font-['Space_Grotesk']">Voice agent conversational runtime</p>
          </div>
        </div>
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-['Space_Grotesk'] font-semibold">
            <CheckCircle size={14} /> Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-red-500 text-xs font-['Space_Grotesk'] font-semibold">
            <AlertTriangle size={14} /> Save failed
          </span>
        )}
      </motion.div>

      {/* Config Editor */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-[#117dff] animate-spin" />
        </div>
      ) : (
        <ConfigEditor config={config} onSave={handleSave} saving={saving} />
      )}

      {/* Live Test */}
      <LiveTest />

      {/* Active Sessions */}
      <ActiveSessions />
    </motion.div>
  );
}
