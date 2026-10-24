import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check, ChevronRight, Download, ExternalLink, FileCode2, FileImage, FileSpreadsheet, FileText, File as FileIcon,
  Folder, FolderOpen, LayoutGrid, Link2, List, RefreshCw, Search, X,
} from 'lucide-react';
import {
  LIBRARY_KINDS, artifactShareUrl, artifactUrl, fetchLibraryPage, filterLibraryItems, folderLabel, folderTree,
  formatShortDate, libraryUrl, mediaBadge, mediaKind, mergeLibraryPage, readLibraryFirstPage, taskLabel,
} from '../shared/runtime-library';
import { pageCache } from '../shared/resource-cache';
import '../shared/skeleton.css';
import './runtime-library.css';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3484ff]';
const VIEW_KEY = 'hm.library.view';
/** A cached first page younger than this paints without a revalidation request. */
const FRESH_MS = 15000;
const SEARCH_DEBOUNCE_MS = 300;
const folderOf = url => new URL(url, 'http://library.local').searchParams.get('folder') || '';

const KIND_STYLE = {
  document: { Icon: FileText, tile: 'bg-[#edf1f7] text-[#41608f]' },
  sheet: { Icon: FileSpreadsheet, tile: 'bg-[#ebf4ee] text-[#2f6b45]' },
  image: { Icon: FileImage, tile: 'bg-[#f3eef6] text-[#6c4f86]' },
  web: { Icon: FileCode2, tile: 'bg-[#f1efe9] text-[#5d5a52]' },
  other: { Icon: FileIcon, tile: 'bg-[#f1efe9] text-[#6b6860]' },
};

function readView() {
  try { return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
}

function TypeTile({ item, size = 'lg' }) {
  const kind = mediaKind(item.mediaType, item.title);
  const { Icon, tile } = KIND_STYLE[kind];
  if (size === 'sm') return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tile}`}><Icon size={18} aria-hidden="true" /></span>;
  return <span className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${tile}`}>
    <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
    <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em]">{mediaBadge(item.mediaType, item.title)}</span>
  </span>;
}

/** Fixed 4:3 box: the thumbnail never shifts layout while it loads, and falls back to the type tile. */
function Thumbnail({ item }) {
  const [failed, setFailed] = useState(false);
  const image = mediaKind(item.mediaType, item.title) === 'image' && !failed;
  return <span className="relative block aspect-[4/3] overflow-hidden bg-[#f3f1ec]">
    <TypeTile item={item} />
    {image ? <img src={item.thumbnailUrl || artifactUrl(item)} alt="" loading="lazy" decoding="async" width="320" height="240"
      onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" /> : null}
  </span>;
}

function itemMeta(item, now) {
  return [item.producerName, formatShortDate(item.updatedAt, now), item.latestVersion > 1 ? `v${item.latestVersion}` : null].filter(Boolean).join(' · ');
}

function ItemActions({ item, copied, onCopy, overlay = false }) {
  const name = item.title || 'file';
  const button = `grid h-10 w-10 place-items-center rounded-lg text-[#5f6368] hover:bg-[#efede6] hover:text-[#1f2328] ${FOCUS}`;
  return <div className={overlay ? 'hm-library-card-actions absolute right-2 top-2 flex gap-1 rounded-xl bg-white/95 p-0.5 shadow-sm' : 'flex shrink-0 items-center'}>
    {!overlay ? <a href={artifactUrl(item)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`} title="Open" className={button}><ExternalLink size={16} /></a> : null}
    <a href={artifactUrl(item, true)} aria-label={`Download ${name}`} title="Download" className={button}><Download size={16} /></a>
    <button type="button" aria-label={copied ? `Link to ${name} copied` : `Copy link to ${name}`} title={copied ? 'Copied' : 'Copy link'} onClick={() => onCopy(item)} className={button}>
      {copied ? <Check size={16} className="text-[#15803d]" /> : <Link2 size={16} />}
    </button>
  </div>;
}

const GalleryCard = memo(function GalleryCard({ item, copied, onCopy, now }) {
  return <li className="hm-library-item group relative min-w-0 overflow-hidden rounded-xl border border-[#e7e4dd] bg-white transition-shadow hover:shadow-[0_10px_28px_-18px_rgba(30,30,25,0.45)] focus-within:border-[#c9c5bc]">
    <a href={artifactUrl(item)} target="_blank" rel="noopener noreferrer" className={`block rounded-xl ${FOCUS}`}>
      <Thumbnail item={item} />
      <span className="block px-3 pb-3 pt-2.5">
        <span className="line-clamp-2 block min-h-[2.5rem] text-[13px] font-medium leading-5 text-[#20252a]">{item.title || 'Untitled file'}</span>
        <span className="hm-library-meta mt-1 block min-h-[18px] truncate text-[11.5px] leading-[18px] text-[#7a7f86]">{itemMeta(item, now)}</span>
      </span>
    </a>
    <ItemActions item={item} copied={copied} onCopy={onCopy} overlay />
  </li>;
});

const ListRow = memo(function ListRow({ item, copied, onCopy, now }) {
  return <li className="hm-library-item flex min-h-[60px] items-center gap-3 px-2 py-2 sm:px-3">
    <TypeTile item={item} size="sm" />
    <a href={artifactUrl(item)} target="_blank" rel="noopener noreferrer" className={`min-w-0 flex-1 rounded-md ${FOCUS}`}>
      <span className="block truncate text-[13.5px] font-medium text-[#20252a] hover:underline">{item.title || 'Untitled file'}</span>
      <span className="block truncate text-[11.5px] text-[#7a7f86] sm:hidden">{itemMeta(item, now)}</span>
      <span className="hidden truncate text-[11.5px] text-[#7a7f86] sm:block">{[folderLabel(item.folder), taskLabel(item)].filter(Boolean).join(' · ')}</span>
    </a>
    <span className="hidden w-36 shrink-0 truncate text-[12px] text-[#5f646b] md:block">{item.producerName || '—'}</span>
    <span className="hidden w-28 shrink-0 truncate text-right text-[12px] text-[#5f646b] sm:block">{formatShortDate(item.updatedAt, now)}{item.latestVersion > 1 ? ` · v${item.latestVersion}` : ''}</span>
    <ItemActions item={item} copied={copied} onCopy={onCopy} />
  </li>;
});

function Skeleton({ view }) {
  if (view === 'list') return <ul className="divide-y divide-[#ece9e2] rounded-xl border border-[#e7e4dd] bg-white" aria-hidden="true">
    {Array.from({ length: 7 }, (unused, index) => <li key={index} className="flex items-center gap-3 px-3 py-3">
      <span className="hm-skeleton h-10 w-10 rounded-lg" />
      <span className="flex-1 space-y-2"><span className="hm-skeleton block h-3 w-2/5 rounded" /><span className="hm-skeleton block h-2.5 w-1/4 rounded" /></span>
    </li>)}
  </ul>;
  return <ul className="hm-library-grid" aria-hidden="true">
    {Array.from({ length: 8 }, (unused, index) => <li key={index} className="overflow-hidden rounded-xl border border-[#e7e4dd] bg-white">
      <span className="hm-skeleton block aspect-[4/3]" />
      <span className="block space-y-2 p-3"><span className="hm-skeleton block h-3 w-4/5 rounded" /><span className="hm-skeleton block h-2.5 w-1/2 rounded" /></span>
    </li>)}
  </ul>;
}

function FolderButton({ active, onClick, icon: Icon, label, count, nested = false }) {
  return <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
    className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] ${nested ? 'pl-8' : ''} ${active ? 'bg-[#ebe8df] font-medium text-[#1f2328]' : 'text-[#3d4249] hover:bg-[#f1efe9]'} ${FOCUS}`}>
    <span className="flex min-w-0 items-center gap-2">{Icon ? <Icon size={15} className="shrink-0 text-[#747970]" aria-hidden="true" /> : null}<span className="truncate">{label}</span></span>
    {count !== undefined ? <span className="shrink-0 text-[11px] tabular-nums text-[#8b8b86]">{count}</span> : null}
  </button>;
}

/**
 * Per-tenant Library of saved Runtime and specialist artifacts: folder tree,
 * sticky search and type filter, gallery or list view. Shows titles, owners,
 * dates and folders only; never raw ids. The first page of each folder and
 * search is cached for the document, painted immediately on return, and
 * revalidated in the background.
 */
export default function RuntimeLibrary() {
  const [params, setParams] = useSearchParams();
  const folder = params.get('folder') || '';
  const query = params.get('query') || '';
  const kind = LIBRARY_KINDS.some(entry => entry.id === params.get('type')) ? params.get('type') : 'all';
  const key = libraryUrl({ folder, query });
  const [text, setText] = useState(query);
  const [view, setViewState] = useState(readView);
  const initial = pageCache.read(key)?.value;
  const [page, setPage] = useState(() => ({ key, folder, items: initial ? mergeLibraryPage(null, initial.items) : null, next: initial?.next || null }));
  const [folders, setFolders] = useState(() => initial?.folders || null);
  const [status, setStatus] = useState(initial?.unavailable ? 'unavailable' : initial ? 'ready' : 'loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const currentKey = useRef(key);
  const moreController = useRef(null);
  const scroller = useRef(null);
  const sentinel = useRef(null);

  const apply = useCallback((value, forKey) => {
    if (currentKey.current !== forKey) return;
    if (value?.unavailable) { setStatus('unavailable'); return; }
    if (Array.isArray(value?.folders)) setFolders(value.folders);
    setPage(current => ({ key: forKey, folder: current.key === forKey ? current.folder : folderOf(forKey), items: mergeLibraryPage(null, value?.items || []), next: value?.next || null }));
    setStatus('ready');
    setNow(Date.now());
  }, []);

  const revalidate = useCallback((forKey, { force = false } = {}) => {
    const cached = pageCache.read(forKey);
    if (!force && cached && Date.now() - cached.at < FRESH_MS) return;
    if (!cached) setStatus('loading'); else setStatus('refreshing');
    pageCache.load(forKey, () => readLibraryFirstPage(forKey)).then(value => apply(value, forKey)).catch(() => {
      if (currentKey.current !== forKey) return;
      setStatus(pageCache.read(forKey) ? 'ready' : 'error');
    });
  }, [apply]);

  useEffect(() => {
    currentKey.current = key;
    moreController.current?.abort();
    setLoadingMore(false);
    const cached = pageCache.read(key)?.value;
    if (cached) apply(cached, key);
    // A new search inside the same folder keeps the current rows (filtered locally) until its page arrives.
    else setPage(current => (current.folder === folder && current.items ? { key, folder, items: current.items, next: null } : { key, folder, items: null, next: null }));
    revalidate(key);
  }, [key, folder, apply, revalidate]);

  useEffect(() => () => moreController.current?.abort(), []);
  // Follow external URL changes (history navigation) without overwriting text typed after a debounced push.
  const pushedQuery = useRef(query);
  useEffect(() => {
    if (query !== pushedQuery.current) setText(query);
    pushedQuery.current = query;
  }, [query]);

  const updateParams = useCallback(change => {
    const nextParams = new URLSearchParams(params);
    for (const [name, value] of Object.entries(change)) {
      if (value) nextParams.set(name, value); else nextParams.delete(name);
    }
    setParams(nextParams, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === query) return undefined;
    const timer = window.setTimeout(() => { pushedQuery.current = trimmed; updateParams({ query: trimmed }); }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, query, updateParams]);

  const loadMore = useCallback(async () => {
    if (!page.next || loadingMore || page.key !== currentKey.current) return;
    const forKey = page.key;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    try {
      const value = await fetchLibraryPage(libraryUrl({ folder, query, cursor: page.next }), { signal: controller.signal });
      if (currentKey.current !== forKey) return;
      setPage(current => (current.key === forKey ? { ...current, items: mergeLibraryPage(current.items, value.items || []), next: value.next || null } : current));
    } catch {
      // An aborted or failed page keeps the rows already shown; the button retries.
    } finally {
      if (moreController.current === controller) setLoadingMore(false);
    }
  }, [page, loadingMore, folder, query]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || !page.next || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void loadMore(); }, { root: scroller.current, rootMargin: '480px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [page.next, loadMore]);

  const copyLink = useCallback(async item => {
    try {
      await navigator.clipboard.writeText(artifactShareUrl(item, window.location.origin));
      setCopiedId(item.artifactId);
      window.setTimeout(() => setCopiedId(current => (current === item.artifactId ? null : current)), 1600);
    } catch {
      // Clipboard access can be denied; the open link still works.
    }
  }, []);

  const setView = value => {
    setViewState(value);
    try { window.localStorage.setItem(VIEW_KEY, value); } catch { /* per-viewer preference only */ }
  };
  const chooseFolder = value => {
    updateParams({ folder: value });
    scroller.current?.scrollTo?.({ top: 0 });
  };

  const tree = useMemo(() => folderTree(folders), [folders]);
  const totalCount = useMemo(() => (folders || []).reduce((sum, entry) => sum + (Number(entry.count) || 0), 0), [folders]);
  const visible = useMemo(() => filterLibraryItems(page.items, { kind, text }), [page.items, kind, text]);
  const activeRoot = folder.split('/')[0] || '';
  const activeGroup = tree.find(group => group.folder === activeRoot);
  const folderCount = !folder ? totalCount : (folders || []).filter(entry => entry.folder === folder || entry.folder.startsWith(`${folder}/`)).reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
  const crumbs = folder ? folder.split('/').filter(Boolean).map((part, index, parts) => ({ label: part, folder: parts.slice(0, index + 1).join('/') })) : [];
  const filtered = kind !== 'all' || Boolean(query) || text.trim() !== query;
  const items = page.items;
  const showSkeleton = status === 'loading' && !items;

  return <div className="hm-library flex h-full min-h-0 w-full min-w-0 bg-[#faf9f4] text-[#262626]">
    <nav aria-label="Library folders" className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[#e7e4dd] px-3 py-5 md:flex">
      <h1 className="mb-3 px-2.5 text-[17px] font-semibold tracking-[-0.01em] text-[#1f2328]">Library</h1>
      <FolderButton active={!folder} onClick={() => chooseFolder('')} icon={FolderOpen} label="All files" count={folders ? totalCount : undefined} />
      {tree.map(group => <React.Fragment key={group.folder}>
        <FolderButton active={folder === group.folder} onClick={() => chooseFolder(group.folder)} icon={Folder} label={group.label} count={group.count} />
        {group.children.length && activeRoot === group.folder ? group.children.map(child => <FolderButton key={child.folder} nested active={folder === child.folder} onClick={() => chooseFolder(child.folder)} label={child.label} count={child.count} />) : null}
      </React.Fragment>)}
      {!folders && status !== 'unavailable' ? <div className="mt-1 space-y-2 px-2.5" aria-hidden="true">{[70, 55, 62].map(width => <span key={width} className="hm-skeleton block h-7 rounded-lg" style={{ width: `${width}%` }} />)}</div> : null}
    </nav>
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-[#e7e4dd] bg-[#faf9f4] px-4 pb-3 pt-4 md:px-6">
        <div className="flex min-w-0 items-end justify-between gap-3">
          <div className="min-w-0">
            <nav aria-label="Folder path" className="flex min-w-0 items-center gap-1 text-[12px] text-[#7a7f86]">
              <button type="button" onClick={() => chooseFolder('')} className={`shrink-0 rounded hover:text-[#1f2328] ${FOCUS}`}><span className="md:hidden">Library</span><span className="hidden md:inline">All files</span></button>
              {crumbs.map(crumb => <React.Fragment key={crumb.folder}><ChevronRight size={12} className="shrink-0" aria-hidden="true" /><button type="button" onClick={() => chooseFolder(crumb.folder)} className={`truncate rounded hover:text-[#1f2328] ${FOCUS}`}>{crumb.label}</button></React.Fragment>)}
            </nav>
            <h2 className="mt-0.5 truncate text-[20px] font-semibold tracking-[-0.02em] text-[#1f2328]">{folder ? crumbs.at(-1)?.label : 'All files'}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[12px] tabular-nums text-[#7a7f86] sm:inline" aria-live="polite">{folders ? `${folderCount} ${folderCount === 1 ? 'file' : 'files'}` : ''}</span>
            <button type="button" onClick={() => revalidate(key, { force: true })} aria-label="Refresh files" title="Refresh" className={`grid h-10 w-10 place-items-center rounded-lg text-[#5f6368] hover:bg-[#efede6] ${FOCUS}`}><RefreshCw size={16} className={status === 'refreshing' ? 'hm-library-spin' : ''} /></button>
            <div className="flex rounded-lg border border-[#e3e0db] bg-white p-0.5" role="group" aria-label="View">
              {[['grid', LayoutGrid, 'Gallery view'], ['list', List, 'List view']].map(([value, Icon, label]) => <button key={value} type="button" onClick={() => setView(value)} aria-pressed={view === value} aria-label={label} title={label}
                className={`grid h-9 w-9 place-items-center rounded-md ${view === value ? 'bg-[#efede6] text-[#1f2328]' : 'text-[#7a7f86] hover:text-[#1f2328]'} ${FOCUS}`}><Icon size={16} /></button>)}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <form role="search" onSubmit={event => { event.preventDefault(); updateParams({ query: text.trim() }); }} className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e3e0db] bg-white px-3 focus-within:border-[#9fb4cf] sm:max-w-sm">
            <Search size={15} className="shrink-0 text-[#8b8b86]" aria-hidden="true" />
            <input value={text} onChange={event => setText(event.target.value)} placeholder="Search files" aria-label="Search files" type="search" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[#9a9a94]" />
            {text ? <button type="button" onClick={() => { setText(''); updateParams({ query: '' }); }} aria-label="Clear search" className={`-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#8b8b86] hover:text-[#1f2328] ${FOCUS}`}><X size={15} /></button> : null}
          </form>
          <div className="hm-library-chips -mx-4 flex min-w-0 gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0" role="group" aria-label="File type">
            {LIBRARY_KINDS.map(entry => <button key={entry.id} type="button" onClick={() => updateParams({ type: entry.id === 'all' ? '' : entry.id })} aria-pressed={kind === entry.id}
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] ${kind === entry.id ? 'border-[#1f2328] bg-[#1f2328] text-white' : 'border-[#e3e0db] bg-white text-[#3d4249] hover:border-[#c9c5bc]'} ${FOCUS}`}>{entry.label}</button>)}
          </div>
        </div>
        {tree.length ? <div className="hm-library-chips -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 md:hidden" role="group" aria-label="Folders">
          {[{ folder: '', label: 'All files' }, ...tree].map(group => <button key={group.folder || 'all'} type="button" onClick={() => chooseFolder(group.folder)} aria-pressed={activeRoot === group.folder}
            className={`flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] ${activeRoot === group.folder ? 'bg-[#ebe8df] font-medium text-[#1f2328]' : 'text-[#3d4249] hover:bg-[#f1efe9]'} ${FOCUS}`}><Folder size={14} aria-hidden="true" />{group.label}</button>)}
          {activeGroup?.children.map(child => <button key={child.folder} type="button" onClick={() => chooseFolder(child.folder)} aria-pressed={folder === child.folder}
            className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] ${folder === child.folder ? 'border-[#1f2328] text-[#1f2328]' : 'border-dashed border-[#d8d4cb] text-[#5f646b]'} ${FOCUS}`}>{child.label}</button>)}
        </div> : null}
      </header>
      <section ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 md:px-6" aria-label={`${folderLabel(folder)} files`} aria-busy={showSkeleton || status === 'refreshing' || undefined}>
        {showSkeleton ? <Skeleton view={view} /> : null}
        {status === 'unavailable' ? <EmptyState title="The Library isn’t available here yet" body="Saved deliverables from Runtime and your team appear here once this workspace is connected." /> : null}
        {status === 'error' ? <div role="alert"><EmptyState title="Files couldn’t be loaded" body="Your files are safe. Check your connection and try again." action={<button type="button" onClick={() => revalidate(key, { force: true })} className={`mt-4 h-10 rounded-lg border border-[#e3e0db] bg-white px-4 text-[13px] font-medium hover:border-[#c9c5bc] ${FOCUS}`}>Try again</button>} /></div> : null}
        {items && status !== 'unavailable' && status !== 'error' && visible.length === 0 ? <EmptyState
          title={filtered ? 'No matching files' : folder ? 'This folder is empty' : 'No files yet'}
          body={filtered ? 'Try another search or file type.' : 'Saved deliverables from Runtime and your team appear here.'}
          action={filtered ? <button type="button" onClick={() => { setText(''); updateParams({ query: '', type: '' }); }} className={`mt-4 h-10 rounded-lg border border-[#e3e0db] bg-white px-4 text-[13px] font-medium hover:border-[#c9c5bc] ${FOCUS}`}>Clear filters</button> : null} /> : null}
        {items && visible.length > 0 && status !== 'unavailable' ? (view === 'grid'
          ? <ul className="hm-library-grid">{visible.map(item => <GalleryCard key={item.artifactId} item={item} copied={copiedId === item.artifactId} onCopy={copyLink} now={now} />)}</ul>
          : <div className="overflow-hidden rounded-xl border border-[#e7e4dd] bg-white">
            <div className="hidden items-center gap-3 border-b border-[#ece9e2] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[#8b8b86] sm:flex" aria-hidden="true">
              <span className="w-10" /><span className="flex-1">Name</span><span className="hidden w-36 md:block">Owner</span><span className="w-28 text-right">Updated</span><span className="w-[120px]" />
            </div>
            <ul className="divide-y divide-[#ece9e2]">{visible.map(item => <ListRow key={item.artifactId} item={item} copied={copiedId === item.artifactId} onCopy={copyLink} now={now} />)}</ul>
          </div>) : null}
        {page.next && items ? <div ref={sentinel} className="flex justify-center pt-5">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className={`h-10 rounded-lg border border-[#e3e0db] bg-white px-4 text-[13px] font-medium text-[#3d4249] hover:border-[#c9c5bc] disabled:opacity-60 ${FOCUS}`}>{loadingMore ? 'Loading…' : 'Load more'}</button>
        </div> : null}
      </section>
    </main>
  </div>;
}

function EmptyState({ title, body, action }) {
  return <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f1efe9] text-[#8b8b86]"><FolderOpen size={24} aria-hidden="true" /></span>
    <h3 className="mt-4 text-[15px] font-semibold text-[#1f2328]">{title}</h3>
    <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{body}</p>
    {action}
  </div>;
}
