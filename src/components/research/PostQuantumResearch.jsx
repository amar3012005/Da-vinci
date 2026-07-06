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
        description: 'How HIVEMIND ships NIST-standard post-quantum cryptography in three independent layers: hybrid key exchange on the edge, signed memory writes, and a tamper-evident audit chain.',
      }}
      product={{ name: 'HIVEMIND', tag: 'Sovereign memory engine', desc: 'The memory layer that remembers everything your org knows — now quantum-resistant end to end: transport, integrity, and audit.' }}
      highlights={[
        'Three independent quantum-resistant layers — transport, memory integrity, and audit.',
        'Hybrid key exchange closes harvest-now-decrypt-later at the edge: safe unless both classical and quantum-hard problems fall.',
        'Every memory write is signed; DB-level tampering becomes mathematically detectable.',
        'The audit log is chained into an append-only, tamper-evident trail — verifiable by anyone.',
        'NIST-standardized post-quantum primitives; signing keys never touch the database.',
      ]}
    >
      <H2>Why — the threat model</H2>
      <P>An adversary who can't break today's crypto can still <strong>record encrypted traffic now and decrypt it later</strong>, once a cryptographically-relevant quantum computer exists ("harvest-now, decrypt-later"). Separately, an attacker with DB access could try to <strong>forge or silently rewrite</strong> stored memories or audit logs. HIVEMIND addresses both with quantum-resistant primitives at the transport, data-integrity, and audit layers.</P>

      <H2>The three layers at a glance</H2>
      <Table
        head={['Layer', 'Purpose', 'Primitive', 'Standard']}
        rows={[
          ['Transport', 'Defeat harvest-now / decrypt-later', 'Hybrid key exchange (classical × lattice KEM)', 'FIPS 203'],
          ['Memory integrity', 'Prove a memory wasn’t forged or altered', 'Lattice signatures', 'FIPS 204'],
          ['Audit trail', 'Tamper-evident, append-only log', 'Hash-based signatures', 'FIPS 205'],
        ]}
      />

      {/* Interactive vault — full-bleed dark band, like ICARUS's byte-slot */}
      <FullBleed><QuantumVault /></FullBleed>

      <H2>Layer 1 — Hybrid post-quantum TLS</H2>
      <P>Every connection to HIVEMIND is negotiated with a <strong>hybrid key exchange</strong> — two independent secrets, combined:</P>
      <Code label="hybrid key exchange">{`shared_secret = combine(
    classical_ECDH,        // fast, proven today
    lattice_KEM            // quantum-hard (FIPS 203)
)`}</Code>
      <P>The session key is safe unless <em>both</em> the classical and the lattice problem are broken at once — so it is never weaker than today's crypto, and quantum-resistant on top. The practical consequence: an adversary who records the encrypted stream today <strong>cannot decrypt it later</strong>, even with a future quantum computer. Older clients that don't understand the hybrid negotiation fall back to the classical curve, so nothing breaks.</P>

      <H2>Layer 2 — Memory write integrity</H2>
      <P>Every time a memory is written, HIVEMIND signs a <strong>canonical, deterministic</strong> representation of the record — the exact same bytes can be reconstructed later:</P>
      <Code label="memory write — signing logic">{`payload   = canonical({ id, user, org, content })   // keys sorted, stable
signature = sign(payload, private_key)               // lattice signature`}</Code>
      <P>The signature is stored <strong>alongside</strong> the memory, not inside it, and the signing key lives only in the environment — never in the database. So an attacker who reaches the database and rewrites <code>content</code> cannot produce a matching signature: forgery needs the secret key, and the secret key isn't there to steal. Anyone holding only the <strong>public</strong> key can verify the memory is authentic and unaltered.</P>

      <H2>Layer 3 — Tamper-evident audit chain</H2>
      <P>Security-relevant events are chained like a mini-ledger: each entry commits to the one before it, then the commitment is signed.</P>
      <Code label="audit chain — link logic">{`entry_hash = hash( previous_entry_hash + canonical(entry) )
signature  = sign(entry_hash, audit_private_key)     // hash-based signature`}</Code>
      <P>Because every entry's hash folds in the previous entry's hash, the log is <strong>append-only</strong>: you can't insert, delete, or reorder a single event without breaking every link after it. The first entry anchors the chain (no predecessor). The signatures use a <strong>hash-based</strong> scheme — the most conservative post-quantum family, resting on the fewest assumptions — because an audit trail is exactly where you want maximum paranoia. A periodic <strong>checkpoint</strong> signs the head of the chain, so the entire history can be verified in one shot.</P>

      <H2>Where the trust lives — key management</H2>
      <P>The whole model rests on one principle: <strong>the secret keys never live where the data lives</strong>. Signing keys exist only in the runtime environment; the database holds signatures and public keys, nothing that could forge them. Compromising the database therefore does not grant the ability to forge a memory or rewrite the audit log — the attacker would still be missing the one thing that matters.</P>
      <P>Verification is <strong>public</strong> by design: anyone with the public key can independently confirm authenticity, without any privileged access. And every layer <strong>degrades gracefully</strong> — if a signing key is absent, the write still succeeds, just unsigned. Availability is never sacrificed for signing; integrity is added on top, never in the critical path.</P>

      <H2>Anyone can check the work</H2>
      <P>None of this is a claim you have to take on faith. Because verification only needs public keys, the guarantees are <strong>externally auditable</strong>:</P>
      <Table
        head={['Question', 'How it’s answered']}
        rows={[
          ['Is post-quantum crypto actually on?', 'A status probe reports the active algorithms and whether keys are loaded, and hands back the public keys.'],
          ['Was this memory forged or altered?', 'Recompute its canonical payload and check the signature against the public key.'],
          ['Has the audit log been tampered with?', 'Walk the chain end to end — re-derive each link, verify each signature and the head checkpoint.'],
        ]}
      />
      <P>The same checks run automatically against every live deployment, so a broken link or a missing signature is caught before it ships — never after.</P>

      <H2>The primitives, and why each was chosen</H2>
      <Table
        head={['Standard', 'Family', 'Why it’s used here']}
        rows={[
          ['FIPS 203', 'Lattice key encapsulation', 'Fast enough to sit on every connection — transport secrecy at no latency cost.'],
          ['FIPS 204', 'Lattice signatures', 'Small, fast signatures — cheap enough to sign every single memory write.'],
          ['FIPS 205', 'Hash-based signatures', 'The most conservative family, fewest assumptions — reserved for the audit trail, where trust matters most.'],
        ]}
      />

      <H2>Guarantees, limits & roadmap</H2>
      <P><strong>Guarantees.</strong> Transport secrecy is quantum-resistant (hybrid) — recorded traffic stays safe. Stored memories are integrity-signed; DB-level tampering is detectable. The audit trail is append-only and tamper-evident, verifiable end-to-end by a third party using only public keys.</P>
      <P><strong>Current limits.</strong> PQC here covers key exchange + signatures (integrity/authenticity). At-rest payload <em>encryption</em> is separate (standard DB/disk encryption; not PQC-KEM-wrapped). Signing is best-effort: with keys absent, writes proceed unsigned by design (availability over hard-fail).</P>
      <P><strong>Roadmap.</strong> Enforce-signing mode (reject unsigned writes) for high-assurance tenants · per-tenant signing keys · post-quantum envelope encryption for memory payloads at rest.</P>
    </NewsArticleLayout>
  );
}
