import React, { useEffect, useState } from 'react';
import EntityProfileDrawer from './EntityProfileDrawer';

export const ENTITY_PROFILE_OPEN_EVENT = 'hivemind:open-entity-profile';
export function openEntityProfile(entityId) {
  if (entityId && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ENTITY_PROFILE_OPEN_EVENT, { detail: { entityId } }));
}

export default function EntityProfileModalHost() {
  const [entityId, setEntityId] = useState(null);
  useEffect(() => {
    const onOpen = (event) => setEntityId(event.detail?.entityId || null);
    window.addEventListener(ENTITY_PROFILE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ENTITY_PROFILE_OPEN_EVENT, onOpen);
  }, []);
  return entityId ? <EntityProfileDrawer entityId={entityId} onClose={() => setEntityId(null)} /> : null;
}
