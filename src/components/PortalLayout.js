import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * PortalLayout
 * 
 * Acts as the "Shell" application for the DaVinci AI ecosystem.
 * - Hosts the persistent TARA widget (so it doesn't reload)
 * - Loads sub-applications (Enterprise, Prometheus) in an iframe
 * - Syncs URL state between the shell and the iframe
 */
const PortalLayout = ({ targetUrl }) => {
    const iframeRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    // Initial URL construction
    // If we are at /enterprise/dashboard, we want to load https://enterprise.davinciai.eu/dashboard
    // targetUrl is the base (e.g. "https://enterprise.davinciai.eu")
    // We append the current path suffix to it.

    // Determine the path to append. 
    // If we differ from the "root" of this portal route.
    // For simplicity, we assume the route structure matches.

    // Example: 
    // Shell: davinciai.eu/enterprise/dashboard
    // Iframe: enterprise.davinciai.eu/enterprise/dashboard

    // This requires the apps to have matching path prefixes or we need to rewrite.
    // Let's assume subdomains map to paths:
    // /enterprise/* -> https://enterprise.davinciai.eu/enterprise/*

    const initialSrc = `${targetUrl}${location.pathname}${location.search}${location.hash}`;

    useEffect(() => {
        const handleMessage = (event) => {
            // Security check - allowing specific domains
            const allowedOrigins = [
                "https://enterprise.davinciai.eu",
                "https://prometheus.davinciai.eu",
                "http://localhost:3000",
                "http://localhost:3001"
            ];

            if (!allowedOrigins.includes(event.origin)) return;

            if (event.data?.type === 'ROUTE_CHANGE') {
                // The iframe navigated, update our shell URL
                // We need to map the iframe's internal path back to our shell path
                // For now, assume 1:1 mapping
                const newPath = event.data.path;
                if (window.location.pathname !== newPath) {
                    navigate(newPath, { replace: true });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [navigate]);

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* 
                Persistent TARA Widget Container 
                The actual script should be loaded in index.html or here 
                For now, we assume the script tag in index.html handles the global TARA instance
            */}
            <div id="tara-persistent-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
                {/* TARA Widget will inject itself here or in body */}
            </div>

            <iframe
                ref={iframeRef}
                title="DaVinci Portal"
                src={initialSrc}
                style={{
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    backgroundColor: '#000'
                }}
                onLoad={() => setIsLoading(false)}
                allow="microphone; camera; geolocation; payment; autoplay; clipboard-read; clipboard-write; fullscreen"
            />
        </div>
    );
};

export default PortalLayout;
