import { motionForRoom } from './runtime-motion';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api-client';
import { useAuth } from '../auth/AuthProvider';
const RuntimeCharacter = createContext('classic');
const characters = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
export const RUNTIME_APPEARANCE_EVENT = 'hivemind:runtime-appearance-saved';
export function RuntimeAppearanceProvider({ children }) {
  const { user, org } = useAuth();
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : '';
  const [saved, setSaved] = useState({ scope: '', character: 'classic' });
  useEffect(() => {
    if (!scope) return undefined;
    let sequence = 0; let active = true;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const value = await api.getRuntimeAppearance();
        if (active && request === sequence && characters.includes(value?.appearance?.character)) setSaved({ scope, character: value.appearance.character });
      } catch { /* Retain the last saved identity during a temporary outage. */ }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    window.addEventListener(RUNTIME_APPEARANCE_EVENT, refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; window.removeEventListener(RUNTIME_APPEARANCE_EVENT, refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, [scope]);
  return <RuntimeCharacter.Provider value={saved.scope === scope ? saved.character : 'classic'}>{children}</RuntimeCharacter.Provider>;
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
  const motion=motionForRoom(room); const state=motion==='unknown'?'ready':motion;
  const animated=!reduced && motion!=='unknown';
  const base=`/assets/runtime-characters/${character==='classic'?'v3':'v2'}`;
  const source=`${base}/${animated?'animations':'stills'}/${character}-${state}.webp`;
  return <img {...props} src={failed===source?`${base}/stills/${character}-${state}.webp`:source} onError={()=>setFailed(source)} data-runtime-motion={motion} data-runtime-animated={animated && failed!==source} decoding="async" alt={props.alt ?? 'Runtime'} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0, ...props.style }} />;
}
