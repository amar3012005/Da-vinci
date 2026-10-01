import React, { useEffect, useState } from 'react';
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
    const sourceText = [memory.source_platform, memory.sourcePlatform, memory.platform, ...tags].join(' ');
    const source = /gmail/i.test(sourceText) ? 'Gmail' : /slack/i.test(sourceText) ? 'Slack' : /google.?docs/i.test(sourceText) ? 'Google Docs' : dream ? t('overview.starters.flashback', 'Flashback') : t('overview.starters.memory', 'Memory');
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
  const [target, setTarget] = useState(null);
  const [ghost, setGhost] = useState('');
  const [notice, setNotice] = useState('');
  const identity = `${org?.id || ''}:${user?.id || ''}:${i18n.language}`;

  useEffect(() => {
    setItems([]);
    if (!ready || !user?.id) return;
    let cancelled = false;
    // Reuse only in this authenticated tab; revalidate authorization before display.
    const key = `hivemind:query-starters:${identity}`;
    Promise.allSettled([
      apiClient.listMemories({ limit: 24 }),
      apiClient.listMemories({ tags: 'flashback', limit: 6 }),
    ]).then(results => {
      if (cancelled) return;
      const memories = results.flatMap(result => result.status === 'fulfilled' ? rows(result.value) : []);
      const all = candidates(memories, t);
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
      try { sessionStorage.setItem(key, JSON.stringify({ generatedAt: Date.now(), items: picked })); } catch { /* storage is optional */ }
    });
    return () => { cancelled = true; };
  }, [ready, identity, user?.id, t]);

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
        setTarget(overview && editor && seat && !editor.textContent.trim() ? { editor, seat, top: (field.top - bounds.top) / scale, left: (field.left - bounds.left) / scale, width: editor.clientWidth } : null);
      });
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(mount, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase', 'contenteditable'], characterData: true });
    mount.addEventListener('input', refresh);
    return () => { observer.disconnect(); mount.removeEventListener('input', refresh); cancelAnimationFrame(frame); };
  }, [ready, mount]);

  useEffect(() => {
    setGhost('');
    if (!target || !items[0]) return;
    const text = items[0].query;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setGhost(text); return; }
    let index = 0;
    const timer = setInterval(() => {
      index = Math.min(text.length, index + 3);
      setGhost(text.slice(0, index));
      if (index === text.length) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [target?.editor, items]);

  if (!target) return null;
  const accept = query => {
    const editor = target.editor;
    if (!editor.isConnected || editor.textContent.trim()) return;
    editor.focus();
    const clipboard = new DataTransfer();
    clipboard.setData('text/plain', query);
    editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
    // Use the existing composer paste path. Never submit or overwrite a draft.
    if (!editor.textContent.trim()) setNotice(t('overview.starters.copyFallback', 'Select this question and paste it into the message box.'));
  };
  const options = items.length ? items : [
    { id: 'document', topic: t('overview.starters.firstDocument', 'Help me understand a document'), query: t('overview.starters.firstDocumentQuery', 'I have a document I want to understand. Help me identify its key points and what I should do next.') },
    { id: 'remember', topic: t('overview.starters.firstMemory', 'Find something I remember'), query: t('overview.starters.firstMemoryQuery', 'Help me find something in my memories. Ask me what I remember about it.') },
    { id: 'project', topic: t('overview.starters.firstProject', 'Catch up on a project'), query: t('overview.starters.firstProjectQuery', 'Help me catch up on a project. Ask me which project, then bring together its relevant context.') },
  ];
  return createPortal(<section className="hm-query-starters" aria-label={t('overview.starters.label', 'Suggested questions')}>
    {ghost && <button type="button" className="hm-query-ghost" style={{ top: target.top, left: target.left, width: target.width }} onClick={() => accept(items[0].query)} aria-label={t('overview.starters.use', 'Use suggested question')}><span aria-hidden="true">{ghost}<span className="hm-query-caret">│</span></span></button>}
    <div className="hm-query-heading">{items.length ? t('overview.starters.heading', 'A starting point from your context') : t('overview.starters.firstHeading', 'What would you like help with?')}</div>
    <div className="hm-query-options">{options.map(item => <button key={item.id} type="button" onClick={() => accept(item.query)} title={item.query}>
      <span className="hm-query-topic">{item.dream ? '🌙 ' : ''}{item.source ? (item.dream ? t('overview.starters.checkLabel', 'Check: {{topic}}', { topic: item.topic }) : t('overview.starters.catchUpLabel', 'Catch up: {{topic}}', { topic: item.topic })) : item.topic}</span>
      <span className="hm-query-source">{item.source || t('overview.starters.try', 'Try this')}{item.timestamp ? ` · ${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(item.timestamp)}` : ''}</span>
    </button>)}</div>
    {notice && <p role="status">{notice}</p>}
  </section>, target.seat);
}
