import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import apiClient from '../shared/api-client';

function deriveSlug(name) {
  return `${name || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export default function TeamProjects() {
  const { org } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const canUseProjects = org?.plan === 'enterprise';
  const suggestedSlug = useMemo(() => deriveSlug(form.slug || form.name), [form.slug, form.name]);

  const loadProjects = useCallback(async () => {
    if (!org?.id || !canUseProjects) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.listProjects(org.id);
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [org?.id, canUseProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '' });
    setEditingProjectId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!org?.id || !form.name.trim()) return;

    setSubmitting(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      slug: suggestedSlug,
      description: form.description.trim(),
    };

    try {
      if (editingProjectId) {
        await apiClient.updateProject(org.id, editingProjectId, payload);
      } else {
        await apiClient.createProject(org.id, payload);
      }
      resetForm();
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!org?.id) return;
    try {
      await apiClient.deleteProject(org.id, projectId);
      if (editingProjectId === projectId) resetForm();
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const startEdit = (project) => {
    setEditingProjectId(project.id);
    setForm({
      name: project.name || '',
      slug: project.slug || '',
      description: project.description || '',
    });
  };

  if (!canUseProjects) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <p className="text-[#0a0a0a] font-semibold font-['Space_Grotesk'] mb-2">Enterprise workspace required</p>
          <p className="text-sm text-[#525252]">Projects are available only on enterprise orgs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-[#117dff]/10 border border-[#117dff]/20 flex items-center justify-center">
              <FolderKanban size={20} className="text-[#117dff]" />
            </div>
            <div>
              <h2 className="text-[#0a0a0a] text-xl font-semibold font-['Space_Grotesk']">Team projects</h2>
              <p className="text-sm text-[#525252]">Create shared project buckets for enterprise memory, graph filtering, and connector routing.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">Project name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. CSI-ARC"
                className="w-full rounded-[8px] border border-[#e3e0db] px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
              />
            </div>

            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="Auto-generated from name"
                className="w-full rounded-[8px] border border-[#e3e0db] px-4 py-3 text-sm font-mono text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40"
              />
              <p className="mt-2 text-[11px] font-mono text-[#a3a3a3]">Effective slug: {suggestedSlug || 'project-slug'}</p>
            </div>

            <div>
              <label className="block text-[#525252] text-xs font-mono mb-2 uppercase tracking-wider">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="What this project is for, which team owns it, and how memories should land here."
                rows={4}
                className="w-full rounded-[8px] border border-[#e3e0db] px-4 py-3 text-sm text-[#0a0a0a] focus:outline-none focus:border-[#117dff]/40 resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !form.name.trim()}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#117dff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e6fe0] disabled:opacity-50"
              >
                {editingProjectId ? <Save size={16} /> : <Plus size={16} />}
                {editingProjectId ? 'Update project' : 'Create project'}
              </button>
              {editingProjectId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-[8px] border border-[#e3e0db] px-4 py-2.5 text-sm font-semibold text-[#525252]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e3e0db] bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[#0a0a0a] font-semibold font-['Space_Grotesk']">Existing projects</h2>
              <p className="text-sm text-[#525252]">These are the canonical project records for this enterprise org.</p>
            </div>
            <button
              type="button"
              onClick={loadProjects}
              className="inline-flex items-center gap-2 rounded-[8px] border border-[#e3e0db] px-3 py-2 text-xs font-semibold text-[#525252]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-[#525252]">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-[#525252]">No projects yet. Create the first shared project from the form.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="rounded-xl border border-[#ece8de] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-[#0a0a0a]">{project.name}</p>
                        <span className="rounded-full border border-[#d8e6ff] bg-[#117dff]/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.08em] text-[#117dff]">
                          {project.slug}
                        </span>
                      </div>
                      <p className="text-sm text-[#525252]">{project.description || 'No description yet.'}</p>
                      <p className="mt-2 text-[11px] font-mono text-[#a3a3a3]">
                        Updated {new Date(project.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(project)}
                        className="rounded-[8px] border border-[#e3e0db] px-3 py-2 text-xs font-semibold text-[#525252]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-[#f8d7da] px-3 py-2 text-xs font-semibold text-[#b91c1c]"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {error && (
        <div className="rounded-xl border border-[#f8d7da] bg-[#fff5f5] px-4 py-3 text-xs font-mono text-[#b91c1c]">
          {error}
        </div>
      )}
    </div>
  );
}
