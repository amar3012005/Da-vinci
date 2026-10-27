import React, { useEffect, useState } from 'react';
import { AudioLines, ChevronLeft, Monitor, PanelRight, Plus, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BrainModeIcon from './BrainModeIcon';
import { getDraft, markOnce, queueDraft, setDraft, subscribeAttached, subscribeDraft, subscribePendingEntries } from '../shared/pending-composer';
import { readBootCache, readLastTenant } from '../shared/boot-cache';
import './liquid-glass.css';
import './OptimisticAppShell.css';

const PHONE_QUERY = '(max-width: 600px)';
const DESKTOP_QUERY = '(min-width: 901px)';
const RUNTIME_ROOM = /^\/hivemind\/app\/employee\/harness(?:\/|$)/u;
const BRAIN_ROOM = /^\/hivemind\/app(?:\/overview(?:\/(?:new|session\/[^/]+))?)?\/?$/u;

// Composer seat for the frame. It collects the draft only: typing is enabled at once, and sending is enabled
// once a native room client attaches (see pending-composer.js). Until then no message is queued or shown as pending.
function PhoneRoomComposer({ room }) {
  const { t } = useTranslation();
  const [draft, setDraftState] = useState(getDraft);
  const [entries, setEntries] = useState([]);
  const [attached, setAttached] = useState(false);
  useEffect(() => subscribeDraft(setDraftState), []);
  useEffect(() => subscribePendingEntries(setEntries), []);
  useEffect(() => subscribeAttached(setAttached), []);
  useEffect(() => { markOnce('hm:composer-visible'); }, []);
  const pending = attached ? entries.filter((entry) => entry.state !== 'sent') : [];
  const submit = (event) => {
    event.preventDefault();
    queueDraft();
  };
  return (
    <>
      {pending.length > 0 && (
        <ul className="optimistic-phone-room-pending" aria-live="polite">
          {pending.map((entry) => (
            <li key={entry.id} data-state={entry.state}>
              {entry.payload?.text}
              <span className="optimistic-phone-room-pending-state">
                {entry.state === 'failed' ? t('chat.sendFailed', 'Not sent') : t('chat.waitingToSend', 'Waiting to send')}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Same seats as the settled agent-room composer (InputBar [data-agent-room] phone rules): a 48px glass +,
          the glass pill from x+56 with the draft at x+70, and the 40px black voice/send circle. */}
      <form className="optimistic-phone-room-composer" onSubmit={submit}>
        <span className="optimistic-phone-room-add" aria-hidden="true"><Plus size={20} strokeWidth={2} /></span>
        <textarea
          aria-label={t('chat.messageLabel', 'Message')}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (attached && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); queueDraft(); } }}
          placeholder={room === 'brain' ? t('chat.messageBrain', 'Message Brain') : t('chat.messageRuntime', 'Message Runtime')}
          className="optimistic-phone-room-input"
        />
        <button type="submit" className="optimistic-phone-room-primary" disabled={!attached || !draft.trim()} aria-label={draft.trim() ? t('chat.send', 'Send') : t('chat.voice', 'Voice')}>
          {draft.trim() ? <Send size={17} strokeWidth={2} /> : <AudioLines size={18} strokeWidth={2} />}
        </button>
      </form>
    </>
  );
}

function phoneViewport() {
  return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches && !window.matchMedia(DESKTOP_QUERY).matches;
}

// Phone frame for the Runtime and Brain chat rooms: the glass back button, the room's identity pill and the composer
// seat appear at once, in the positions of the settled room, while sign-in, the company check and the chat client load.
// HarnessSurface reuses it as its opening cover, so the screen stays the same until the room itself is ready.
const CHARACTERS = ['capsule', 'pebble', 'prism', 'orbit', 'spark', 'fold', 'classic'];

// The Runtime character saved by the last confirmed session (RuntimeAvatar's boot-cache entry), so the frame paints
// the real avatar at once. A device without that entry shows a soft mark instead of a default character.
function cachedRuntimeStill() {
  const tenant = readLastTenant();
  const character = tenant ? readBootCache(tenant.orgId, tenant.userId, 'runtime-appearance')?.value?.character : null;
  return CHARACTERS.includes(character) ? `/assets/runtime-characters/${character === 'classic' ? 'v3' : 'v2'}/stills/${character}-ready.webp` : null;
}

export function PhoneRoomFrame({ room, children = null }) {
  const { t } = useTranslation();
  const [still] = useState(() => (room === 'runtime' ? cachedRuntimeStill() : null));
  return (
    <div data-hivemind-app-shell data-optimistic-shell data-optimistic-phone-room={room} aria-busy="true" className="optimistic-phone-room">
      <span role="status" className="sr-only">Loading workspace</span>
      <div className="optimistic-phone-room-bar" aria-hidden="true">
        <span className="liquid-glass optimistic-phone-room-back"><ChevronLeft size={22} strokeWidth={2} /></span>
        <span className="liquid-glass optimistic-phone-room-identity">
          {room === 'brain'
            ? <><span className="optimistic-phone-room-mark"><BrainModeIcon size={28} /></span><span>{t('topbar.companyBrain', { defaultValue: 'Company Brain' })}</span></>
            : <><span className="optimistic-phone-room-mark">{still ? <img src={still} alt="" width={32} height={32} decoding="async" /> : <span className="optimistic-phone-room-mark-soft" />}</span><span>Runtime</span></>}
        </span>
        <span className="liquid-glass optimistic-phone-room-trailing">{room === 'brain' ? <PanelRight size={20} strokeWidth={1.8} /> : <Monitor size={20} strokeWidth={1.8} />}</span>
      </div>
      <PhoneRoomComposer room={room} />
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

/**
 * Loading state for any stage that can precede a chat room: the room frame on phone chat rooms, else the fallback.
 * @param {{ pathname: string, fallback: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function RoomLoading({ pathname, fallback }) {
  const room = phoneChatRoom(pathname);
  return room ? <PhoneRoomFrame room={room} /> : fallback;
}
