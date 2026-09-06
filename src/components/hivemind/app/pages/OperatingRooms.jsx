import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, Plus, ShieldCheck, Users, Waves, Send, ListChecks } from 'lucide-react';
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
  const transcriptIdsRef = useRef(new Set());
  const [request, setRequest] = useState('');
  const [agendaDraft,setAgendaDraft] = useState('');
  const [editingAgenda,setEditingAgenda] = useState(false);
  const [elapsed,setElapsed] = useState(0);
  const enteredAt = useRef(Date.now());
  const pendingRef = useRef(new Map());
  useEffect(()=>()=>{for(const item of pendingRef.current.values()) clearTimeout(item.timer);pendingRef.current.clear();},[]);

  useEffect(() => {
    let active = true;
    let timer;
    const poll = async () => {
      try { const next = await apiClient.getOperatingRoom(roomId); if(active) setRoom(next); }
      catch (_) { /* retain the last confirmed room view through reconnects */ }
      if(active) timer=setTimeout(poll,2500);
    };
    poll();
    const clock=setInterval(()=>setElapsed(Math.floor((Date.now()-enteredAt.current)/1000)),1000);
    return ()=>{active=false;clearTimeout(timer);clearInterval(clock);};
  },[roomId]);

  const askHivemind = useCallback(async (event) => {
    // The server owns speaker identity, room history, grounding, and turn
    // idempotency. A browser cannot impersonate another participant or create a
    // second answer by rebuilding the chat prompt differently.
    const data = await apiClient.respondToOperatingRoomTurn(roomId,event.turn.id);
    const answer = String(data.answer || '').trim();
    if (!answer) throw new Error('HIVEMIND returned an empty room response');
    return answer;
  }, [roomId]);

  const submitTranscript = useCallback(async (text, eventId = crypto.randomUUID()) => {
    const {data:event} = await apiClient.controlPlane.post(`/v1/operating-rooms/${roomId}/transcript`, {text,event_id:eventId});
    if (event.addressed_to_hivemind) {
      setStatus(`HIVEMIND heard ${event.turn.speaker_name} and is considering the room context…`);
      try {
        await askHivemind(event);
        setStatus(`HIVEMIND answered ${event.turn.speaker_name}`);
      } catch (cause) {
        setStatus(cause.message || 'HIVEMIND could not answer this turn');
        throw cause;
      }
    }
  }, [askHivemind, roomId]);

  const enqueueTranscript = useCallback((text,id=crypto.randomUUID())=>{
    if(pendingRef.current.has(id)) return;
    pendingRef.current.set(id,{text,attempt:0});
    const run = async()=>{
      const item=pendingRef.current.get(id); if(!item) return;
      try { await submitTranscript(text,id); pendingRef.current.delete(id); }
      catch(cause) {
        item.attempt+=1;
        const busy=cause?.response?.data?.error==='operating_room_busy';
        if(item.attempt<(busy?60:4)) item.timer=setTimeout(run,busy?3000:1000*item.attempt);
        else {pendingRef.current.delete(id);setStatus('Transcript could not be saved. Please repeat or use the room message box.');}
      }
    };
    run();
  },[submitTranscript]);

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
    if (meeting.ai?.on && meeting.self?.permissions?.transcriptionEnabled) {
      const onTranscript = (item) => {
        if (item?.isPartialTranscript || !item?.transcript) return;
        const eventId = item.id || `${item.peerId}:${item.timestamp}:${item.transcript}`;
        if(transcriptIdsRef.current.has(eventId)) return;
        const belongsToSelf = item.customParticipantId
          ? item.customParticipantId === selfParticipant.user_id
          : (item.userId === meeting.self?.userId || item.peerId === meeting.self?.id);
        if (!belongsToSelf) return;
        transcriptIdsRef.current.add(eventId);
        if(transcriptIdsRef.current.size>2000) transcriptIdsRef.current.delete(transcriptIdsRef.current.values().next().value);
        enqueueTranscript(item.transcript,eventId);
      };
      meeting.ai.on('transcript', onTranscript);
      return () => meeting.ai.off?.('transcript', onTranscript);
    }
    // Compatibility fallback for browsers/presets where RealtimeKit live
    // transcription is unavailable. This still captures only the local mic,
    // so server-authoritative speaker attribution remains valid.
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {setStatus('Live captions are unavailable in this browser. Use the room message box to address HIVEMIND.');return undefined;}
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal && meeting.self?.audioEnabled) enqueueTranscript(event.results[i][0].transcript);
      }
    };
    recognition.onend = () => { try { recognition.start(); } catch (_) {} };
    try { recognition.start(); recognitionRef.current = recognition; } catch (_) {}
    return () => { recognition.onend = null; recognition.stop(); };
  }, [meeting, selfParticipant, enqueueTranscript]);

  if (error) return <div className="min-h-[70vh] grid place-items-center bg-[#faf9f4] p-6"><div className="max-w-lg border border-red-200 bg-white p-6"><h2 className="font-['Space_Grotesk'] text-xl font-semibold">Room connection failed</h2><p className="mt-2 text-sm text-[#625f58]">{error}</p><button className="mt-5 text-sm text-[#117dff]" onClick={() => navigate('/hivemind/app/employees/operating-rooms')}>Back to rooms</button></div></div>;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-[#0a0a0a]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
        <div className="flex items-center gap-3"><button aria-label="Back" onClick={() => navigate('/hivemind/app/employees/operating-rooms')}><ArrowLeft size={18} /></button><div><div className="font-['Space_Grotesk'] text-sm font-semibold">{room?.name || 'Operating Room'}</div><div className="text-[11px] text-white/60">{status}</div></div></div>
        <div className="flex items-center gap-3 text-xs text-white/70"><span className="hidden items-center gap-2 md:flex"><ShieldCheck size={14} className="text-emerald-400" /> Verified organization room</span>{['owner', 'admin'].includes(selfParticipant?.role) && <button disabled={closing} onClick={closeRoom} className="border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50">{closing ? 'Finalizing…' : 'End & finalize'}</button>}</div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-[45vh] flex-1">{meeting ? <RtkMeeting meeting={meeting} mode="fill" /> : <div className="grid h-full place-items-center text-sm text-white/70"><Waves className="mb-3 animate-pulse text-[#117dff]" size={32} />{status}</div>}</div>
        <aside className="w-full overflow-y-auto border-t border-white/10 bg-[#141414] p-4 text-white lg:w-80 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold"><Waves size={16} className="text-[#117dff]"/> HIVEMIND · TARA</span><span className="font-mono text-xs text-white/50">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</span></div>
          <p className="mt-2 text-xs text-white/60" aria-live="polite">{room?.facilitator_activity==='speaking'?'Speaking to the room':room?.facilitator_activity==='thinking'?'Considering the room discussion':'Listening · say “HIVEMIND” to bring me in'}</p>
          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/50">Our goal</h3><p className="mt-2 text-sm">{room?.goal}</p>
          <div className="mt-5 flex items-center justify-between"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50"><ListChecks size={14}/> Shared agenda</h3>{['owner','admin'].includes(selfParticipant?.role)&&<button className="text-xs text-blue-400" onClick={()=>{setAgendaDraft((room?.agenda||[]).join('\n'));setEditingAgenda(!editingAgenda);}}>Edit</button>}</div>
          {editingAgenda?<form onSubmit={async e=>{e.preventDefault();try{const {data}=await apiClient.controlPlane.post(`/v1/operating-rooms/${roomId}/agenda`,{agenda:agendaDraft.split('\n')});setRoom(data.room);setEditingAgenda(false);}catch(cause){setStatus(cause.message);}}}><textarea aria-label="Shared agenda, one topic per line" value={agendaDraft} onChange={e=>setAgendaDraft(e.target.value)} rows={4} className="mt-2 w-full rounded border border-white/20 bg-black p-2 text-sm"/><button className="mt-2 rounded bg-blue-600 px-3 py-1 text-xs">Save agenda</button></form>:<ol className="mt-2 space-y-2 text-sm">{(room?.agenda?.length?room.agenda:['Understand the current situation','Discuss priorities and open questions','Agree next actions']).map((item,i)=><li key={i}><span className="mr-2 text-white/40">{i+1}.</span>{item}</li>)}</ol>}
          {room?.session_brief?.summary&&<><h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/50">Discussion so far</h3><p className="mt-2 text-xs leading-relaxed text-white/80">{room.session_brief.summary}</p></>}
          {room?.session_brief?.open_items?.length>0&&<><h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/50">Still open</h3><ul className="mt-2 space-y-2 text-xs">{room.session_brief.open_items.map((item,i)=><li key={i}>{item.text}</li>)}</ul></>}
          {(room?.recent_responses||[]).slice(-2).map(item=><div key={item.turn_id} className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"><p className="text-xs text-blue-300">HIVEMIND → {item.addressed_name}</p><p className="mt-2 text-sm leading-relaxed">{item.answer}</p></div>)}
          <form className="mt-5 flex gap-2" onSubmit={e=>{e.preventDefault();if(request.trim()){enqueueTranscript(`HIVEMIND, ${request.trim()}`);setRequest('');}}}><input aria-label="Ask HIVEMIND in this room" placeholder="Ask HIVEMIND…" value={request} onChange={e=>setRequest(e.target.value)} className="min-w-0 flex-1 rounded border border-white/20 bg-black px-3 py-2 text-sm"/><button aria-label="Send to HIVEMIND" disabled={!request.trim()} className="rounded bg-blue-600 p-2 disabled:opacity-40"><Send size={16}/></button></form>
        </aside>
      </div>
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
