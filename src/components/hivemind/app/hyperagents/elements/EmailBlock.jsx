import React from 'react';
import { Mail } from 'lucide-react';

/**
 * EmailBlock — structured, read-only email rendering for sealed reports.
 *
 * The synthesis for outreach turns opens with a ready-to-send email as plain
 * markdown ("Subject: … / Dear … / body"). Dumping that as raw prose reads
 * like chatbot output; this element renders it as a real email artifact —
 * envelope rows (Subject / To when present) + a clean letter body — so the
 * report looks like a deliverable a colleague prepared.
 *
 * parseEmailMarkdown() is exported for the renderer's detection step: a
 * section qualifies when its first non-empty line is a Subject: line.
 */
export function parseEmailMarkdown(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const first = lines.find((l) => l.trim());
  const m = (first || '').match(/^\*{0,2}Subject:?\*{0,2}\s*(.+)$/i);
  if (!m) return null;
  const subject = m[1].replace(/\*+/g, '').trim();
  const rest = lines.slice(lines.indexOf(first) + 1);
  // Optional To/Cc envelope rows the model sometimes emits after Subject.
  const envelope = {};
  while (rest.length) {
    const em = rest[0].match(/^\*{0,2}(To|Cc|From):?\*{0,2}\s*(.+)$/i);
    if (!em) break;
    envelope[em[1].toLowerCase()] = em[2].replace(/\*+/g, '').trim();
    rest.shift();
  }
  return { subject, envelope, body: rest.join('\n').trim() };
}

export function EmailBlock({ subject, envelope = {}, body, renderMarkdown }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e3e0db] bg-white shadow-sm max-w-[600px]">
      <div className="flex items-center gap-2 bg-[#fafafa] border-b border-[#eee] px-3.5 py-2">
        <Mail size={13} className="text-[#525252]" />
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#525252]">Draft email — ready to send</span>
      </div>
      <div className="px-3.5 text-[12.5px]">
        <div className="flex gap-2 border-b border-[#f2f0ec] py-2">
          <span className="text-[#a3a3a3] w-14 shrink-0">Subject</span>
          <span className="text-[#0a0a0a] font-medium">{subject}</span>
        </div>
        {['from', 'to', 'cc'].map((k) => envelope[k] ? (
          <div key={k} className="flex gap-2 border-b border-[#f2f0ec] py-2">
            <span className="text-[#a3a3a3] w-14 shrink-0 capitalize">{k}</span>
            <span className="text-[#0a0a0a] truncate">{envelope[k]}</span>
          </div>
        ) : null)}
        <div className="py-3 leading-relaxed text-[#1f1f1f]">
          {renderMarkdown ? renderMarkdown(body) : <div className="whitespace-pre-wrap">{body}</div>}
        </div>
      </div>
    </div>
  );
}

export default EmailBlock;
