import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDragControls } from 'framer-motion';
import { GitBranch, Search, Sparkles } from 'lucide-react';
import GraphVisualization from '../components/GraphVisualization';
import ResearchInput from '../components/ResearchInput';
import ResearchPanel from '../components/ResearchPanel';
import apiClient from '../shared/api-client';

const PANEL_WIDTH_VALUES = {
  compact: 350,
  medium: 450,
  large: 550,
};

export default function DeepResearch() {
  const [query, setQuery] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [events, setEvents] = useState([]);
  const [report, setReport] = useState(null);
  const [findings, setFindings] = useState([]);
  const [durationMs, setDurationMs] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [, setProjectId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState(null);

  const [showPanel, setShowPanel] = useState(false);
  const [panelTab, setPanelTab] = useState('status');
  const [panelSize, setPanelSize] = useState('large');
  const panelRef = useRef(null);
  const panelContentRef = useRef(null);
  const panelDragControls = useDragControls();

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [graphLayers, setGraphLayers] = useState({
    sources: true,
    claims: true,
    trails: true,
    observations: true,
    executionEvents: true,
    blueprints: true,
  });
  const [graphLoading, setGraphLoading] = useState(false);
  const [webUsage, setWebUsage] = useState(null);
  const [savingMemories, setSavingMemories] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  const [isGraphDetached, setIsGraphDetached] = useState(false);
  const [showGraphWindow, setShowGraphWindow] = useState(false);
  const [detachedGraphPos, setDetachedGraphPos] = useState({ x: 100, y: 100, width: 600, height: 500 });
  const graphWindowRef = useRef(null);
  const inlineGraphRef = useRef(null);
  const detachedGraphRef = useRef(null);

  const [, setTrailSteps] = useState([]);
  const [agentStates, setAgentStates] = useState({});
  const [subgoals, setSubgoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState('');
  const textareaRef = useRef(null);

  const isResearchActive = status === 'running' || status === 'completed';

  const fetchTrailSteps = useCallback(async (sid) => {
    try {
      const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/trail`);
      setTrailSteps(Array.isArray(data) ? data : data?.trail || []);
      if (data?.tasks) {
        setSubgoals(
          data.tasks.map((task, index) => ({
            id: task.id || index,
            query: task.query,
            status: task.status || 'pending',
            confidence: task.confidence,
          }))
        );
      }
      if (data?.query) {
        setActiveGoal(data.query);
      }
    } catch (fetchError) {
      console.error('Failed to fetch trail:', fetchError);
    }
  }, []);

  const fetchGraphData = useCallback(
    async (sid) => {
      setGraphLoading(true);
      try {
        const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/graph`);
        const layers = data.layers || {};
        const nodes = [];
        const links = [];

        if (graphLayers.sources && layers.sources) {
          layers.sources.forEach((source, index) => {
            nodes.push({
              id: `source-${source.id || index}`,
              type: 'source',
              title: source.title || source.url || 'Source',
              url: source.url,
              val: 8,
              color: '#117dff',
              runtime: source.runtime || 'tavily',
              score: source.score,
              favicon: source.favicon,
            });
          });
        }

        if (graphLayers.claims && layers.claims) {
          layers.claims.forEach((claim, index) => {
            const isStructured = claim.type === 'structured-claim' || claim.structured;
            nodes.push({
              id: `claim-${claim.id || index}`,
              type: isStructured ? 'structured-claim' : 'plain-claim',
              title: claim.content?.slice(0, 80) || 'Finding',
              confidence: claim.confidence,
              val: isStructured ? 12 : 8,
              color: isStructured ? '#16a34a' : '#86efac',
              sourceId: claim.source,
              structured: claim.structured,
              source: claim.source,
            });

            if (isStructured && claim.structured?.sourceIds?.length > 0) {
              claim.structured.sourceIds.forEach((sourceId) => {
                links.push({
                  source: `claim-${claim.id || index}`,
                  target: `source-${sourceId}`,
                  type: 'derived_from',
                  color: '#16a34a40',
                });
              });
            }
          });
        }

        if (graphLayers.trails && layers.trails) {
          layers.trails.forEach((step, index) => {
            nodes.push({
              id: `trail-${step.id || index}`,
              type: 'trail',
              title: `${step.agent}: ${step.action}`,
              action: step.action,
              agent: step.agent,
              val: 6,
              color: '#9333ea',
              runtime: step.runtime,
              confidence: step.confidence,
            });
            if (index > 0) {
              links.push({
                source: `trail-${step.id || index}`,
                target: `trail-${layers.trails[index - 1].id || index - 1}`,
                type: 'sequence',
                color: '#9333ea40',
              });
            }
          });
        }

        if (graphLayers.blueprints && layers.blueprints) {
          layers.blueprints.forEach((blueprint, index) => {
            nodes.push({
              id: `blueprint-${blueprint.blueprintId || index}`,
              type: 'blueprint',
              title: blueprint.name || 'Blueprint',
              domain: blueprint.domain,
              reused: blueprint.timesReused || 0,
              val: 12,
              color: '#d97706',
            });
          });
        }

        if (graphLayers.observations && layers.observations) {
          layers.observations.forEach((observation, index) => {
            nodes.push({
              id: `obs-${observation.id || index}`,
              type: 'observation',
              title: `${observation.agent}/${observation.action}: ${observation.title?.slice(0, 40) || 'Observation'}`,
              agent: observation.agent,
              action: observation.action,
              findingType: observation.findingType,
              source: observation.source,
              sourceId: observation.sourceId,
              confidence: observation.confidence,
              val: 7,
              color:
                observation.agent === 'explorer'
                  ? '#3b82f6'
                  : observation.agent === 'analyst'
                    ? '#10b981'
                    : observation.agent === 'verifier'
                      ? '#f59e0b'
                      : '#8b5cf6',
              createdAt: observation.createdAt,
              isLive: Date.now() - new Date(observation.createdAt).getTime() < 5000,
            });
          });
        }

        if (graphLayers.executionEvents && layers.executionEvents) {
          layers.executionEvents.forEach((executionEvent, index) => {
            nodes.push({
              id: `exec-${executionEvent.id || index}`,
              type: 'execution-event',
              title: `${executionEvent.agent}/${executionEvent.action}`,
              agent: executionEvent.agent,
              action: executionEvent.action,
              success: executionEvent.success,
              val: 5,
              color: executionEvent.success ? '#059669' : '#dc2626',
              createdAt: executionEvent.createdAt,
              isLive: Date.now() - new Date(executionEvent.createdAt).getTime() < 5000,
            });
          });
        }

        if (layers.weights?.edges) {
          layers.weights.edges.forEach((edge) => {
            links.push({
              source: edge.from,
              target: edge.to,
              type: edge.type || 'related',
              confidence: edge.confidence,
              color: `rgba(147, 51, 234, ${0.2 + (edge.confidence || 0.5) * 0.5})`,
            });
          });
        }

        setGraphData({ nodes, links });
      } catch (fetchError) {
        console.error('Failed to fetch graph:', fetchError);
      } finally {
        setGraphLoading(false);
      }
    },
    [graphLayers]
  );

  const fetchWebUsage = useCallback(async () => {
    try {
      const { data } = await apiClient.controlPlane.get('/v1/proxy/web/usage');
      setWebUsage(data);
    } catch (fetchError) {
      console.error('Failed to fetch web usage:', fetchError);
    }
  }, []);

  useEffect(() => {
    apiClient.controlPlane
      .get('/v1/proxy/research/sessions')
      .then(({ data }) => setSessions(Array.isArray(data) ? data : data?.sessions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId || status !== 'running') {
      return undefined;
    }

    const baseUrl = apiClient.controlPlane.defaults?.baseURL || '';
    const streamUrl = `${baseUrl}/v1/proxy/research/${sessionId}/stream`;
    const source = new EventSource(streamUrl, { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);

        if (data.type === 'agent.states' && data.states) {
          setAgentStates((prev) => ({ ...prev, [data.taskId]: data.states }));
        } else if (data.type === 'agent.state') {
          setAgentStates((prev) => ({
            ...prev,
            [data.taskId]: { ...(prev[data.taskId] || {}), [data.agent]: data.state },
          }));
        }

        if (data.type === 'task.started' && data.dimension) {
          setSubgoals((prev) => {
            if (prev.find((goal) => goal.id === data.taskId)) {
              return prev;
            }
            return [...prev, { id: data.taskId, query: data.query, dimension: data.dimension, status: 'running' }];
          });
        }

        if (data.type === 'task.completed') {
          setSubgoals((prev) =>
            prev.map((goal) => (goal.id === data.taskId ? { ...goal, status: 'completed', confidence: data.confidence } : goal))
          );
        }

        if (showPanel && data.type === 'task.completed') {
          fetchGraphData(sessionId);
        }
      } catch (parseError) {
        console.error('[SSE] Failed to parse event:', parseError);
      }
    };

    source.addEventListener('done', async (event) => {
      const data = JSON.parse(event.data);
      source.close();

      if (data.status === 'completed') {
        setStatus('completed');
        try {
          const { data: reportData } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/report`);
          setReport(reportData.report);
          setFindings(reportData.findings || []);
          setDurationMs(reportData.durationMs || 0);
          setConfidence(reportData.confidence ?? reportData.taskProgress?.overallConfidence ?? 0);
          setFromCache(!!reportData.fromCache);
          if (reportData.projectId) {
            setProjectId(reportData.projectId);
          }
          fetchTrailSteps(sessionId);
          fetchGraphData(sessionId);
        } catch (reportError) {
          console.error('Failed to fetch report:', reportError);
        }
      } else if (data.status === 'failed') {
        setStatus('failed');
        setError(data.error || 'Research failed');
      }
    });

    source.onerror = () => {
      console.error('[SSE] Connection error, falling back to polling');
      source.close();

      const fallbackInterval = setInterval(async () => {
        try {
          const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/status`);
          setEvents(data.events || []);

          const agentStateEvents = (data.events || []).filter(
            (entry) => entry.type === 'agent.state' || entry.type === 'agent.states'
          );

          agentStateEvents.forEach((entry) => {
            if (entry.type === 'agent.states' && entry.states) {
              setAgentStates((prev) => ({ ...prev, [entry.taskId]: entry.states }));
            } else if (entry.type === 'agent.state') {
              setAgentStates((prev) => ({
                ...prev,
                [entry.taskId]: { ...(prev[entry.taskId] || {}), [entry.agent]: entry.state },
              }));
            }
          });

          if (showPanel) {
            fetchGraphData(sessionId);
          }

          if (data.status === 'completed') {
            setStatus('completed');
            clearInterval(fallbackInterval);
            try {
              const { data: reportData } = await apiClient.controlPlane.get(`/v1/proxy/research/${sessionId}/report`);
              setReport(reportData.report);
              setFindings(reportData.findings || []);
              setDurationMs(reportData.durationMs || 0);
              setConfidence(reportData.confidence ?? reportData.taskProgress?.overallConfidence ?? 0);
              setFromCache(!!reportData.fromCache);
              if (reportData.projectId) {
                setProjectId(reportData.projectId);
              }
              fetchTrailSteps(sessionId);
              fetchGraphData(sessionId);
            } catch (reportError) {
              console.error('Failed to fetch report:', reportError);
            }
          } else if (data.status === 'failed') {
            setStatus('failed');
            setError(data.error || 'Research failed');
            clearInterval(fallbackInterval);
          }
        } catch (pollError) {
          console.error('Polling error:', pollError);
        }
      }, 2000);

      source._fallbackInterval = fallbackInterval;
    };

    return () => {
      source.close();
      if (source._fallbackInterval) {
        clearInterval(source._fallbackInterval);
      }
    };
  }, [fetchGraphData, fetchTrailSteps, sessionId, showPanel, status]);

  useEffect(() => {
    if (panelTab === 'graph' && showPanel && sessionId) {
      fetchGraphData(sessionId);
      fetchWebUsage();
    }
  }, [fetchGraphData, fetchWebUsage, panelTab, sessionId, showPanel]);

  useEffect(() => {
    if (status === 'running' || status === 'completed') {
      window.dispatchEvent(new CustomEvent('hivemind:close-sidebar'));
    }

    return () => {
      if (status === 'idle') {
        window.dispatchEvent(new CustomEvent('hivemind:open-sidebar'));
      }
    };
  }, [status]);

  useEffect(() => {
    if (events.length === 0) {
      return;
    }

    const nextAgentStates = {};
    const actionToAgent = {
      SEARCH_WEB: 'Explorer',
      SEARCH_MEMORY: 'Explorer',
      READ_URL: 'Explorer',
      SYNTHESIZE: 'Analyst',
      FINISH: 'Synthesizer',
    };

    events.forEach((event) => {
      if (event.type === 'task.reasoning' && event.action) {
        const agent = actionToAgent[event.action] || 'Verifier';
        nextAgentStates[agent] = {
          status: 'active',
          lastAction: event.action,
          thought: event.thought,
        };
      }
    });

    ['Explorer', 'Analyst', 'Verifier', 'Synthesizer'].forEach((agent) => {
      if (!nextAgentStates[agent]) {
        nextAgentStates[agent] = { status: 'idle' };
      }
    });

    setAgentStates((prev) => ({ ...prev, ...nextAgentStates }));
  }, [events]);

  const handleSubmit = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || status === 'running') {
      return;
    }

    setShowSessions(false);
    setError(null);
    setStatus('running');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setDurationMs(0);
    setConfidence(0);
    setFromCache(false);
    setSubgoals([]);
    setActiveGoal(trimmedQuery);
    setTrailSteps([]);
    setSelectedNode(null);
    setShowPanel(true);
    setPanelTab('status');

    try {
      const { data } = await apiClient.controlPlane.post('/v1/proxy/research/start', {
        query: trimmedQuery,
        forceRefresh: false,
      });

      setSessionId(data.session_id);
      setProjectId(data.project_id || null);

      if (data.status === 'completed') {
        setStatus('completed');
        const { data: reportData } = await apiClient.controlPlane.get(`/v1/proxy/research/${data.session_id}/report`);
        setReport(reportData.report);
        setFindings(reportData.findings || []);
        setDurationMs(reportData.durationMs || 0);
        setConfidence(reportData.confidence ?? 0);
        setFromCache(!!reportData.fromCache);
        if (reportData.projectId) {
          setProjectId(reportData.projectId);
        }
      }
    } catch (submitError) {
      setStatus('failed');
      setError(submitError.response?.data?.detail || submitError.message || 'Failed to start research');
    }
  }, [query, status]);

  const loadSession = useCallback(
    async (sid) => {
      setShowSessions(false);
      setSessionId(sid);
      setError(null);
      setEvents([]);
      setSelectedNode(null);

      try {
        const { data } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/status`);
        setStatus(data.status || 'idle');
        setEvents(data.events || []);
        if (data.query) {
          setQuery(data.query);
          setActiveGoal(data.query);
        }
        setShowPanel(true);
        setPanelTab('status');

        if (data.status === 'completed') {
          const { data: reportData } = await apiClient.controlPlane.get(`/v1/proxy/research/${sid}/report`);
          setReport(reportData.report);
          setFindings(reportData.findings || []);
          setDurationMs(reportData.durationMs || 0);
          setConfidence(reportData.confidence ?? 0);
          setFromCache(!!reportData.fromCache);
          setQuery(reportData.query || data.query || '');
          if (reportData.projectId) {
            setProjectId(reportData.projectId);
          }
          fetchTrailSteps(sid);
        }
      } catch (loadError) {
        setError('Failed to load session');
      }
    },
    [fetchTrailSteps]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleNewResearch = useCallback(() => {
    setQuery('');
    setSessionId(null);
    setStatus('idle');
    setEvents([]);
    setReport(null);
    setFindings([]);
    setProjectId(null);
    setError(null);
    setDurationMs(0);
    setConfidence(0);
    setFromCache(false);
    setShowPanel(false);
    setShowSessions(false);
    setSelectedNode(null);
    setSubgoals([]);
    setTrailSteps([]);
    setActiveGoal('');
    setShowGraphWindow(false);
    setIsGraphDetached(false);
    textareaRef.current?.focus();
  }, []);

  const handleSaveToMemory = useCallback(
    async (source, nodeId) => {
      if (!sessionId) {
        return;
      }

      setSavingMemories((prev) => new Set(prev).add(nodeId));
      try {
        await apiClient.controlPlane.post(`/v1/proxy/research/${sessionId}/save-memory`, {
          sourceId: source.id,
          title: source.title,
          url: source.url,
          tags: ['web-search', 'deep-research'],
        });
      } catch (saveError) {
        console.error('Failed to save to memory:', saveError);
      } finally {
        setSavingMemories((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [sessionId]
  );

  const handleRefreshGraph = useCallback(() => {
    if (!sessionId) {
      return;
    }
    setGraphRefreshKey((prev) => prev + 1);
    fetchGraphData(sessionId);
  }, [fetchGraphData, sessionId]);

  const handleSaveAsBlueprint = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      const { data } = await apiClient.controlPlane.post(`/v1/proxy/research/${sessionId}/save-as-blueprint`, {
        name: `Research: ${query?.slice(0, 40) || 'Deep Research'}`,
      });
      alert(data.message || 'Research saved as reusable blueprint');
      console.log('[DeepResearch] Saved as blueprint:', data.blueprint);
    } catch (saveError) {
      console.error('Failed to save as blueprint:', saveError);
      alert(`Failed to save as blueprint: ${saveError.response?.data?.error || saveError.message}`);
    }
  }, [query, sessionId]);

  const handleRerunFromBlueprint = useCallback(
    async (blueprintId, baseQuery) => {
      try {
        const { data } = await apiClient.controlPlane.post(`/v1/proxy/research/blueprint/${blueprintId}/rerun`, {
          baseQuery: baseQuery || query,
        });
        setSessionId(data.session_id);
        setStatus('running');
        setEvents([]);
        setReport(null);
        setFindings([]);
        setShowPanel(true);
        setPanelTab('status');
      } catch (rerunError) {
        console.error('Failed to rerun from blueprint:', rerunError);
        alert(`Failed to rerun from blueprint: ${rerunError.response?.data?.error || rerunError.message}`);
      }
    },
    [query]
  );

  const handleNodeClick = useCallback(
    (node) => {
      if (node.type === 'blueprint') {
        const useAsBase = window.confirm(`Use "${node.title}" as a base for new research?`);
        if (useAsBase && node.id) {
          handleRerunFromBlueprint(node.id.replace('blueprint-', ''), node.title);
          return;
        }
      }

      if (node.type === 'source' || node.type === 'structured-claim' || node.type === 'plain-claim') {
        setSelectedNode(node);
        return;
      }

      setSelectedNode(null);
    },
    [handleRerunFromBlueprint]
  );

  const handleDetachGraph = useCallback(() => {
    setIsGraphDetached(true);
    setShowGraphWindow(true);
    setPanelTab('status');
  }, []);

  const handleToggleGraphWindow = useCallback(() => {
    setShowGraphWindow((prev) => {
      const next = !prev;
      if (next) {
        setIsGraphDetached(true);
      } else {
        setIsGraphDetached(false);
      }
      return next;
    });
  }, []);

  const handleCloseGraphWindow = useCallback(() => {
    setShowGraphWindow(false);
    setIsGraphDetached(false);
  }, []);

  const togglePanelSize = useCallback(() => {
    setPanelSize((prev) => (prev === 'compact' ? 'medium' : prev === 'medium' ? 'large' : 'compact'));
  }, []);

  const resolveAgentState = useCallback((agentName, currentAgentStates) => {
    const directState = currentAgentStates?.[agentName];
    if (directState?.status) {
      return directState.status;
    }

    const latestTaskId = Object.keys(currentAgentStates || {}).pop();
    const taskState = latestTaskId ? currentAgentStates?.[latestTaskId] : null;
    if (typeof taskState === 'string') {
      return taskState;
    }
    if (taskState?.[agentName.toLowerCase()]) {
      return taskState[agentName.toLowerCase()];
    }
    if (taskState?.[agentName]) {
      return taskState[agentName];
    }
    return 'idle';
  }, []);

  const inlineGraphWidth = Math.max((PANEL_WIDTH_VALUES[panelSize] || PANEL_WIDTH_VALUES.large) - 24, 320);
  const inlineGraphHeight = Math.max((panelContentRef.current?.clientHeight || 560) - 24, 320);

  const sharedGraphProps = {
    data: graphData,
    layers: graphLayers,
    setLayers: setGraphLayers,
    loading: graphLoading,
    webUsage,
    selectedNode,
    setSelectedNode,
    onNodeClick: handleNodeClick,
    onRefresh: handleRefreshGraph,
    refreshKey: graphRefreshKey,
    isDetached: isGraphDetached,
    onDetach: handleDetachGraph,
    onToggleDetachedWindow: handleToggleGraphWindow,
    onCloseDetachedWindow: handleCloseGraphWindow,
    detachedBounds: detachedGraphPos,
    setDetachedBounds: setDetachedGraphPos,
    graphWindowRef,
    inlineGraphRef,
    detachedGraphRef,
    onSaveToMemory: handleSaveToMemory,
    savingMemories,
  };

  return (
    <div className="fixed inset-0 bg-[#faf9f4] overflow-hidden flex flex-col z-[100]">
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#e3e0db] bg-white/90 backdrop-blur-sm z-[60]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#117dff]/10 flex items-center justify-center flex-shrink-0">
            <Search size={16} className="sm:w-[18px] sm:h-[18px] text-[#117dff]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-[#0a0a0a] font-['Space_Grotesk'] truncate">Deep Research</h1>
            <p className="text-[9px] sm:text-[10px] text-[#a3a3a3] hidden sm:block">AI-powered research engine</p>
          </div>
        </div>

        {status !== 'idle' && (
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => setShowPanel((prev) => !prev)}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs transition-colors ${
                showPanel
                  ? 'bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#9333ea]'
                  : 'bg-[#faf9f4] border border-[#e3e0db] text-[#525252] hover:bg-[#f3f1ec]'
              }`}
              type="button"
            >
              <GitBranch size={12} />
              <span className="hidden sm:inline">{showPanel ? 'Hide' : 'Show'} Process</span>
            </button>
            <button
              onClick={handleNewResearch}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#faf9f4] border border-[#e3e0db] text-[#525252] text-xs hover:bg-[#f3f1ec] transition-colors"
              type="button"
            >
              <Sparkles size={12} />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl">
            <ResearchInput
              query={query}
              onQueryChange={setQuery}
              onSubmit={handleSubmit}
              onKeyDown={handleKeyDown}
              textareaRef={textareaRef}
              status={status}
              sessions={sessions}
              showSessions={showSessions}
              onToggleSessions={() => setShowSessions((prev) => !prev)}
              onLoadSession={loadSession}
              showPanel={showPanel}
              onShowPanel={() => setShowPanel(true)}
              fromCache={fromCache}
              error={error}
            />
          </div>
        </div>

        <ResearchPanel
          isOpen={showPanel}
          isResearchActive={isResearchActive}
          panelRef={panelRef}
          panelContentRef={panelContentRef}
          panelDragControls={panelDragControls}
          panelTab={panelTab}
          onPanelTabChange={setPanelTab}
          panelSize={panelSize}
          onTogglePanelSize={togglePanelSize}
          onClose={() => setShowPanel(false)}
          status={status}
          activeGoal={activeGoal}
          agentStates={agentStates}
          subgoals={subgoals}
          events={events}
          report={report}
          findings={findings}
          durationMs={durationMs}
          confidence={confidence}
          fromCache={fromCache}
          onSaveAsBlueprint={handleSaveAsBlueprint}
          resolveAgentState={resolveAgentState}
          graphTabContent={
            <GraphVisualization
              {...sharedGraphProps}
              width={inlineGraphWidth}
              height={inlineGraphHeight}
              showDetachedWindow={false}
            />
          }
        />
      </div>

      {(isResearchActive || showGraphWindow) && (
        <GraphVisualization
          {...sharedGraphProps}
          width={0}
          height={0}
          renderInline={false}
          showDetachedWindow={showGraphWindow}
        />
      )}
    </div>
  );
}
