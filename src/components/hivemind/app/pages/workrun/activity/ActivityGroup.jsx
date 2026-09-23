import React, { useEffect, useState } from 'react';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import ToolDisclosure from '../tools/ToolDisclosure';
import ReasoningRow from '../narrative/ReasoningRow';
import ActivityRow from './ActivityRow';

function toToolState(status) {
  if (status === 'streaming' || status === 'running') return 'running';
  if (status === 'complete' || status === 'completed' || status === 'done') return 'done';
  return status || 'done';
}

export default function ActivityGroup({ items, onOpen, streaming = false }) {
  const list = Array.isArray(items) ? items : [];
  const hasRunningWork = streaming || list.some((item) => (
    (item.kind === 'tool' || item.kind === 'search') && (item.status === 'streaming' || item.status === 'running')
  ));
  const [expanded, setExpanded] = useState(Boolean(hasRunningWork));

  useEffect(() => {
    setExpanded(Boolean(hasRunningWork));
  }, [hasRunningWork]);

  if (!list.length) return null;

  return (
    <section className="space-y-2" aria-label="WorkRun activity">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-[6px] py-0.5 text-[13px] text-[#737373] hover:text-[#0a0a0a]"
      >
        {hasRunningWork ? <LoaderCircle size={14} className="animate-spin" /> : null}
        <span>{hasRunningWork ? 'Working' : 'Worked'} · {list.length} action{list.length === 1 ? '' : 's'}</span>
        <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded ? (
        <div className="ml-1 space-y-1 border-l border-[#e3e0db] pl-3">
          {list.map((item, index) => {
            const key = item.id || item.block_id || `${item.kind}-${index}`;
            if (item.kind === 'tool' || item.kind === 'search') {
              return (
                <ToolDisclosure
                  key={key}
                  tool={{
                    ...item,
                    name: item.name || item.payload?.name || 'Tool',
                    label: item.label || item.payload?.label,
                    input: item.input ?? item.payload?.input,
                    result: item.result ?? item.output ?? item.payload?.result ?? item.payload?.output,
                    state: toToolState(item.status || item.state),
                    id: item.id || item.block_id,
                  }}
                  onOpen={onOpen}
                />
              );
            }
            if (item.kind === 'thinking' || (item.kind === 'activity' && /thinking/i.test(String(item.label || '')))) {
              return <ReasoningRow key={key} text={item.text || item.payload?.text || ''} running={hasRunningWork && item.status === 'streaming'} title="Thinking" />;
            }
            return <ActivityRow key={key} label={item.label || item.name || item.kind} status={item.status} />;
          })}
        </div>
      ) : null}
    </section>
  );
}
