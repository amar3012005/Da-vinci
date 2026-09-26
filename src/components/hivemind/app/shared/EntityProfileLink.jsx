import React, { useCallback, useState } from 'react';
import apiClient from './api-client';
import { openEntityProfile } from './EntityProfileModalHost';

/**
 * Opens a canonical entity dossier from a human-readable entity mention.
 *
 * Memory tags deliberately contain names rather than database identifiers, so
 * resolve the canonical entity through the authorized entity-search endpoint
 * at click time. This keeps a browser-held tag from becoming an authority.
 */
export default function EntityProfileLink({
  name,
  entityId,
  mobile = false,
  className = '',
  children,
}) {
  const [opening, setOpening] = useState(false);

  const openProfile = useCallback(async (event) => {
    event.stopPropagation();
    if (opening) return;
    setOpening(true);
    try {
      let resolvedId = entityId;
      if (!resolvedId) {
        const { data } = await apiClient.core.get(
          `/api/entity-search?query=${encodeURIComponent(name)}&limit=5`,
        );
        const exact = (data?.matches || []).find((match) => (
          match?.entity_id
          && String(match?.canonical_name || match?.name || '').trim().toLocaleLowerCase()
            === String(name || '').trim().toLocaleLowerCase()
        ));
        const canonical = exact || (data?.matches || []).find((match) => match?.entity_id);
        resolvedId = canonical?.entity_id;
      }
      if (resolvedId) {
        openEntityProfile(resolvedId);
      }
    } finally {
      setOpening(false);
    }
  }, [entityId, name, opening]);

  return (
    <button
      type="button"
      onClick={openProfile}
      disabled={opening}
      title={`Open ${name}'s entity profile`}
      aria-label={`Open entity profile for ${name}`}
      className={`${className} ${opening ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:brightness-95'} transition-opacity`}
    >
      {children}
    </button>
  );
}
