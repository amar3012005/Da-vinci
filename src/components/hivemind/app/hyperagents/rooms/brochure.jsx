// BrochureReport — renders the sealed synthesis with the EXACT structure, theme
// and UX of the SINGULANCE HIVEMIND brochure: an editorial long-form document.
// The markdown is composed into brochure SECTIONS (not a flat column): a serif
// hero, light reading sections with generous rhythm, dark inverted feature bands
// for key callouts, and a gradient CTA band for the closing "next steps".
//
// Structure map (from the reference HTML):
//   • outer: warm-cream #F5F0E8, centered reading column ~720px, 48–52px section rhythm
//   • hero: eyebrow (kind) + 34px Newsreader title + lead paragraph
//   • ## heading  → new light <section> (22px serif head + hairline)
//   • > [!important/insight] → dark inverted band (#1C1A16 ground, cream text)
//   • final "Next steps"/CTA section → purple gradient band (#2A2536→#4A3550)
//   • tables / timeline / chart / callouts render via renderMarkdownLite
import React from 'react';
import { renderMarkdownLite } from './shared';

const B = {
  ground: '#F5F0E8', ink: '#1C1A16', muted: '#6A6154', faint: '#8A8073',
  serif: "'Newsreader', Georgia, 'Times New Roman', serif",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
  rule: 'rgba(28,26,22,0.12)',
};

// Split markdown into sections at top-level "## " headings. The pre-heading
// remainder is the hero/lead. Returns [{title, body}], title '' = hero.
function splitSections(md) {
  const lines = String(md || '').replace(/\r/g, '').split('\n');
  const secs = [];
  let cur = { title: '', body: [] };
  for (const l of lines) {
    const h = l.match(/^##\s+(.+?)\s*$/); // top-level section break (## only)
    if (h) { secs.push(cur); cur = { title: h[1].replace(/[*#]/g, '').trim(), body: [] }; }
    else cur.body.push(l);
  }
  secs.push(cur);
  return secs.filter(s => s.title || s.body.join('').trim());
}

const _CTA_RE = /next step|call to action|book|schedule|get started|contact/i;
const _isEmailSubject = (b) => /^\s*\*{0,2}subject\s*:/i.test(b);

export default function BrochureReport({ report, eyebrow, title, accent = '#B0836A' }) {
  const content = String(report?.content || '');
  if (!content.trim()) return null;
  const secs = splitSections(content);
  const hero = secs[0] && !secs[0].title ? secs[0] : null;
  const rest = hero ? secs.slice(1) : secs;

  return (
    <div className="hyper-brochure rounded-2xl overflow-hidden"
      style={{ background: B.ground, color: B.ink, fontFamily: B.sans }}>
      {/* Outer reading frame — centered column, brochure horizontal padding */}
      <div className="mx-auto" style={{ maxWidth: 'min(100%, 960px)', padding: '0 clamp(20px, 4vw, 48px) 44px' }}>

        {/* ── Hero ── */}
        <header style={{ padding: '44px 0 8px' }}>
          <div className="flex items-center gap-2 text-[10.5px] uppercase"
            style={{ color: accent, letterSpacing: '0.22em', fontWeight: 600 }}>
            {eyebrow}
          </div>
          <h1 className="mt-2" style={{ fontFamily: B.serif, fontWeight: 500, fontSize: 34, lineHeight: 1.12, color: B.ink }}>
            {title}
          </h1>
          {hero && (
            <div className="mt-3 hyper-markdown" style={{ fontSize: 16, lineHeight: 1.7, color: '#3B372F', maxWidth: 820 }}>
              {renderMarkdownLite(hero.body.join('\n').trim())}
            </div>
          )}
          <div className="mt-4 h-px w-full" style={{ background: B.rule }} />
        </header>

        {/* ── Sections ── */}
        {rest.map((s, idx) => {
          const bodyMd = s.body.join('\n').trim();
          const t = (s.title || '').toLowerCase();
          const isCta = _CTA_RE.test(t);
          if (isCta) {
            // Gradient CTA band — the brochure's closing move.
            return (
              <section key={idx} className="hyper-brochure-dark rounded-xl mt-8"
                style={{ background: 'linear-gradient(120deg,#2A2536,#3A2E44 45%,#4A3550)', color: B.ground, padding: '32px 30px' }}>
                <h2 style={{ fontFamily: B.serif, fontWeight: 500, fontSize: 24, lineHeight: 1.15 }}>{s.title}</h2>
                <div className="mt-3 hyper-markdown" style={{ fontSize: 15, lineHeight: 1.7 }}>
                  {renderMarkdownLite(bodyMd)}
                </div>
              </section>
            );
          }
          // Standard light section — serif head, hairline, editorial body.
          return (
            <section key={idx} style={{ padding: '32px 0 4px' }}>
              <h2 style={{ fontFamily: B.serif, fontWeight: 500, fontSize: 22, lineHeight: 1.2, color: B.ink }}>{s.title}</h2>
              <div className="mt-1 mb-3 h-px w-14" style={{ background: accent }} />
              <div className={`hyper-markdown ${_isEmailSubject(bodyMd) ? 'hyper-brochure-letter' : ''}`}
                style={{ fontSize: 15, lineHeight: 1.7, color: B.ink }}>
                {renderMarkdownLite(bodyMd)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
