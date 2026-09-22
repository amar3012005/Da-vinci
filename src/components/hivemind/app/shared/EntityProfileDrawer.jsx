import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from './api-client';

const labels = { static: 'Static', dynamic: 'Current context', relationship: 'Relationships', historical: 'History' };

export default function EntityProfileDrawer({ entityId, mobile = false }) {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, dossier: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, dossier: null, error: null });
    apiClient.getEntityProfile(entityId).then((dossier) => alive && setState({ loading: false, dossier, error: null }))
      .catch((error) => alive && setState({ loading: false, dossier: null, error: error?.response?.status === 404 ? 'This entity is unavailable in your workspace.' : 'Unable to load this dossier.' }));
    return () => { alive = false; };
  }, [entityId]);
  const close = () => navigate(mobile ? '/hivemind/m/memories' : '/hivemind/app/memories');
  const content = state.loading ? <p className="py-12 text-center text-sm text-[#78716c]">Loading evidence…</p>
    : state.error ? <p className="py-12 text-center text-sm text-[#78716c]">{state.error}</p>
      : <>
        <div className="border-b border-[#ece9e3] px-5 py-5"><p className="font-mono text-[10px] tracking-[0.18em] text-[#78716c] uppercase">Entity dossier</p><h1 className="mt-1 text-2xl font-semibold text-[#0a0a0a]">{state.dossier.entity.canonicalName}</h1><p className="mt-1 text-xs text-[#78716c]">{state.dossier.entity.entityKind} · evidence-backed HIVE projection</p></div>
        <div className="space-y-6 p-5">{['static', 'dynamic', 'relationship', 'historical'].map((factClass) => {
          const facts = state.dossier.facts.filter((fact) => fact.factClass === factClass);
          if (!facts.length) return null;
          return <section key={factClass}><h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#78716c]">{labels[factClass]}</h2><div className="space-y-2">{facts.map((fact) => <article key={fact.id} className="rounded-xl border border-[#e9e5df] bg-[#fffefd] p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-[#1c1917]">{fact.factKey}</span><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${fact.status === 'active' ? 'bg-[#e8f7ee] text-[#18703d]' : 'bg-[#fff1dc] text-[#9a5b00]'}`}>{fact.status}</span></div><p className="mt-1 text-sm text-[#57534e] break-words">{typeof fact.value === 'string' ? fact.value : JSON.stringify(fact.value)}</p><p className="mt-2 text-[11px] text-[#78716c]">Confidence {Math.round(Number(fact.confidence) * 100)}% · updated {new Date(fact.freshnessAt).toLocaleDateString()}</p>{fact.evidence?.length ? <details className="mt-2 text-xs text-[#57534e]"><summary className="cursor-pointer">Why HIVE knows this ({fact.evidence.length})</summary>{fact.evidence.map((e) => <p key={e.id} className="mt-1 border-l-2 border-[#117dff]/30 pl-2">{e.exactQuote || `Memory ${e.memoryId}`}</p>)}</details> : null}</article>)}</div></section>;
        })}</div></>;
  return mobile ? <main className="min-h-screen bg-[#fffefd]"> <button onClick={close} className="m-4 text-sm text-[#57534e]">← Back</button>{content}</main>
    : <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-[520px] overflow-y-auto border-l border-[#e8e4de] bg-[#fffefd] shadow-2xl"><button onClick={close} className="absolute right-4 top-4 z-10 rounded-md border border-[#e8e4de] bg-white px-2 py-1 text-xs">Close</button>{content}</div>;
}
