import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Plus, ShieldCheck, Users, Waves } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';
import apiClient from '../shared/api-client';

function RoomCall({ roomId }) {
  const navigate = useNavigate();
  const [meeting, initMeeting] = useRealtimeKitClient();
  const [room, setRoom] = useState(null);
  const [selfParticipant, setSelfParticipant] = useState(null);
  const [status, setStatus] = useState('Connecting securely…');
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const recognitionRef = useRef(null);
  const spokenRef = useRef(new Set());
  const transcriptIdsRef = useRef(new Set());

  const askHivemind = useCallback(async (event) => {
    const roomContext = event.context || {};
    const roster = (roomContext.participants || []).map((person) => `${person.name} (${person.role})`).join(', ');
    const contextPrefix = [
      `Operating room: ${roomContext.room?.name || room?.name || 'Company Operating Room'}.`,
      `Current verified speaker: ${event.turn.speaker_name} (${event.turn.speaker_role}).`,
      roster ? `Participants: ${roster}.` : '',
      roomContext.room?.goal ? `Room goal: ${roomContext.room.goal}.` : '',
    ].filter(Boolean).join(' ');
    const response = await fetch(new URL('/v1/proxy/chat', apiClient.controlPlane.defaults.baseURL).toString(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${contextPrefix}\n\n${event.turn.speaker_name} asks: ${event.query}`,
        stream: false,
        router: 'tool',
        use_tools: true,
        history_turns: 6,
        room_context: roomContext,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HIVEMIND response failed (${response.status})`);
    const answer = String(data.response || data.answer || '').trim();
    if (!answer) throw new Error('HIVEMIND returned an empty room response');
    await meeting?.chat?.sendTextMessage?.(`HIVEMIND · ${answer}`);
    return answer;
  }, [meeting, room?.name]);

  const submitTranscript = useCallback(async (text) => {
    const event = await apiClient.appendOperatingRoomTranscript(roomId, text);
    if (event.addressed_to_hivemind) {
      setStatus(`HIVEMIND heard ${event.turn.speaker_name} and is considering the room context…`);
      try {
        const answer = await askHivemind(event);
        setStatus(`HIVEMIND answered ${event.turn.speaker_name}`);
        if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
      } catch (cause) {
        setStatus(cause.message || 'HIVEMIND could not answer this turn');
      }
    }
  }, [askHivemind, roomId]);

  const closeRoom = async () => {
    setClosing(true);
    try {
      await apiClient.closeOperatingRoom(roomId);
      await meeting?.leave?.();
      navigate('/hivemind/app/meeting-notes');
    } catch (cause) {
      setStatus(cause?.response?.data?.error === 'operating_room_transcript_empty' ? 'Speak at least once before finalizing the room' : (cause?.response?.data?.message || cause.message));
      setClosing(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const joined = await apiClient.joinOperatingRoom(roomId);
        if (!active) return;
        setRoom(joined.room);
        setSelfParticipant(joined.participant);
        await initMeeting({
          authToken: joined.auth_token,
          roomName: joined.room_name,
          defaults: { audio: true, video: false },
        });
        setStatus('Live · say “HIVEMIND” or “TARA” to address the facilitator');
      } catch (cause) {
        if (active) setError(cause?.response?.data?.message || cause.message || 'Unable to join this room');
      }
    })();
    return () => { active = false; recognitionRef.current?.stop?.(); };
  }, [initMeeting, roomId]);

  useEffect(() => {
    if (!meeting || !selfParticipant) return undefined;
    if (meeting.ai?.on) {
      const onTranscript = (item) => {
        if (item?.isPartialTranscript || !item?.transcript || transcriptIdsRef.current.has(item.id)) return;
        const belongsToSelf = item.customParticipantId
          ? item.customParticipantId === selfParticipant.user_id
          : (item.userId === meeting.self?.userId || item.peerId === meeting.self?.id);
        if (!belongsToSelf) return;
        transcriptIdsRef.current.add(item.id);
        submitTranscript(item.transcript).catch(() => {});
      };
      meeting.ai.on('transcript', onTranscript);
      return () => meeting.ai.off?.('transcript', onTranscript);
    }
    // Compatibility fallback for browsers/presets where RealtimeKit live
    // transcription is unavailable. This still captures only the local mic,
    // so server-authoritative speaker attribution remains valid.
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) submitTranscript(event.results[i][0].transcript).catch(() => {});
      }
    };
    recognition.onend = () => { try { recognition.start(); } catch (_) {} };
    try { recognition.start(); recognitionRef.current = recognition; } catch (_) {}
    return () => { recognition.onend = null; recognition.stop(); };
  }, [meeting, selfParticipant, submitTranscript]);

  useEffect(() => {
    if (!meeting?.chat?.on) return undefined;
    const onChat = ({ action, message }) => {
      const text = String(message?.message || '');
      if (action !== 'add' || !text.startsWith('HIVEMIND · ') || spokenRef.current.has(message?.id)) return;
      spokenRef.current.add(message?.id);
      // The originating browser already speaks immediately; other browsers
      // speak the same server-grounded answer when RealtimeKit fans it out.
      if (message?.userId === meeting?.self?.userId) return;
      if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(11)));
    };
    meeting.chat.on('chatUpdate', onChat);
    return () => meeting.chat.off?.('chatUpdate', onChat);
  }, [meeting]);

  if (error) return <div className="min-h-[70vh] grid place-items-center bg-[#faf9f4] p-6"><div className="max-w-lg border border-red-200 bg-white p-6"><h2 className="font-['Space_Grotesk'] text-xl font-semibold">Room connection failed</h2><p className="mt-2 text-sm text-[#625f58]">{error}</p><button className="mt-5 text-sm text-[#117dff]" onClick={() => navigate('/hivemind/app/employees/operating-rooms')}>Back to rooms</button></div></div>;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-[#0a0a0a]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
        <div className="flex items-center gap-3"><button aria-label="Back" onClick={() => navigate('/hivemind/app/employees/operating-rooms')}><ArrowLeft size={18} /></button><div><div className="font-['Space_Grotesk'] text-sm font-semibold">{room?.name || 'Operating Room'}</div><div className="text-[11px] text-white/60">{status}</div></div></div>
        <div className="flex items-center gap-3 text-xs text-white/70"><span className="hidden items-center gap-2 md:flex"><ShieldCheck size={14} className="text-emerald-400" /> Verified organization room</span>{['owner', 'admin'].includes(selfParticipant?.role) && <button disabled={closing} onClick={closeRoom} className="border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50">{closing ? 'Finalizing…' : 'End & finalize'}</button>}</div>
      </header>
      <div className="min-h-0 flex-1">{meeting ? <RtkMeeting meeting={meeting} mode="fill" /> : <div className="grid h-full place-items-center text-sm text-white/70"><Waves className="mb-3 animate-pulse text-[#117dff]" size={32} />{status}</div>}</div>
    </div>
  );
}

function RoomLobby() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { apiClient.listOperatingRooms().then(setRooms).catch((e) => setError(e?.response?.data?.message || e.message)); }, []);
  const create = async () => {
    setCreating(true); setError('');
    try {
      const room = await apiClient.createOperatingRoom({ name: 'Company Operating Room', goal: 'Understand the company, align the team, and decide the next best actions.' });
      navigate(`/hivemind/app/employees/operating-rooms/${room.id}`);
    } catch (e) { setError(e?.response?.data?.message || e.message); setCreating(false); }
  };
  return (
    <div className="min-h-full bg-[#faf9f4] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="font-mono text-xs uppercase tracking-[0.18em] text-[#737373]">Employees · live collaboration</div><h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-semibold text-[#0a0a0a]">Operating Rooms</h1><p className="mt-2 max-w-2xl text-sm text-[#625f58]">A verified multi-person voice room with HIVEMIND as the disclosed AI facilitator. Every speaker keeps their organization identity and role.</p></div><button onClick={create} disabled={creating} className="inline-flex items-center justify-center gap-2 bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{creating ? 'Creating…' : 'New operating room'}</button></div>
        {error && <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => <button key={room.id} onClick={() => navigate(`/hivemind/app/employees/operating-rooms/${room.id}`)} className="border border-[#e3e0db] bg-white p-5 text-left transition hover:border-[#117dff]"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center bg-[#eef5ff] text-[#117dff]"><Mic size={19} /></div><span className="font-mono text-[10px] uppercase tracking-wider text-emerald-700">{room.status}</span></div><h2 className="mt-5 font-['Space_Grotesk'] text-lg font-semibold">{room.name}</h2><p className="mt-2 line-clamp-2 text-sm text-[#625f58]">{room.goal}</p><div className="mt-5 flex items-center gap-2 text-xs text-[#737373]"><Users size={14} /> {room.participants?.length || 0} verified participants</div></button>)}
          {!rooms.length && !error && <div className="col-span-full border border-dashed border-[#d4d0c8] bg-white p-10 text-center text-sm text-[#737373]">No operating rooms yet. Create the first room for your company.</div>}
        </div>
      </div>
    </div>
  );
}

export default function OperatingRooms() {
  const { roomId } = useParams();
  return roomId ? <RoomCall roomId={roomId} /> : <RoomLobby />;
}
