import { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { ProjectCard } from '@/components/features/ProjectCard';
import { useAppStore } from '@/stores/appStore';

export function ProjectsPage() {
  const { projects, addProject, deleteProject } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');

  const handleAddProject = () => {
    if (newProjectTitle.trim() && newProjectDeadline) {
      addProject(newProjectTitle.trim(), newProjectDeadline);
      setNewProjectTitle('');
      setNewProjectDeadline('');
      setShowForm(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">长期事项</h2>
            <p className="text-sm text-white/50">规划和追踪你的长期目标</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建项目
        </button>
      </div>

      {/* Add Project Form */}
      {showForm && (
        <GlassCard className="p-5 animate-fade-in">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-2">项目名称</label>
              <input
                type="text"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                placeholder="输入项目名称..."
                className="w-full glass-input text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-2">截止日期</label>
              <input
                type="date"
                value={newProjectDeadline}
                onChange={(e) => setNewProjectDeadline(e.target.value)}
                className="w-full glass-input text-white text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddProject}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
              >
                添加项目
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-2 gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={() => deleteProject(project.id)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <GlassCard className="p-12 text-center">
          <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50">暂无长期项目，创建一个开始规划吧！</p>
        </GlassCard>
      )}
    </div>
  );
}
