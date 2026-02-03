import { useAppStore } from '@/stores/appStore';
import { GlassCard } from '@/components/layout/GlassCard';
import { StatCard } from '@/components/features/StatCard';
import { TodoItem } from '@/components/features/TodoItem';
import { HotList } from '@/components/features/HotList';
import { 
  Target, 
  User, 
  Cloud, 
  Calendar,
  CheckSquare
} from 'lucide-react';
import { format, addDays, getDay } from 'date-fns';
import { cn } from '@/lib/utils';

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function Dashboard() {
  const { todos, toggleTodo, events, weather, projects, personalTasks, setCurrentPage } = useAppStore();

  const incompleteTodos = todos.filter((t) => !t.completed).slice(0, 3);

  // Generate next 7 days for schedule
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date,
      dayName: weekDays[getDay(date)],
      dayNum: format(date, 'd'),
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <button onClick={() => setCurrentPage('todos')} className="text-left">
          <StatCard
            icon={<CheckSquare className="w-6 h-6 text-red-400" />}
            value={todos.filter((t) => !t.completed).length}
            label="待办事项"
            iconBgColor="bg-red-500/20"
          />
        </button>
        <button onClick={() => setCurrentPage('projects')} className="text-left">
          <StatCard
            icon={<Target className="w-6 h-6 text-green-400" />}
            value={projects.filter((p) => p.status === 'active').length}
            label="长期任务"
            iconBgColor="bg-green-500/20"
          />
        </button>
        <button onClick={() => setCurrentPage('personal')} className="text-left">
          <StatCard
            icon={<User className="w-6 h-6 text-yellow-400" />}
            value={personalTasks.length}
            label="个人事务"
            iconBgColor="bg-yellow-500/20"
          />
        </button>
        <GlassCard className="p-5" hover>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Cloud className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {weather ? `${weather.temperature}°C` : 'Loading...'}
              </div>
              <div className="text-sm text-white/50">今日天气</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Todo List */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-red-400" />
              <span className="text-lg font-semibold text-white">待办事项</span>
            </div>
            <button className="text-sm text-white/50 hover:text-white/70 transition-colors">
              全部
            </button>
          </div>

          <div className="space-y-1">
            {incompleteTodos.length > 0 ? (
              incompleteTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => toggleTodo(todo.id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-white/40">
                暂无待办事项
              </div>
            )}
          </div>
        </GlassCard>

        {/* Future Schedule */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold text-white">未来日程</span>
            </div>
            <button
              onClick={() => setCurrentPage('schedule')}
              className="text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              日历
            </button>
          </div>

          <div className="space-y-2">
            {nextDays.map((day, index) => {
              const dateStr = format(day.date, 'yyyy-MM-dd');
              const dayEvents = events.filter((e) => e.date === dateStr);

              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                    index === 0 && 'bg-white/5'
                  )}
                >
                  <div className="text-center min-w-[40px]">
                    <div className="text-xs text-white/50">{day.dayName}</div>
                    <div
                      className={cn(
                        'text-lg font-semibold',
                        index === 0 ? 'text-blue-400' : 'text-white'
                      )}
                    >
                      {day.dayNum}
                    </div>
                  </div>
                  <div className="flex-1">
                    {dayEvents.length > 0 ? (
                      <span className="text-sm text-white/70">
                        {dayEvents.length} 个事件
                      </span>
                    ) : (
                      <span className="text-sm text-white/30">无安排</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Hot List */}
        <HotList />
      </div>
    </div>
  );
}
