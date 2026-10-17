import React, { useRef } from 'react';
import ModelConnectionCard from './ModelConnectionCard';

/** Reuse the Usage connection flow without navigating away from the current chat. */
export default function ChatModelConnection() {
  const dialog = useRef(null);
  return <div className="absolute right-3 top-3 z-20">
    <button type="button" onClick={() => dialog.current?.showModal()} className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-[#f7f6f1]">Connect ChatGPT</button>
    <dialog ref={dialog} aria-labelledby="chat-model-connection-title" className="m-auto max-h-[90dvh] w-[min(560px,calc(100vw-24px))] overflow-y-auto rounded-3xl border border-[#e3e0db] bg-[#faf9f4] p-5 shadow-2xl backdrop:bg-black/40">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><h2 id="chat-model-connection-title" className="text-xl font-semibold">Use HIVEMIND with the best frontier models</h2><p className="mt-2 text-sm text-[#666]">Connect your ChatGPT plan and choose your default model, right here.</p></div>
        <button type="button" aria-label="Close model connection" onClick={() => dialog.current?.close()} className="h-9 w-9 shrink-0 rounded-full border border-[#dedbd5]">×</button>
      </div>
      <ModelConnectionCard connectLabel="Connect now" />
      <button type="button" onClick={() => dialog.current?.close()} className="rounded-full bg-[#151515] px-4 py-2 text-sm text-white">Back to chat</button>
    </dialog>
  </div>;
}
