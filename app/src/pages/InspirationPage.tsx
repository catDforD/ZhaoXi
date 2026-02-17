import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Archive, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InspirationPage() {
  const {
    inspirations,
    isLoadingInspirations,
    fetchInspirations,
    addInspiration,
    toggleInspirationArchived,
    deleteInspiration,
  } = useAppStore();
  const [content, setContent] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeItems = useMemo(
    () => inspirations.filter((item) => !item.isArchived),
    [inspirations]
  );
  const archivedItems = useMemo(
    () => inspirations.filter((item) => item.isArchived),
    [inspirations]
  );

  useEffect(() => {
    void fetchInspirations(true);
  }, [fetchInspirations]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await addInspiration(trimmed);
    setContent('');
    inputRef.current?.focus();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条灵感吗？')) {
      return;
    }
    await deleteInspiration(id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-yellow-300" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">灵感记录</h2>
          <p className="text-sm text-white/50">随手记下想法，避免转瞬即忘</p>
        </div>
      </div>

      <GlassCard className="p-4 space-y-3">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入灵感，按 Enter 立即保存（Shift + Enter 换行）"
          className="w-full min-h-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 resize-none"
          autoFocus
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">{content.trim().length} 字</span>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!content.trim()}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
          >
            <Plus className="w-4 h-4 mr-1" />
            记录灵感
          </Button>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          未归档 ({activeItems.length})
        </h3>

        {isLoadingInspirations ? (
          <GlassCard className="p-6 text-center text-sm text-white/50">加载中...</GlassCard>
        ) : activeItems.length === 0 ? (
          <GlassCard className="p-6 text-center text-sm text-white/50">
            还没有灵感，先记录第一条吧。
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => (
              <GlassCard key={item.id} className="p-4 space-y-3" hover>
                <p className="text-sm text-white whitespace-pre-wrap break-words">{item.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{formatTime(item.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void toggleInspirationArchived(item.id, true)}
                      className="h-8 border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                    >
                      <Archive className="w-3.5 h-3.5 mr-1" />
                      归档
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleDelete(item.id)}
                      className="h-8 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowArchived((prev) => !prev)}
          className={cn(
            'text-sm text-white/70 hover:text-white transition-colors',
            showArchived && 'text-white'
          )}
        >
          {showArchived ? '收起已归档' : `展开已归档 (${archivedItems.length})`}
        </button>

        {showArchived && (
          archivedItems.length === 0 ? (
            <GlassCard className="p-4 text-center text-sm text-white/50">暂无已归档灵感</GlassCard>
          ) : (
            <div className="space-y-3">
              {archivedItems.map((item) => (
                <GlassCard key={item.id} className="p-4 space-y-3 opacity-80" hover>
                  <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{item.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{formatTime(item.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void toggleInspirationArchived(item.id, false)}
                        className="h-8 border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                      >
                        取消归档
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleDelete(item.id)}
                        className="h-8 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
