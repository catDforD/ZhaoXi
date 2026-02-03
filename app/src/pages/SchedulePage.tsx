import { useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { CalendarGrid } from '@/components/features/CalendarGrid';
import { useAppStore } from '@/stores/appStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const colorOptions = [
  { id: 'blue', color: 'bg-blue-500', label: '蓝色' },
  { id: 'orange', color: 'bg-orange-500', label: '橙色' },
  { id: 'green', color: 'bg-green-500', label: '绿色' },
  { id: 'teal', color: 'bg-teal-500', label: '青色' },
  { id: 'red', color: 'bg-red-500', label: '红色' },
];

export function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { events, addEvent, deleteEvent } = useAppStore();
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventColor, setNewEventColor] = useState<'blue' | 'orange' | 'green' | 'teal' | 'red'>('blue');
  const [newEventNote, setNewEventNote] = useState('');

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayEvents = events.filter((e) => e.date === selectedDateStr);

  const handleAddEvent = () => {
    if (newEventTitle.trim()) {
      addEvent({
        title: newEventTitle.trim(),
        date: selectedDateStr,
        color: newEventColor,
        note: newEventNote || undefined,
      });
      setNewEventTitle('');
      setNewEventNote('');
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-6">
        {/* Left Panel - Event Form */}
        <div className="col-span-2 space-y-4">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold text-white">日程管理</span>
            </div>

            {/* Selected Date */}
            <div className="mb-5 p-4 rounded-xl bg-white/5">
              <div className="text-sm text-white/50 mb-1">当前选中</div>
              <div className="text-xl font-semibold text-white">
                {format(selectedDate, 'yyyy年M月d日', { locale: zhCN })}
              </div>
            </div>

            {/* Add Event Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-2">新建事件</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="输入事项标题..."
                  className="w-full glass-input text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">颜色标记</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setNewEventColor(color.id as any)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        color.color,
                        newEventColor === color.id
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent'
                          : 'opacity-60 hover:opacity-100'
                      )}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">备注详情</label>
                <textarea
                  value={newEventNote}
                  onChange={(e) => setNewEventNote(e.target.value)}
                  placeholder="添加描述..."
                  rows={3}
                  className="w-full glass-input text-white text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加事件
              </button>
            </div>
          </GlassCard>

          {/* Day's Events */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-white/50">
                当日列表 ({dayEvents.length})
              </span>
              <span className="text-xs text-white/30">SCROLL FOR MORE</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dayEvents.length > 0 ? (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 group"
                  >
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        event.color === 'blue' && 'bg-blue-400',
                        event.color === 'orange' && 'bg-orange-400',
                        event.color === 'green' && 'bg-green-400',
                        event.color === 'teal' && 'bg-teal-400',
                        event.color === 'red' && 'bg-red-400'
                      )}
                    />
                    <div className="flex-1">
                      <div className="text-sm text-white">{event.title}</div>
                      {event.note && (
                        <div className="text-xs text-white/40">{event.note}</div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-white/40">
                  暂无安排
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Panel - Calendar */}
        <div className="col-span-3">
          <CalendarGrid
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>
    </div>
  );
}
