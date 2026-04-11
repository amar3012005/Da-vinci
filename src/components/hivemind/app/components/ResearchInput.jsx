import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Sparkles, History, Loader2, GitBranch } from 'lucide-react';

/**
 * ResearchInput renders the query box, session history, and submit controls.
 * It is controlled by the orchestrator and keeps no research state of its own.
 */
export default function ResearchInput({
  query = '',
  onQueryChange,
  onSubmit,
  onKeyDown,
  textareaRef = null,
  status = 'idle',
  sessions = [],
  showSessions = false,
  onToggleSessions,
  onLoadSession,
  showPanel = false,
  onShowPanel,
  fromCache = false,
  error = null,
  disabled = false,
  placeholder = 'What would you like to research?',
  idleTitle = 'What would you like to research?',
  idleDescription = 'Ask anything. HIVEMIND searches the web, analyzes sources, and synthesizes comprehensive reports.',
  className = '',
}) {
  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const canSubmit = query.trim() && !isRunning && !disabled;

  return (
    <div className={className}>
      {isIdle && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#117dff]/10 to-[#9333ea]/10 flex items-center justify-center">
            <Sparkles size={24} className="sm:w-[28px] sm:h-[28px] text-[#117dff]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] font-['Space_Grotesk'] mb-3 px-4">{idleTitle}</h2>
          <p className="text-sm sm:text-base text-[#525252] max-w-md mx-auto px-4">{idleDescription}</p>
        </motion.div>
      )}

      {sessions.length > 0 && status === 'idle' && onToggleSessions && (
        <div className="relative mb-4 flex justify-end">
          <button
            onClick={onToggleSessions}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#f3f1ec] transition-colors"
          >
            <History size={14} />
            <span className="hidden sm:inline">History</span>
          </button>
          <AnimatePresence>
            {showSessions && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-[#e3e0db] p-2 w-64 sm:w-72 max-h-80 overflow-y-auto shadow-xl z-50"
              >
                {sessions.map((session) => {
                  const sessionKey = session.id || session.session_id;
                  return (
                    <button
                      key={sessionKey}
                      onClick={() => onLoadSession?.(sessionKey)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#faf9f4] transition-colors"
                    >
                      <p className="text-xs text-[#0a0a0a] truncate">{session.query || 'Untitled'}</p>
                      <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                        {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}
                      </p>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-12">
        <div className="bg-white rounded-2xl border border-[#e3e0db] overflow-hidden shadow-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e3e0db] bg-gradient-to-b from-[#faf9f4] to-white">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#dba520]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf9f4] border border-[#e3e0db]">
              <Sparkles size={12} className="text-[#9333ea]" />
              <span className="text-[10px] text-[#525252] font-medium">AI Research</span>
            </div>
          </div>

          <div className="p-5">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value, event)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={isIdle ? 4 : 3}
              className="w-full bg-transparent text-[#0a0a0a] text-sm placeholder:text-[#a3a3a3] resize-none focus:outline-none leading-relaxed font-mono"
              disabled={isRunning || disabled}
            />

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e3e0db]">
              <div className="flex items-center gap-2 flex-wrap">
                {isRunning && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#117dff]/10 border border-[#117dff]/20 text-[#117dff] text-xs font-medium">
                    <Loader2 size={12} className="animate-spin" />
                    Researching...
                  </span>
                )}
                {(status === 'running' || status === 'completed') && !showPanel && onShowPanel && (
                  <button
                    onClick={onShowPanel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea] text-xs font-medium hover:bg-[#9333ea]/20 transition-colors"
                  >
                    <GitBranch size={12} />
                    Show Process
                  </button>
                )}
                {fromCache && status === 'completed' && (
                  <span className="px-3 py-1.5 rounded-full bg-[#16a34a]/10 border border-[#16a34a]/20 text-[#16a34a] text-xs font-medium">
                    From Cache
                  </span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(17,125,255,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={onSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#117dff] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#0066e0] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="hidden sm:inline">Running...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Start Research</span>
                    <ArrowUp size={14} />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {status === 'failed' && error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-[#dc2626]/5 border border-[#dc2626]/20 rounded-2xl px-6 py-4 text-center"
        >
          <p className="text-sm text-[#dc2626]">{error}</p>
        </motion.div>
      )}
    </div>
  );
}
