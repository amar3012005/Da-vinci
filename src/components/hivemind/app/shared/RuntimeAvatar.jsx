import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api-client';
import { useAuth } from '../auth/AuthProvider';
const RuntimeCharacter = createContext('orbit');
const characters = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];
export const RUNTIME_APPEARANCE_EVENT = 'hivemind:runtime-appearance-saved';
export function RuntimeAppearanceProvider({ children }) {
  const { user, org } = useAuth();
  const scope = user?.id && org?.id ? `${user.id}:${org.id}` : '';
  const [saved, setSaved] = useState({ scope: '', character: 'orbit' });
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
  return <RuntimeCharacter.Provider value={saved.scope === scope ? saved.character : 'orbit'}>{children}</RuntimeCharacter.Provider>;
}
export default function RuntimeAvatar({ size, ...props }) {
  const character = useContext(RuntimeCharacter);
  return <img {...props} src={`/assets/runtime-characters/v2/stills/${character}-ready.webp`} alt={props.alt ?? 'Runtime'} width={size} height={size} style={{ objectFit: 'contain', flexShrink: 0, ...props.style }} />;
}
