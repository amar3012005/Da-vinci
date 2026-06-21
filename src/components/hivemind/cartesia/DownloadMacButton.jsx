import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const GITHUB_RELEASE_URL =
  'https://github.com/amar3012005/HIVEMIND/releases/latest';
const RELEASES_API =
  'https://api.github.com/repos/amar3012005/HIVEMIND/releases/latest';

const AppleIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const DownloadMacButton = ({ className = '' }) => {
  const [version, setVersion] = useState(null);
  const [dmgUrl, setDmgUrl] = useState(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
    );
  }, []);

  useEffect(() => {
    fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tag_name) setVersion(data.tag_name);
        const dmg = data.assets?.find((a) => a.name?.endsWith('.dmg'));
        if (dmg?.browser_download_url) setDmgUrl(dmg.browser_download_url);
      })
      .catch(() => {});
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    if (dmgUrl) {
      // Trigger real file download (not navigate)
      const a = document.createElement('a');
      a.href = dmgUrl;
      a.download = `HIVEMIND-${version || '1.0.0'}.dmg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Fallback: open releases page
      window.open(GITHUB_RELEASE_URL, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0a0a0a] text-white font-medium rounded-lg border border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors text-xs sm:text-sm cursor-pointer ${className}`}
    >
      <AppleIcon size={14} />
      <span>
        Download for Mac
        {version && (
          <span className="ml-1.5 text-[10px] text-white/50 font-normal">
            {version}
          </span>
        )}
      </span>
      {!isMac && (
        <span className="ml-1 text-[10px] text-white/40">(macOS)</span>
      )}
    </motion.button>
  );
};

export default DownloadMacButton;
