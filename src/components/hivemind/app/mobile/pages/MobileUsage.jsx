import React, { useEffect, useState } from 'react';
import apiClient from '../../shared/api-client';
import MobileShell from '../MobileShell';

function pct(used, limit) {
  const u = Number(used) || 0;
  const l = Number(limit) || 0;
  if (l <= 0) return 0;
  return Math.min(100, Math.round((u / l) * 100));
}

/** One Claude-style usage card: title left, "X% used" right, thin bar, caption. */
function UsageCard({ title, used, limit, caption }) {
  const p = pct(used, limit);
  return (
    <div className="bg-white rounded-[20px] px-5 py-4 mb-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[17px]">{title}</div>
        <div className="text-[15px] text-[#737373]">{limit > 0 ? `${p}% used` : `${Number(used) || 0}`}</div>
      </div>
      {limit > 0 && (
        <div className="mt-2.5 h-1.5 rounded-full bg-[#e8e5de] overflow-hidden">
          <div className="h-full rounded-full bg-[#2f6bff]" style={{ width: `${p}%` }} />
        </div>
      )}
      {caption && <div className="mt-2 text-[12.5px] text-[#a8a49c]">{caption}</div>}
    </div>
  );
}

export default function MobileUsage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.getUsage();
        if (!cancelled) setUsage(data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || e?.message || 'Could not load usage.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const t = usage?.tokens || {};
  const planName = usage?.planName || usage?.plan || 'Current plan';
  const period = usage?.period?.month ? `This period · ${usage.period.month}` : 'This period';

  return (
    <MobileShell title="Usage">
      <div className="px-4 pt-2 pb-10">
        {loading && <div className="py-12 text-center text-[13px] text-[#737373]">Loading…</div>}
        {error && <div className="py-3 text-[13px] text-red-700">{error}</div>}
        {!loading && !error && usage && (
          <>
            <UsageCard title="Tokens" used={t.used} limit={t.limit} caption={`${planName} · ${period}`} />
            <div className="text-[13px] text-[#737373] mt-4 mb-2 px-1">This period</div>
            {/* Full desktop metric set (same /billing/usage payload keys). */}
            {[
              { key: 'searches', title: 'Recall / Chat', sub: 'agent queries' },
              { key: 'memories', title: 'Memories', sub: 'ingested' },
              { key: 'graphQueries', title: 'Graph Queries', sub: 'graph loads' },
              { key: 'kbPages', title: 'KB Pages', sub: 'pages + slides + images' },
              { key: 'deepResearch', title: 'Deep Research', sub: 'jobs' },
              { key: 'webIntel', title: 'Web Intel', sub: 'search + crawl' },
              { key: 'taraSeconds', title: 'TARA Talk Time', sub: 'seconds' },
              { key: 'hyperAgentRuns', title: 'HyperAgents Runs', sub: 'runs' },
              { key: 'connectors', title: 'Connectors', sub: 'active sources' },
              { key: 'hyperRooms', title: 'HyperAgents', sub: 'rooms' },
              { key: 'users', title: 'Seats', sub: 'org members' },
            ].map(({ key, title, sub }) => {
              const d = usage[key];
              if (d == null) return null;
              return (
                <UsageCard key={key} title={title}
                  used={d?.used ?? d} limit={d?.limit}
                  caption={d?.limit ? undefined : sub} />
              );
            })}
          </>
        )}
      </div>
    </MobileShell>
  );
}
