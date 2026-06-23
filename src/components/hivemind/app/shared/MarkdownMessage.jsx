import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders assistant/chat content as markdown — bold, lists, headings, code,
 * links, and GFM tables — instead of raw `**`/`|` text.
 *
 * Safe by construction: react-markdown does NOT render raw HTML (no
 * `rehype-raw`), so model output cannot inject markup. Links open in a new tab
 * with noopener. Styling is scoped via the `hm-md` class (see element map).
 */
export default function MarkdownMessage({ children, className = '' }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  return (
    <div className={`hm-md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#117dff] underline underline-offset-2" />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table {...props} className="border-collapse text-[12px] w-full" />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th {...props} className="border border-[#e3e0db] bg-[#faf9f4] px-2 py-1 text-left font-semibold" />
          ),
          td: ({ node, ...props }) => (
            <td {...props} className="border border-[#e3e0db] px-2 py-1 align-top" />
          ),
          code: ({ node, inline, ...props }) => (
            inline
              ? <code {...props} className="bg-[#f3f1ec] rounded px-1 py-0.5 text-[12px] font-mono" />
              : <code {...props} className="block bg-[#f3f1ec] rounded-md p-2.5 text-[12px] font-mono overflow-x-auto" />
          ),
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-1.5 space-y-0.5" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-1.5 space-y-0.5" />,
          h1: ({ node, ...props }) => <h1 {...props} className="text-[15px] font-bold mt-2 mb-1" />,
          h2: ({ node, ...props }) => <h2 {...props} className="text-[14px] font-bold mt-2 mb-1" />,
          h3: ({ node, ...props }) => <h3 {...props} className="text-[13px] font-semibold mt-2 mb-1" />,
          p: ({ node, ...props }) => <p {...props} className="my-1.5 first:mt-0 last:mb-0" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
