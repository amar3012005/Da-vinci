import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';

export default function OnboardingFlow() {
  const { user, createOrg } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setCreating(true);
    setError(null);
    try {
      await createOrg(orgName.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      {/* Background */}
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

          <h2 className="text-white text-2xl font-bold font-['Space_Grotesk'] mb-2">
            Create your workspace
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Welcome, {user?.display_name || user?.email || 'there'}. Set up your organization to start using HIVEMIND.
          </p>

          <form onSubmit={handleCreate}>
            <label className="block text-white/60 text-xs font-mono mb-2 uppercase tracking-wider">
              Workspace Name
            </label>
            <div className="relative mb-4">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-white text-sm font-['Space_Grotesk'] placeholder:text-white/20 focus:outline-none focus:border-[#bdf213]/30 transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-4 font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={!orgName.trim() || creating}
              className="w-full flex items-center justify-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0a0a] font-semibold py-3 px-6 rounded-xl transition-all text-sm font-['Space_Grotesk'] group"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create Workspace
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
