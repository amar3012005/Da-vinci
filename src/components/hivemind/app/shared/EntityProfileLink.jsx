import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from './api-client';

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
  const navigate = useNavigate();
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
          match?.id
          && String(match?.canonical_name || match?.name || '').trim().toLocaleLowerCase()
            === String(name || '').trim().toLocaleLowerCase()
        ));
        const canonical = exact || (data?.matches || []).find((match) => match?._canonical && match?.id);
        resolvedId = canonical?.id;
      }
      if (resolvedId) {
        navigate(mobile ? `/hivemind/m/entities/${resolvedId}` : `/hivemind/app/entities/${resolvedId}`);
      }
    } finally {
      setOpening(false);
    }
  }, [entityId, mobile, name, navigate, opening]);

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
