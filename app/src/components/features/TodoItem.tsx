import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Todo } from '@/types';

interface TodoItemProps {
  todo: Todo;
  onToggle: () => void;
  onEdit?: (newTitle: string) => void;
}

export function TodoItem({ todo, onToggle, onEdit }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);

  const handleDoubleClick = () => {
    if (todo.completed) return;
    setIsEditing(true);
    setEditTitle(todo.title);
  };

  const handleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== todo.title) {
      onEdit?.(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(todo.title);
      setIsEditing(false);
    }
  };

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
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 text-sm bg-white/10 text-white px-2 py-1 rounded outline-none border border-white/20"
        />
      ) : (
        <span
          onDoubleClick={handleDoubleClick}
          className={cn(
            'flex-1 text-sm transition-all duration-200 cursor-pointer',
            todo.completed ? 'text-white/40 line-through' : 'text-white'
          )}
        >
          {todo.title}
        </span>
      )}
      {todo.priority === 'urgent' && !todo.completed && (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/30 text-red-400">
          紧急
        </span>
      )}
    </div>
  );
}
