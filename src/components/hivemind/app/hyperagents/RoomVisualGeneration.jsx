import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Download, Expand, Image as ImageIcon, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import apiClient from '../shared/api-client';

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);
const STAGE_LABELS = {
  queued: 'Queued',
  admitted: 'Workflow admitted',
  context: 'Reading company and Brand DNA',
  art_direction: 'Building art direction',
  generating_anchor: 'Creating the visual system',
  generating_master: 'Rendering the master',
  critiquing: 'Designer quality review',
  generating_variants: 'Producing the coordinated set',
  storing: 'Preparing final files',
  completed: 'Ready for review',
  failed: 'Generation stopped',
};

export function mergeVisualJobs(current, incoming) {
  const byId = new Map((Array.isArray(current) ? current : []).map((job) => [job.job_id, job]));
  (Array.isArray(incoming) ? incoming : []).forEach((job) => {
    if (!job?.job_id) return;
    byId.set(job.job_id, { ...(byId.get(job.job_id) || {}), ...job });
  });
  return [...byId.values()].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

export function visualStageLabel(stage) {
  return STAGE_LABELS[stage] || String(stage || 'working').replaceAll('_', ' ');
}

function normalizedPrompt(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function assignVisualJobsToTurns(jobs, turns) {
  const assignments = new Map((Array.isArray(turns) ? turns : []).map((turn) => [String(turn.id), []]));
  const unassigned = [];
  const candidates = (Array.isArray(turns) ? turns : []).map((turn) => ({
    id: String(turn.id),
    prompt: normalizedPrompt(turn.userMessage || turn.user_message),
  }));
  (Array.isArray(jobs) ? jobs : []).forEach((job) => {
    const sourceTurnId = String(job?.source?.turn_id || '');
    let owner = sourceTurnId && assignments.has(sourceTurnId) ? sourceTurnId : '';
    if (!owner && !sourceTurnId) {
      const instruction = normalizedPrompt(job?.instruction);
      const matching = candidates.filter(({ prompt }) => prompt && instruction.includes(prompt));
      owner = matching.length === 1 ? matching[0].id : '';
    }
    if (owner) assignments.get(owner).push(job);
    else unassigned.push(job);
  });
  return { assignments, unassigned };
}

function assetRatio(asset, job) {
  const ratio = asset?.aspect_ratio || asset?.aspectRatio || job?.output?.aspect_ratios?.[0] || '16:9';
  return ({ '1:1': 'aspect-square', '9:16': 'aspect-[9/16]', '4:5': 'aspect-[4/5]', '3:4': 'aspect-[3/4]', '4:3': 'aspect-[4/3]' })[ratio] || 'aspect-video';
}

function VisualLightbox({ job, asset, onClose }) {
  const url = apiClient.visualGenerationAssetUrl(job.job_id, asset.asset_id);
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#111]/80 p-3 backdrop-blur-sm sm:p-7" role="dialog" aria-modal="true" aria-label="Generated visual preview">
    <div className="flex max-h-full w-full max-w-[1500px] flex-col overflow-hidden rounded-xl border border-white/15 bg-[#161616] shadow-2xl">
      <div className="flex min-h-12 items-center gap-3 border-b border-white/10 px-4 text-white">
        <Sparkles size={14} className="text-[#8bb8ff]" />
        <div className="min-w-0 flex-1 truncate text-[11px] font-medium">Generated visual</div>
        <a href={url} download className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Download visual"><Download size={16} /></a>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close visual"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#0d0d0d] p-3 sm:p-5">
        <img src={url} alt={asset.alt_text || 'Generated visual'} className="mx-auto max-h-[calc(100vh-9rem)] max-w-full object-contain" />
      </div>
    </div>
  </div>;
}

function GeneratingTile({ job, index }) {
  const ratio = job.output?.aspect_ratios?.[index] || job.output?.aspect_ratios?.[0];
  return <div className={`relative min-h-[170px] overflow-hidden rounded-lg border border-[#d8d3cc] bg-[#eae7e1] ${assetRatio({ aspect_ratio: ratio }, job)}`} data-testid="visual-generation-skeleton">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_26%,rgba(83,132,226,0.22),transparent_35%),radial-gradient(circle_at_72%_74%,rgba(32,94,78,0.18),transparent_40%)]" />
    <div className="absolute inset-0 animate-[pulse_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/55 to-transparent motion-reduce:animate-none" />
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-[#514c46] shadow-sm backdrop-blur"><Loader2 size={12} className="animate-spin text-[#256d5b]" /> Rendering {ratio || 'visual'}</div>
    </div>
  </div>;
}

export function VisualJobCard({ job, onPatch, onRefresh, onRetry, onOpen }) {
  const active = !TERMINAL.has(job.status);
  const count = Math.max(1, Number(job.output?.count) || 1);
  const assets = Array.isArray(job.assets) ? job.assets : [];
  const [retrying, setRetrying] = useState(false);
  const statusTitle = job.status === 'completed'
    ? (count === 1 ? 'Image ready' : `${count} images ready`)
    : job.status === 'failed'
      ? 'Image generation needs attention'
      : (count === 1 ? 'Generating image' : `Generating ${count} images`);

  useEffect(() => {
    if (!active || typeof EventSource === 'undefined') return undefined;
    let source;
    try { source = new EventSource(apiClient.visualGenerationEventsUrl(job.job_id), { withCredentials: true }); } catch { return undefined; }
    const update = (event) => {
      try {
        const value = JSON.parse(event.data);
        onPatch(job.job_id, {
          ...(value.stage ? { stage: value.stage } : {}),
          ...(Number.isFinite(Number(value.progress)) ? { progress: Number(value.progress) } : {}),
          ...(value.message ? { last_message: value.message } : {}),
        });
      } catch { /* the periodic room refresh remains the fallback */ }
    };
    source.addEventListener('visual_stage', update);
    source.addEventListener('ping', update);
    source.addEventListener('visual_terminal', () => { source.close(); onRefresh(); });
    return () => source.close();
  }, [active, job.job_id, onPatch, onRefresh]);

  const retry = async () => {
    setRetrying(true);
    try { await onRetry(job); } finally { setRetrying(false); }
  };

  return <section className="overflow-hidden rounded-xl border border-[#d8d3cc] bg-[#f8f7f3] shadow-[0_16px_42px_-34px_rgba(20,27,24,0.55)]" data-testid="room-visual-generation-card" aria-live="polite">
    <div className="flex flex-wrap items-start gap-3 border-b border-[#e1ddd6] bg-white/80 px-4 py-3.5">
      <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${job.status === 'failed' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#c9d8d1] bg-[#edf5f1] text-[#256d5b]'}`}>
        {job.status === 'completed' ? <Check size={16} /> : job.status === 'failed' ? <AlertTriangle size={16} /> : <Sparkles size={15} className="animate-pulse" />}
        {active ? <span className="absolute inset-1 animate-ping rounded-md border border-[#4d8c79]/35 motion-reduce:animate-none" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-mono font-semibold uppercase tracking-[0.16em] text-[#256d5b]">Visual studio</div>
        <h3 className="mt-1 text-[13px] font-semibold leading-5 text-[#24211f]">{statusTitle}</h3>
        <p className={`mt-1 text-[10.5px] ${job.status === 'failed' ? 'text-red-700' : 'text-[#777168]'}`}>{job.status === 'failed' ? (job.error?.message || 'The workflow could not complete this visual.') : (job.last_message || visualStageLabel(job.stage))}</p>
      </div>
      <div className="shrink-0 text-right"><div className="text-[17px] font-semibold tabular-nums text-[#24211f]">{Math.max(0, Math.min(100, Number(job.progress) || 0))}%</div><div className="text-[8px] font-mono uppercase tracking-wider text-[#99928a]">{job.quality || 'quality'}</div></div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[#dfdcd5]"><div className={`h-full rounded-full transition-[width] duration-500 ${job.status === 'failed' ? 'bg-red-500' : 'bg-[#256d5b]'}`} style={{ width: `${Math.max(2, Math.min(100, Number(job.progress) || 0))}%` }} /></div>
    </div>
    <div className={`grid gap-3 p-3 ${count === 1 ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
      {assets.length ? assets.map((asset) => {
        const url = apiClient.visualGenerationAssetUrl(job.job_id, asset.asset_id);
        return <button key={asset.asset_id} type="button" onClick={() => onOpen(job, asset)} className="group min-w-0 text-left" data-testid="visual-generation-ready">
          <div className={`relative overflow-hidden rounded-lg border border-[#d8d3cc] bg-[#eae7e1] ${assetRatio(asset, job)}`}><img src={url} alt={asset.alt_text || 'Generated visual'} className="h-full w-full object-cover opacity-0 transition duration-700 group-hover:scale-[1.015]" onLoad={(event) => event.currentTarget.classList.remove('opacity-0')} /><span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><Expand size={14} /></span></div>
          <div className="mt-1.5 flex items-center justify-between gap-2 px-0.5 text-[9.5px] text-[#6f6962]"><span>{asset.aspect_ratio || job.output?.aspect_ratios?.[0] || 'visual'}</span><span className="text-emerald-700">Rendered + reviewed</span></div>
        </button>;
      }) : active ? Array.from({ length: count }).map((unused, index) => <GeneratingTile key={index} job={job} index={index} />) : null}
      {job.status === 'failed' ? <div className="col-span-full flex min-h-[130px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-red-200 bg-red-50/40 px-5 text-center"><ImageIcon size={22} className="text-red-400" /><p className="max-w-lg text-[10.5px] leading-5 text-red-700">The request is retained. Retry starts a new durable attempt with the same brief and Room context.</p><button type="button" disabled={retrying} onClick={retry} className="inline-flex h-8 items-center gap-2 rounded-md bg-[#171717] px-3 text-[10px] font-semibold text-white disabled:opacity-50">{retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}Retry visual</button></div> : null}
    </div>
  </section>;
}

export function useRoomVisualGeneration(roomId, turnRunning = false) {
  const [jobs, setJobs] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const value = await apiClient.listVisualGenerationJobs(roomId);
      setJobs((current) => mergeVisualJobs(current, value?.jobs));
      setError('');
    } catch (reason) {
      setError(reason?.response?.status === 404 ? '' : 'Visual progress is reconnecting…');
    }
  }, [roomId]);

  const hasActive = jobs.some((job) => !TERMINAL.has(job.status));

  useEffect(() => {
    let stopped = false;
    const run = () => { if (!stopped) refresh(); };
    run();
    const timer = window.setInterval(run, turnRunning || hasActive ? 1800 : 8000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [hasActive, refresh, turnRunning]);

  const patch = useCallback((jobId, value) => setJobs((current) => current.map((job) => job.job_id === jobId ? { ...job, ...value } : job)), []);
  const retry = useCallback(async (job) => {
    const created = await apiClient.retryVisualGenerationJob(job);
    setJobs((current) => mergeVisualJobs(current, [created]));
    await refresh();
  }, [refresh]);
  return { jobs, error, patch, refresh, retry, lightbox, setLightbox };
}

export default function RoomVisualGeneration({ controller, jobs: suppliedJobs, showError = true }) {
  const jobs = useMemo(() => (Array.isArray(suppliedJobs) ? suppliedJobs : []), [suppliedJobs]);
  const activeJobs = useMemo(() => jobs.slice(0, 12), [jobs]);
  const { error = '', patch, refresh, retry, lightbox, setLightbox } = controller || {};
  if (!activeJobs.length && (!showError || !error)) return null;

  return <div className="space-y-3" aria-label="Room visual generation">
    {activeJobs.map((job) => <VisualJobCard key={job.job_id} job={job} onPatch={patch} onRefresh={refresh} onRetry={retry} onOpen={(selectedJob, asset) => setLightbox({ job: selectedJob, asset })} />)}
    {showError && error ? <div className="flex items-center gap-2 px-1 text-[10px] text-[#777168]"><Loader2 size={11} className="animate-spin" />{error}</div> : null}
    {lightbox ? <VisualLightbox job={lightbox.job} asset={lightbox.asset} onClose={() => setLightbox(null)} /> : null}
  </div>;
}
