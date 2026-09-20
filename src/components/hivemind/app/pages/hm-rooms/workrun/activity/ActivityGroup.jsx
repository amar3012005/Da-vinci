import React from 'react';
import ActivityRow from './ActivityRow';
import SearchActivity from './SearchActivity';
import MemoryActivity from './MemoryActivity';
import BrowserActivity from './BrowserActivity';
import AppActivity from './AppActivity';

export default function ActivityGroup({ items, onOpen }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-1">
      {list.map((item) => {
        const name = String(item.payload?.name || item.label || '');
        const row = { ...item, onOpen };
        if (/web_search/i.test(name)) return <SearchActivity key={item.id || item.block_id} {...row} />;
        if (/recall|memory|company_context/i.test(name)) return <MemoryActivity key={item.id || item.block_id} {...row} />;
        if (/browser|web_read|crawl/i.test(name)) return <BrowserActivity key={item.id || item.block_id} {...row} />;
        if (/composio|gmail|app/i.test(name)) return <AppActivity key={item.id || item.block_id} {...row} />;
        return <ActivityRow key={item.id || item.block_id} label={item.label || name} status={item.status} />;
      })}
    </div>
  );
}
