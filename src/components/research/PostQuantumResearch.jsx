import React, { useState } from 'react';
import NewsArticleLayout, { H2, P, Table, FullBleed } from './NewsArticleLayout';
import { Lock, LockKeyhole, Zap } from 'lucide-react';

/**
 * /research/post-quantum-cryptography — same news-article theme + outline as
 * IcarusResearch/CsiResearch (NewsArticleLayout: full-bleed hero, Highlights +
 * product card, editorial body, ember CTA). Adds one interactive FullBleed
 * "quantum attack" vault. Content sourced from the PQC codebase recon (2026-07-02).
 */

const BLUE = '#117dff';
const BORDER = '#E4E3DE';

/* Terminal-style code block on the warm-paper body (matches editorial tone). */
const Code = ({ label, children }) => (
  <div className="mt-6 overflow-hidden rounded-lg border" style={{ borderColor: BORDER }}>
    <div className="flex items-center gap-1.5 border-b px-4 py-2" style={{ borderColor: BORDER, background: '#f3f2ec' }}>
      <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[#8a8a82]">{label}</span>
    </div>
    <pre className="overflow-x-auto whitespace-pre bg-white p-4 font-mono text-[12.5px] leading-relaxed text-[#0a0a0a]">{children}</pre>
  </div>
);

/* Interactive lattice — mirrors the homepage vault; used inside a FullBleed. */
function QuantumVault() {
  const [pq, setPq] = useState(true);
  const [attack, setAttack] = useState(0);
  const broken = !pq && attack > 0;

  const cols = 6, rows = 5, gap = 46, ox = 34, oy = 30;
  const nodes = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) nodes.push({ x: ox + c * gap, y: oy + r * gap, c, r });
  const bonds = [];
  nodes.forEach((n) => {
    const right = nodes.find((m) => m.c === n.c + 1 && m.r === n.r);
    const down = nodes.find((m) => m.c === n.c && m.r === n.r + 1);
    if (right) bonds.push([n, right]);
    if (down) bonds.push([n, down]);
  });

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-16 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">〉 harvest-now · decrypt-later</span>
      <h3 className="font-['Space_Grotesk'] mt-4 text-2xl font-semibold text-white md:text-3xl">Fire a quantum attack at the vault.</h3>
      <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-white/55">
        Classical RSA/ECC falls to Shor’s algorithm. The lattice problem behind ML-KEM stays hard — the vault holds.
      </p>

      <div className="mt-8 inline-flex items-center rounded-full border border-white/15 bg-white/5 p-1">
        {[['Classical', false], ['Post-Quantum', true]].map(([label, val]) => (
          <button key={label} onClick={() => { setPq(val); setAttack(0); }}
            className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-all ${pq === val ? 'bg-white text-[#05070f]' : 'text-white/60 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-8 aspect-[6/5] w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d18]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(17,125,255,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(17,125,255,0.05)_1px,transparent_1px)] bg-[size:28px_28px]" />
        {pq && (
          <svg viewBox="0 0 300 250" className="absolute inset-0 h-full w-full">
            {bonds.map(([a, b], i) => <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={BLUE} strokeWidth="0.7" strokeOpacity={attack > 0 ? 0.55 : 0.28} />)}
            {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r="1.8" fill={BLUE} opacity="0.8">{attack > 0 && <animate attributeName="cy" values={`${n.y};${n.y + (i % 2 ? 4 : -4)};${n.y}`} dur="0.9s" repeatCount="1" />}</circle>)}
          </svg>
        )}
        {attack > 0 && (
          <span key={attack} className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.4), transparent 70%)', animation: 'pqpulse 0.9s ease-out' }} />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 ${broken ? 'border-[#dc2626]/50 bg-[#dc2626]/10' : 'border-[#117dff]/40 bg-[#117dff]/10'}`}>
            {broken ? <Lock size={34} className="text-[#dc2626]" strokeWidth={1.6} /> : <LockKeyhole size={34} className="text-[#4a9fff]" strokeWidth={1.6} />}
          </div>
          <div className={`mt-3 font-mono text-[10px] uppercase tracking-[0.24em] ${broken ? 'text-[#ff6b6b]' : 'text-[#4a9fff]'}`}>
            {broken ? 'RSA-2048 broken' : pq ? 'ML-KEM sealed' : 'RSA-2048'}
          </div>
          {broken && <div className="mt-1 text-[10px] text-white/40">harvested payload decrypted</div>}
          {pq && attack > 0 && <div className="mt-1 text-[10px] text-[#4ade80]">lattice held · attack absorbed</div>}
        </div>
      </div>

      <button onClick={() => setAttack((n) => n + 1)}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10">
        <Zap size={14} className="text-[#ff6b6b]" /> Run quantum attack
      </button>
      <style>{`@keyframes pqpulse{from{transform:translate(-50%,-50%) scale(0.2);opacity:0.6}to{transform:translate(-50%,-50%) scale(6);opacity:0}}`}</style>
    </div>
  );
}

export default function PostQuantumResearch() {
  return (
    <NewsArticleLayout
      badge="Research"
      title="Post-quantum cryptography, shipped in three layers"
      date="Jul 2, 2026"
      author="SINGULANCE Labs"
      seo={{
        title: 'Post-Quantum Cryptography — Harvest-Now-Decrypt-Later, Closed | SINGULANCE Research',
        description: 'How HIVEMIND ships NIST-standard post-quantum cryptography in three independent layers: hybrid PQC TLS, ML-DSA-65 memory signatures, and an SLH-DSA tamper-evident audit chain.',
      }}
      product={{ name: 'HIVEMIND', tag: 'Sovereign memory engine', desc: 'The memory layer that remembers everything your org knows — now quantum-resistant end to end: transport, integrity, and audit.' }}
      highlights={[
        'Three independent quantum-resistant layers — transport, memory integrity, and audit.',
        'Hybrid PQC TLS (X25519 + ML-KEM-768) closes harvest-now-decrypt-later at the edge.',
        'ML-DSA-65 signs every memory write; DB-level tampering becomes detectable.',
        'SLH-DSA chains the audit log into an append-only, tamper-evident trail.',
        'NIST FIPS 203/204/205 via the audited @noble/post-quantum; keys never touch the DB.',
      ]}
    >
      <H2>Why — the threat model</H2>
      <P>An adversary who can't break today's crypto can still <strong>record encrypted traffic now and decrypt it later</strong>, once a cryptographically-relevant quantum computer exists ("harvest-now, decrypt-later"). Separately, an attacker with DB access could try to <strong>forge or silently rewrite</strong> stored memories or audit logs. HIVEMIND addresses both with quantum-resistant primitives at the transport, data-integrity, and audit layers.</P>

      <H2>The three layers at a glance</H2>
      <Table
        head={['Layer', 'Purpose', 'Algorithm', 'Standard', 'Where']}
        rows={[
          ['Transport', 'Defeat harvest-now / decrypt-later', 'X25519 + ML-KEM-768 (hybrid KEM)', 'FIPS 203', 'Caddy edge'],
          ['Memory integrity', 'Prove a memory wasn’t forged/altered', 'ML-DSA-65', 'FIPS 204', 'pqc-signer.js → memory_signatures'],
          ['Audit trail', 'Tamper-evident, append-only log', 'SLH-DSA-SHA2-128s', 'FIPS 205', 'audit-logger.js → audit_signatures'],
        ]}
      />

      {/* Interactive vault — full-bleed dark band, like ICARUS's byte-slot */}
      <FullBleed><QuantumVault /></FullBleed>

      <H2>Layer 1 — Hybrid post-quantum TLS</H2>
      <P>Every HTTPS connection to the API and core is negotiated with a <strong>hybrid key exchange</strong>:</P>
      <Code label="Caddyfile · tls curves">{`curves x25519mlkem768 x25519`}</Code>
      <P><strong>X25519MLKEM768</strong> combines classical X25519 with NIST ML-KEM-768 (FIPS 203). The shared secret is safe unless <em>both</em> are broken — no weaker than today's crypto, quantum-resistant on top. Recorded sessions <strong>cannot be decrypted later</strong> by a quantum attacker. Served by Caddy 2.11 (native x25519mlkem768); classical x25519 stays as a fallback for older clients.</P>

      <H2>Layer 2 — Memory write integrity (ML-DSA-65)</H2>
      <P>On a memory write, HIVEMIND signs a <strong>canonical, deterministic</strong> representation of the record:</P>
      <Code label="core/src/security/pqc-signer.js">{`payload   = canonical({ id, user_id, org_id, content })
signature = ML_DSA_65.sign(payload, PQC_MEMORY_SK)`}</Code>
      <P>Stored in the <strong>memory_signatures</strong> table (memory_id → signature), separate from the memory row. <code>canonical()</code> sorts keys and stringifies deterministically, so the signed bytes are reproducible at verify time. ML-DSA-65 (FIPS 204, lattice-based) is fast enough to sign per-write. Anyone can verify with the <strong>public</strong> key — an attacker who alters <code>content</code> in the DB can't produce a matching signature, because the secret key isn't in the DB.</P>

      <H2>Layer 3 — Tamper-evident audit chain (SLH-DSA)</H2>
      <P>Security-relevant events are chained like a mini-blockchain and signed with a conservative hash-based scheme:</P>
      <Code label="core/src/audit/audit-logger.js">{`entry_hash = sha256( prev_hash + canonical(entry) )
signature  = SLH_DSA_SHA2_128s.sign(entry_hash, PQC_AUDIT_SK)
→ INSERT INTO audit_signatures (audit_id, org_id, alg, prev_hash, entry_hash, signature, seq)`}</Code>
      <P>Each entry's <code>prev_hash</code> links to the previous entry's <code>entry_hash</code> → <strong>append-only</strong>: you can't insert, delete, or reorder without breaking the chain. The genesis anchor has <code>prev_hash === ''</code>. Signed with SLH-DSA-SHA2-128s (FIPS 205) — hash-based, the most conservative PQC signature family (minimal assumptions), used here because audit integrity is worth the heavier signature. A periodic <strong>checkpoint</strong> signs {'{ org, max_seq, head_entry_hash, row_count }'} so the whole trail's head verifies in one shot.</P>

      <H2>Key management</H2>
      <Table
        head={['Key', 'Algorithm', 'Env (secret / public)']}
        rows={[
          ['Memory signing', 'ML-DSA-65', 'PQC_MEMORY_SK / PQC_MEMORY_PK'],
          ['Audit signing', 'SLH-DSA-SHA2-128s', 'PQC_AUDIT_SK / PQC_AUDIT_PK'],
        ]}
      />
      <P>Generated by <code>core/scripts/pqc-keygen.mjs</code> (prints env lines). <strong>Secret keys live ONLY in env</strong>, never in the database — so DB compromise ≠ forgery ability. Public keys are exposed for independent verification. <strong>Graceful degradation</strong>: if keys or the library are missing, sign/verify return null/false and the caller proceeds unsigned — signing never breaks the main flow.</P>

      <H2>Verification & endpoints</H2>
      <Table
        head={['Endpoint', 'What it does']}
        rows={[
          ['GET /api/security/pqc', 'Status (algorithms, whether keys are loaded) + the public keys'],
          ['GET /api/security/verify-memory', 'Recomputes a memory’s canonical payload and verifies its ML-DSA signature'],
          ['GET /api/security/audit-verify', 'Walks the chain: recompute entry_hash, verify each link + SLH-DSA signature + checkpoint → tamper_evident'],
        ]}
      />
      <P>A cold test (<code>cold-tests/t4-security-verify.mjs</code>, "T4") checks all of this against a live deployment: public keys present, memory signatures valid, and the audit chain intact with no tail regression.</P>

      <H2>Standards & library</H2>
      <Table
        head={['Standard', 'Algorithm', 'Role']}
        rows={[
          ['FIPS 203', 'ML-KEM', 'Key encapsulation (transport)'],
          ['FIPS 204', 'ML-DSA', 'Lattice signatures (memory integrity)'],
          ['FIPS 205', 'SLH-DSA', 'Hash-based signatures (audit)'],
          ['—', '@noble/post-quantum ^0.6.1', 'Pure-JS, audited NIST PQC implementations'],
        ]}
      />

      <H2>Guarantees, limits & roadmap</H2>
      <P><strong>Guarantees.</strong> Transport secrecy is quantum-resistant (hybrid) — recorded traffic stays safe. Stored memories are integrity-signed; DB-level tampering is detectable. The audit trail is append-only and tamper-evident, verifiable end-to-end by a third party using only public keys.</P>
      <P><strong>Current limits.</strong> PQC here covers key exchange + signatures (integrity/authenticity). At-rest payload <em>encryption</em> is separate (standard DB/disk encryption; not PQC-KEM-wrapped). Signing is best-effort: with keys absent, writes proceed unsigned by design (availability over hard-fail).</P>
      <P><strong>Roadmap.</strong> Enforce-signing mode (reject unsigned writes) for high-assurance tenants · per-tenant signing keys · PQC-wrapped envelope encryption for memory payloads at rest.</P>

      <P><em style={{ color: '#8a8a82', fontSize: 13 }}>Source of truth: pqc-signer.js · audit-logger.js · Caddyfile.api/Caddyfile.core · pqc-keygen.mjs · t4-security-verify.mjs. Auto-generated from a codebase recon — 2026-07-02.</em></P>
    </NewsArticleLayout>
  );
}
