import React from 'react';

const UNIT_KEYS = {
  chat_turn: 'recall_chat_turns',
  composio_tool_call: 'composio_tool_calls',
  knowledge_page_evidence: 'knowledge_pages',
  knowledge_page_both: 'knowledge_both_pages_identified',
  meeting_minute: 'meeting_minutes',
  hyperagent_turn: 'hyperagent_turns',
};

const fmt = (value) => Number(value || 0).toLocaleString();

export default function CreditUsageBreakdown({ credits, compact = false, className = '' }) {
  if (!credits) return null;
  const catalog = credits.catalog || {};
  const units = credits.calculation?.units || {};

  return (
    <div className={`rounded-xl border border-[#e3e0db] bg-white ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`${compact ? 'text-[12.5px]' : 'text-sm'} font-semibold text-[#0a0a0a] font-['Space_Grotesk']`}>Credits by service</h2>
        <span className="text-[9.5px] text-[#999]">This month</span>
      </div>
      <div className={compact ? 'divide-y divide-[#eeeae4]' : 'grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3'}>
        {Object.entries(catalog).map(([key, item]) => {
          let unitCount = Number(units[UNIT_KEYS[key]] || 0);
          if (key === 'knowledge_page_evidence' && units.knowledge_pages != null) {
            unitCount = Math.max(0, Number(units.knowledge_pages || 0) - Number(units.knowledge_both_pages_identified || 0));
          }
          const used = Number(credits.breakdown?.[key] || 0);
          return (
            <div key={key} className={compact ? 'flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0' : 'border-b border-[#eeeae4] pb-2'}>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-[#525252]">{item.label}</div>
                <div className="text-[9px] text-[#999]">
                  {unitCount > 0 ? `${fmt(unitCount)} ${item.unit}${unitCount === 1 ? '' : 's'} × ${item.credits}` : `${item.credits} credit${item.credits === 1 ? '' : 's'} / ${item.unit}`}
                </div>
              </div>
              <div className={`${compact ? 'text-[12px]' : 'mt-0.5 text-xs'} shrink-0 font-semibold tabular-nums text-[#0a0a0a]`}>{fmt(used)} credits</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
