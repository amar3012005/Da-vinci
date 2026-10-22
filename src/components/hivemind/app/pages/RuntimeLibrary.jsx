import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileCode2, FileImage, FileText, Folder, Link2, Search } from 'lucide-react';
import { artifactShareUrl, artifactUrl, folderLabel, libraryUrl, taskLabel } from '../shared/runtime-library';

function TypeIcon({ mediaType }) {
  const type = String(mediaType || '');
  if (type.startsWith('image/')) return <FileImage size={18} aria-hidden="true" />;
  if (type.includes('html') || type.includes('json') || type.includes('javascript')) return <FileCode2 size={18} aria-hidden="true" />;
  return <FileText size={18} aria-hidden="true" />;
}

function formatUpdated(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Per-tenant Library of saved Runtime and specialist artifacts, grouped by
 * folder like the Projects Library. Titles and folders only; never raw IDs.
 */
export default function RuntimeLibrary() {
  const [params, setParams] = useSearchParams();
  const folder = params.get('folder') || '';
  const [query, setQuery] = useState(params.get('query') || '');
  const [folders, setFolders] = useState(null);
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [state, setState] = useState('loading');
  const request = useRef(0);

  const load = useCallback(async (cursor) => {
    const id = ++request.current;
    if (!cursor) setState('loading');
    try {
      const response = await fetch(libraryUrl({ folder, query: params.get('query') || '', cursor }), { credentials: 'include', cache: 'no-store' });
      if (id !== request.current) return;
      if (response.status === 404) { setState('unavailable'); return; }
      if (!response.ok) throw new Error('library_unavailable');
      const value = await response.json();
      if (id !== request.current) return;
      if (Array.isArray(value.folders)) setFolders(value.folders);
      setItems(previous => (cursor && previous ? [...previous, ...(value.items || [])] : (value.items || [])));
      setNext(value.next || null);
      setState('ready');
    } catch {
      if (id === request.current) setState('error');
    }
  }, [folder, params]);

  useEffect(() => { void load(null); }, [load]);

  const copyLink = async item => {
    try {
      await navigator.clipboard.writeText(artifactShareUrl(item, window.location.origin));
    } catch {
      // Clipboard access can be denied; the row's open link still works.
    }
  };
  const chooseFolder = value => {
    const nextParams = new URLSearchParams(params);
    if (value) nextParams.set('folder', value); else nextParams.delete('folder');
    setParams(nextParams, { replace: true });
  };
  const submitSearch = event => {
    event.preventDefault();
    const nextParams = new URLSearchParams(params);
    if (query.trim()) nextParams.set('query', query.trim()); else nextParams.delete('query');
    setParams(nextParams, { replace: true });
  };

  return <div className="flex h-full min-h-0 bg-[#faf9f4] text-[#262626]">
    <nav aria-label="Library folders" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-[#e7e4dd] p-4 md:flex">
      <h1 className="mb-3 px-2 text-lg font-semibold">Library</h1>
      <button type="button" onClick={() => chooseFolder('')} className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${!folder ? 'bg-[#efede6] font-medium' : 'hover:bg-[#f3f1ec]'}`}>
        <span className="flex items-center gap-2"><Folder size={15} aria-hidden="true" />All files</span>
      </button>
      {(folders || []).map(entry => <button key={entry.folder} type="button" onClick={() => chooseFolder(entry.folder)} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${folder === entry.folder ? 'bg-[#efede6] font-medium' : 'hover:bg-[#f3f1ec]'}`}>
        <span className="flex min-w-0 items-center gap-2"><Folder size={15} className="shrink-0" aria-hidden="true" /><span className="truncate">{folderLabel(entry.folder)}</span></span>
        <span className="text-xs text-[#8b8b86]">{entry.count}</span>
      </button>)}
    </nav>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#e7e4dd] px-4 py-3 md:px-6">
        <h2 className="mr-auto text-base font-semibold">{folderLabel(folder)}</h2>
        <select aria-label="Folder" value={folder} onChange={event => chooseFolder(event.target.value)} className="rounded-md border border-[#e3e0db] bg-white px-2 py-1.5 text-sm md:hidden">
          <option value="">All files</option>
          {(folders || []).map(entry => <option key={entry.folder} value={entry.folder}>{folderLabel(entry.folder)}</option>)}
        </select>
        <form onSubmit={submitSearch} className="flex w-full items-center gap-2 rounded-md border border-[#e3e0db] bg-white px-2 sm:w-72" role="search">
          <Search size={15} className="text-[#8b8b86]" aria-hidden="true" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search files" aria-label="Search files" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none" />
        </form>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6" aria-live="polite">
        {state === 'loading' && !items && <p className="py-10 text-center text-sm text-[#737373]">Loading files…</p>}
        {state === 'unavailable' && <p className="py-10 text-center text-sm text-[#737373]">The Library isn’t available for this workspace yet.</p>}
        {state === 'error' && <p role="alert" className="py-10 text-center text-sm text-[#737373]">Files couldn’t be loaded. <button type="button" className="underline" onClick={() => void load(null)}>Try again</button></p>}
        {items && items.length === 0 && state === 'ready' && <p className="py-10 text-center text-sm text-[#737373]">No files here yet. Saved deliverables from Runtime and your team appear here.</p>}
        {items && items.length > 0 && <ul className="divide-y divide-[#ece9e2]">
          {items.map(item => <li key={`${item.artifactId}:${item.latestVersion}`} className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#f1efe9] text-[#5f6368]"><TypeIcon mediaType={item.mediaType} /></span>
            <a href={artifactUrl(item)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium hover:underline">{item.title || 'Untitled file'}</span>
              <span className="block truncate text-xs text-[#7a7f86]">{[item.producerName, folderLabel(item.folder), taskLabel(item), item.latestVersion > 1 ? `Version ${item.latestVersion}` : null, formatUpdated(item.updatedAt)].filter(Boolean).join(' · ')}</span>
            </a>
            <a href={artifactUrl(item)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title || 'file'}`} className="rounded-md p-1.5 text-[#5f6368] hover:bg-[#efede6]"><ExternalLink size={16} /></a>
            <a href={artifactUrl(item, true)} aria-label={`Download ${item.title || 'file'}`} className="rounded-md p-1.5 text-[#5f6368] hover:bg-[#efede6]"><Download size={16} /></a>
            <button type="button" aria-label={`Copy link to ${item.title || 'file'}`} onClick={() => copyLink(item)} className="rounded-md p-1.5 text-[#5f6368] hover:bg-[#efede6]"><Link2 size={16} /></button>
          </li>)}
        </ul>}
        {next && <div className="py-4 text-center"><button type="button" onClick={() => void load(next)} className="rounded-md border border-[#e3e0db] bg-white px-3 py-1.5 text-sm hover:bg-[#f3f1ec]">Load more</button></div>}
      </section>
    </main>
  </div>;
}
