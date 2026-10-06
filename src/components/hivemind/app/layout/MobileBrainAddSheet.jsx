import React, { useState } from 'react';
import { LegacyMobileAddSheet } from '../mobile/LegacyChatSheets';
import { useQuickRecorder } from '../shared/QuickRecorderProvider';

/** Presentation only. File intake and draft modes stay in the native composer. */
export default function MobileBrainAddSheet({ open = true, onClose, onConnectors }) {
  const qrec = useQuickRecorder();
  const [research, setResearch] = useState(false);
  const action = kind => window.dispatchEvent(new CustomEvent('hivemind:mobile-brain-action', { detail: { kind } }));
  return <LegacyMobileAddSheet nativeViewport plusSheetOpen={open} onClose={onClose} qrec={qrec} deepResearchMode={research} onPickFiles={action} setDeepResearchMode={enabled => { setResearch(enabled); action(enabled ? 'research' : 'search'); }} onConnectors={onConnectors} />;
}
