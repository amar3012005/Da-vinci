import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, ListTodo, FileText, CheckCircle2, ChevronUp, PanelTop, ChevronDown, X } from 'lucide-react';
import StatusTab from './StatusTab';
import ReportTab from './ReportTab';

const PANEL_WIDTH_CLASSES = {
  compact: 'w-full sm:w-[350px]',
  medium: 'w-full sm:w-[450px]',
  large: 'w-full sm:w-[550px]',
};

const PANEL_WIDTH_VALUES = {
  compact: 350,
  medium: 450,
  large: 550,
};

/**
 * ResearchPanel renders the right-side process shell.
 * Graph content is injected via composition so graph state stays decoupled.
 */
export default function ResearchPanel({
  isOpen = false,
  isResearchActive = false,
  panelRef = null,
  panelContentRef = null,
  panelDragControls,
  panelTab = 'status',
  onPanelTabChange,
  panelSize = 'large',
  onTogglePanelSize,
  onClose,
  status = 'idle',
  activeGoal = '',
  agentStates = {},
  subgoals = [],
  events = [],
  eventsEndRef = null,
  autoScrollEvents = true,
  resolveAgentState,
  report = null,
  findings = [],
  durationMs = 0,
  confidence = 0,
  fromCache = false,
  onSaveAsBlueprint,
  graphTabContent = null,
  renderGraphTab = null,
  className = '',
}) {
  if (!isOpen || !isResearchActive) {
    return null;
  }

  const graphContent = typeof renderGraphTab === 'function' ? renderGraphTab() : graphTabContent;

  return (
    <AnimatePresence>
      <div className={className}>
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={onClose} />
        <motion.div
          ref={panelRef}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: PANEL_WIDTH_VALUES[panelSize] || PANEL_WIDTH_VALUES.large, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          className={`flex-none bg-white border-l border-[#e3e0db] shadow-lg flex flex-col overflow-hidden relative z-40 ${
            PANEL_WIDTH_CLASSES[panelSize] || PANEL_WIDTH_CLASSES.large
          }`}
          style={{ minWidth: 0, maxWidth: '100%' }}
          drag="x"
          dragControls={panelDragControls}
          dragConstraints={{ left: -400, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(event, info) => {
            if (info.offset.x < -100) {
              onClose?.();
            }
          }}
        >
          <div
            className="flex-none flex items-center justify-between px-3 py-2 border-b border-[#e3e0db] bg-[#faf9f4] cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => panelDragControls?.start?.(event)}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-[#d1cfc6] opacity-50 flex-shrink-0" />
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => onPanelTabChange?.('status')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                    panelTab === 'status' ? 'bg-[#117dff]/10 text-[#117dff]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                  }`}
                >
                  <ListTodo size={14} />
                  <span className="font-medium">Status</span>
                  {status === 'running' && <span className="w-2 h-2 rounded-full bg-[#117dff] animate-pulse" />}
                </button>
                <button
                  onClick={() => onPanelTabChange?.('report')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                    panelTab === 'report' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                  }`}
                  disabled={!report}
                >
                  <FileText size={14} />
                  <span className="font-medium">Report</span>
                  {report && <CheckCircle2 size={12} />}
                </button>
                <button
                  onClick={() => onPanelTabChange?.('graph')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                    panelTab === 'graph' ? 'bg-[#9333ea]/10 text-[#9333ea]' : 'text-[#525252] hover:bg-[#f3f1ec]'
                  }`}
                >
                  <GitBranch size={14} />
                  <span className="font-medium">Graph</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onTogglePanelSize}
                className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]"
                title="Resize panel"
              >
                {panelSize === 'compact' && <ChevronUp size={14} />}
                {panelSize === 'medium' && <PanelTop size={14} />}
                {panelSize === 'large' && <ChevronDown size={14} />}
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#e3e0db]/40 text-[#525252]">
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={panelContentRef} className="flex-1 overflow-y-auto p-3">
            <AnimatePresence mode="wait">
              {panelTab === 'status' && (
                <motion.div key="status" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <StatusTab
                    activeGoal={activeGoal}
                    agentStates={agentStates}
                    events={events}
                    status={status}
                    subgoals={subgoals}
                    eventsEndRef={eventsEndRef}
                    autoScroll={autoScrollEvents}
                    resolveAgentState={resolveAgentState}
                  />
                </motion.div>
              )}

              {panelTab === 'report' && (
                <ReportTab
                  report={report}
                  findings={findings}
                  durationMs={durationMs}
                  confidence={confidence}
                  fromCache={fromCache}
                  onSaveAsBlueprint={onSaveAsBlueprint}
                  isGenerating={status === 'running'}
                />
              )}

              {panelTab === 'graph' && (
                <motion.div key="graph" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full">
                  {graphContent}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
