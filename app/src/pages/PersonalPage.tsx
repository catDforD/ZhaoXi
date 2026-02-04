import { useState } from 'react';
import { User, Plus, Wallet, Calendar, MapPin, FileText, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { useAppStore } from '@/stores/appStore';

export function PersonalPage() {
  const { personalTasks, addPersonalTask, deletePersonalTask, balance } = useAppStore();
  const [newTask, setNewTask] = useState({
    title: '',
    budget: '',
    date: '',
    location: '',
    note: '',
  });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      addPersonalTask({
        title: newTask.title.trim(),
        budget: newTask.budget ? parseFloat(newTask.budget) : undefined,
        date: newTask.date || undefined,
        location: newTask.location || undefined,
        note: newTask.note || undefined,
      });
      setNewTask({ title: '', budget: '', date: '', location: '', note: '' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">个人事务</h2>
            <p className="text-sm text-white/50">记录你的个人清单与备忘</p>
          </div>
        </div>

        {/* Balance Card */}
        <GlassCard className="px-5 py-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-xs text-white/50">当前余额</div>
            <div className="text-xl font-bold text-white">
              ¥ {balance.toFixed(2)}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Task List Card */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-yellow-400 rounded-full" />
            <span className="text-lg font-semibold text-white">事务清单</span>
          </div>
          <span className="text-sm text-white/50">
            {personalTasks.length} 项内容
          </span>
        </div>

        {/* Add Task Form */}
        <div className="mb-5 space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="添加新事务 (必填)..."
              className="flex-1 glass-input text-white text-sm"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                ¥
              </span>
              <input
                type="number"
                value={newTask.budget}
                onChange={(e) => setNewTask({ ...newTask, budget: e.target.value })}
                placeholder="预算"
                className="w-28 glass-input text-white text-sm pl-7"
              />
            </div>
            <button
              onClick={handleAddTask}
              className="w-12 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="date"
                value={newTask.date}
                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                className="w-full glass-input text-white text-sm pl-10"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={newTask.location}
                onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                placeholder="地点"
                className="w-full glass-input text-white text-sm pl-10"
              />
            </div>
            <div className="flex-1 relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={newTask.note}
                onChange={(e) => setNewTask({ ...newTask, note: e.target.value })}
                placeholder="备注"
                className="w-full glass-input text-white text-sm pl-10"
              />
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {personalTasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="flex-1">
                <span className="text-sm text-white">{task.title}</span>
                {(task.date || task.location) && (
                  <div className="flex gap-2 mt-1">
                    {task.date && (
                      <span className="text-xs text-white/40">{task.date}</span>
                    )}
                    {task.location && (
                      <span className="text-xs text-white/40">{task.location}</span>
                    )}
                  </div>
                )}
              </div>
              {task.budget !== undefined && task.budget > 0 && (
                <span className="text-sm text-green-400">
                  ¥{task.budget}
                </span>
              )}
              <button
                onClick={() => deletePersonalTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>

        {personalTasks.length === 0 && (
          <div className="text-center py-8 text-white/40">
            暂无事务，添加一个吧！
          </div>
        )}
      </GlassCard>
    </div>
  );
}
