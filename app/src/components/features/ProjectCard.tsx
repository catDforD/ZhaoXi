import { Trash2, Calendar } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  onDelete: () => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <GlassCard className="p-5 relative group">
      <button
        onClick={onDelete}
        className="absolute top-4 right-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        <Trash2 className="w-4 h-4 text-white/50" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/30 text-blue-400">
          进行中
        </span>
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>

      <div className="flex items-center gap-2 text-sm text-white/50 mb-4">
        <Calendar className="w-4 h-4" />
        <span>截止: {project.deadline}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">进度</span>
          <span className="text-white font-medium">{project.progress}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-800 bg-gradient-to-r from-blue-500 to-blue-400"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/30">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </GlassCard>
  );
}
