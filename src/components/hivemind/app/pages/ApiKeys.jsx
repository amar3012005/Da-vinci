import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Copy, Check, Trash2, Shield, AlertTriangle } from 'lucide-react';
import apiClient from '../shared/api-client';
import { useApiQuery, useCopyToClipboard } from '../shared/hooks';

function KeyCreatedBanner({ rawKey, onDismiss }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden"
    >
      <div className="bg-[#0a0a0a] border border-[#bdf213]/30 rounded-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle size={18} className="text-[#bdf213] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#bdf213] text-sm font-semibold font-['Space_Grotesk']">
              Save your API key now
            </p>
            <p className="text-white/50 text-xs mt-1 font-['Space_Grotesk']">
              This is the only time you will see this key. Copy it and store it securely.
              It cannot be retrieved again.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#111]/80 border border-white/[0.06] rounded-lg p-3">
          <code className="flex-1 text-[#bdf213] text-sm font-mono break-all select-all">
            {rawKey}
          </code>
          <button
            onClick={() => copy(rawKey)}
            className="shrink-0 p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={16} className="text-[#bdf213]" />
            ) : (
              <Copy size={16} className="text-white/40 hover:text-white/70" />
            )}
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="mt-3 text-white/30 hover:text-white/50 text-xs font-mono transition-colors"
        >
          I've saved the key — dismiss
        </button>
      </div>
    </motion.div>
  );
}

function RevokeConfirmation({ keyLabel, onConfirm, onCancel, revoking }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3"
    >
      <AlertTriangle size={16} className="text-red-400 shrink-0" />
      <p className="text-red-300 text-xs font-['Space_Grotesk'] flex-1">
        Revoke <span className="font-semibold">"{keyLabel}"</span>? This cannot be undone.
        Any service using this key will lose access immediately.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onCancel}
          disabled={revoking}
          className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 font-['Space_Grotesk'] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={revoking}
          className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg font-['Space_Grotesk'] transition-colors disabled:opacity-40"
        >
          {revoking ? (
            <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            'Revoke'
          )}
        </button>
      </div>
    </motion.div>
  );
}

function KeyRow({ apiKey, onRevoke }) {
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const isRevoked = apiKey.status === 'revoked';

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke(apiKey.id);
    } finally {
      setRevoking(false);
      setConfirmingRevoke(false);
    }
  };

  const createdDate = new Date(apiKey.created_at || apiKey.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-[#111]/80 border border-white/[0.06] rounded-xl p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isRevoked
              ? 'bg-white/[0.04] border border-white/[0.06]'
              : 'bg-[#bdf213]/10 border border-[#bdf213]/20'
          }`}>
            <Key size={14} className={isRevoked ? 'text-white/20' : 'text-[#bdf213]'} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold font-['Space_Grotesk'] truncate ${
              isRevoked ? 'text-white/30' : 'text-white'
            }`}>
              {apiKey.name || apiKey.label}
            </p>
            <p className={`text-xs font-mono mt-0.5 ${
              isRevoked ? 'text-white/15' : 'text-white/40'
            }`}>
              {apiKey.key_prefix || apiKey.keyPrefix || 'hm_...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-mono text-white/30 hidden sm:block">
            {createdDate}
          </span>

          {isRevoked ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase tracking-wider bg-red-500/10 text-red-400/60 border border-red-500/10">
              Revoked
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          )}

          {!isRevoked && (
            <button
              onClick={() => setConfirmingRevoke(true)}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Revoke key"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {confirmingRevoke && (
          <div className="mt-3">
            <RevokeConfirmation
              keyLabel={apiKey.name || apiKey.label}
              onConfirm={handleRevoke}
              onCancel={() => setConfirmingRevoke(false)}
              revoking={revoking}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ApiKeysPage() {
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);

  const {
    data: keys,
    loading,
    error: fetchError,
    refetch,
  } = useApiQuery(() => apiClient.listApiKeys(), []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const result = await apiClient.createApiKey(label.trim());
      // result: { success, api_key (raw string), key: { id, name, ... }, descriptors }
      setNewlyCreatedKey(result.api_key);
      apiClient.setApiKey(result.api_key);
      setLabel('');
      refetch();
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    await apiClient.revokeApiKey(id);
    refetch();
  };

  const keyList = Array.isArray(keys) ? keys : keys?.keys || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#bdf213]/10 border border-[#bdf213]/20 flex items-center justify-center">
              <Key size={20} className="text-[#bdf213]" />
            </div>
            <h1 className="text-white text-2xl font-bold font-['Space_Grotesk']">
              API Keys
            </h1>
          </div>
          <p className="text-white/40 text-sm font-['Space_Grotesk'] ml-[52px]">
            Manage authentication keys for the HIVEMIND Core API.
          </p>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="flex items-start gap-3 bg-[#111]/80 border border-white/[0.06] rounded-xl p-4">
            <Shield size={16} className="text-white/30 mt-0.5 shrink-0" />
            <p className="text-white/40 text-xs font-['Space_Grotesk'] leading-relaxed">
              API keys authenticate requests to the HIVEMIND Core API. Each key is scoped to your
              organization. Keep keys secret — treat them like passwords. Revoke any key you suspect
              has been compromised.
            </p>
          </div>
        </motion.div>

        {/* Create Key Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-[#111]/80 border border-white/[0.06] rounded-xl p-5">
            <h2 className="text-white text-sm font-semibold font-['Space_Grotesk'] mb-4">
              Create a new key
            </h2>
            <form onSubmit={handleCreate} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-white/40 text-xs font-mono mb-2 uppercase tracking-wider">
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder='e.g. "Production Key", "Dev Key"'
                  maxLength={64}
                  className="w-full bg-[#0a0a0a] border border-white/[0.08] rounded-xl py-2.5 px-4 text-white text-sm font-['Space_Grotesk'] placeholder:text-white/20 focus:outline-none focus:border-[#bdf213]/30 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!label.trim() || creating}
                className="flex items-center gap-2 bg-[#bdf213] hover:bg-[#d4ff3a] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0a0a] font-semibold py-2.5 px-5 rounded-xl transition-all text-sm font-['Space_Grotesk'] shrink-0"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={16} />
                    Create Key
                  </>
                )}
              </button>
            </form>

            {createError && (
              <p className="text-red-400 text-xs mt-3 font-mono">{createError}</p>
            )}
          </div>
        </motion.div>

        {/* Newly Created Key Banner */}
        <AnimatePresence>
          {newlyCreatedKey && (
            <KeyCreatedBanner
              rawKey={newlyCreatedKey}
              onDismiss={() => setNewlyCreatedKey(null)}
            />
          )}
        </AnimatePresence>

        {/* Keys List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-white/60 text-xs font-mono mb-3 uppercase tracking-wider">
            Existing Keys ({loading ? '...' : keyList.length})
          </h2>

          {fetchError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-300 text-xs font-['Space_Grotesk']">
                Failed to load keys: {fetchError}
              </p>
            </div>
          )}

          {loading && !keys ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#111]/80 border border-white/[0.06] rounded-xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-white/[0.04] rounded" />
                      <div className="h-3 w-20 bg-white/[0.03] rounded mt-1.5" />
                    </div>
                    <div className="h-5 w-14 bg-white/[0.04] rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : keyList.length === 0 ? (
            <div className="bg-[#111]/80 border border-white/[0.06] rounded-xl p-10 text-center">
              <Key size={24} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm font-['Space_Grotesk']">
                No API keys yet. Create one above to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {keyList.map((k) => (
                  <KeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
