import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, Key, Copy, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useAuth } from '../auth/AuthProvider';
import { useCopyToClipboard } from '../shared/hooks';

/**
 * First-time API key setup — shown when bootstrap.onboarding.has_api_key is false.
 * After the key is created, refreshes bootstrap and the user enters the dashboard.
 */
export default function ApiKeySetup() {
  const { user, refresh } = useAuth();
  const { copied, copy } = useCopyToClipboard();
  const [step, setStep] = useState('create'); // 'create' | 'show'
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [rawKey, setRawKey] = useState(null);


  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await apiClient.createApiKey('Primary API Key');
      // result: { success, api_key, key, descriptors }
      setRawKey(result.api_key);

      setStep('show');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleContinue = () => {
    refresh(); // Re-bootstrap — has_api_key will now be true
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#bdf213]/[0.015] blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg mx-4"
      >
        <div className="bg-[#111]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
              <Hexagon size={22} className="text-[#bdf213]" />
            </div>
            <span className="text-white text-lg font-bold font-['Space_Grotesk']">HIVEMIND</span>
          </div>

          {step === 'create' && (
            <>
              <h2 className="text-white text-2xl font-bold font-['Space_Grotesk'] mb-2">
                Create your API key
              </h2>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                Hi {user?.display_name || user?.email || 'there'} — you need an API key to connect clients
                and access the HIVEMIND memory engine.
              </p>

              {error && (
                <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-400 text-xs font-mono">{error}</p>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] disabled:opacity-40 text-[#0a0a0a] font-semibold py-3 px-6 rounded-xl transition-all text-sm font-['Space_Grotesk'] group cursor-pointer border-none"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Key size={16} />
                    Generate API Key
                  </>
                )}
              </button>
            </>
          )}

          {step === 'show' && rawKey && (
            <>
              <h2 className="text-white text-2xl font-bold font-['Space_Grotesk'] mb-2">
                Your API key
              </h2>

              {/* Warning */}
              <div className="flex items-start gap-2 mb-4">
                <AlertTriangle size={14} className="text-[#bdf213] mt-0.5 shrink-0" />
                <p className="text-[#bdf213]/80 text-xs font-['Space_Grotesk'] leading-relaxed">
                  Copy this key now. It will not be shown again.
                </p>
              </div>

              {/* Key display */}
              <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#bdf213]/30 rounded-xl p-4 mb-6">
                <code className="flex-1 text-[#bdf213] text-sm font-mono break-all select-all">
                  {rawKey}
                </code>
                <button
                  onClick={() => copy(rawKey)}
                  className="shrink-0 p-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer bg-transparent border-none"
                >
                  {copied ? (
                    <Check size={16} className="text-[#bdf213]" />
                  ) : (
                    <Copy size={16} className="text-white/40" />
                  )}
                </button>
              </div>

              {/* Continue */}
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] text-[#0a0a0a] font-semibold py-3 px-6 rounded-xl transition-all text-sm font-['Space_Grotesk'] group cursor-pointer border-none"
              >
                Continue to Dashboard
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-2 h-2 rounded-full bg-[#bdf213]" />
          <div className="w-8 h-0.5 bg-[#bdf213]/30" />
          <div className={`w-2 h-2 rounded-full ${step === 'show' ? 'bg-[#bdf213]' : 'bg-white/10'}`} />
          <div className="w-8 h-0.5 bg-white/10" />
          <div className="w-2 h-2 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center justify-center gap-8 mt-2">
          <span className="text-[10px] text-[#bdf213]/60 font-mono">Org</span>
          <span className={`text-[10px] font-mono ${step === 'show' ? 'text-[#bdf213]/60' : 'text-white/20'}`}>Key</span>
          <span className="text-[10px] text-white/20 font-mono">Dashboard</span>
        </div>
      </motion.div>
    </div>
  );
}
