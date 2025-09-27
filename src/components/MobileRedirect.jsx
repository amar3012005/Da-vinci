import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor,
  Smartphone,
  MoreHorizontal,
  X,
  Info,
  ArrowRight
} from 'lucide-react';

const MobileRedirect = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  // Force desktop mode function
  const forceDesktopMode = () => {
    try {
      localStorage.setItem('forceDesktop', 'true');
      window.location.href = window.location.pathname + '?desktop=true';
    } catch (e) {
      window.location.href = window.location.pathname + '?desktop=true';
    }
  };

  // Detect browser for specific instructions
  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      return { name: 'Chrome', icon: Monitor };
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return { name: 'Safari', icon: Monitor };
    } else if (userAgent.includes('Firefox')) {
      return { name: 'Firefox', icon: Monitor };
    } else {
      return { name: 'Browser', icon: MoreHorizontal };
    }
  };

  const browser = getBrowserInfo();
  const BrowserIcon = browser.icon;

  const getDesktopInstructions = () => {
    switch (browser.name) {
      case 'Chrome':
        return [
          'Tap the three dots (⋮) in the top-right corner',
          'Select "Desktop site" or "Request Desktop Site"',
          'The page will reload in desktop mode'
        ];
      case 'Safari':
        return [
          'Tap the "aA" icon in the address bar',
          'Select "Request Desktop Website"',
          'The page will reload in desktop mode'
        ];
      case 'Firefox':
        return [
          'Tap the three dots (⋮) menu',
          'Toggle "Desktop site" to ON',
          'The page will refresh automatically'
        ];
      default:
        return [
          'Look for browser menu (usually three dots or lines)',
          'Find "Desktop site" or "Request Desktop Site" option',
          'Enable it to view the full experience'
        ];
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-white text-center max-w-md">
        <div className="mb-8">
          <Monitor className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Desktop Experience Recommended</h1>
        
        <p className="text-gray-300 mb-8 leading-relaxed">
          DA'VINCI's AI showcase is optimized for desktop viewing. 
          Please switch to desktop mode for the full interactive experience.
        </p>

        <div className="flex justify-center items-center gap-6 mb-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center mb-2">
              <Smartphone className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-red-400 text-xs font-medium">Mobile</span>
          </div>

          <ArrowRight className="w-6 h-6 text-white/40" />

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center mb-2">
              <Monitor className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-green-400 text-xs font-medium">Desktop</span>
          </div>
        </div>

        <button
          onClick={() => setShowInstructions(true)}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold 
                     rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300
                     flex items-center justify-center gap-3 mb-4"
        >
          <BrowserIcon className="w-5 h-5" />
          Enable Desktop Mode
        </button>

        <button
          onClick={() => setShowInstructions(true)}
          className="w-full text-white/60 text-sm font-medium hover:text-white/80 transition-colors
                     flex items-center justify-center gap-2"
        >
          <Info className="w-4 h-4" />
          How to switch? ({browser.name})
        </button>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-white/50 text-xs leading-relaxed mb-4">
            Experience our AI agent TARA_x1, interactive demos, and full-screen visualizations 
            designed for desktop browsers.
          </p>
          
          <button
            onClick={forceDesktopMode}
            className="w-full px-4 py-2 text-xs bg-white/5 text-white/60 rounded-lg
                       hover:bg-white/10 hover:text-white/80 transition-all duration-200"
          >
            Force Desktop Mode (if detection fails)
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="max-w-sm w-full bg-black/90 backdrop-blur-xl border border-white/20 rounded-3xl p-6 relative">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center
                         text-white/60 hover:text-white hover:bg-white/20 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl 
                             flex items-center justify-center mx-auto mb-4">
                <BrowserIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {browser.name} Instructions
              </h3>
              <p className="text-white/60 text-sm">
                Follow these steps to enable desktop mode:
              </p>
            </div>

            <div className="space-y-4">
              {getDesktopInstructions().map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-white/50 text-xs">
                The page will automatically reload in desktop mode
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
          <span className="text-white/60 text-xs font-medium">DA'VINCI Solutions</span>
        </div>
      </div>
    </div>
  );
};

export default MobileRedirect;