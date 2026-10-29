import React from 'react';
import './sidebar-tools.css';

/** Routes of the HyperAgents sidebar tools; both read the company's Runtime root as a data owner and open with or without Runtime. */
export const CALENDAR_PATH = '/hivemind/app/employee/calendar';
export const ARTIFACTS_PATH = '/hivemind/app/employee/artifacts';

/**
 * The Artifacts glyph, drawn with the shared palette-brush mask so it matches the native icon it replaces.
 * @param {{ size?: number }} props - rendered size in pixels.
 * @returns {React.ReactNode} A decorative span.
 */
export function ArtifactsIcon({ size = 18 }) {
  return <span className="hm-artifacts-icon" aria-hidden="true" style={{ width: size, height: size }} />;
}
