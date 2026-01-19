import React, { useState } from 'react';
import DemoPortal from './ui/demo-request-modal';

const DemoPage = () => {
    const [isDemoOpen, setIsDemoOpen] = useState(true);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
            {/* Background elements to match the site aesthetic */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 text-center">
                <h1 className="text-4xl font-light text-white mb-4 tracking-tight">Accessing Demo Portal...</h1>
                <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Initializing Neural Handshake</p>

                {!isDemoOpen && (
                    <button
                        onClick={() => setIsDemoOpen(true)}
                        className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all font-mono text-xs uppercase tracking-widest"
                    >
                        Re-open Portal
                    </button>
                )}
            </div>

            <DemoPortal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
        </div>
    );
};

export default DemoPage;
