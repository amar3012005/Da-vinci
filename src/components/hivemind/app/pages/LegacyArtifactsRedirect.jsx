import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LIBRARY_PATH } from '../layout/sidebar-tools';

/**
 * Sends the former Artifacts route to the Library, keeping any folder, search and type query so saved links still land where they pointed.
 * @returns {React.ReactNode} a replacing redirect.
 */
export default function LegacyArtifactsRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: LIBRARY_PATH, search }} replace />;
}
