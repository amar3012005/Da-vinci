import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Seo from '../Seo';

/**
 * NewsArticleLayout — Mistral news-article style (mistral.ai/news/...).
 * Full-bleed image hero with a centered RESEARCH badge + title + date/author and
 * overlaid Back / Share controls, then a light editorial body: a Highlights
 * block beside a product card, followed by the article sections (children).
 * Warm-paper canvas, black ink, one ember accent. Hero background swaps via heroImg.
 */
const PAPER = '#FBFBF8';
const INK = '#0a0a0a';
const EMBER = '#FF5229';
const BORDER = '#E4E3DE';

const NewsArticleLayout = ({
  badge = 'Research',
  title,
  date,
  author = 'SINGULANCE Labs',
  heroImg,
  seo,
  product,        // { name, tag, desc }
  highlights = [],
  children,
}) => {
  const navigate = useNavigate();
  return (
    <div style={{ background: PAPER, color: INK }} className="min-h-screen font-['Inter']">
      {seo && <Seo {...seo} />}

      {/* HERO — full-bleed image, centered title, overlaid controls */}
      <header
        className="relative flex min-h-[62vh] flex-col"
        style={{
          backgroundColor: '#0a0d18',
          backgroundImage: heroImg
            ? `linear-gradient(180deg, rgba(5,7,15,0.45), rgba(5,7,15,0.65)), url(${heroImg})`
            : 'radial-gradient(120% 80% at 80% 10%, #16335e 0%, #0a0d18 55%, #05070f 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 bg-transparent text-[13px] font-medium text-white/80 hover:text-white">
            SINGULANCE
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/50">Research</span>
        </div>

        {/* centered title */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="rounded bg-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">{badge}</span>
          <h1 className="font-['Space_Grotesk'] mt-6 max-w-4xl text-4xl font-medium leading-[1.08] tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.2em] text-white/65">{date} &nbsp;·&nbsp; By {author}</p>
        </div>

        {/* bottom controls */}
        <div className="relative z-10 flex items-center justify-between px-6 pb-6 md:px-10">
          <button onClick={() => navigate('/research')} className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/50">
            <ArrowLeft size={14} /> Back to Research
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/25 bg-black/30 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-md">Share the post</span>
            <span className="h-8 w-8 rounded" style={{ background: EMBER }} />
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="mx-auto max-w-[1000px] px-6 py-16 md:py-20">
        {/* Highlights + product card */}
        <div className="grid gap-10 border-b pb-14 md:grid-cols-[1fr_320px]" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="font-['Space_Grotesk'] text-2xl font-semibold tracking-tight" style={{ color: INK }}>Highlights</h2>
            <ul className="mt-5 space-y-3 text-[16px] leading-relaxed text-[#3a3a36]">
              {highlights.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: EMBER }} />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          {product && (
            <aside className="h-fit rounded-xl border p-5" style={{ borderColor: BORDER, background: '#fff' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: EMBER }}>
                  <span className="font-['Space_Grotesk'] text-sm font-bold text-white">{product.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-['Space_Grotesk'] text-[15px] font-semibold" style={{ color: INK }}>{product.name}</div>
                  {product.tag && <span className="font-mono text-[10px] uppercase tracking-wider text-[#8a8a82]">{product.tag}</span>}
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[#525252]">{product.desc}</p>
            </aside>
          )}
        </div>

        {/* article body */}
        <article className="prose-singulance mt-14">{children}</article>
      </main>

      {/* full-bleed accent CTA */}
      <section className="px-6 py-16 md:py-20" style={{ background: EMBER }}>
        <div className="mx-auto flex max-w-[1000px] flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="font-['Space_Grotesk'] text-2xl font-semibold text-white md:text-3xl">Beyond the horizon of intelligence.</p>
          <a href="/research" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-[14px] font-semibold text-white no-underline">More SINGULANCE research</a>
        </div>
      </section>
    </div>
  );
};

/* small section helpers for the article body */
export const H2 = ({ children }) => (
  <h2 className="font-['Space_Grotesk'] mt-12 text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: '#0a0a0a' }}>{children}</h2>
);
export const P = ({ children }) => (
  <p className="mt-4 text-[16px] leading-relaxed text-[#3a3a36]">{children}</p>
);
export const Table = ({ head, rows }) => (
  <div className="mt-6 overflow-x-auto rounded-lg border" style={{ borderColor: '#E4E3DE' }}>
    <table className="w-full border-collapse text-[14px]">
      <thead>
        <tr className="bg-[#f3f2ec] text-left font-mono text-[11px] uppercase tracking-wider text-[#737367]">
          {head.map((h) => <th key={h} className="border-b px-4 py-3 font-medium" style={{ borderColor: '#E4E3DE' }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="align-top">
            {r.map((c, j) => <td key={j} className="border-b px-4 py-3" style={{ borderColor: '#E4E3DE', color: j === 0 ? '#0a0a0a' : '#3a3a36', fontWeight: j === 0 ? 500 : 400 }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default NewsArticleLayout;
