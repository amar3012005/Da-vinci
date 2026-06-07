import React, { useCallback, useEffect, useState } from 'react';
import { Zap, AlertCircle, Loader2, Save } from 'lucide-react';
import { colors, shadows } from '../../shared/theme';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.text.primary,
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 16px',
    borderRadius: '8px',
    border: 'none',
    background: colors.accent.primary,
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  saveBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  saveBtnSaving: {
    opacity: 0.75,
    cursor: 'not-allowed',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    background: colors.bg.elevated,
    border: `1px solid ${colors.border.default}`,
    borderRadius: '10px',
    boxShadow: shadows.card,
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    transition: 'box-shadow 0.15s',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardDesc: {
    fontSize: '12px',
    color: colors.text.tertiary,
    lineHeight: 1.45,
  },
  toggleWrapper: {
    flexShrink: 0,
    marginTop: '1px',
  },
  toggleTrack: (enabled) => ({
    position: 'relative',
    display: 'inline-block',
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    background: enabled ? colors.accent.primary : colors.bg.tertiary,
    border: `1px solid ${enabled ? colors.accent.primary : colors.border.strong}`,
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
    flexShrink: 0,
  }),
  toggleThumb: (enabled) => ({
    position: 'absolute',
    top: '2px',
    left: enabled ? '17px' : '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'left 0.2s',
  }),
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    color: colors.text.muted,
    fontSize: '13px',
    background: colors.bg.secondary,
    borderRadius: '10px',
    border: `1px dashed ${colors.border.default}`,
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
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(22, 163, 74, 0.06)',
    border: `1px solid rgba(22, 163, 74, 0.18)`,
    borderRadius: '8px',
    color: colors.status.success,
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

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      style={styles.toggleTrack(enabled)}
    >
      <span style={styles.toggleThumb(enabled)} />
    </button>
  );
}

export default function Skills({ apiClient, refresh }) {
  const [skills, setSkills] = useState([]);
  const [enabled, setEnabled] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!apiClient) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getHermesSkills();
      const list = data?.skills ?? [];
      setSkills(list);
      const initial = {};
      list.forEach((s) => {
        initial[s.id] = Boolean(s.enabled);
      });
      setEnabled(initial);
      setDirty(false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load skills');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = useCallback((id, value) => {
    setEnabled((prev) => ({ ...prev, [id]: value }));
    setDirty(true);
    setSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiClient || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = skills.map((s) => ({
        id: s.id,
        enabled: Boolean(enabled[s.id]),
      }));
      await apiClient.updateHermesSkills(payload);
      setDirty(false);
      setSuccess(true);
      if (typeof refresh === 'function') refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to save skills');
    } finally {
      setSaving(false);
    }
  }, [apiClient, saving, skills, enabled, refresh]);

  if (!apiClient) {
    return (
      <div style={styles.errorBanner}>
        <AlertCircle size={15} />
        No API client provided.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Loading skills…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>
          <Zap size={15} color={colors.accent.primary} />
          Capabilities
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            ...styles.saveBtn,
            ...(saving ? styles.saveBtnSaving : {}),
            ...(!dirty && !saving ? styles.saveBtnDisabled : {}),
          }}
        >
          {saving ? (
            <>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
              Saving…
            </>
          ) : (
            <>
              <Save size={13} />
              Save
            </>
          )}
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {success && !error && (
        <div style={styles.successBanner}>
          Skills updated successfully.
        </div>
      )}

      {skills.length === 0 ? (
        <div style={styles.empty}>No skills available for this agent.</div>
      ) : (
        <div style={styles.grid}>
          {skills.map((skill) => (
            <div key={skill.id} style={styles.card}>
              <div style={styles.cardLeft}>
                <span style={styles.cardName}>{skill.name}</span>
                {skill.description && (
                  <span style={styles.cardDesc}>{skill.description}</span>
                )}
              </div>
              <div style={styles.toggleWrapper}>
                <Toggle
                  enabled={Boolean(enabled[skill.id])}
                  onChange={(val) => handleToggle(skill.id, val)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
