import React from 'react';
import { motion } from 'framer-motion';

export const Message = ({ children, from = 'user', missionName = 'AI' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${from === 'user' ? 'items-end' : 'items-start'} mb-4`}
        >
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                    {from === 'user' ? 'YOU' : missionName}
                </span>
            </div>
            <div
                className={`px-4 py-3 rounded-none max-w-[85%] text-[10px] font-black uppercase tracking-widest leading-relaxed border ${from === 'user'
                        ? 'bg-white/5 text-white border-white/10'
                        : 'bg-white/10 text-white border-white/20'
                    }`}
            >
                {children}
            </div>
        </motion.div>
    );
};
