/**
 * AaasVoiceWidget — realtime voice via the self-hosted TARA AaaS.
 *
 * Protocol (vs the Cartesia-hosted widget): RAW PCM bytes both ways.
 *   • mic  → AudioWorklet/ScriptProcessor → Int16 PCM @16k → ws.send(ArrayBuffer)
 *   • recv → binary frame = raw PCM s16le @16k → Web Audio playback (scheduled)
 *   • recv → text frame   = JSON control {type: ready|transcript|speech_start|turn_done|error}
 *
 * WSS endpoint: wss://core.singulancelabs.com/voice2/voice
 *   ?user_id=&org_id=&session_id=&language=   (tenant = user_id; auth hardening = Phase 2)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, AlertTriangle, Volume2 } from 'lucide-react';
import { Orb } from './Orb';
import apiClient from './app/shared/api-client';

const SAMPLE_RATE = 16000;
const _CORE_HTTP = (process.env.REACT_APP_CORE_API_URL || 'https://core.hivemind.davinciai.eu:8050').replace(/\/$/, '');
const DG_HTTP = (process.env.REACT_APP_TARA_DG_HTTP || `${_CORE_HTTP}/voice2`).replace(/\/$/, '');
const DG_WS = `${DG_HTTP.replace(/^http/, 'ws')}/voice`;

// What each mode means — shown as an overlay caption so the user knows on toggle.
const MODE_DESC = {
  external: 'Agent acts as your employee — used for client or user interaction.',
  internal: 'Agent acts as your private HIVEMIND — answers you directly with full recall, for internal use.',
};

// A multilingual provider accepts the requested conversation language rather
// than exposing a separate voice for every locale. Keep that choice explicit.
const MULTILINGUAL_LANGUAGE_OPTIONS = ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'ar', 'hi', 'ja', 'ko', 'zh'];

function resolveCatalogLanguages(catalog, voices, preferredLanguage) {
  const advertised = Array.isArray(catalog?.languages) ? catalog.languages : [];
  const voiceLanguages = voices.flatMap((voice) => Array.isArray(voice?.languages)
    ? voice.languages : voice?.language ? [voice.language] : []);
  const multilingual = [...advertised, ...voiceLanguages].some((value) => String(value).toLowerCase() === 'multilingual');
  return [...new Set([
    ...(multilingual ? MULTILINGUAL_LANGUAGE_OPTIONS : []),
    ...advertised,
    ...voiceLanguages,
    preferredLanguage,
  ].map((value) => String(value || '').toLowerCase()).filter((value) => value && value !== 'multilingual'))];
}

export default function AaasVoiceWidget({ userId, orgId, language = 'en', wsBase = null, provider = 'deepgram', initialGoal = '', initialMode = 'external', interactionProfile = null, runtimeAdmin = false, maxDurationSeconds = 180, onSessionCreated = null, onSessionEnded = null }) {
  const isRuntimeAdmin = runtimeAdmin && interactionProfile === 'runtime_operator';
  const engineWs = wsBase || DG_WS;
  const engineHttp = DG_HTTP;
  const [active, setActive] = useState(false);
  const [state, setState] = useState('idle'); // idle|connecting|listening|thinking|talking
  const [transcript, setTranscript] = useState('');   // current-turn user STT
  const [agentTurn, setAgentTurn] = useState('');     // current-turn TARA reply
  const [error, setError] = useState(null);

  // Voice picker
  const [voices, setVoices] = useState([]);
  const [langs, setLangs] = useState([]);
  const [catalogState, setCatalogState] = useState('loading');
  const [catalogError, setCatalogError] = useState('');
  const [langFilter, setLangFilter] = useState((language || 'en').split('-')[0].toLowerCase());
  const [genderFilter, setGenderFilter] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [mode, setMode] = useState(initialMode === 'internal' ? 'internal' : 'external'); // external = full agent (clinical) | internal = direct recall
  const [goal, setGoal] = useState(initialGoal || ''); // session goal — drives the strategist (phase/confidence engine)
  // Active skill name per mode (org-wide selection from the Skills tab) — the
  // toggle reflects whichever skill is selected for each side.
  const [skillNames, setSkillNames] = useState({ external: null, internal: null });
  const [previewing, setPreviewing] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(maxDurationSeconds);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    if (isRuntimeAdmin) {
      setCatalogState('ready');
      setCatalogError('');
      setVoices([]);
      setLangs([]);
      setVoiceId('rex');
      setLangFilter('en');
      return undefined;
    }
    let cancelled = false;
    const want = (language || 'en').split('-')[0].toLowerCase();
    setCatalogState('loading');
    setCatalogError('');
    apiClient.listTaraVoices(provider)
      .then((d) => {
        if (cancelled) return;
        const list = d.voices || [];
        if (!Array.isArray(list) || !list.length) throw new Error('voice_catalog_empty');
        setVoices(list);
        setLangs(resolveCatalogLanguages(d, list, want));
        setCatalogState('ready');
        // Robust default: exact 'en' → any 'en*' → first available (never leave empty,
        // which would make Start send no voice_id and fall back to Cartesia's default).
        // Prefer a voice in the caller's chosen language, then any en, then first.
        const def = list.find((v) => v.language === want)
          || list.find((v) => (v.language || '').startsWith(want))
          || list.find((v) => v.language === 'en')
          || list[0];
        if (def) setVoiceId(def.id);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogState('error');
        setCatalogError('Voice options could not be loaded. Check the selected TARA provider, then try again.');
        setVoices([]);
        setLangs([want]);
        setVoiceId('');
      });
    return () => { cancelled = true; };
  }, [language, provider, isRuntimeAdmin]);

  useEffect(() => {
    if (!active && initialGoal) setGoal(initialGoal);
  }, [active, initialGoal]);

  // Reflect the org-wide selected skill on each toggle side.
  useEffect(() => {
    if (isRuntimeAdmin) return undefined;
    apiClient.listTaraSkills()
      .then((d) => {
        const byId = Object.fromEntries((d?.skills || []).map((s) => [s.id, s.name]));
        const sel = d?.selected || {};
        setSkillNames({
          external: byId[sel.external_skill_id] || null,
          internal: byId[sel.internal_skill_id] || null,
        });
      })
      .catch(() => {});
  }, [active, isRuntimeAdmin]);

  // Grok's voices are 'multilingual' (one voice speaks every supported language),
  // so an exact language match would filter all 26 of them out and leave the
  // picker empty. Treat multilingual as matching any selected language.
  const filteredVoices = voices.filter(
    (v) => (!langFilter || v.language === langFilter || v.language === 'multilingual')
      && (!genderFilter || v.gender === genderFilter)
  );

  // Keep voiceId valid for the current filter. Without this the dropdown shows
  // one voice while voiceId still holds a stale/invalid id, so Start sends the
  // wrong (or no) voice_id. Auto-select the first matching voice.
  useEffect(() => {
    if (filteredVoices.length && !filteredVoices.some((v) => v.id === voiceId)) {
      setVoiceId(filteredVoices[0].id);
    }
  }, [filteredVoices, voiceId]);

  const preview = useCallback(() => {
    if (!voiceId) return;
    setPreviewing(true);
    if (provider === 'grok') { setPreviewing(false); setError('Grok voice preview is available after provider approval.'); return; }
    const url = `${engineHttp}/voice-preview?voice_id=${encodeURIComponent(voiceId)}&language=${langFilter || 'en'}`;
    if (previewAudioRef.current) { try { previewAudioRef.current.pause(); } catch { /* noop */ } }
    const a = new Audio(url);
    previewAudioRef.current = a;
    a.onended = () => setPreviewing(false);
    a.onerror = () => setPreviewing(false);
    a.play().catch(() => setPreviewing(false));
  }, [voiceId, langFilter, engineHttp, provider]);

  const wsRef = useRef(null);
  const micCtxRef = useRef(null);
  const playCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const procRef = useRef(null);
  const lastPlayRef = useRef(0);
  const sourcesRef = useRef([]);
  const outVolRef = useRef(0);   // TARA speaking volume → orb
  const inVolRef = useRef(0);    // mic volume → orb
  const sessionIdRef = useRef(null);
  const sessionCreatedRef = useRef(onSessionCreated);
  const sessionEndedRef = useRef(onSessionEnded);
  useEffect(() => { sessionCreatedRef.current = onSessionCreated; }, [onSessionCreated]);
  useEffect(() => { sessionEndedRef.current = onSessionEnded; }, [onSessionEnded]);

  const stopAll = useCallback((reason) => {
    sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
    sourcesRef.current = [];
    if (procRef.current) { try { procRef.current.disconnect(); } catch { /* noop */ } procRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (micCtxRef.current) { micCtxRef.current.close().catch(() => {}); micCtxRef.current = null; }
    if (playCtxRef.current) { playCtxRef.current.close().catch(() => {}); playCtxRef.current = null; }
    if (wsRef.current) {
      try { if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close(1000, reason || 'stop'); } catch { /* noop */ }
      wsRef.current = null;
    }
    setActive(false);
    setState('idle');
    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (sessionId) sessionEndedRef.current?.({ sessionId, reason: reason || 'stop' });
  }, []);

  useEffect(() => {
    if (!isRuntimeAdmin || !active) return undefined;
    const deadline = Date.now() + maxDurationSeconds * 1000;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0) stopAll('time-limit');
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [active, isRuntimeAdmin, maxDurationSeconds, stopAll]);

  // Schedule a raw-PCM (s16le @16k) chunk for gapless playback.
  const playPcm = useCallback((arrayBuf) => {
    const ctx = playCtxRef.current;
    if (!ctx || !arrayBuf.byteLength) return;
    const i16 = new Int16Array(arrayBuf);
    const f32 = new Float32Array(i16.length);
    let sum = 0;
    for (let i = 0; i < i16.length; i++) { f32[i] = i16[i] / 0x8000; sum += f32[i] * f32[i]; }
    outVolRef.current = Math.min(1, Math.sqrt(sum / (f32.length || 1)) * 3); // RMS → orb output volume
    const buf = ctx.createBuffer(1, f32.length, SAMPLE_RATE);
    buf.copyToChannel(f32, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    let at = lastPlayRef.current;
    if (at < now) at = now;
    src.start(at);
    lastPlayRef.current = at + buf.duration;
    sourcesRef.current.push(src);
    setState('talking');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!userId) { setError('Not signed in — no user id.'); return; }
    // The server owns the effective provider through organization policy. Create
    // one browser session before opening audio so its returned provider and URL
    // are always consumed together; never combine a Grok UI assumption with a
    // Deepgram session URL.
    const voiceSessionPromise = apiClient.createTaraVoiceSession({
      provider: isRuntimeAdmin ? 'grok' : provider,
      language: isRuntimeAdmin ? 'en' : langFilter || language,
      mode: isRuntimeAdmin ? 'internal' : mode,
      voice_id: isRuntimeAdmin ? 'rex' : voiceId || undefined,
      goal: goal.trim() || undefined,
      interaction_profile: interactionProfile || undefined,
    });
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      voiceSessionPromise.catch(() => {});
      setError('Microphone permission denied.'); return;
    }
    micStreamRef.current = stream;
    setActive(true);
    setState('connecting');

    const playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    playCtxRef.current = playCtx;
    lastPlayRef.current = playCtx.currentTime;

    let url;
    let sessionCapability = null;
    let sessionProvider = null;
    try {
      const session = await voiceSessionPromise;
      sessionIdRef.current = session.session_id;
      sessionCreatedRef.current?.({ sessionId: session.session_id });
      sessionProvider = session.provider;
      if (sessionProvider === 'grok') {
        url = new URL(`${session.ws_url.replace(/\/$/, '')}/${encodeURIComponent(session.session_id)}`);
        sessionCapability = session.capability;
      } else {
        url = new URL(session.ws_url || engineWs);
        url.searchParams.set('user_id', userId);
        if (orgId) url.searchParams.set('org_id', orgId);
        url.searchParams.set('session_id', session.session_id);
        url.searchParams.set('language', isRuntimeAdmin ? 'en' : langFilter || language);
        url.searchParams.set('mode', isRuntimeAdmin ? 'internal' : mode);
        if (isRuntimeAdmin ? 'rex' : voiceId) url.searchParams.set('voice_id', isRuntimeAdmin ? 'rex' : voiceId);
        if (goal.trim()) url.searchParams.set('goal', goal.trim().slice(0, 200));
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Unable to start TARA session.');
      stopAll('session-error');
      return;
    }

    if (sessionProvider === 'grok' && !sessionCapability) {
      setError('TARA did not return a browser session capability. Please try again.');
      stopAll('missing-capability');
      return;
    }
    let ws;
    try {
      const protocols = sessionProvider === 'grok' ? ['hm.tara.v1', `hm.tara.cap.${sessionCapability}`] : undefined;
      ws = protocols ? new WebSocket(url.toString(), protocols) : new WebSocket(url.toString());
    } catch {
      setError('The browser could not open the TARA voice connection.');
      stopAll('socket-create-error');
      return;
    }
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      // mic pump: Float32 → Int16 PCM → raw bytes
      const micCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
      micCtxRef.current = micCtx;
      const srcNode = micCtx.createMediaStreamSource(stream);
      const proc = micCtx.createScriptProcessor(4096, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        let sum = 0;
        for (let i = 0; i < input.length; i++) { const s = Math.max(-1, Math.min(1, input[i])); pcm[i] = s * 0x7fff; sum += s * s; }
        inVolRef.current = Math.min(1, Math.sqrt(sum / (input.length || 1)) * 3); // mic RMS → orb input volume
        ws.send(pcm.buffer);
      };
      srcNode.connect(proc);
      proc.connect(micCtx.destination);
    };

    ws.onmessage = (msg) => {
      if (msg.data instanceof ArrayBuffer) { playPcm(msg.data); return; }
      let evt;
      try { evt = JSON.parse(msg.data); } catch { return; }
      switch (evt.type) {
        case 'ready': setState('listening'); break;
        case 'speech_start':
          // barge-in: stop current playback
          sourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* noop */ } });
          sourcesRef.current = [];
          if (playCtxRef.current) lastPlayRef.current = playCtxRef.current.currentTime;
          setState('thinking');
          break;
        case 'transcript': setTranscript(evt.text || ''); setAgentTurn(''); setState('thinking'); break;
        case 'agent_text': setAgentTurn((p) => p + (evt.text || '')); break;
        case 'turn_done': setState('listening'); break;
        case 'error': setError(evt.error || 'stream error'); break;
        default: break;
      }
    };
    ws.onerror = () => setError('Connection error.');
    ws.onclose = (closeEvent) => {
      if (wsRef.current !== ws) return;
      if (closeEvent.code !== 1000) setError('TARA closed before the voice session became ready. You can adjust the settings and try again.');
      stopAll('closed');
    };
  }, [userId, orgId, language, langFilter, voiceId, mode, goal, engineWs, playPcm, stopAll, provider, isRuntimeAdmin]);

  useEffect(() => () => stopAll('unmount'), [stopAll]);

  const busy = state === 'connecting';
  const runtimeTime = `${String(Math.floor(remainingSeconds / 60)).padStart(1, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  return (
    <div className={`border border-[#e3e0db] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${isRuntimeAdmin ? 'min-h-[360px] p-5 sm:p-6' : 'rounded-2xl p-6'}`}>
      {/* Mode caption — long strip on top so the user knows what the active mode does */}
      {!isRuntimeAdmin && !active && (
        <div className={`mb-5 flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[12px] ${
          mode === 'internal' ? 'bg-[#f3ecff] text-[#5b21b6]' : 'bg-[#eef5ff] text-[#1e40af]'}`}>
          <span className={`shrink-0 font-mono uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
            mode === 'internal' ? 'bg-[#7c3aed] text-white' : 'bg-[#117dff] text-white'}`}>{mode}</span>
          <span className="leading-snug">{MODE_DESC[mode]}</span>
        </div>
      )}
      <div className={`flex ${isRuntimeAdmin ? 'flex-col items-center text-center' : 'items-start gap-5'}`}>
        {/* Exact ElevenLabs orb (Three.js shader) */}
        <div className={`${isRuntimeAdmin ? 'h-32 w-32' : 'w-28 h-28'} shrink-0`}>
          <Orb
            colors={["#cadcfc", "#6b86b5"]}
            agentState={active ? (state === 'talking' ? 'talking' : (state === 'thinking' || state === 'connecting') ? 'thinking' : 'listening') : null}
            getOutputVolume={() => outVolRef.current}
            getInputVolume={() => inVolRef.current}
            className="w-full h-full"
          />
        </div>

        {/* Right column */}
        <div className={`${isRuntimeAdmin ? 'relative w-full max-w-sm' : 'flex-1 min-w-0'}`}>
          <div className={`flex items-start gap-3 ${isRuntimeAdmin ? 'justify-center' : 'justify-between'}`}>
            <div>
              <h3 className="text-[#0a0a0a] text-[15px] font-bold font-['Space_Grotesk'] leading-tight">{isRuntimeAdmin ? 'Runtime · Admin check-in' : 'Talk to TARA'}</h3>
              <p className="text-[#a3a3a3] text-[12px]">{isRuntimeAdmin ? active ? `${runtimeTime} remaining` : 'A focused three-minute check-in' : `Real-time voice · ${provider === 'grok' ? 'Grok Voice' : 'Deepgram Voice Agent'}`}</p>
            </div>
            <div className={`flex items-center gap-2 shrink-0 ${isRuntimeAdmin ? 'absolute bottom-5 left-1/2 -translate-x-1/2' : ''}`}>
              {/* internal = direct HIVEMIND recall (no clinical) · external = full agent */}
              {!isRuntimeAdmin && !active && (
                <div className="flex rounded-lg border border-[#e3e0db] overflow-hidden text-[11px] font-medium">
                  {['external', 'internal'].map((m) => (
                    <button key={m} type="button" onClick={() => setMode(m)}
                      title={skillNames[m] ? `Active skill: ${skillNames[m]}` : MODE_DESC[m]}
                      className={`px-2.5 py-1 leading-tight text-left transition-colors ${mode === m ? 'bg-[#117dff] text-white' : 'bg-white text-[#525252] hover:bg-[#faf9f4]'}`}>
                      <span className="block capitalize">{m}</span>
                      <span className={`block text-[9px] normal-case ${mode === m ? 'text-white/75' : 'text-[#a3a3a3]'}`}>
                        {skillNames[m] || 'no skill selected'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            <button
              onClick={active ? () => stopAll('user') : start}
              disabled={busy}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all shrink-0 ${
                active ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                : 'bg-[#0a0a0a] text-white hover:bg-[#262626] disabled:opacity-50'}`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : active ? <Square size={14} /> : <Mic size={14} />}
              {busy ? 'Connecting…' : active ? (isRuntimeAdmin ? 'End early' : 'Stop') : (isRuntimeAdmin ? 'Start check-in' : 'Start')}
            </button>
            </div>
          </div>

          {/* Voice config (always visible when idle) */}
          {!isRuntimeAdmin && !active && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)}
                  className="h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
                  <option value="">All languages</option>
                  {langs.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
                  className="h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
                  <option value="">Any gender</option>
                  <option value="feminine">Feminine</option>
                  <option value="masculine">Masculine</option>
                </select>
              </div>
              <div className="flex gap-2">
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
                  className="flex-1 h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40">
                  {filteredVoices.length === 0 && <option value="">{voices.length ? 'No match' : 'Loading voices…'}</option>}
                  {filteredVoices.slice(0, 10).map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.gender?.[0]?.toUpperCase()}{v.country ? `·${v.country}` : ''})</option>
                  ))}
                </select>
                <button type="button" onClick={preview} disabled={!voiceId || previewing}
                  className="px-3 h-9 rounded-lg border border-[#e3e0db] text-[12px] text-[#117dff] hover:bg-[#faf9f4] disabled:opacity-50 flex items-center gap-1">
                  {previewing ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />} Hear
                </button>
              </div>
              {catalogState === 'loading' ? <p className="text-[10px] text-[#777168]">Loading available voices…</p> : null}
              {catalogError ? <p className="text-[10px] leading-4 text-red-700">{catalogError}</p> : null}
              {/* Session goal — drives the strategist (phase + confidence) like outbound */}
              <input
                type="text" value={goal} onChange={(e) => setGoal(e.target.value)}
                placeholder="Goal (optional) — e.g. qualify interest and book a demo"
                maxLength={200}
                className="w-full h-9 px-2 text-[12px] bg-[#faf9f4] border border-[#e3e0db] rounded-lg focus:outline-none focus:border-[#117dff]/40"
              />
            </div>
          )}

          {isRuntimeAdmin ? <p className="mt-3 text-[11px] leading-5 text-[#777168]">Runtime will use this conversation only to understand your current status and priorities. The check-in ends automatically after 3 minutes.</p> : null}

          {/* Current turn — user STT + TARA reply */}
          {(transcript || agentTurn) && (
            <div className="mt-4 space-y-2 border-t border-[#f3f1ec] pt-3">
              {transcript && (
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono text-[#a3a3a3] uppercase pt-0.5 w-10 shrink-0">You</span>
                  <p className="text-[12.5px] text-[#0a0a0a] flex-1">{transcript}</p>
                </div>
              )}
              {agentTurn && (
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono text-[#117dff] uppercase pt-0.5 w-10 shrink-0">TARA</span>
                  <p className="text-[12.5px] text-[#525252] flex-1">{agentTurn}</p>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              <AlertTriangle size={11} className="inline mr-1" /> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
