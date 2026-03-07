import React from 'react';
import { createRoot } from 'react-dom/client';
import TaraVoiceWidget from './components/mobile/TaraVoiceWidget';

/**
 * TARA WIDGET LOADER
 * This script initializes the widget when loaded via a script tag.
 */
const initWidget = () => {
    // 1. Find the configuration from the script tag attributes
    const scriptTag = document.currentScript || document.querySelector('script[src*="tara-widget"]');

    const config = {
        tenantId: scriptTag?.getAttribute('data-tenant') || 'davinci',
        agentId: scriptTag?.getAttribute('data-agent') || 'davinci',
        agentName: scriptTag?.getAttribute('data-name') || 'Tara AI',
        language: scriptTag?.getAttribute('data-lang') || 'en',
        accessKey: scriptTag?.getAttribute('data-key') || '000000',
        region: scriptTag?.getAttribute('data-region') || 'EU',
    };

    // 2. Create the container element
    const container = document.createElement('div');
    container.id = 'tara-voice-widget-root';
    document.body.appendChild(container);

    // 3. Create a Shadow Root to keep styles isolated (optional but recommended)
    // For simplicity in this build, we'll append directly, 
    // but in a production bundle, we'd use Shadow DOM.
    const root = createRoot(container);
    root.render(<TaraVoiceWidget config={config} />);
};

// Initialize if the document is ready
if (document.readyState === 'complete') {
    initWidget();
} else {
    window.addEventListener('load', initWidget);
}
