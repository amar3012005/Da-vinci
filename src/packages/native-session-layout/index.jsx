import React from 'react';
import './style.css';

// Presentation-only port of ui-conversation's ConversationRoot/EmptyHero width axis.
// Cloudflare task rooms continue to own submission and session state.
export function NativeSessionLayout({ children }) {
  return <main className="native-session-layout"><div className="native-session-stack">{children}</div></main>;
}
