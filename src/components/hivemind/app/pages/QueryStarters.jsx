import ConnectedActivity from './ConnectedActivity';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';
import './QueryStarters.css';

const rows = value => Array.isArray(value) ? value : value?.memories || value?.data || [];
const clean = value => String(value || '').replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '').replace(/\s+/g, ' ').trim();
const dateOf = memory => memory.updated_at || memory.updatedAt || memory.created_at || memory.createdAt;
function candidates(memories, t) {
  const seen = new Set();
  return memories.map(memory => {
    const tags = Array.isArray(memory.tags) ? memory.tags : [];
    if (tags.some(tag => /internal-audit|cognition-loop|system-prompt/i.test(tag))) return null;
    const topic = clean(memory.title);
    if (!memory.id || topic.length < 5 || topic.length > 180 || /^(https?:|file_|untitled|tool call)/i.test(topic)) return null;
    const key = topic.toLocaleLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    const dream = tags.some(tag => /^(flashback|derived|dreamer:)/i.test(tag));
    const sourceText = [memory.source_platform, memory.sourcePlatform, memory.platform, ...tags.filter(tag => /^(platform|source):/i.test(tag))].join(' ');
    const source = dream ? t('overview.starters.flashback', 'Flashback') : /gmail/i.test(sourceText) ? 'Gmail' : /slack/i.test(sourceText) ? 'Slack' : /google.?docs/i.test(sourceText) ? 'Google Docs' : dream ? t('overview.starters.flashback', 'Flashback') : t('overview.starters.memory', 'Memory');
    const query = dream
      ? t('overview.starters.check', 'Help me check the evidence and uncertainty behind “{{topic}}”. What is worth following up?', { topic })
      : t('overview.starters.catchUp', 'Bring me up to date on “{{topic}}”, using the relevant memories and any connected apps I have allowed. What could I do next?', { topic });
    const timestamp = Date.parse(dateOf(memory));
    return { id: memory.id, topic, query, source, dream, timestamp: Number.isFinite(timestamp) ? timestamp : 0 };
  }).filter(Boolean).sort((a, b) => b.timestamp - a.timestamp);
}

export default function QueryStarters({ mount, ready }) {
  const { user, org } = useAuth() || {};
  const { t, i18n } = useTranslation('dashboard');
  const [items, setItems] = useState([]);
  const [finishedTyping, setFinishedTyping] = useState(false);
  const [target, setTarget] = useState(null);
  const [loadedEditor, setLoadedEditor] = useState(null);
  const typedEditors = useRef(new WeakSet());
  const generatedDraft = useRef('');
  const stopTyping = useRef(() => {});
  const identity = `${org?.id || ''}:${user?.id || ''}:${i18n.language}`;

  useEffect(() => {
    setItems([]);
    setLoadedEditor(null);
    if (!ready || !user?.id || !target?.editor) return;
    let cancelled = false;
    // Reuse only in this authenticated tab; revalidate authorization before display.
    const key = `hivemind:query-starters:${identity}`;
    Promise.allSettled([
      apiClient.listMemories({ limit: 24 }),
      apiClient.listMemories({ tags: 'flashback', limit: 6 }),
      apiClient.hivemindTriggers({ operation: 'suggestions', limit: 8 }, { timeoutMs: 4000 }),
    ]).then(results => {
      if (cancelled) return;
      const memories = results.flatMap(result => result.status === 'fulfilled' ? rows(result.value) : []);
      const events = results[2]?.status === 'fulfilled' ? results[2].value?.suggestions || [] : [];
      const activity = events.map(event => ({ ...event, topic: clean(event.topic), timestamp: Date.parse(event.timestamp) || 0, source: ({ gmail: 'Gmail', slack: 'Slack', github: 'GitHub', googledocs: 'Google Docs' })[event.source] || event.source, dream: false }));
      const all = [...activity, ...candidates(memories, t)];
      const picked = [];
      const sources = new Set();
      for (const item of all) {
        if (picked.length && sources.has(item.source)) continue;
        picked.push(item); sources.add(item.source);
        if (picked.length === 3) break;
      }
      for (const item of all) {
        if (picked.length === 3) break;
        if (!picked.some(value => value.id === item.id)) picked.push(item);
      }
      setItems(picked);
      setLoadedEditor(target.editor);
      try { sessionStorage.setItem(key, JSON.stringify({ generatedAt: Date.now(), items: picked })); } catch { /* storage is optional */ }
    });
    return () => { cancelled = true; };
  }, [ready, identity, user?.id, target?.editor, t]);

  useEffect(() => {
    if (!ready || !mount) return;
    let frame;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hero = mount.querySelector('[data-phase="hero"]');
        const editor = hero?.querySelector('[data-composer-input][contenteditable="true"]');
        const seat = hero?.querySelector('[data-composer-seat]');
        const overview = /^\/hivemind\/app\/overview(?:\/(?:new|session\/[^/]+))?$/.test(window.location.pathname);
        const scale = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        const field = editor?.getBoundingClientRect();
        const bounds = seat?.getBoundingClientRect();
        setTarget(overview && editor && seat ? { editor, seat, top: (field.top - bounds.top) / scale, left: (field.left - bounds.left) / scale, width: editor.clientWidth } : null);
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(mount, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase', 'contenteditable'], characterData: true });
    mount.addEventListener('input', refresh);
    return () => { observer.disconnect(); mount.removeEventListener('input', refresh); cancelAnimationFrame(frame); };
  }, [ready, mount]);

  useEffect(() => {
    const editor = target?.editor;
    if (!editor || loadedEditor !== editor || !items[0] || editor.textContent.trim() || typedEditors.current.has(editor)) return;
    typedEditors.current.add(editor);
    const text = items[0].query;
    let index = 0;
    let timer;
    const stop = event => { if (!event || event.isTrusted) { clearInterval(timer); setFinishedTyping(false); } };
    stopTyping.current = () => clearInterval(timer);
    const insert = value => {
      generatedDraft.current += value;
      const clipboard = new DataTransfer();
      clipboard.setData('text/plain', value);
      editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
    };
    editor.addEventListener('keydown', stop);
    editor.addEventListener('pointerdown', stop);
    editor.addEventListener('paste', stop);
    editor.focus();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { insert(text); setFinishedTyping(true); }
    else timer = setInterval(() => {
      if (!editor.isConnected) { clearInterval(timer); return; }
      const next = Math.min(text.length, index + 3);
      insert(text.slice(index, next));
      index = next;
      if (index === text.length) { clearInterval(timer); setFinishedTyping(true); }
    }, 40);
    return () => {
      clearInterval(timer);
      editor.removeEventListener('keydown', stop);
      editor.removeEventListener('pointerdown', stop);
      editor.removeEventListener('paste', stop);
    };
  }, [target?.editor, items, loadedEditor]);

  if (!target) return null;
  const accept = query => {
    const editor = target.editor;
    if (!editor.isConnected) return;
    const draft = editor.textContent.trim();
    if (draft && draft !== generatedDraft.current.trim()) return;
    stopTyping.current();
    setFinishedTyping(false);
    editor.focus();
    if (draft) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }
    requestAnimationFrame(() => {
      const clipboard = new DataTransfer();
      clipboard.setData('text/plain', query);
      generatedDraft.current = query;
      editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
    });
    // Use the existing composer paste path. Never submit or overwrite a draft.
  };
  const options = items.length ? items : [
    { id: 'document', topic: t('overview.starters.firstDocument', 'Help me understand a document'), query: t('overview.starters.firstDocumentQuery', 'I have a document I want to understand. Help me identify its key points and what I should do next.') },
    { id: 'remember', topic: t('overview.starters.firstMemory', 'Find something I remember'), query: t('overview.starters.firstMemoryQuery', 'Help me find something in my memories. Ask me what I remember about it.') },
    { id: 'project', topic: t('overview.starters.firstProject', 'Catch up on a project'), query: t('overview.starters.firstProjectQuery', 'Help me catch up on a project. Ask me which project, then bring together its relevant context.') },
  ];
  return createPortal(<section className="hm-query-starters" aria-label={t('overview.starters.label', 'Suggested questions')}>

    <div className="hm-query-heading">{items.length ? t('overview.starters.heading', 'A starting point from your context') : t('overview.starters.firstHeading', 'What would you like help with?')}</div>
    <div className="hm-query-options">{options.map(item => <button key={item.id} type="button" onClick={() => accept(item.query)} title={item.query}>
      <span className="hm-query-topic">{item.dream ? '🌙 ' : ''}{item.source ? (item.dream ? t('overview.starters.checkLabel', 'Check: {{topic}}', { topic: item.topic }) : t('overview.starters.catchUpLabel', 'Catch up: {{topic}}', { topic: item.topic })) : item.topic}</span>
      <span className="hm-query-source">{item.source || t('overview.starters.try', 'Try this')}{item.timestamp ? ` · ${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(item.timestamp)}` : ''}</span>
    </button>)}</div>
    {finishedTyping && <p className="hm-query-ready" role="status">{t('overview.starters.ready', 'Edit this question, or send it when you’re ready.')}</p>}
    <ConnectedActivity />
  </section>, target.seat);
}
