import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, LockKeyhole, ShieldCheck, Cpu, KeyRound, Zap } from 'lucide-react';

const StripedSeparator = () => (
  <div
    className="h-12 sm:h-16 w-full border-b border-[#e3e0db]"
    style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(0,0,0,0.015) 50%)', backgroundSize: '4px 100%' }}
  />
);

/**
 * PostQuantum — interactive PQC section. A mode toggle (Classical ⟷ Post-Quantum)
 * fires a "quantum attack" pulse at the vault: in Classical mode the RSA/ECC lock
 * shatters; in Post-Quantum mode a lattice mesh (ML-KEM/ML-DSA) absorbs the pulse
 * and the vault holds. Clicking "Run quantum attack" replays it. Blueprint day-mode.
 */
const PQ_SPECS = [
  { icon: KeyRound, k: 'ML-KEM-768', v: 'key encapsulation · FIPS 203' },
  { icon: ShieldCheck, k: 'ML-DSA-65', v: 'signatures · FIPS 204' },
  { icon: Cpu, k: 'Hybrid X25519', v: 'classical + PQ, belt & braces' },
  { icon: Lock, k: 'AES-256-GCM', v: 'data at rest, quantum-hard' },
];

function LatticeMesh({ armed }) {
  // 6×5 lattice of nodes + bonds; on attack the nodes jitter then re-lock.
  const cols = 6, rows = 5, gap = 46, ox = 34, oy = 30;
  const nodes = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) nodes.push({ c, r, x: ox + c * gap, y: oy + r * gap });
  const bond = (a, b) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const bonds = [];
  nodes.forEach((n) => {
    const right = nodes.find((m) => m.c === n.c + 1 && m.r === n.r);
    const down = nodes.find((m) => m.c === n.c && m.r === n.r + 1);
    if (right) bonds.push([n, right]);
    if (down) bonds.push([n, down]);
  });
  return (
    <svg viewBox="0 0 300 250" className="absolute inset-0 h-full w-full">
      {bonds.map(([a, b], i) => (
        <motion.path
          key={`b-${i}`} d={bond(a, b)} stroke="#117dff" strokeWidth={0.8}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={armed ? { pathLength: 1, opacity: 0.5 } : { pathLength: 1, opacity: 0.22 }}
          transition={{ duration: 0.5, delay: (i % 12) * 0.03 }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={`n-${i}`} cx={n.x} cy={n.y} r={1.8} fill="#117dff"
          animate={armed ? { x: [0, (i % 3 - 1) * 5, 0], y: [0, ((i % 2) ? 1 : -1) * 5, 0], opacity: [0.9, 0.4, 0.9] } : { x: 0, y: 0, opacity: 0.7 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}

function PostQuantum() {
  const navigate = useNavigate();
  const [pq, setPq] = useState(true);       // true = post-quantum, false = classical
  const [attack, setAttack] = useState(0);  // increment replays the pulse
  const broken = !pq && attack > 0;

  const fire = () => setAttack((n) => n + 1);

  return (
    <section id="post-quantum" className="relative border-t border-[#e3e0db]">
      <StripedSeparator />
      <div className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.24em] text-[#117dff] mb-4">
              <span className="text-[#a3a3a3]">〉</span> POST-QUANTUM · 09
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.02] mb-5 font-['Space_Grotesk']"
            >
              Encryption that outlives<br />the quantum threat.
            </motion.h2>
            <p className="text-sm sm:text-base text-[#525252] leading-relaxed mb-6 max-w-lg">
              Adversaries <span className="text-[#0a0a0a] font-medium">harvest encrypted data now to decrypt it later</span>, once a quantum computer can break RSA and elliptic curves. HIVEMIND ships NIST-standardized post-quantum cryptography today — <span className="text-[#0a0a0a] font-medium">lattice-based ML-KEM &amp; ML-DSA</span>, in a hybrid handshake — so your memory stays sealed for decades.
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-w-md mb-8">
              {PQ_SPECS.map((s, i) => (
                <motion.div key={s.k}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-2.5">
                  <s.icon size={16} className="text-[#117dff] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[13px] font-semibold text-[#0a0a0a] font-['Space_Grotesk']">{s.k}</div>
                    <div className="text-[11px] text-[#a3a3a3] font-mono">{s.v}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => navigate('/hivemind/docs')}
              className="px-5 py-2.5 rounded-[4px] bg-[#117dff] text-white font-semibold hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
            >
              Read the security model
            </button>
          </div>

          {/* Interactive vault */}
          <div>
            {/* mode toggle */}
            <div className="inline-flex items-center p-1 rounded-full border border-[#e3e0db] bg-white mb-6">
              {[['Classical', false], ['Post-Quantum', true]].map(([label, val]) => (
                <button key={label} onClick={() => { setPq(val); setAttack(0); }}
                  className={`px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-[0.1em] transition-all ${pq === val ? 'bg-[#0a0a0a] text-white' : 'text-[#525252] hover:text-[#0a0a0a]'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="relative aspect-[6/5] w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#e3e0db] bg-white shadow-[0_20px_60px_rgba(17,24,39,0.06)]">
              {/* blueprint grid */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(17,125,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(17,125,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

              {/* lattice only in PQ mode */}
              {pq && <LatticeMesh armed={attack > 0} />}

              {/* quantum attack pulse */}
              <AnimatePresence>
                {attack > 0 && (
                  <motion.div
                    key={attack}
                    initial={{ scale: 0, opacity: 0.6, x: '-50%', y: '-50%' }}
                    animate={{ scale: 6, opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute left-1/2 top-1/2 h-20 w-20 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35), transparent 70%)' }}
                  />
                )}
              </AnimatePresence>

              {/* the vault lock */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={broken ? { rotate: [0, -6, 6, -3, 0], x: [0, -4, 4, 0] } : { rotate: 0, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative flex flex-col items-center"
                >
                  <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-2 transition-colors duration-500 ${broken ? 'border-[#dc2626]/40 bg-[#dc2626]/[0.06]' : 'border-[#117dff]/35 bg-[#117dff]/[0.06]'}`}>
                    {broken
                      ? <Lock size={34} className="text-[#dc2626]" strokeWidth={1.6} />
                      : <LockKeyhole size={34} className="text-[#117dff]" strokeWidth={1.6} />}
                  </div>
                  <div className={`mt-3 font-mono text-[10px] uppercase tracking-[0.24em] ${broken ? 'text-[#dc2626]' : 'text-[#117dff]'}`}>
                    {broken ? 'RSA-2048 broken' : pq ? 'ML-KEM sealed' : 'RSA-2048'}
                  </div>
                  {broken && <div className="mt-1 text-[10px] text-[#a3a3a3]">harvested payload decrypted</div>}
                  {pq && attack > 0 && <div className="mt-1 text-[10px] text-[#16a34a]">lattice held · attack absorbed</div>}
                </motion.div>
              </div>

              <div className="absolute left-4 top-3 font-mono text-[9px] uppercase tracking-[0.28em] text-[#a3a3a3]">hivemind · key vault</div>
            </div>

            <button onClick={fire}
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0a0a0a] hover:text-[#117dff] transition-colors bg-transparent border-none cursor-pointer">
              <Zap size={14} className="text-[#dc2626]" /> Run quantum attack
            </button>
            <p className="mt-2 text-[11px] text-[#a3a3a3] font-mono">
              {pq ? 'Post-quantum: the lattice problem stays hard even for Shor’s algorithm.' : 'Classical: Shor’s algorithm factors RSA/ECC in polynomial time.'}
            </p>
          </div>
        </div>
      </div>
      <StripedSeparator />
    </section>
  );
}

const Features = () => {
  const navigate = useNavigate();
  const [, setCurrentSlide] = useState(0);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % 3);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + 3) % 3);

  return (
    <div id="features" className="bg-[#faf9f4] text-[#0a0a0a]">
      {/* Container with side borders */}
      <div className="max-w-[1200px] mx-auto border-x border-[#e3e0db]">

        {/* Section 1: Context-savvy accuracy */}
        <section className="relative">
          <StripedSeparator />

          <div className="px-4 sm:px-8 lg:px-16 py-12 sm:py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
              {/* Left Content */}
              <div className="space-y-4 sm:space-y-6">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight font-['Space_Grotesk']"
                >
                  Context-savvy accuracy<br />
                  <span className="text-[#a3a3a3]">for the real-world</span>
                </motion.h2>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/hivemind/login')}
                  className="px-5 py-2.5 bg-[#117dff] text-white font-semibold rounded-[4px] hover:bg-[#0066e0] transition-colors cursor-pointer border-none text-xs sm:text-sm uppercase tracking-[0.075em] shadow-[0_2px_8px_rgba(17,125,255,0.15)]"
                >
                  Try for free
                </motion.button>
              </div>

              {/* Right Content - Navigation arrows */}
              <div className="flex justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={prevSlide}
                  className="w-10 h-10 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white"
                >
                  <ArrowRight className="w-4 h-4 rotate-180 text-[#525252]" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={nextSlide}
                  className="w-10 h-10 rounded-xl border border-[#e3e0db] flex items-center justify-center hover:bg-[#f3f1ec] hover:border-[#d4d0ca] transition-colors bg-white"
                >
                  <ArrowRight className="w-4 h-4 text-[#525252]" />
                </motion.button>
              </div>
            </div>

            {/* Feature showcase with annotation lines */}
            <div className="mt-12 sm:mt-16 relative">
              {/* Number label */}
              <div className="text-[#a3a3a3] font-mono text-xs sm:text-sm mb-6">[02]</div>

              {/* Annotation line and label */}
              <div className="relative mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 sm:w-16 h-px bg-[#d4d0ca]"></div>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#a3a3a3] font-mono">Accurately Retrieved</span>
                </div>
              </div>

              {/* Large text with highlights - Smaller on mobile */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light leading-tight font-['Space_Grotesk']"
              >
                <span className="text-[#117dff]">"What was the deployment fix</span>{' '}
                <span className="text-[#d4d0ca]">from last Tuesday?"</span>
              </motion.div>

              {/* Bottom annotation */}
              <div className="flex justify-end mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-[#a3a3a3] font-mono text-right">3 Relevant Memories Found</span>
                  <div className="w-8 sm:w-12 h-px bg-[#d4d0ca]"></div>
                </div>
              </div>

              {/* Feature description - Stack on mobile */}
              <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 font-['Space_Grotesk']">Context-Aware Recall</h3>
                  <p className="text-[#525252] text-xs sm:text-sm leading-relaxed">
                    Retrieves contextually relevant memories based on your current task, not just keyword matches.
                  </p>
                </motion.div>
                <div className="flex justify-start md:justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 45 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#117dff]/[0.08] border border-[#117dff]/20 flex items-center justify-center hover:bg-[#117dff]/[0.12] transition-colors"
                  >
                    <ArrowRight className="w-5 h-5 text-[#117dff]" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Section 3: Post-Quantum Cryptography */}
        <PostQuantum />

      </div>
    </div>
  );
};

export default Features;
