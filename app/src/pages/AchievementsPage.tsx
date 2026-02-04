import { useState } from 'react';
import { Trophy, Download, Settings, CheckSquare, Target, Flame, Calendar, Wallet, FileText } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { StatCard } from '@/components/features/StatCard';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

type TimeFilter = 'today' | 'week' | 'month' | 'all' | 'custom';

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'all', label: '全部' },
  { id: 'custom', label: '自定义' },
];

export function AchievementsPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('week');
  const { todos, projects, wishlist, balance, getStatistics } = useAppStore();
  const stats = getStatistics();

  const completedTodos = todos.filter((t) => t.completed);
  const activeProjects = projects.filter((p) => p.status === 'active');

  // Calculate wishlist totals
  const totalWishlistAmount = wishlist.reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = Math.max(0, totalWishlistAmount - balance);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">我的成就</h2>
            <p className="text-sm text-white/50">汇总你的个人成长与数据</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors">
            <Download className="w-4 h-4" />
            导出
          </button>
          <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <Settings className="w-4 h-4 text-white/70" />
          </button>

          {/* Time Filters */}
          <div className="flex gap-1 ml-4">
            {timeFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm transition-all',
                  activeFilter === filter.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<CheckSquare className="w-6 h-6 text-green-400" />}
          value={stats.completedTasks}
          label="任务完成数"
          iconBgColor="bg-green-500/20"
        />
        <StatCard
          icon={<Target className="w-6 h-6 text-blue-400" />}
          value={`${stats.averageProgress}%`}
          label="平均项目进度"
          iconBgColor="bg-blue-500/20"
        />
        <StatCard
          icon={<Flame className="w-6 h-6 text-orange-400" />}
          value={`${stats.habitChallenges} / 4`}
          label="习惯与挑战"
          iconBgColor="bg-orange-500/20"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6 text-purple-400" />}
          value={stats.scheduleEvents}
          label="日程事件"
          iconBgColor="bg-purple-500/20"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Todo & Projects */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-400" />
                <span className="text-lg font-semibold text-white">待办与项目</span>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10">
                  <FileText className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Active Projects */}
              <div>
                <div className="text-sm text-white/50 mb-2">进行中的项目</div>
                <div className="space-y-2">
                  {activeProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                    >
                      <span className="text-sm text-white">{project.title}</span>
                      <span className="text-sm text-blue-400">{project.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Todos */}
              <div>
                <div className="text-sm text-white/50 mb-2">已完成待办 (按时间排序)</div>
                {completedTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 p-2 text-sm text-white/70"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {todo.title}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Schedule Review */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-semibold text-white">日程回顾</span>
              </div>
            </div>
            <div className="text-center py-8 text-white/40">
              无日程记录
            </div>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Journal Records */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-lg font-semibold text-white">生活手账记录</span>
              </div>
            </div>
            <div className="text-center py-8 text-white/40">
              暂无记录
            </div>
          </GlassCard>

          {/* Finance Overview */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-yellow-400" />
                <span className="text-lg font-semibold text-white">财务概览</span>
              </div>
            </div>

            {/* Balance */}
            <div className="p-4 rounded-xl bg-white/5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/50 mb-1">当前余额</div>
                  <div className="text-3xl font-bold text-white">
                    ¥{balance}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Wishlist */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/70">愿望清单</span>
                </div>
                <span className="text-sm text-white/50">{wishlist.length} 项</span>
              </div>

              <div className="space-y-2">
                {wishlist.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <span className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-xs text-white font-bold">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-sm text-green-400">
                      ¥{item.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">总计需要</span>
                  <span className="text-yellow-400 font-medium">
                    ¥{totalWishlistAmount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">还需存款</span>
                  <span className="text-yellow-400 font-medium">
                    ¥{remainingAmount}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
