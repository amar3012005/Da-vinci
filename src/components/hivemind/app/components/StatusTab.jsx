import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  History,
  Loader2,
  Search,
  CheckCircle2,
  BookOpen,
  Brain,
  Globe,
  Zap,
  AlertCircle,
  GitBranch,
  Target,
  ListTodo,
  Users,
  Layers,
  Scroll,
  Award,
  Activity,
} from 'lucide-react';

const ACTION_BADGES = {
  SEARCH_WEB: { label: 'Web Search', color: '#117dff', bg: 'rgba(17,125,255,0.12)' },
  SEARCH_MEMORY: { label: 'Memory Search', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  READ_URL: { label: 'Reading', color: '#9333ea', bg: 'rgba(147,51,234,0.12)' },
  SYNTHESIZE: { label: 'Synthesize', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  FINISH: { label: 'Finish', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

const AGENT_COLORS = {
  Explorer: '#117dff',
  Analyst: '#9333ea',
  Verifier: '#16a34a',
  Synthesizer: '#d97706',
};

function EventCard({ event, index }) {
  const getContent = () => {
    switch (event.type) {
      case 'task.reasoning': {
        const badge = ACTION_BADGES[event.action] || ACTION_BADGES.SYNTHESIZE;
        const agentColor = AGENT_COLORS[event.agent] || '#a3a3a3';
        return (
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Brain size={14} style={{ color: agentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {badge.label}
                </span>
                {event.agent && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {event.agent}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#525252]/70 leading-relaxed">{event.thought || event.message}</p>
            </div>
          </div>
        );
      }
      case 'research.started':
        return (
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-[#117dff]" />
            <span className="text-xs text-[#117dff] font-medium">Research started: {event.query}</span>
          </div>
        );
      case 'web.searching':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#117dff] animate-spin" />
            <span className="text-xs text-[#525252]/70">
              Searching: <span className="text-[#117dff]">{event.query}</span>
            </span>
          </div>
        );
      case 'web.results':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#525252]/70">
              <span className="text-[#16a34a] font-medium">{event.count}</span> results found {event.via && `via ${event.via}`}
            </span>
          </div>
        );
      case 'web.reading':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#9333ea] animate-spin" />
            <span className="text-xs text-[#525252]/70 truncate">
              Reading: <span className="text-[#9333ea]">{event.url}</span>
            </span>
          </div>
        );
      case 'web.read_complete':
        return (
          <div className="flex items-center gap-3">
            <BookOpen size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#525252]/70">
              Read <span className="text-[#9333ea] font-medium">{event.length?.toLocaleString()}</span> chars {event.via && `via ${event.via}`}
            </span>
          </div>
        );
      case 'web.error':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-[#dc2626]" />
            <span className="text-xs text-[#dc2626]">Search error: {event.error}</span>
          </div>
        );
      case 'follow_up':
        return (
          <div className="flex items-center gap-3">
            <GitBranch size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">{event.title}</span>
          </div>
        );
      case 'task.completed':
        return (
          <div className="flex items-center gap-3">
            <Zap size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">
              Task complete: <span className="text-[#d97706] font-medium">{event.findingCount}</span> findings
              {event.confidence != null && (
                <>
                  , confidence <span className="text-[#d97706] font-medium">{(event.confidence * 100).toFixed(0)}%</span>
                </>
              )}
            </span>
          </div>
        );
      case 'research.synthesizing':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#d97706] animate-spin" />
            <span className="text-xs text-[#d97706] font-medium">Synthesizing final report...</span>
          </div>
        );
      case 'research.completed':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a] font-medium">
              Research complete! {event.findingCount} findings in {((event.durationMs || 0) / 1000).toFixed(1)}s
            </span>
          </div>
        );
      case 'task.started':
        return (
          <div className="flex items-center gap-3">
            <Loader2 size={14} className="text-[#117dff] animate-spin" />
            <span className="text-xs text-[#525252]/70">Task started: {event.taskId}</span>
          </div>
        );
      case 'task.failed':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-[#dc2626]" />
            <span className="text-xs text-[#dc2626]">Task failed: {event.error}</span>
          </div>
        );
      case 'task.observation': {
        const agentColor = AGENT_COLORS[event.agent] || '#9333ea';
        return (
          <div className="flex items-center gap-3">
            <Target size={14} style={{ color: agentColor }} />
            <span className="text-xs text-[#525252]/70">
              {event.agent && (
                <span className="font-medium" style={{ color: agentColor }}>
                  {event.agent}:
                </span>
              )}{' '}
              {event.title}
            </span>
          </div>
        );
      }
      case 'agent.state': {
        const agentColor = AGENT_COLORS[event.agent] || '#a3a3a3';
        const stateIcon = event.state === 'active' ? (
          <Loader2 size={14} className="animate-spin" />
        ) : event.state === 'completed' ? (
          <CheckCircle2 size={14} />
        ) : (
          <Globe size={14} />
        );
        return (
          <div className="flex items-center gap-3">
            <span style={{ color: agentColor }}>{stateIcon}</span>
            <span className="text-xs text-[#525252]/70">
              <span className="font-medium" style={{ color: agentColor }}>
                {event.agent}
              </span>
              <span className="text-gray-400 mx-1">→</span>
              <span className={event.state === 'active' ? 'text-[#117dff]' : event.state === 'completed' ? 'text-[#16a34a]' : ''}>
                {event.state}
              </span>
              {event.detail && <span className="text-gray-400 ml-1">({event.detail})</span>}
            </span>
          </div>
        );
      }
      case 'agent.states': {
        const states = event.states || {};
        return (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Agent Status</span>
            <div className="flex items-center gap-3">
              {Object.entries(states).map(([agent, state]) => {
                const color = AGENT_COLORS[agent] || '#a3a3a3';
                return (
                  <div key={agent} className="flex items-center gap-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color, opacity: state === 'active' ? 1 : state === 'completed' ? 0.8 : 0.3 }}
                    />
                    <span className="text-[10px]" style={{ color }}>
                      {agent}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case 'verifier.contradiction':
        return (
          <div className="flex items-center gap-3 bg-red-50 p-2 rounded-lg border border-red-100">
            <AlertCircle size={14} className="text-red-500" />
            <span className="text-xs text-red-600 font-medium">
              Contradiction detected: {event.count} conflicting {event.count === 1 ? 'claim' : 'claims'}
            </span>
          </div>
        );
      case 'verifier.contradiction_resolved':
        return (
          <div className="flex items-center gap-3 bg-green-50 p-2 rounded-lg border border-green-100">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs text-green-700 font-medium">
              Contradiction resolved: supports Claim {event.supports} ({(event.confidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
        );
      case 'verifier.contradictions_summary':
        return (
          <div className="flex items-center gap-3">
            <Activity size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#525252]/70">
              Contradictions: {event.resolved} resolved, {event.unresolved} unresolved of {event.total}
            </span>
          </div>
        );
      case 'research.decomposed':
        return (
          <div className="flex items-center gap-3">
            <GitBranch size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#525252]/70">Decomposed into {event.taskCount || event.dimensions?.length || 'multiple'} tasks</span>
          </div>
        );
      case 'research.wave_started':
        return (
          <div className="flex items-center gap-3">
            <Layers size={14} className="text-[#117dff]" />
            <span className="text-xs text-[#525252]/70">Wave {event.wave}: Running {event.taskCount} dimensions in parallel</span>
          </div>
        );
      case 'research.wave_completed':
        return (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">
              Wave {event.wave} complete — {event.findingCount} findings ({(event.confidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
        );
      case 'research.depth_decision':
        return (
          <div className="flex items-center gap-3">
            <Activity size={14} className={event.decision === 'high_confidence_early_stop' ? 'text-[#16a34a]' : 'text-[#d97706]'} />
            <span className="text-xs text-[#525252]/70">
              {event.decision === 'high_confidence_early_stop'
                ? `High confidence (${(event.avgConfidence * 100).toFixed(0)}%) — skipping to synthesis`
                : `Low confidence (${(event.avgConfidence * 100).toFixed(0)}%) — extending search depth to ${event.newMaxDepth}`}
            </span>
          </div>
        );
      case 'research.skipping_waves':
        return (
          <div className="flex items-center gap-3">
            <Zap size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">Confidence sufficient — fast-tracking to gap analysis</span>
          </div>
        );
      case 'research.reflecting':
        return (
          <div className="flex items-center gap-3">
            <Brain size={14} className="text-[#9333ea] animate-pulse" />
            <span className="text-xs text-[#525252]/70">Reflecting (round {event.round}, {(event.confidence * 100).toFixed(0)}%)</span>
          </div>
        );
      case 'research.cached':
        return (
          <div className="flex items-center gap-3">
            <History size={14} className="text-[#16a34a]" />
            <span className="text-xs text-[#16a34a]">Using {event.findingCount} cached findings</span>
          </div>
        );
      case 'memory.cache_hit':
        return (
          <div className="flex items-center gap-3 bg-[#9333ea]/5 p-2 rounded-lg border border-[#9333ea]/20">
            <Brain size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#9333ea] font-medium">
              Memory hit: {event.title?.slice(0, 60)} ({((event.confidence || 0) * 100).toFixed(0)}%)
            </span>
          </div>
        );
      case 'research.blueprint_suggested':
        return (
          <div className="flex items-center gap-3">
            <Award size={14} className="text-[#d97706]" />
            <span className="text-xs text-[#d97706]">Blueprint suggested: {event.blueprintId || event.name}</span>
          </div>
        );
      case 'research.blueprints_mined':
        return (
          <div className="flex items-center gap-3">
            <Layers size={14} className="text-[#9333ea]" />
            <span className="text-xs text-[#9333ea]">Mined {event.count || event.blueprintCount} new blueprints</span>
          </div>
        );
      case 'web.read_error':
        return (
          <div className="flex items-center gap-3">
            <AlertCircle size={14} className="text-orange-500" />
            <span className="text-xs text-orange-500">Read error: {event.error}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3">
            <Globe size={14} className="text-[#a3a3a3]" />
            <span className="text-xs text-[#a3a3a3]">{event.message || event.type}</span>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="bg-white border border-[#e3e0db] rounded-xl px-4 py-2.5 shadow-sm"
    >
      {getContent()}
    </motion.div>
  );
}

function defaultResolveAgentState(agent, agentStates) {
  const latestTaskId = Object.keys(agentStates || {}).pop();
  return latestTaskId ? agentStates?.[latestTaskId]?.[agent.toLowerCase()] : 'idle';
}

/**
 * StatusTab renders the active goal, agent states, subgoals, and event timeline.
 * It owns timeline auto-scroll but otherwise stays presentational.
 */
export default function StatusTab({
  activeGoal = '',
  agentStates = {},
  events = [],
  status = 'idle',
  subgoals = [],
  eventsEndRef = null,
  autoScroll = true,
  className = '',
  resolveAgentState = defaultResolveAgentState,
}) {
  const localEventsEndRef = useRef(null);
  const endRef = eventsEndRef || localEventsEndRef;

  useEffect(() => {
    if (!autoScroll || !endRef.current) return;
    endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [autoScroll, endRef, events]);

  const agentCards = useMemo(
    () =>
      Object.entries(AGENT_COLORS).map(([agent, color]) => {
        const state = resolveAgentState(agent, agentStates);
        const isActive = state === 'active';
        const isCompleted = state === 'completed';

        return {
          agent,
          color,
          state,
          isActive,
          isCompleted,
        };
      }),
    [agentStates, resolveAgentState]
  );

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {activeGoal && (
        <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-[#117dff]" />
            <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Active Goal</span>
          </div>
          <p className="text-sm text-[#0a0a0a]">{activeGoal}</p>
        </div>
      )}

      <div className="bg-gradient-to-br from-[#faf9f4] to-white border border-[#e3e0db] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#9333ea]" />
          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">CSI Agents</span>
          {status === 'running' && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#117dff]">
              <Loader2 size={10} className="animate-spin" />
              Active
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {agentCards.map(({ agent, color, state, isActive, isCompleted }) => (
            <div
              key={agent}
              className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                isActive ? 'bg-white border-[#117dff]/30 shadow-sm' : 'bg-white/50 border-[#e3e0db]'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${isActive ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: isActive ? color : isCompleted ? color : `${color}40` }}
              />
              <div className="flex-1 min-w-0">
                <span className={`text-xs block ${isActive ? 'text-[#0a0a0a] font-medium' : 'text-[#525252]'}`}>{agent}</span>
                {state && state !== 'idle' && state !== 'not_used' && (
                  <span className={`text-[9px] ${isActive ? 'text-[#117dff]' : isCompleted ? 'text-[#16a34a]' : 'text-[#a3a3a3]'}`}>
                    {state}
                  </span>
                )}
              </div>
              {isActive && <Loader2 size={12} className="text-[#117dff] animate-spin flex-shrink-0" />}
              {isCompleted && <CheckCircle2 size={12} className="text-[#16a34a] flex-shrink-0" />}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#a3a3a3] mt-2 leading-relaxed">
          Four specialized CSI agents work together: Explorer gathers sources, Analyst extracts claims, Verifier checks quality, and Synthesizer combines findings.
        </p>
      </div>

      {subgoals.length > 0 && (
        <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <ListTodo size={14} className="text-[#16a34a]" />
            <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Subgoals</span>
          </div>
          <div className="space-y-2">
            {subgoals.map((goal, index) => (
              <div key={goal.id || index} className="flex items-start gap-2">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    goal.status === 'completed' ? 'bg-[#16a34a]/10 border border-[#16a34a]/30' : 'bg-white border border-[#e3e0db]'
                  }`}
                >
                  {goal.status === 'completed' && <CheckCircle2 size={10} className="text-[#16a34a]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0a0a0a] truncate">{goal.query}</p>
                  {goal.confidence != null && (
                    <p className="text-[10px] text-[#525252]/50 mt-0.5">Confidence: {(goal.confidence * 100).toFixed(0)}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#faf9f4] border border-[#e3e0db] rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch size={14} className="text-[#d97706]" />
          <span className="text-[10px] uppercase tracking-wider text-[#525252] font-medium">Timeline</span>
        </div>
        <div className="space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-4 text-[#a3a3a3] text-xs">
              <Loader2 size={16} className="animate-spin mx-auto mb-2" />
              Waiting for events...
            </div>
          ) : (
            events.map((event, index) => <EventCard key={`${event.type}-${index}`} event={event} index={index} />)
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}
