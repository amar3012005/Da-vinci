import React, { useState } from 'react';
import { Hexagon, Copy, Check, ShieldCheck, KeyRound, Server, Lock, Cpu, ArrowLeft } from 'lucide-react';

/**
 * /research/post-quantum-cryptography — a full research page in the SINGULANCE
 * blueprint day aesthetic (ivory paper, ink, #117dff, Space Grotesk, mono
 * eyebrows, terminal code blocks). Static, self-contained; sourced from the
 * PQC codebase recon (2026-07-02).
 */


function CodeBlock({ label, children }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : '';
  return (
    <div className="my-4 overflow-hidden rounded-[10px] border border-[#e3e0db] bg-white">
      <div className="flex items-center gap-1.5 border-b border-[#e3e0db] bg-[#faf9f4] px-3.5 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 font-mono text-[10px] text-[#a3a3a3]">{label}</span>
        <button
          onClick={() => { try { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* noop */ } }}
          className="ml-auto flex items-center gap-1 font-mono text-[10px] text-[#a3a3a3] hover:text-[#0a0a0a]">
          {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}{copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre p-4 font-mono text-[12px] leading-relaxed text-[#0a0a0a]">{text}</pre>
    </div>
  );
}

const Eyebrow = ({ children }) => (
  <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#117dff]">
    <span className="text-[#a3a3a3]">〉</span> {children}
  </div>
);
const H2 = ({ id, children }) => (
  <h2 id={id} className="mt-14 scroll-mt-24 font-['Space_Grotesk'] text-[24px] font-semibold tracking-tight text-[#0a0a0a]">{children}</h2>
);
const P = ({ children }) => <p className="my-3 text-[14px] leading-relaxed text-[#525252]">{children}</p>;
const B = ({ children }) => <strong className="font-semibold text-[#0a0a0a]">{children}</strong>;
const Mono = ({ children }) => <code className="rounded-[4px] border border-[#e3e0db] bg-[#f3f1ec] px-1.5 py-0.5 font-mono text-[12px] text-[#0a0a0a]">{children}</code>;

function Table({ head, rows }) {
  return (
    <div className="my-4 overflow-x-auto rounded-[10px] border border-[#e3e0db]">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-[#e3e0db] bg-[#faf9f4] text-left font-mono text-[10px] uppercase tracking-wider text-[#737373]">
            {head.map((h) => <th key={h} className="px-3.5 py-2.5 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eae7e1]">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3.5 py-2.5 ${j === 0 ? 'font-semibold text-[#0a0a0a]' : 'text-[#525252]'}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NAV = [
  ['why', 'Threat model'],
  ['layers', 'The three layers'],
  ['layer1', '— Hybrid PQC TLS'],
  ['layer2', '— Memory integrity'],
  ['layer3', '— Audit chain'],
  ['keys', 'Key management'],
  ['verify', 'Verification & endpoints'],
  ['standards', 'Standards & library'],
  ['roadmap', 'Guarantees & roadmap'],
];

export default function PostQuantumResearch() {
  return (
    <div className="min-h-screen bg-[#faf9f4]">
      {/* SINGULANCE nav */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e3e0db] bg-[#faf9f4]/90 px-5 backdrop-blur-xl md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <a href="https://singulancelabs.com" className="font-['Space_Grotesk'] text-[12px] font-bold tracking-[0.22em] text-[#0a0a0a] no-underline">SINGULANCE</a>
          <span className="text-[#d4d0ca]">/</span>
          <a href="/research" className="flex items-center gap-1.5 no-underline"><Hexagon size={14} className="text-[#117dff]" /><span className="font-['Space_Grotesk'] text-[12px] font-semibold text-[#0a0a0a]">Research</span></a>
        </div>
        <a href="/hivemind/app/mcp" className="rounded-[6px] bg-[#117dff] px-3 py-1.5 text-[12px] font-semibold text-white no-underline hover:bg-[#0066e0]">Open console</a>
      </header>

      <div className="mx-auto flex max-w-[1180px] gap-10 px-5 py-10 md:px-8">
        {/* TOC */}
        <nav className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20 space-y-0.5">
            <a href="/research" className="mb-3 flex items-center gap-1.5 text-[11px] text-[#a3a3a3] no-underline hover:text-[#0a0a0a]"><ArrowLeft size={12} /> All research</a>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">On this page</div>
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={`block rounded-[6px] px-2 py-1 text-[12px] no-underline hover:bg-[#f3f1ec] hover:text-[#0a0a0a] ${label.startsWith('—') ? 'pl-4 text-[#a3a3a3]' : 'font-medium text-[#525252]'}`}>{label.replace('— ', '')}</a>
            ))}
          </div>
        </nav>

        <main className="min-w-0 max-w-[760px] flex-1">
          <Eyebrow>RESEARCH · POST-QUANTUM · 2026-07-02</Eyebrow>
          <h1 className="font-['Space_Grotesk'] text-[34px] font-medium leading-[1.06] tracking-tight text-[#0a0a0a] md:text-[42px]">
            Post-quantum cryptography in HIVEMIND
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#737373]">
            Three independent quantum-resistant layers — hybrid PQC TLS on the edge, ML-DSA-65 signatures on every memory write, and an SLH-DSA tamper-evident audit chain. NIST-standard, audited library, graceful degradation.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {['FIPS 203 · ML-KEM', 'FIPS 204 · ML-DSA', 'FIPS 205 · SLH-DSA', '@noble/post-quantum'].map((t) => (
              <span key={t} className="rounded-full border border-[#117dff]/25 bg-[#117dff]/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#117dff]">{t}</span>
            ))}
          </div>

          {/* TL;DR callout */}
          <div className="mt-8 rounded-[12px] border-l-2 border-[#117dff] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[#117dff]">TL;DR</div>
            <p className="text-[14px] leading-relaxed text-[#0a0a0a]">
              HIVEMIND ships post-quantum crypto in <B>three independent layers</B>: (1) <B>hybrid PQC TLS</B> on the edge so traffic can't be <em>harvested-now / decrypted-later</em>, (2) <B>ML-DSA-65</B> signatures on every memory write for integrity, and (3) an <B>SLH-DSA</B> append-only, chained <B>tamper-evident audit trail</B>. All use NIST-standard algorithms via the audited <Mono>@noble/post-quantum</Mono> library. Signing keys live only in env (never the DB), and every layer degrades gracefully — if keys/lib are absent, the main flow still works, just unsigned.
            </p>
          </div>

          <H2 id="why">Why — the threat model</H2>
          <P>An adversary who can't break today's crypto can still <B>record encrypted traffic today and decrypt it later</B> once a cryptographically-relevant quantum computer exists ("harvest-now, decrypt-later"). Separately, an attacker with DB access could try to <B>forge or silently rewrite</B> stored memories or audit logs. HIVEMIND addresses both with quantum-resistant primitives at the transport, data-integrity, and audit layers.</P>

          <H2 id="layers">The three layers at a glance</H2>
          <Table
            head={['Layer', 'Purpose', 'Algorithm', 'Standard', 'Where']}
            rows={[
              ['Transport', 'Defeat harvest-now / decrypt-later', 'X25519 + ML-KEM-768 (hybrid KEM)', 'FIPS 203', 'Caddy edge'],
              ['Memory integrity', 'Prove a memory wasn’t forged/altered', 'ML-DSA-65', 'FIPS 204', 'pqc-signer.js → memory_signatures'],
              ['Audit trail', 'Tamper-evident, append-only log', 'SLH-DSA-SHA2-128s', 'FIPS 205', 'audit-logger.js → audit_signatures'],
            ]}
          />

          <H2 id="layer1"><span className="text-[#117dff]">01 ·</span> Hybrid post-quantum TLS</H2>
          <P>Every HTTPS connection to the API and core is negotiated with a <B>hybrid key exchange</B>:</P>
          <CodeBlock label="Caddyfile · tls curves">{`curves x25519mlkem768 x25519`}</CodeBlock>
          <P><B>X25519MLKEM768</B> combines classical X25519 with NIST ML-KEM-768 (FIPS 203). The shared secret is safe unless <em>both</em> are broken — no weaker than today's crypto, quantum-resistant on top. Recorded sessions <B>cannot be decrypted later</B> by a quantum attacker. Served by Caddy 2.11 (native <Mono>x25519mlkem768</Mono>); classical <Mono>x25519</Mono> stays as fallback for older clients.</P>

          <H2 id="layer2"><span className="text-[#117dff]">02 ·</span> Memory write integrity — ML-DSA-65</H2>
          <P>On a memory write, HIVEMIND signs a <B>canonical, deterministic</B> representation of the record:</P>
          <CodeBlock label="pqc-signer.js">{`payload   = canonical({ id, user_id, org_id, content })
signature = ML_DSA_65.sign(payload, PQC_MEMORY_SK)`}</CodeBlock>
          <P>Stored in the <Mono>memory_signatures</Mono> table (<Mono>memory_id → signature</Mono>), separate from the memory row. <Mono>canonical()</Mono> sorts keys and stringifies deterministically, so the signed bytes are <B>reproducible at verify time</B>. ML-DSA-65 (FIPS 204, lattice-based) is fast enough to sign per-write. Anyone can verify with the <B>public</B> key — an attacker who alters <Mono>content</Mono> in the DB can't produce a matching signature, because the secret key isn't in the DB.</P>

          <H2 id="layer3"><span className="text-[#117dff]">03 ·</span> Tamper-evident audit chain — SLH-DSA</H2>
          <P>Security-relevant events are chained like a mini-blockchain and signed with a conservative hash-based scheme:</P>
          <CodeBlock label="audit-logger.js">{`entry_hash = sha256( prev_hash + canonical(entry) )
signature  = SLH_DSA_SHA2_128s.sign(entry_hash, PQC_AUDIT_SK)
→ INSERT INTO audit_signatures (audit_id, org_id, alg, prev_hash, entry_hash, signature, seq)`}</CodeBlock>
          <P>Each entry's <Mono>prev_hash</Mono> links to the previous entry's <Mono>entry_hash</Mono> → <B>append-only</B>: you can't insert, delete, or reorder without breaking the chain. The genesis anchor has <Mono>prev_hash === ''</Mono>. Signed with SLH-DSA-SHA2-128s (FIPS 205) — hash-based, the most conservative PQC signature family (minimal assumptions), used here because audit integrity is worth the heavier signature. A periodic <B>checkpoint</B> signs <Mono>{'{ org, max_seq, head_entry_hash, row_count }'}</Mono> so the whole trail's head verifies in one shot.</P>

          <H2 id="keys">Key management</H2>
          <Table
            head={['Key', 'Algorithm', 'Env (secret / public)']}
            rows={[
              ['Memory signing', 'ML-DSA-65', 'PQC_MEMORY_SK / PQC_MEMORY_PK'],
              ['Audit signing', 'SLH-DSA-SHA2-128s', 'PQC_AUDIT_SK / PQC_AUDIT_PK'],
            ]}
          />
          <P>Generated by <Mono>core/scripts/pqc-keygen.mjs</Mono> (prints env lines). <B>Secret keys live ONLY in env</B>, never in the database — so DB compromise ≠ forgery ability. Public keys are exposed for independent verification. <B>Graceful degradation</B>: if keys or the library are missing, sign/verify return <Mono>null</Mono>/<Mono>false</Mono> and the caller proceeds unsigned — signing never breaks the main flow.</P>

          <H2 id="verify">Verification & endpoints</H2>
          <Table
            head={['Endpoint', 'What it does']}
            rows={[
              [<Mono>GET /api/security/pqc</Mono>, 'Status (algorithms, whether keys are loaded) + the public keys'],
              [<Mono>GET /api/security/verify-memory</Mono>, 'Recomputes a memory’s canonical payload and verifies its ML-DSA signature'],
              [<Mono>GET /api/security/audit-verify</Mono>, 'Walks the chain: recompute entry_hash, verify each link + SLH-DSA signature + checkpoint → tamper_evident'],
            ]}
          />
          <P>A cold test (<Mono>cold-tests/t4-security-verify.mjs</Mono>, "T4") checks all of this against a live deployment: public keys present, memory signatures valid, audit chain intact with no tail regression.</P>

          <H2 id="standards">Standards & library</H2>
          <div className="my-4 grid gap-3 sm:grid-cols-2">
            {[
              [KeyRound, 'FIPS 203', 'ML-KEM — key encapsulation'],
              [ShieldCheck, 'FIPS 204', 'ML-DSA — lattice signatures'],
              [Lock, 'FIPS 205', 'SLH-DSA — hash-based signatures'],
              [Cpu, '@noble/post-quantum ^0.6.1', 'Pure-JS, audited NIST PQC'],
            ].map(([Icon, k, v]) => (
              <div key={k} className="flex items-start gap-3 rounded-[10px] border border-[#e3e0db] bg-white p-4">
                <Icon size={16} className="mt-0.5 shrink-0 text-[#117dff]" />
                <div><div className="font-['Space_Grotesk'] text-[13px] font-semibold text-[#0a0a0a]">{k}</div><div className="font-mono text-[11px] text-[#a3a3a3]">{v}</div></div>
              </div>
            ))}
          </div>

          <H2 id="roadmap">Guarantees, limits & roadmap</H2>
          <P><B>Guarantees.</B> Transport secrecy is quantum-resistant (hybrid) — recorded traffic stays safe. Stored memories are integrity-signed; DB-level tampering is detectable. The audit trail is append-only and tamper-evident, verifiable end-to-end by a third party using only public keys.</P>
          <P><B>Current limits.</B> PQC here covers key exchange + signatures (integrity/authenticity). At-rest payload <em>encryption</em> is separate (standard DB/disk encryption; not PQC-KEM-wrapped). Signing is best-effort: with keys absent, writes proceed unsigned by design (availability over hard-fail).</P>
          <P><B>Roadmap.</B> Enforce-signing mode (reject unsigned writes) for high-assurance tenants · per-tenant signing keys · PQC-wrapped envelope encryption for memory payloads at rest.</P>

          <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#e3e0db] pt-6 font-mono text-[10px] uppercase tracking-wider text-[#a3a3a3]">
            <span className="flex items-center gap-1.5"><Server size={11} className="text-[#117dff]/60" /> EU sovereign</span>
            <span>·</span>
            <span>Source: pqc-signer.js · audit-logger.js · Caddyfile · pqc-keygen.mjs · t4-security-verify.mjs</span>
          </div>
          <p className="mt-4 text-[11px] italic text-[#a3a3a3]">Auto-generated from a codebase recon — 2026-07-02.</p>
        </main>
      </div>
    </div>
  );
}
