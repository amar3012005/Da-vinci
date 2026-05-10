import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Plus, Check, Folder } from 'lucide-react';
import { useTeamContext } from '../shared/team-context';
import apiClient from '../shared/api-client';

export default function TeamSwitcher() {
  const {
    teams,
    projects,
    activeTeam,
    activeProject,
    activeTeamId,
    activeProjectId,
    setActiveTeamId,
    setActiveProjectId,
    refresh,
  } = useTeamContext();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    function onClickAway(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setErr(null);
    try {
      const resp = await apiClient.createTeam({ name: newName.trim() });
      setNewName('');
      setCreating(false);
      await refresh();
      if (resp?.team?.id) setActiveTeamId(resp.team.id);
    } catch (e2) {
      setErr(e2.response?.data?.error || e2.message);
    }
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-3 rounded-[6px] bg-white border border-[#e3e0db] hover:border-[#d4d0ca] text-[#0a0a0a] text-xs font-medium transition-colors"
      >
        <Users size={13} className="text-[#525252]" />
        <span className="max-w-[140px] truncate">
          {activeTeam ? activeTeam.name : 'Select team'}
        </span>
        {activeProject && (
          <>
            <span className="text-[#a3a3a3]">/</span>
            <span className="max-w-[120px] truncate text-[#525252]">
              {activeProject.name}
            </span>
          </>
        )}
        <ChevronDown size={12} className="text-[#a3a3a3]" />
      </button>

      {open && (
        <div className="absolute top-10 left-0 w-[280px] bg-white border border-[#e3e0db] rounded-[8px] shadow-lg z-50 overflow-hidden">
          {/* Teams section */}
          <div className="px-3 py-2 border-b border-[#eae7e1] bg-[#faf9f4]">
            <div className="text-[10px] uppercase tracking-wide text-[#a3a3a3] font-semibold">
              Teams
            </div>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {teams.length === 0 && (
              <div className="px-3 py-3 text-xs text-[#a3a3a3]">No teams yet</div>
            )}
            {teams.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTeamId(t.id);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f3f1ec] transition-colors text-xs"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Users size={12} className="text-[#525252] flex-shrink-0" />
                  <span className="truncate">{t.name}</span>
                  {(t.isDefault || t.is_default) && (
                    <span className="text-[9px] uppercase text-[#a3a3a3]">default</span>
                  )}
                </span>
                {t.id === activeTeamId && <Check size={12} className="text-[#16a34a]" />}
              </button>
            ))}
          </div>

          {/* Create team */}
          <div className="border-t border-[#eae7e1]">
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#117dff] hover:bg-[#f3f1ec] transition-colors"
              >
                <Plus size={12} />
                Create team
              </button>
            ) : (
              <form onSubmit={handleCreateTeam} className="p-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Team name"
                  className="flex-1 h-7 px-2 text-xs border border-[#e3e0db] rounded-[4px] focus:outline-none focus:border-[#117dff]"
                />
                <button
                  type="submit"
                  className="h-7 px-2 text-xs bg-[#117dff] text-white rounded-[4px] hover:bg-[#0066e0]"
                >
                  Add
                </button>
              </form>
            )}
            {err && <div className="px-3 pb-2 text-[10px] text-[#dc2626]">{err}</div>}
          </div>

          {/* Projects section */}
          {activeTeam && (
            <>
              <div className="px-3 py-2 border-y border-[#eae7e1] bg-[#faf9f4]">
                <div className="text-[10px] uppercase tracking-wide text-[#a3a3a3] font-semibold">
                  Projects in {activeTeam.name}
                </div>
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                <button
                  onClick={() => setActiveProjectId(null)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f3f1ec] transition-colors text-xs"
                >
                  <span className="flex items-center gap-2 text-[#525252]">
                    <span className="text-[10px] uppercase tracking-wide">All</span>
                  </span>
                  {!activeProjectId && <Check size={12} className="text-[#16a34a]" />}
                </button>
                {projects.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#a3a3a3]">No projects in this team</div>
                )}
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f3f1ec] transition-colors text-xs"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Folder size={12} className="text-[#525252] flex-shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </span>
                    {p.id === activeProjectId && <Check size={12} className="text-[#16a34a]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
