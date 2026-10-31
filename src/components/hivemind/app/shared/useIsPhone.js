import { useEffect, useState } from 'react';

/** Phone layout breakpoint (px); matches Tailwind's `sm` minus one. */
export const PHONE_QUERY = '(max-width: 639px)';

/** True while the viewport is phone width; false when matchMedia is unavailable. */
export function useIsPhone() {
  const read = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && !!window.matchMedia(PHONE_QUERY).matches;
  const [phone, setPhone] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(!!query.matches);
    update();
    if (query.addEventListener) { query.addEventListener('change', update); return () => query.removeEventListener('change', update); }
    query.addListener?.(update);
    return () => query.removeListener?.(update);
  }, []);
  return phone;
}
