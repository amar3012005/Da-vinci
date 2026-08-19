/**
 * <T> — runtime auto-translate component.
 *
 * Drop-in around any English string the codebase hasn't statically wrapped
 * with i18next t() yet. On non-English locales:
 *
 *   1. Hash the text + current lang → cache key.
 *   2. Cache hit (IndexedDB or in-memory) → render translation immediately.
 *   3. Cache miss → render source verbatim, queue the string into a
 *      debounced batch that POSTs to /api/translate, populates cache,
 *      then re-renders.
 *
 * Behaves like a normal React component:
 *
 *   <T>Save memory</T>
 *   <T params={{count: 5}}>{{count}} memories saved</T>
 *   <T fallback="Loading…">Initialising HIVEMIND…</T>
 *
 * Side-effect free for English (no fetch, no cache work).
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// ── IndexedDB cache (Web-Worker-friendly, persistent across reloads) ────────

const DB_NAME = 'hivemind:i18n';
const DB_STORE = 'translations';
let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
  });
  return _dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// In-memory mirror so renders within the same session don't go to IDB.
const memoryCache = new Map(); // key → translation

function cacheKey(text, lang) {
  return `${lang}:${text}`;
}

// ── Batch translate queue ──────────────────────────────────────────────────

const pendingQueue = new Map(); // text → Set<resolverFn>
let flushTimer = null;
const FLUSH_DEBOUNCE_MS = 120;
const MAX_BATCH = 100;

function getApiBase() {
  return (
    (typeof process !== 'undefined' && process.env?.REACT_APP_CORE_API_URL) ||
    'https://core.singulancelabs.com'
  );
}

async function flushQueue(lang) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingQueue.size === 0) return;
  const all = [...pendingQueue.entries()];
  // Take up to MAX_BATCH, leave the rest for the next flush
  const batch = all.slice(0, MAX_BATCH);
  for (const [t] of batch) pendingQueue.delete(t);

  const texts = batch.map(([t]) => t);
  try {
    const resp = await fetch(`${getApiBase()}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ texts, target_lang: lang }),
    });
    if (!resp.ok) throw new Error(`translate ${resp.status}`);
    const data = await resp.json();
    const translations = Array.isArray(data.translations) ? data.translations : texts;
    for (let i = 0; i < batch.length; i++) {
      const [text, resolvers] = batch[i];
      const tr = translations[i] || text;
      const k = cacheKey(text, lang);
      memoryCache.set(k, tr);
      idbSet(k, tr).catch(() => {});
      for (const r of resolvers) r(tr);
    }
  } catch (err) {
    // On failure, resolve with source so the UI never blocks.
    for (const [text, resolvers] of batch) {
      for (const r of resolvers) r(text);
    }
  }
  // Re-queue tail if any remained
  if (pendingQueue.size > 0) scheduleFlush(lang);
}

function scheduleFlush(lang) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flushQueue(lang), FLUSH_DEBOUNCE_MS);
}

function queueTranslate(text, lang) {
  return new Promise((resolve) => {
    let set = pendingQueue.get(text);
    if (!set) {
      set = new Set();
      pendingQueue.set(text, set);
    }
    set.add(resolve);
    scheduleFlush(lang);
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Sync resolver — looks up in-memory cache, returns null on miss.
 */
function lookupSync(text, lang) {
  if (!lang || lang === 'en') return text;
  const k = cacheKey(text, lang);
  return memoryCache.has(k) ? memoryCache.get(k) : null;
}

/**
 * Async resolver — checks IDB then queues translation.
 */
async function resolveAsync(text, lang) {
  if (!lang || lang === 'en') return text;
  const k = cacheKey(text, lang);
  if (memoryCache.has(k)) return memoryCache.get(k);
  const fromIdb = await idbGet(k);
  if (typeof fromIdb === 'string' && fromIdb.length > 0) {
    memoryCache.set(k, fromIdb);
    return fromIdb;
  }
  return queueTranslate(text, lang);
}

function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in params ? String(params[key]) : `{{${key}}}`
  );
}

const TContext = createContext({ enabled: true });

export function TProvider({ enabled = true, children }) {
  const value = useMemo(() => ({ enabled }), [enabled]);
  return <TContext.Provider value={value}>{children}</TContext.Provider>;
}

/**
 * <T>Save memory</T>
 * <T params={{ count: 5 }}>You have {{count}} memories</T>
 * <T fallback="Loading…">Initialising…</T>
 */
export default function T({ children, params, fallback }) {
  const { i18n } = useTranslation();
  const ctx = useContext(TContext);
  const lang = (i18n.language || 'en').split('-')[0];
  // Flatten children to a single string. We deliberately only support
  // plain-text children — wrap dynamic React children manually instead.
  const text = useMemo(() => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children.map((c) => (typeof c === 'string' ? c : '')).join('');
    }
    return '';
  }, [children]);

  const [translated, setTranslated] = useState(() => {
    if (!ctx.enabled || !lang || lang === 'en') return text;
    return lookupSync(text, lang) ?? text;
  });

  const lastReqRef = useRef(0);

  useEffect(() => {
    if (!ctx.enabled || !lang || lang === 'en') {
      setTranslated(text);
      return;
    }
    const sync = lookupSync(text, lang);
    if (sync !== null) {
      setTranslated(sync);
      return;
    }
    if (fallback) setTranslated(fallback);
    const reqId = ++lastReqRef.current;
    resolveAsync(text, lang).then((tr) => {
      // Ignore late resolves for stale text.
      if (reqId !== lastReqRef.current) return;
      setTranslated(tr || text);
    });
  }, [text, lang, ctx.enabled, fallback]);

  return interpolate(translated, params);
}

/**
 * Hook variant for non-JSX strings (titles, aria-labels, placeholders).
 *
 *   const tr = useT();
 *   <input placeholder={tr('Search memories…')} />
 */
export function useT() {
  const { i18n } = useTranslation();
  const ctx = useContext(TContext);
  const lang = (i18n.language || 'en').split('-')[0];

  const [, force] = useState(0);

  return useMemo(() => {
    return (text, params) => {
      if (!ctx.enabled || !text || !lang || lang === 'en') return interpolate(text, params);
      const sync = lookupSync(text, lang);
      if (sync !== null) return interpolate(sync, params);
      // Kick async fetch; once it lands, re-render via cache hit.
      resolveAsync(text, lang).then(() => force((n) => n + 1));
      return interpolate(text, params);
    };
  }, [lang, ctx.enabled]);
}

export { TContext };
