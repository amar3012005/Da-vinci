import React, { useEffect, useState } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-r from-black/95 via-black/90 to-black/95 border-t border-pink-500/30 z-50 shadow-2xl">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div className="text-white font-mono">
          <div className="text-lg text-pink-500 font-bold tracking-wide mb-1">Install DA'VINCI App</div>
          <div className="text-xs text-gray-300 mb-2">Empower your workflow with AI. Add to your home screen for instant access to next-gen solutions.</div>
          <div className="text-xs text-white/40 italic">"Say goodbye to boring and awkward processes. Experience the future with DA'VINCI."</div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPrompt(false)}
            className="px-4 py-2 text-xs text-white/60 font-mono rounded hover:text-white/80 hover:bg-white/5 transition"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-2 text-xs bg-pink-500 text-white font-mono rounded shadow hover:bg-pink-400 transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
