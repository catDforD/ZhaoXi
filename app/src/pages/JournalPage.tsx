import { useState } from 'react';
import { Flame, Check } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { MoodSelector } from '@/components/features/MoodSelector';
import { WeatherCard } from '@/components/features/WeatherCard';
import { useAppStore } from '@/stores/appStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

export function JournalPage() {
  const { dailyChallenges, toggleChallenge } = useAppStore();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Get today's challenges
  const todayChallenges = dailyChallenges.find((dc) => dc.date === todayStr)?.items || [
    { id: '1', title: '深呼吸练习', completed: false },
    { id: '2', title: '23:00前入睡', completed: false },
  ];

  // Mini calendar
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);
  const emptyDays = startDay === 0 ? 6 : startDay - 1;

  // Weekly check-in
  const [checkIns, setCheckIns] = useState<boolean[]>([false, false, false, false, false, false, false]);

  const toggleCheckIn = (index: number) => {
    setCheckIns((prev) => {
      const newCheckIns = [...prev];
      newCheckIns[index] = !newCheckIns[index];
      return newCheckIns;
    });
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Mini Calendar */}
          <GlassCard className="p-5">
            <div className="text-center mb-4">
              <span className="text-sm text-white/70">
                {format(today, 'M月 yyyy', { locale: zhCN })}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs text-white/40 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array(emptyDays).fill(null).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'aspect-square flex items-center justify-center text-sm rounded-lg',
                      isToday
                        ? 'bg-red-500 text-white font-medium'
                        : 'text-white/60'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Daily Challenges */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-white">
                挑战 ({todayStr})
              </span>
            </div>
            <div className="space-y-2">
              {todayChallenges.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => toggleChallenge(todayStr, challenge.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      challenge.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/30'
                    )}
                  >
                    {challenge.completed && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      challenge.completed ? 'text-white/40 line-through' : 'text-white'
                    )}
                  >
                    {challenge.title}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Middle Column - Timeline */}
        <div className="space-y-4">
          <GlassCard className="p-5 h-full">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-blue-400 rounded-full" />
              <span className="text-lg font-semibold text-white">时间轴</span>
            </div>

            <div className="space-y-4">
              {Array.from({ length: 12 }, (_, i) => {
                const hour = 7 + i;
                return (
                  <div key={hour} className="flex gap-4">
                    <div className="w-12 text-right text-sm text-white/50">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute left-0 top-2 w-full h-px bg-white/10" />
                      <input
                        type="text"
                        placeholder="type..."
                        className="w-full bg-transparent text-sm text-white/70 placeholder:text-white/20 outline-none py-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Mood Selector */}
          <MoodSelector />

          {/* Weather */}
          <WeatherCard />

          {/* Weekly Check-in */}
          <GlassCard className="p-5">
            <div className="text-sm text-white/50 mb-4">本周打卡</div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleCheckIn(index)}
                  className={cn(
                    'aspect-square rounded-xl flex items-center justify-center transition-all',
                    checkIns[index]
                      ? 'bg-green-500/30 border border-green-500/50'
                      : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  {checkIns[index] && <Check className="w-4 h-4 text-green-400" />}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs text-white/40">
                  {day}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
