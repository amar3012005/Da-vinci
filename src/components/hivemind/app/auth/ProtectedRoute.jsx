import ConnectionUnavailable from './ConnectionUnavailable';
import AsciiWorkspaceLoading from '../components/AsciiWorkspaceLoading';
import { RoomLoading } from '../layout/PhoneRoomFrame';
import React, { useEffect } from 'react';
import { RUNTIME_ORIGIN, runtimeLoginUrl, workspaceDocumentRedirect } from '../shared/workspace-authority.mjs';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// `optimisticFallback` paints while bootstrap is in flight and only when a saved shell hint exists.
// Children, and every data read they make, mount only after bootstrap confirms the session.
export default function ProtectedRoute({ children, optimisticFallback = null }) {
  const { isAuthenticated, loading, isUnreachable, connectionFailure, refresh } = useAuth();
  const location = useLocation();

  const authorityRedirect = workspaceDocumentRedirect(window.location.href, { embedded: window.parent !== window });
  const loginRedirect = !loading && !isAuthenticated && !isUnreachable && window.location.origin === RUNTIME_ORIGIN
    ? runtimeLoginUrl(window.location.href) : null;
  useEffect(() => {
    if (authorityRedirect || loginRedirect) window.location.replace(authorityRedirect || loginRedirect);
  }, [authorityRedirect, loginRedirect]);
  if (authorityRedirect || loginRedirect) return null;

  // The restoring frame decides for itself: cached identity on desktop, the room frame on phone chat rooms, else its loader.
  if (loading && optimisticFallback) return optimisticFallback;

  if (loading) {
    return <RoomLoading pathname={window.location.pathname} fallback={<div className="min-h-screen bg-[#faf9f4] flex items-center justify-center"><AsciiWorkspaceLoading /></div>} />;
  }

  if (isUnreachable) return <div className="min-h-screen flex items-center justify-center bg-[#faf9f4] p-6"><ConnectionUnavailable failure={connectionFailure} onRetry={refresh} /></div>;

  // Only confirmed sign-out goes to login.
  if (!isAuthenticated) {
    return <Navigate to="/hivemind/login" state={{ from: location }} replace />;
  }

  return children;
}
