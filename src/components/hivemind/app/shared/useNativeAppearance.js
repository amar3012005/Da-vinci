import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { nativePlugin } from './native-auth';
import { isNativeApp } from './native-app';
import { observeNativeAppearance } from './native-appearance-policy';

export function useNativeAppearance() {
  const [appearance, setAppearance] = useState({ reduceMotion: false });
  useEffect(() => {
    if (!isNativeApp() || typeof document === 'undefined') return undefined;
    return observeNativeAppearance({ plugin: nativePlugin, app: App, document, onChange: setAppearance });
  }, []);
  return appearance;
}
