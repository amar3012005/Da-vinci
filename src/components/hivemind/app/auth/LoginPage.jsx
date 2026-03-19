import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hexagon, ArrowRight, Zap, Brain, Shield, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const { isAuthenticated, login, loading, error } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, go to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/hivemind/app/overview', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Don't redirect away during loading — always show the login UI
  // so the user is never stuck on a blank page
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(189, 242, 19, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(189, 242, 19, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#bdf213]/[0.02] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
              <Hexagon size={22} className="text-[#bdf213]" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold font-['Space_Grotesk'] tracking-tight">
                HIVEMIND
              </h1>
              <p className="text-white/30 text-xs font-mono">Memory Engine</p>
            </div>
          </div>

          {/* Headline */}
          <h2 className="text-white text-2xl font-bold font-['Space_Grotesk'] mb-2">
            Welcome back
          </h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Sign in to access your memory workspace, manage API keys, and configure MCP connections.
          </p>

          {/* Error banner (control plane unreachable) */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              Control plane unavailable. Sign-in may not work until the service is online.
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={login}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] disabled:opacity-60 text-[#0a0a0a] font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm font-['Space_Grotesk'] group cursor-pointer border-none"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Checking session...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/20 text-xs font-mono">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Back to marketing */}
          <a
            href="/hivemind"
            className="block w-full text-center text-white/40 hover:text-white/60 text-sm py-2.5 rounded-xl border border-white/[0.06] hover:border-white/10 transition-all font-['Space_Grotesk']"
          >
            Learn more about HIVEMIND
          </a>
        </div>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {[
            { icon: Brain, label: 'Persistent Memory' },
            { icon: Zap, label: 'Sub-50ms Recall' },
            { icon: Shield, label: 'Enterprise Grade' },
          ].map((feat) => (
            <div
              key={feat.label}
              className="flex items-center gap-1.5 text-white/25 text-xs font-['Space_Grotesk']"
            >
              <feat.icon size={12} />
              <span>{feat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
