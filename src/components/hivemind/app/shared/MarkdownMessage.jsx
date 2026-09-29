import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Keep component identities stable while a streamed answer grows. Recreating
// this map on every chunk remounts headings, tables, and code blocks in place.
const MARKDOWN_COMPONENTS = {
  a: ({ node, children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-[#117dff] underline underline-offset-2 break-all">{children}</a>
  ),
  table: ({ node, ...props }) => (
    <div className="my-4 max-w-full overflow-x-auto rounded-xl border border-[#e3e0db]">
      <table {...props} className="w-full min-w-[420px] border-collapse text-left text-[13px] leading-5" />
    </div>
  ),
  thead: ({ node, ...props }) => <thead {...props} className="bg-[#f6f5f2] text-[#343434]" />,
  tr: ({ node, ...props }) => <tr {...props} className="border-b border-[#eae7e2] last:border-b-0" />,
  th: ({ node, ...props }) => <th {...props} scope="col" className="min-w-[100px] px-3 py-2 font-semibold align-top" />,
  td: ({ node, ...props }) => <td {...props} className="min-w-[100px] px-3 py-2 align-top break-words" />,
  code: ({ node, className = '', ...props }) => <code {...props} className={`rounded bg-[#f3f1ec] px-1 py-0.5 font-mono text-[0.85em] ${className}`} />,
  pre: ({ node, ...props }) => <pre {...props} className="my-3 max-w-full overflow-x-auto rounded-xl border border-[#e3e0db] bg-[#f3f1ec] p-3 text-[12px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0" />,
  blockquote: ({ node, ...props }) => <blockquote {...props} className="my-3 border-l-[3px] border-[#d4d0ca] pl-4 text-[#626262]" />,
  img: ({ node, alt }) => <span className="text-[#737373]">{alt || ''}</span>,
  ul: ({ node, ...props }) => <ul {...props} className="my-2 list-disc space-y-1 pl-6" />,
  ol: ({ node, ...props }) => <ol {...props} className="my-2 list-decimal space-y-1 pl-6" />,
  li: ({ node, ...props }) => <li {...props} className="pl-0.5 [&>p]:my-1" />,
  h1: ({ node, children, ...props }) => <h1 {...props} className="mb-3 mt-6 text-[22px] font-semibold leading-tight first:mt-0">{children}</h1>,
  h2: ({ node, children, ...props }) => <h2 {...props} className="mb-2 mt-5 text-[18px] font-semibold leading-snug first:mt-0">{children}</h2>,
  h3: ({ node, children, ...props }) => <h3 {...props} className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{children}</h3>,
  p: ({ node, ...props }) => <p {...props} className="my-3 first:mt-0 last:mb-0" />,
  hr: ({ node, ...props }) => <hr {...props} className="my-5 border-[#e7e4df]" />,
};

/**
 * Renders assistant/chat content as markdown — bold, lists, headings, code,
 * links, and GFM tables — instead of raw `**`/`|` text.
 *
 * Safe by construction: react-markdown does NOT render raw HTML (no
 * `rehype-raw`), so model output cannot inject markup. Links open in a new tab
 * with noopener. Styling is scoped via the `hm-md` class (see element map).
 */
function MarkdownMessage({ children, className = '', streaming = false }) {
  const text = typeof children === 'string' ? children : String(children ?? '');
  return (
    <div dir="auto" data-streaming={streaming || undefined} className={`hm-md min-w-0 max-w-full break-words leading-[1.75] ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessage);
