import React, { useState } from 'react';
import { colors, fonts, shadows } from '../shared/theme';

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 60, label: '1 hour' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
  { value: 0, label: 'Manual only' },
];

function relativeTime(isoString) {
  if (!isoString) return 'never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SyncConfigPanel({
  provider,
  currentInterval = 60,
  scopeOptions,
  lastSyncAt,
  lastEventAt,
  webhookActive,
  onSave,
  onTriggerSync,
}) {
  const [interval, setInterval] = useState(currentInterval);
  const [scope, setScope] = useState(
    scopeOptions ? scopeOptions.map((o) => ({ ...o })) : []
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ intervalMinutes: interval, scope });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setSyncing(false);
    }
  };

  const toggleScope = (id) => {
    setScope((prev) =>
      prev.map((o) => (o.id === id ? { ...o, selected: !o.selected } : o))
    );
  };

  const card = {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: 12,
    boxShadow: shadows.card,
    padding: '20px 24px',
    fontFamily: fonts.body,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const label = {
    fontSize: 12,
    fontWeight: 600,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  };

  const select = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.border.default}`,
    background: colors.bg.secondary,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 14,
    outline: 'none',
  };

  const pill = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    background: webhookActive
      ? 'rgba(22, 163, 74, 0.1)'
      : 'rgba(217, 119, 6, 0.1)',
    color: webhookActive ? colors.status.success : colors.status.warning,
  };

  const btn = (primary) => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: primary ? 'none' : `1px solid ${colors.border.default}`,
    background: primary ? colors.accent.primary : colors.bg.secondary,
    color: primary ? colors.text.inverse : colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  });

  const statusText = webhookActive
    ? `Live • last event ${relativeTime(lastEventAt)}`
    : `Polling • every ${INTERVAL_OPTIONS.find((o) => o.value === interval)?.label ?? interval + 'm'}`;

  return (
    <div style={card} aria-label={`Sync configuration for ${provider}`}>
      {/* Row 1: Status pill */}
      <div>
        <div style={label}>Status</div>
        <span style={pill}>
          {webhookActive ? '🟢' : '🟡'} {statusText}
        </span>
      </div>

      {/* Row 2: Interval */}
      <div>
        <div style={label}>Sync interval</div>
        <select
          style={select}
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          aria-label="Sync interval"
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 3: Scope multi-select */}
      {scope.length > 0 && (
        <div>
          <div style={label}>Scope</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {scope.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleScope(opt.id)}
                style={{
                  ...btn(opt.selected),
                  padding: '5px 12px',
                  fontSize: 13,
                  border: opt.selected
                    ? `1px solid ${colors.accent.primary}`
                    : `1px solid ${colors.border.default}`,
                  background: opt.selected
                    ? colors.accent.primaryMuted
                    : colors.bg.secondary,
                  color: opt.selected
                    ? colors.accent.primary
                    : colors.text.secondary,
                }}
                aria-pressed={opt.selected}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Last full sync */}
      <div
        style={{ fontSize: 13, color: colors.text.muted }}
      >
        Last full sync: {relativeTime(lastSyncAt)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          style={btn(false)}
          onClick={handleSyncNow}
          disabled={syncing}
          aria-label="Sync now"
        >
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          type="button"
          style={btn(true)}
          onClick={handleSave}
          disabled={saving}
          aria-label="Save sync configuration"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
