// Simple Horizon Background - Fallback version
import React, { useEffect, useRef, useState } from 'react';

export const SimpleHorizonBackground = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800" />
      
      {/* Animated stars */}
      <div className="absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animation: 'twinkle 3s infinite'
            }}
          />
        ))}
      </div>
      
      {/* Mountain silhouettes */}
      <div className="absolute bottom-0 left-0 w-full h-1/3">
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-gray-800 to-transparent opacity-50" />
        <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-gray-700 to-transparent opacity-30" />
        <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-gray-600 to-transparent opacity-20" />
      </div>
      
      {/* Loading indicator */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-white/60 text-lg">Loading Environment...</div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

