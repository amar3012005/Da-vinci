import { useEffect, useState } from 'react';
import UnicornScene from 'unicornstudio-react';

export function RaycastAnimatedBackground({ width = 400, height = 500, className = '' }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <UnicornScene
        production
        projectId="cbmTT38A0CcuYxeiyj5H"
        width={width}
        height={height}
      />
    </div>
  );
}

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

