const ATTRIBUTES = {
  reduceMotion: 'data-native-reduce-motion',
  reduceTransparency: 'data-native-reduce-transparency',
  increaseContrast: 'data-native-increase-contrast',
};

/** Public OS display hints only; no identity, credentials or content cross this path. */
export function applyNativeAppearance(root, value) {
  if (!value || !['ios', 'android'].includes(value.platform) || typeof value.reduceMotion !== 'boolean') return null;
  root.setAttribute('data-native-platform', value.platform);
  for (const [key, attribute] of Object.entries(ATTRIBUTES)) {
    if (typeof value[key] === 'boolean') root.setAttribute(attribute, String(value[key]));
    else root.removeAttribute(attribute);
  }
  return { reduceMotion: value.reduceMotion };
}

export function observeNativeAppearance({ plugin, app, document, onChange }) {
  let stopped = false;
  let sequence = 0;
  let appListener;
  const refresh = async () => {
    const request = ++sequence;
    try {
      const value = await plugin.getAppearance();
      if (stopped || request !== sequence) return;
      const result = applyNativeAppearance(document.documentElement, value);
      if (result) onChange(result);
    } catch { /* Older app versions retain browser accessibility preferences. */ }
  };
  const visible = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', visible);
  try {
    Promise.resolve(app.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }))
      .then(listener => { if (stopped) Promise.resolve(listener.remove()).catch(() => {}); else appListener = listener; })
      .catch(() => {});
  } catch { /* Optional lifecycle plugin is unavailable in older native shells. */ }
  refresh();
  return () => {
    stopped = true;
    sequence++;
    document.removeEventListener('visibilitychange', visible);
    if (appListener) Promise.resolve(appListener.remove()).catch(() => {});
  };
}
