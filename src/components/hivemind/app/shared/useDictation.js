import { useCallback, useRef, useState, useEffect } from 'react';
import apiClient from './api-client';

/**
 * useDictation — push-to-talk speech-to-text for chat composers.
 *
 * Reuses the SAME Groq Whisper path as AI Meeting Notes
 * (POST /api/meetings/transcribe — raw audio body → whisper-large-v3 → { text }).
 *
 * Single-shot: tap to start recording, tap again to stop. On stop the recorded
 * blob is sent to the transcribe endpoint and the resulting text is handed to
 * `onText(text)` so the caller can append it to its own input state.
 *
 * State machine: 'idle' → 'recording' → 'transcribing' → 'idle' (or 'error').
 *
 * @param {(text: string) => void} onText  receives the transcript on success
 * @returns {{ state: string, error: string|null, toggle: () => void, cancel: () => void }}
 */
export default function useDictation(onText) {
  const [state, setState] = useState('idle'); // idle | recording | transcribing | error
  const [error, setError] = useState(null);

  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const onTextRef = useRef(onText);

  // Keep latest callback without re-creating start/stop.
  useEffect(() => { onTextRef.current = onText; }, [onText]);

  const cleanup = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch (e) { /* noop */ }
    streamRef.current = null;
    recRef.current = null;
    chunksRef.current = [];
  }, []);

  const transcribe = useCallback(async (blob) => {
    if (!blob || blob.size < 1024) {
      setState('idle');
      return;
    }
    setState('transcribing');
    try {
      // Same endpoint AI Meeting Notes uses. No diarization for a single speaker;
      // a short prompt hint nudges Whisper toward clean punctuation.
      const { data } = await apiClient.core.post(
        '/api/meetings/transcribe?prompt=' + encodeURIComponent('Spoken message to an AI assistant.'),
        blob,
        { headers: { 'Content-Type': blob.type || 'audio/webm' }, timeout: 120000 }
      );
      const text = (data && (data.text || data.transcript)) ? (data.text || data.transcript).trim() : '';
      if (text) {
        onTextRef.current && onTextRef.current(text);
        setState('idle');
        setError(null);
      } else {
        setState('error');
        setError('No speech detected.');
      }
    } catch (e) {
      setState('error');
      setError(e?.response?.data?.message || 'Transcription failed — try again.');
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      setState('error');
      setError('Microphone permission denied.');
      return;
    }
    streamRef.current = stream;
    const mime = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime });
    recRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      cleanup();
      transcribe(blob);
    };
    rec.start();
    setState('recording');
  }, [cleanup, transcribe]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop(); // → onstop → transcribe
    } else {
      setState('idle');
    }
  }, []);

  const toggle = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle' || state === 'error') start();
    // ignore while transcribing
  }, [state, start, stop]);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (rec) { rec.onstop = null; try { rec.stop(); } catch (e) {} }
    cleanup();
    setState('idle');
    setError(null);
  }, [cleanup]);

  // Tear down on unmount.
  useEffect(() => () => { cancel(); }, [cancel]);

  return { state, error, toggle, cancel };
}
