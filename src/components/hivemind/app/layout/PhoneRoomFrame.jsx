import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BrainModeIcon from './BrainModeIcon';
import './liquid-glass.css';
import './OptimisticAppShell.css';

const PHONE_QUERY = '(max-width: 600px)';
const DESKTOP_QUERY = '(min-width: 901px)';
const RUNTIME_ROOM = /^\/hivemind\/app\/employee\/harness(?:\/|$)/u;
const BRAIN_ROOM = /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u;

function phoneViewport() {
  return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches && !window.matchMedia(DESKTOP_QUERY).matches;
}

// Phone frame for the Runtime and Brain chat rooms: the glass back button, the room's identity pill and the composer
// seat appear at once, in the positions of the settled room, while sign-in, the company check and the chat client load.
// HarnessSurface reuses it as its opening cover, so the screen stays the same until the room itself is ready.
export function PhoneRoomFrame({ room, children = null }) {
  const { t } = useTranslation();
  return (
    <div data-hivemind-app-shell data-optimistic-shell data-optimistic-phone-room={room} aria-busy="true" className="optimistic-phone-room">
      <span role="status" className="sr-only">Loading workspace</span>
      <div className="optimistic-phone-room-bar" aria-hidden="true">
        <span className="liquid-glass optimistic-phone-room-back"><ChevronLeft size={22} strokeWidth={2} /></span>
        <span className="liquid-glass optimistic-phone-room-identity">
          {room === 'brain'
            ? <><span className="optimistic-phone-room-mark"><BrainModeIcon size={28} /></span><span>{t('topbar.companyBrain', { defaultValue: 'Company Brain' })}</span></>
            : <><span className="optimistic-phone-room-mark optimistic-skeleton" /><span>Runtime</span></>}
        </span>
      </div>
      <div className="optimistic-phone-room-composer liquid-glass" aria-hidden="true">
        <span className="optimistic-phone-room-action" />
        <span className="optimistic-phone-room-input" />
        <span className="optimistic-phone-room-action is-send" />
      </div>
      {children}
    </div>
  );
}

/**
 * The phone chat room a path opens, for the room frame.
 * @param {string} pathname
 * @returns {'runtime' | 'brain' | null} null on wider screens and other routes.
 */
export function phoneChatRoom(pathname) {
  if (!phoneViewport()) return null;
  return RUNTIME_ROOM.test(pathname) ? 'runtime' : BRAIN_ROOM.test(pathname) ? 'brain' : null;
}
