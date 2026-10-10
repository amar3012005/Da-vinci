import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@humation/react';
import { humation1 } from '@humation/assets-humation-1';
import { X } from 'lucide-react';
import apiClient from '../shared/api-client';
import { LANE_META } from '../hyperagents/rooms/shared';
import { APPEARANCE_SLOTS, APPEARANCE_COLORS, appearanceParts, createEmployeeAppearance } from '../shared/employee-appearance';

const labels = { head: 'Hair', body: 'Top', bottom: 'Bottom', item: 'Accessory', glasses: 'Glasses', clothes: 'Clothes', skin: 'Skin', stroke: 'Outline' };
const accents = ['117dff', '8755d8', 'e9a23b', 'e56c8b', '3f9d82', '667383'];

function Character({ appearance, size, title, selections }) {
  return <Avatar assets={humation1} seed={appearance.seed} selections={selections || appearance.selections} colors={appearance.colors} background={appearance.background} crop={appearance.crop} size={size} title={title} />;
}

export default function CreateEmployeeDialog({ onClose, onCreated }) {
  const [creationKey] = useState(() => window.crypto.randomUUID());
  const [name, setName] = useState('');
  const [appearance, setAppearance] = useState(() => createEmployeeAppearance(creationKey, { colors: { clothes: LANE_META.Communicator.color } }));
  const [customizing, setCustomizing] = useState(false);
  const [slot, setSlot] = useState('head');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const container = useRef(null);
  const nameInput = useRef(null);
  const submitted = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    nameInput.current?.focus();
    return () => previous?.focus?.();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true); setError('');
    try {
      let employee = created;
      if (!employee) {
        // Retry the exact submitted draft after an unknown connection outcome.
        submitted.current ||= { operation: 'create', creation_key: creationKey, name: name.trim(), lifecycle: 'durable', appearance };
        const result = await apiClient.manageNativeEmployeeLifecycle(submitted.current);
        if (!result?.employee?.id) throw new Error(result?.message || result?.error || 'Employee creation was not confirmed.');
        employee = result.employee;
        setCreated(employee);
      }
      if (await onCreated(employee) === false) throw new Error('Your employee is created. Its room could not open yet. Please try again.');
      onClose();
    } catch (failure) {
      setError(failure.response?.data?.message || failure.response?.data?.error || failure.message || 'Could not create this employee.');
    } finally { setBusy(false); }
  }

  const locked = busy || Boolean(submitted.current);
  const changeAppearance = options => setAppearance(createEmployeeAppearance(appearance.seed, { ...appearance, ...options }));
  const keys = event => {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.current.querySelectorAll('button:not(:disabled), input:not(:disabled)'));
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return createPortal(
    <div data-create-employee-overlay className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-2 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <form ref={container} onSubmit={submit} onKeyDown={keys} role="dialog" aria-modal="true" aria-labelledby="create-employee-title"
        data-create-employee-card className="flex max-h-[94dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-[30px] bg-[#fbfbfa] p-6 shadow-2xl sm:max-h-[90dvh] sm:rounded-[26px] sm:p-8">
        <header className="flex items-center gap-4">
          <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-[#f0f0ee] text-[#292929] disabled:opacity-40"><X size={22} /></button>
          <h2 id="create-employee-title" className="text-[20px] font-semibold tracking-[-0.03em]">Create employee</h2>
        </header>
        <div className="min-h-0 overflow-y-auto px-1 pb-1">
          <div className="my-6 flex justify-center"><Character appearance={appearance} size={148} title={name.trim() || 'Your employee'} /></div>
          <input ref={nameInput} aria-label="Employee name" maxLength={80} value={name} disabled={locked} onChange={event => setName(event.target.value)} placeholder="Name your employee"
            className="h-14 w-full rounded-[17px] border-0 bg-[#efefed] px-4 text-center text-[19px] font-medium outline-none focus:ring-2 focus:ring-[#b9cdef] disabled:opacity-60" />
          <div data-character-choices className="mt-5 grid grid-cols-6 gap-2" role="group" aria-label="Choose a character">
            {accents.map((accent, index) => {
              const candidate = createEmployeeAppearance(`${creationKey}:${index}`, { colors: { clothes: accent }, background: 'transparent' });
              const selected = appearance.seed === candidate.seed;
              return <button key={accent} type="button" disabled={locked} onClick={() => setAppearance(candidate)} aria-label={`Character ${index + 1}`} aria-pressed={selected}
                className={`aspect-square overflow-hidden rounded-[14px] border-2 bg-white ${selected ? 'border-[#6693d9]' : 'border-transparent'} disabled:opacity-50`}><Character appearance={candidate} size="100%" /></button>;
            })}
          </div>
          <button type="button" disabled={locked} onClick={() => setCustomizing(value => !value)} className="mt-4 w-full text-center text-[12px] font-medium text-[#666] underline underline-offset-4">{customizing ? 'Done customizing' : 'Customize character'}</button>
          {customizing && <div className="mt-4 border-t border-[#e5e5e1] pt-4">
            <div className="flex flex-wrap justify-center gap-1" role="group" aria-label="Character parts">{APPEARANCE_SLOTS.map(id => <button key={id} disabled={locked} type="button" onClick={() => setSlot(id)} aria-pressed={slot === id} className={`rounded-full px-3 py-1.5 text-[11px] ${slot === id ? 'bg-[#e4eaf5] text-[#284c82]' : 'text-[#666]'}`}>{labels[id]}</button>)}</div>
            <div data-character-parts className="mt-3 grid max-h-40 grid-cols-5 gap-2 overflow-y-auto" role="group" aria-label={`${labels[slot]} options`}>{appearanceParts(slot).map(part => <button key={part.id} type="button" disabled={locked} aria-label={`${labels[slot]}: ${part.name}`} aria-pressed={appearance.selections[slot] === part.id} onClick={() => changeAppearance({ selections: { ...appearance.selections, [slot]: part.id } })} className={`aspect-square overflow-hidden rounded-lg border bg-white ${appearance.selections[slot] === part.id ? 'border-[#6693d9]' : 'border-[#e5e5e1]'}`}>
              {part.name === 'none' ? <span className="text-[10px] text-[#666]">None</span> : <Character appearance={appearance} selections={{ ...appearance.selections, [slot]: part.id }} size="100%" />}
            </button>)}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">{APPEARANCE_COLORS.map(color => <label key={color} className="flex flex-col items-center gap-1 text-[10px] text-[#666]">{labels[color] || color}<input type="color" aria-label={`${labels[color] || color} color`} disabled={locked} value={`#${appearance.colors[color]}`} onChange={event => changeAppearance({ colors: { ...appearance.colors, [color]: event.target.value.slice(1) } })} className="h-7 w-8 cursor-pointer border-0 bg-transparent" /></label>)}</div>
          </div>}
          {error && <p role="alert" className="mt-4 text-center text-[12px] leading-5 text-red-600">{error}</p>}
        </div>
        <button type="submit" disabled={busy || !name.trim()} className="mt-6 h-12 shrink-0 rounded-full bg-[#141414] text-[15px] font-semibold text-white disabled:bg-[#a5a5a2]">{busy ? (created ? 'Opening…' : 'Creating…') : created ? 'Open employee' : submitted.current ? 'Retry create' : 'Create'}</button>
      </form>
    </div>, document.body,
  );
}
