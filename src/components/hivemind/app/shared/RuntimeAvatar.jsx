import { motionForRoom } from './runtime-motion';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './api-client';
import { useAuth } from '../auth/AuthProvider';
import { readBootCache, writeBootCache } from './boot-cache';
// `null` means the saved character is not known yet; the avatar renders a placeholder, never a default character.
const RuntimeCharacter = createContext('classic');
const characters = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
const APPEARANCE_RESOURCE = 'runtime-appearance';
export const RUNTIME_APPEARANCE_EVENT = 'hivemind:runtime-appearance-saved';
function cachedCharacter(orgId, userId) {
  const character = readBootCache(orgId, userId, APPEARANCE_RESOURCE)?.value?.character;
  return characters.includes(character) ? character : null;
}
export function RuntimeAppearanceProvider({ children }) {
  const { user, org } = useAuth();
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : '';
  // The per-tenant cache paints the saved character on the first render; the authoritative read below replaces it.
  const cached = useMemo(() => (scope ? cachedCharacter(org.id, user.id) : null), [scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fetched, setFetched] = useState({ scope: '', character: null });
  const character = fetched.scope === scope ? fetched.character : cached;
  useEffect(() => {
    if (!character) return;
    // Warm the browser cache so the avatar's first paint has its pixels ready.
    const image = new Image();
    image.src = `/assets/runtime-characters/${character === 'classic' ? 'v3' : 'v2'}/stills/${character}-ready.webp`;
  }, [character]);
  useEffect(() => {
    if (!scope) return undefined;
    let sequence = 0; let active = true;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const value = await api.getRuntimeAppearance();
        if (active && request === sequence && characters.includes(value?.appearance?.character)) {
          setFetched({ scope, character: value.appearance.character });
          writeBootCache(org.id, user.id, APPEARANCE_RESOURCE, { character: value.appearance.character });
        }
      } catch { /* Retain the last saved identity during a temporary outage. */ }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    window.addEventListener(RUNTIME_APPEARANCE_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; window.removeEventListener(RUNTIME_APPEARANCE_EVENT, refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, [scope]);
  return <RuntimeCharacter.Provider value={character}>{children}</RuntimeCharacter.Provider>;
}
export default function RuntimeAvatar({ size, room, ...props }) {
  const character = useContext(RuntimeCharacter);
  const [reduced, setReduced] = useState(true);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'); if (!media) return undefined;
    const sync=()=>setReduced(media.matches); sync(); media.addEventListener('change',sync);
    return ()=>media.removeEventListener('change',sync);
  },[]);
  if (character === null) {
    // Reserves the avatar box until the saved character is known, so no default character flashes before the swap.
    return <span aria-hidden="true" data-runtime-avatar-pending="" style={{ display: 'inline-block', width: size, height: size, flexShrink: 0, ...props.style }} />;
  }
  const motion=motionForRoom(room); const state=motion==='unknown'?'ready':motion;
  const animated=!reduced && motion!=='unknown';
  const base=`/assets/runtime-characters/${character==='classic'?'v3':'v2'}`;
  const source=`${base}/${animated?'animations':'stills'}/${character}-${state}.webp`;
  return <img {...props} src={failed===source?`${base}/stills/${character}-${state}.webp`:source} onError={()=>setFailed(source)} data-runtime-motion={motion} data-runtime-animated={animated && failed!==source} decoding="async" alt={props.alt ?? 'Runtime'} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0, ...props.style }} />;
}
