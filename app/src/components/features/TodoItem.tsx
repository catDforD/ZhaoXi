import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
}

export function TodoItem({ todo, onToggle }: TodoItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
        'hover:bg-white/5'
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200',
          todo.completed
            ? 'bg-green-500 border-green-500'
            : 'border-white/30 hover:border-white/50'
        )}
      >
        {todo.completed && <Check className="w-3 h-3 text-white" />}
      </button>
      <span
        className={cn(
          'flex-1 text-sm transition-all duration-200',
          todo.completed ? 'text-white/40 line-through' : 'text-white'
        )}
      >
        {todo.title}
      </span>
      {todo.priority === 'urgent' && !todo.completed && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/30 text-red-400">
          紧急
        </span>
      )}
    </div>
  );
}
