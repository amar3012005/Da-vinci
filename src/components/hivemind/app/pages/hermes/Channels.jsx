import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Send, Hash, AlertCircle, CheckCircle, Loader2, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, shadows } from '../../shared/theme';

const PLATFORMS = [
  {
    type: 'slack',
    label: 'Slack',
    description: 'Connect Hermes to a Slack workspace via a bot token.',
    Icon: Hash,
  },
  {
    type: 'telegram',
    label: 'Telegram',
    description: 'Connect Hermes to a Telegram bot via the BotFather token.',
    Icon: Send,
  },
  {
    type: 'discord',
    label: 'Discord',
    description: 'Connect Hermes to a Discord server via a bot token.',
    Icon: MessageSquare,
  },
];

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text.primary,
    marginBottom: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  card: {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: '10px',
    boxShadow: shadows.card,
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'box-shadow 0.15s',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.text.primary,
  },
  cardDesc: {
    fontSize: '12px',
    color: colors.text.tertiary,
    lineHeight: 1.45,
  },
  badge: (connected) => ({
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    padding: '3px 9px',
    borderRadius: '99px',
    background: connected
      ? 'rgba(22, 163, 74, 0.10)'
      : colors.bg.tertiary,
    color: connected
      ? colors.status.success
      : colors.text.muted,
    border: connected
      ? `1px solid rgba(22, 163, 74, 0.22)`
      : `1px solid ${colors.border.default}`,
  }),
  comingSoonBadge: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 500,
    padding: '3px 9px',
    borderRadius: '99px',
    background: 'rgba(217, 119, 6, 0.08)',
    color: colors.status.warning,
    border: `1px solid rgba(217, 119, 6, 0.20)`,
  },
  connectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: `1px solid ${colors.accent.primary}`,
    background: colors.accent.primaryMuted,
    color: colors.accent.primary,
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    alignSelf: 'flex-start',
  },
  connectBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  tokenForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: `1px solid ${colors.border.subtle}`,
    paddingTop: '12px',
  },
  tokenLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: colors.text.secondary,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  tokenRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  tokenInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: '7px',
    border: `1px solid ${colors.border.default}`,
    background: colors.bg.secondary,
    fontSize: '13px',
    color: colors.text.primary,
    outline: 'none',
    fontFamily: 'monospace',
    minWidth: 0,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 14px',
    borderRadius: '7px',
    border: 'none',
    background: colors.accent.primary,
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  submitBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  cardError: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    fontSize: '12px',
    color: colors.status.error,
    padding: '6px 10px',
    background: 'rgba(220, 38, 38, 0.05)',
    borderRadius: '6px',
    border: `1px solid rgba(220, 38, 38, 0.14)`,
    lineHeight: 1.4,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(220, 38, 38, 0.06)',
    border: `1px solid rgba(220, 38, 38, 0.18)`,
    borderRadius: '8px',
    color: colors.status.error,
    fontSize: '13px',
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '48px 0',
    color: colors.text.muted,
    fontSize: '13px',
  },
};

function ChannelCard({ platform, channelData, apiClient, onConnected }) {
  const { type, label, description, Icon } = platform;

  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [comingSoon, setComingSoon] = useState(false);

  const connected = Boolean(channelData?.connected);

  const handleToggle = useCallback(() => {
    if (connected || comingSoon) return;
    setOpen((prev) => !prev);
    setCardError(null);
  }, [connected, comingSoon]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setCardError(null);

    try {
      await apiClient.connectHermesChannel(type, trimmed);
      setToken('');
      setOpen(false);
      if (typeof onConnected === 'function') onConnected();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        setComingSoon(true);
        setOpen(false);
        setToken('');
      } else {
        setCardError(
          err?.response?.data?.error ||
          err?.message ||
          'Connection failed. Check your token and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, type, token, submitting, onConnected]);

  const renderBadge = () => {
    if (comingSoon) {
      return <span style={styles.comingSoonBadge}>Coming soon</span>;
    }
    return (
      <span style={styles.badge(connected)}>
        {connected
          ? <><CheckCircle size={11} /> Connected</>
          : 'Not connected'}
      </span>
    );
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.cardMeta}>
          <span style={styles.cardTitle}>
            <Icon size={15} color={colors.accent.primary} />
            {label}
          </span>
          <span style={styles.cardDesc}>{description}</span>
        </div>
        {renderBadge()}
      </div>

      {!connected && !comingSoon && (
        <button
          type="button"
          onClick={handleToggle}
          style={{
            ...styles.connectBtn,
            ...(submitting ? styles.connectBtnDisabled : {}),
          }}
        >
          <KeyRound size={12} />
          {open ? 'Cancel' : 'Connect'}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {open && (
        <form style={styles.tokenForm} onSubmit={handleSubmit}>
          <span style={styles.tokenLabel}>Bot token</span>
          <div style={styles.tokenRow}>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your bot token…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={styles.tokenInput}
              aria-label={`${label} bot token`}
            />
            <button
              type="submit"
              disabled={!token.trim() || submitting}
              style={{
                ...styles.submitBtn,
                ...(!token.trim() || submitting ? styles.submitBtnDisabled : {}),
              }}
            >
              {submitting
                ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : 'Save'}
            </button>
          </div>
          {cardError && (
            <div style={styles.cardError}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '1px' }} />
              {cardError}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default function Channels({ agent, apiClient, refresh }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!apiClient || !agent) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHermesChannels();
      setChannels(data?.channels ?? []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load channel status.');
    } finally {
      setLoading(false);
    }
  }, [apiClient, agent]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnected = useCallback(() => {
    load();
    if (typeof refresh === 'function') refresh();
  }, [load, refresh]);

  if (!apiClient || !agent) {
    return (
      <div style={styles.errorBanner}>
        <AlertCircle size={15} />
        {!apiClient ? 'No API client provided.' : 'No agent loaded.'}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Loading channels…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={styles.header}>
        <MessageSquare size={15} color={colors.accent.primary} />
        Messaging Channels
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div style={styles.grid}>
        {PLATFORMS.map((platform) => {
          const channelData = channels.find(
            (c) => (c.type || '').toLowerCase() === platform.type
          );
          return (
            <ChannelCard
              key={platform.type}
              platform={platform}
              channelData={channelData}
              apiClient={apiClient}
              onConnected={handleConnected}
            />
          );
        })}
      </div>
    </div>
  );
}
