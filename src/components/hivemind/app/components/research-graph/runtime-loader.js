import { useEffect, useState } from 'react';

const importRuntimeModule = (() => {
  try {
    return new Function('specifier', 'return import(/* @vite-ignore */ specifier);');
  } catch (error) {
    return null;
  }
})();

export function useOptional3DRenderer(shouldLoad) {
  const [state, setState] = useState({
    component: null,
    status: shouldLoad ? 'loading' : 'idle',
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!shouldLoad || !importRuntimeModule) {
      setState({
        component: null,
        status: shouldLoad ? 'unavailable' : 'idle',
        error: null,
      });
      return undefined;
    }

    setState((current) => ({
      ...current,
      status: current.component ? 'ready' : 'loading',
    }));

    importRuntimeModule('react-force-graph-3d')
      .then((module) => {
        if (cancelled) return;
        setState({
          component: module?.default || module?.ForceGraph3D || null,
          status: module?.default || module?.ForceGraph3D ? 'ready' : 'unavailable',
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          component: null,
          status: 'unavailable',
          error,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  return state;
}
