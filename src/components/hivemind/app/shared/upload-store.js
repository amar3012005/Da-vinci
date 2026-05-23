/**
 * Global upload store — survives page navigation.
 *
 * Why a module-level store instead of Context: KnowledgeBase already has
 * 200+ lines of upload handlers tied to a `setUploads` state setter. We
 * proxy that setter through this store so the data outlives KB's mount.
 * Any component can subscribe via useUploads() and render the same rows.
 *
 * In-flight fetch promises are NOT cancelled by React unmount — the
 * browser keeps the request alive — so navigating away does NOT kill
 * the upload itself, only the UI that was watching it. This store fixes
 * the UI gap.
 */

import { useEffect, useState } from 'react';

let _uploads = [];
const _listeners = new Set();

function emit() {
  for (const l of _listeners) {
    try { l(_uploads); } catch {}
  }
}

export function getUploads() {
  return _uploads;
}

/** Replace the entire uploads array (used by KnowledgeBase's setUploads). */
export function setUploads(next) {
  _uploads = typeof next === 'function' ? next(_uploads) : (Array.isArray(next) ? next : []);
  emit();
}

/** Patch one row by id; no-op if missing. */
export function updateUpload(id, patch) {
  _uploads = _uploads.map((u) => (u.id === id ? { ...u, ...patch } : u));
  emit();
}

/** Drop one row by id. */
export function removeUpload(id) {
  _uploads = _uploads.filter((u) => u.id !== id);
  emit();
}

/** React hook — re-renders on every store change. */
export function useUploads() {
  const [snap, setSnap] = useState(_uploads);
  useEffect(() => {
    const cb = (next) => setSnap(next);
    _listeners.add(cb);
    // Initial sync in case store changed between render + subscribe.
    setSnap(_uploads);
    return () => _listeners.delete(cb);
  }, []);
  return snap;
}
