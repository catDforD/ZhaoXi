import { useState } from 'react';
import { CheckSquare, Plus, RotateCcw } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { TodoItem } from '@/components/features/TodoItem';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

export function TodoPage() {
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodoTitle } = useAppStore();
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  const handleAddTodo = () => {
    if (newTodo.trim()) {
      addTodo(newTodo.trim(), priority);
      setNewTodo('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.nativeEvent as KeyboardEvent).isComposing) {
      return;
    }
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  return (
    <div className="p-6">
      <GlassCard className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-semibold text-white">待办事项清单</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50">
              {completedCount} / {totalCount} 完成
            </span>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <RotateCcw className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加一个新的待办任务 (回车)..."
            className="flex-1 glass-input text-white text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setPriority('normal')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                priority === 'normal'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              一般
            </button>
            <button
              onClick={() => setPriority('urgent')}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                priority === 'urgent'
                  ? 'bg-red-500/30 text-red-400'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              )}
            >
              紧急
            </button>
          </div>
          <button
            onClick={handleAddTodo}
            className="w-12 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Todo List */}
        <div className="space-y-1">
          {todos.length > 0 ? (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <TodoItem todo={todo} onToggle={() => toggleTodo(todo.id)} onEdit={(title) => updateTodoTitle(todo.id, title)} />
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <span className="text-red-400 text-xs">删除</span>
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-white/40">
              暂无待办事项，添加一个吧！
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="mt-6 text-center text-xs text-white/30">
          双击任务文字可进行编辑
        </div>
      </GlassCard>
    </div>
  );
}
