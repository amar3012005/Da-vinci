import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Clock3 } from 'lucide-react';
import apiClient from './api-client';
import WorkspacePopupSurface from './WorkspacePopupSurface';

export default function EntityProfileDrawer({ entityId, mobile = false, onClose }) {
  const [state, setState] = useState({ loading: true, dossier: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, dossier: null, error: null });
    apiClient.getEntityProfile(entityId).then((dossier) => alive && setState({ loading: false, dossier, error: null }))
      .catch((error) => alive && setState({ loading: false, dossier: null, error: error?.response?.status === 404 ? 'This entity is unavailable in your workspace.' : 'Unable to load this dossier.' }));
    return () => { alive = false; };
  }, [entityId]);
  const close = () => {
    if (onClose) return onClose();
    window.history.length > 1
      ? window.history.back()
      : window.location.assign(mobile ? '/hivemind/m/memories' : '/hivemind/app/memories');
  };
  const events = state.dossier?.timeline || state.dossier?.facts?.map((fact) => ({ id: fact.id, kind: 'fact', title: fact.factKey, value: fact.value, status: fact.status, valid_at: fact.freshnessAt, recorded_at: fact.createdAt })) || [];
  const factsById = new Map((state.dossier?.facts || []).map((fact) => [fact.id, fact]));
  const content = state.loading ? <p className="py-12 text-center text-sm text-[#78716c]">Loading evidence timeline…</p>
    : state.error ? <p className="py-12 text-center text-sm text-[#78716c]">{state.error}</p>
      : <><div className="border-b border-[#ece9e3] px-6 py-5"><p className="font-mono text-[10px] tracking-[0.18em] text-[#4b9375] uppercase">Entity profile · bi-temporal evidence</p><h1 className="mt-1 text-2xl font-semibold text-[#0a0a0a]">{state.dossier.entity.canonicalName}</h1><p className="mt-1 text-xs text-[#78716c]">{state.dossier.entity.entityKind} · evidence-backed HIVE projection</p></div><div className="max-h-[58dvh] overflow-y-auto p-6">{events.length === 0 ? <p className="rounded-xl border border-dashed border-[#d9d4cc] bg-[#faf9f5] p-5 text-sm text-[#78716c]">No evidence-backed facts have entered this entity timeline yet.</p> : <ol className="relative ml-2 border-l border-[#b9d7ff] pl-6">{events.map((event) => { const evidence = factsById.get(event.fact_id || event.id)?.evidence?.[0]; return <li key={event.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[31px] top-3 h-3 w-3 rounded-full bg-[#117dff] ring-4 ring-[#edf6ff]" /><article className="rounded-xl border border-[#e9e5df] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-mono uppercase tracking-[0.11em] text-[#117dff]">{event.kind === 'fact' ? 'Profile fact' : event.kind.replace('_', ' ')}</p><h2 className="mt-1 text-sm font-semibold text-[#1c1917]">{event.title}</h2>{event.value?.object_literal ? <p className="mt-1 text-sm text-[#57534e]">{event.value.object_literal}</p> : null}</div><span className="rounded-full bg-[#fff1dc] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#9a5b00]">{event.status || 'recorded'}</span></div>{evidence?.exactQuote ? <blockquote className="mt-3 border-l-2 border-[#b9d7ff] pl-3 text-xs leading-5 text-[#57534e]">“{evidence.exactQuote}”</blockquote> : null}<div className="mt-3 grid gap-1 border-t border-[#f0ede8] pt-2.5 text-[10px] text-[#78716c] sm:grid-cols-2"><span className="flex items-center gap-1"><CalendarDays size={11} />Valid: {event.valid_at ? new Date(event.valid_at).toLocaleDateString() : 'Unknown'}</span><span className="flex items-center gap-1"><Clock3 size={11} />Recorded by HIVE: {event.recorded_at ? new Date(event.recorded_at).toLocaleDateString() : 'Unknown'}</span></div></article></li>; })}</ol>}</div></>;
  const modal = <div className="fixed inset-0 z-[120] grid place-items-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="w-full max-w-[920px]"><WorkspacePopupSurface variant="reader" label="hivemind — entity timeline" onClose={close} meta="Valid time and HIVE recorded time" secondaryAction={{ label: 'Close', onClick: close }}>{content}</WorkspacePopupSurface></div></div>;
  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
