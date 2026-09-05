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
    <div dir="auto" className={`hm-md min-w-0 leading-[1.75] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#117dff] underline underline-offset-2">{children}</a>
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
          // react-markdown v9 does not supply `inline`. A pre owns fenced
          // block layout; code remains inline in paragraphs and list items.
          code: ({ node, className = '', ...props }) => <code {...props} className={`bg-[#f3f1ec] rounded px-1 py-0.5 text-[0.85em] font-mono ${className}`} />,
          pre: ({ node, ...props }) => <pre {...props} className="my-3 rounded-[10px] border border-[#e3e0db] bg-[#f3f1ec] p-3 text-[13px] leading-relaxed overflow-x-auto [&>code]:p-0 [&>code]:bg-transparent" />,
          blockquote: ({ node, ...props }) => <blockquote {...props} className="my-3 border-l-2 border-[#d4d0ca] pl-4 text-[#737373]" />,
          img: ({ node, alt }) => <span className="text-[#737373]">{alt || ''}</span>,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-1.5 space-y-0.5" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-1.5 space-y-0.5" />,
          h1: ({ node, children, ...props }) => <h1 {...props} className="text-[15px] font-bold mt-2 mb-1">{children}</h1>,
          h2: ({ node, children, ...props }) => <h2 {...props} className="text-[14px] font-bold mt-2 mb-1">{children}</h2>,
          h3: ({ node, children, ...props }) => <h3 {...props} className="text-[13px] font-semibold mt-2 mb-1">{children}</h3>,
          p: ({ node, ...props }) => <p {...props} className="my-1.5 first:mt-0 last:mb-0" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
