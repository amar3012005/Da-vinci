import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import apiClient from './api-client';

// Persisted selection — survives reloads
const STORAGE_TEAM = 'hivemind_active_team_id';
const STORAGE_PROJECT = 'hivemind_active_project_id';

const TeamContext = createContext({
  teams: [],
  projects: [],
  activeTeamId: null,
  activeProjectId: null,
  activeTeam: null,
  activeProject: null,
  loading: false,
  error: null,
  setActiveTeamId: () => {},
  setActiveProjectId: () => {},
  refresh: () => {},
});

export function TeamProvider({ children }) {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeTeamId, _setActiveTeamId] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_TEAM) || null;
  });
  const [activeProjectId, _setActiveProjectId] = useState(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_PROJECT) || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setActiveTeamId = useCallback((id) => {
    _setActiveTeamId(id);
    _setActiveProjectId(null); // reset project when team changes
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(STORAGE_TEAM, id);
      else window.localStorage.removeItem(STORAGE_TEAM);
      window.localStorage.removeItem(STORAGE_PROJECT);
    }
  }, []);

  const setActiveProjectId = useCallback((id) => {
    _setActiveProjectId(id);
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(STORAGE_PROJECT, id);
      else window.localStorage.removeItem(STORAGE_PROJECT);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsResp, projectsResp] = await Promise.all([
        apiClient.listTeams().catch(err => {
          // 404/401 means user not in any team yet; treat as empty
          if (err.response?.status === 401) throw err;
          return { teams: [] };
        }),
        apiClient.listAccessibleProjects().catch(err => {
          if (err.response?.status === 401) throw err;
          return { projects: [] };
        }),
      ]);
      const t = teamsResp.teams || [];
      const p = projectsResp.projects || [];
      setTeams(t);
      setProjects(p);

      // Auto-select default team if none selected
      if (!activeTeamId && t.length > 0) {
        const def = t.find(x => x.isDefault || x.is_default) || t[0];
        setActiveTeamId(def.id);
      } else if (activeTeamId && !t.find(x => x.id === activeTeamId)) {
        // Stored team no longer accessible
        setActiveTeamId(t[0]?.id || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, setActiveTeamId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTeam = useMemo(
    () => teams.find(t => t.id === activeTeamId) || null,
    [teams, activeTeamId]
  );
  const teamProjects = useMemo(
    () => projects.filter(p => !activeTeamId || p.teamId === activeTeamId || p.team_id === activeTeamId),
    [projects, activeTeamId]
  );
  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const value = useMemo(() => ({
    teams,
    projects: teamProjects,
    allProjects: projects,
    activeTeamId,
    activeProjectId,
    activeTeam,
    activeProject,
    loading,
    error,
    setActiveTeamId,
    setActiveProjectId,
    refresh,
  }), [teams, teamProjects, projects, activeTeamId, activeProjectId, activeTeam, activeProject, loading, error, setActiveTeamId, setActiveProjectId, refresh]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeamContext() {
  return useContext(TeamContext);
}
