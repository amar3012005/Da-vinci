import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hexagon, Zap, Brain, Shield, Loader2, Mail, WifiOff } from 'lucide-react';
import { useAuth } from './AuthProvider';

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const { isAuthenticated, isUnreachable, loading, login } = useAuth();
  const navigate = useNavigate();

  // Already signed in → go to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/hivemind/app/overview', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#bdf213]/[0.02] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
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
            Sign in to HIVEMIND
          </h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Access your memory workspace, manage API keys, and configure MCP connections.
          </p>

          {/* State: control_plane_unreachable — the ONLY state that shows a warning */}
          {isUnreachable && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <WifiOff size={14} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-400 text-xs font-semibold font-['Space_Grotesk']">
                  Control plane unavailable
                </p>
                <p className="text-red-400/60 text-[11px] mt-0.5 font-['Space_Grotesk']">
                  Unable to reach the authentication service. Please try again in a moment.
                </p>
              </div>
            </div>
          )}

          {/* Auth buttons — always visible, even during loading */}
          <div className="space-y-3">
            <button
              onClick={() => login({ idpHint: 'google' })}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/95 disabled:opacity-60 text-[#1f1f1f] font-medium py-3 px-6 rounded-xl transition-all duration-200 text-sm font-['Space_Grotesk'] cursor-pointer border-none"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-[#1f1f1f]/50" />
              ) : (
                <GoogleIcon size={18} />
              )}
              Continue with Google
            </button>

            <button
              onClick={() => login()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-transparent hover:bg-white/[0.04] disabled:opacity-60 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 text-sm font-['Space_Grotesk'] cursor-pointer border border-white/[0.1] hover:border-white/[0.15]"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-white/30" />
              ) : (
                <Mail size={16} className="text-white/50" />
              )}
              Continue with Email
            </button>
          </div>

          <p className="text-white/20 text-[11px] text-center mt-6 leading-relaxed font-['Space_Grotesk']">
            Authentication is handled securely by our identity provider.<br />
            HIVEMIND does not store your password.
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/15 text-xs font-mono">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

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
