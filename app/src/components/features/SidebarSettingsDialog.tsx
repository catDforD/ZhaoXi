import { useState, useRef, useCallback } from 'react';
import {
  LayoutGrid,
  CheckSquare,
  Target,
  User,
  Calendar,
  Heart,
  Trophy,
  Grid3X3,
  Bot,
  GripVertical,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  Smartphone,
  LayoutTemplate,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/features/DynamicIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SidebarItem } from '@/types';

// 内置页面定义
interface BuiltinPageDef {
  id: string;
  label: string;
  icon: React.ElementType;
}

const BUILTIN_PAGES: BuiltinPageDef[] = [
  { id: 'dashboard', label: '我的主页', icon: LayoutGrid },
  { id: 'todos', label: '待办事项', icon: CheckSquare },
  { id: 'projects', label: '长期事项', icon: Target },
  { id: 'personal', label: '个人事务', icon: User },
  { id: 'schedule', label: '日程管理', icon: Calendar },
  { id: 'journal', label: '生活手账', icon: Heart },
  { id: 'achievements', label: '我的成就', icon: Trophy },
  { id: 'apps', label: '应用中心', icon: Grid3X3 },
  { id: 'agent', label: '工作台 Agent', icon: Bot },
];

interface SidebarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SidebarSettingsDialog({
  open,
  onOpenChange,
}: SidebarSettingsDialogProps) {
  const {
    sidebarItems,
    userApps,
    toggleSidebarItem,
    reorderSidebarItems,
    addSidebarItem,
    removeSidebarItem,
  } = useAppStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取内置页面定义
  const getBuiltinPage = (id: string): BuiltinPageDef | undefined => {
    return BUILTIN_PAGES.find((p) => p.id === id);
  };

  // 获取用户应用
  const getUserApp = (id: string) => {
    return userApps.find((a) => a.id === id);
  };

  // 检查项目是否在侧边栏中
  const isInSidebar = (id: string) => {
    return sidebarItems.some((item) => item.id === id);
  };

  // 使用鼠标事件实现拖拽排序
  const handleMouseDown = useCallback((itemId: string) => {
    setDraggingId(itemId);
  }, []);

  const handleMouseEnter = useCallback((targetId: string) => {
    if (draggingId && draggingId !== targetId) {
      setDragOverId(targetId);

      // 立即执行排序
      const enabledItems = sidebarItems.filter((item) => item.enabled);
      const draggedIndex = enabledItems.findIndex((i) => i.id === draggingId);
      const targetIndex = enabledItems.findIndex((i) => i.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // 重新排序
      const newEnabledItems = [...enabledItems];
      const [removed] = newEnabledItems.splice(draggedIndex, 1);
      newEnabledItems.splice(targetIndex, 0, removed);

      // 更新 order
      const updatedItems = newEnabledItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      // 合并回所有项目（包括禁用的）
      const disabledItems = sidebarItems.filter((item) => !item.enabled);
      reorderSidebarItems([...updatedItems, ...disabledItems]);
    }
  }, [draggingId, sidebarItems, reorderSidebarItems]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
    setDragOverId(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  // 渲染排序项
  const renderSortableItem = (item: SidebarItem) => {
    const isDragging = draggingId === item.id;
    const isDragOver = dragOverId === item.id;

    if (item.type === 'builtin') {
      const page = getBuiltinPage(item.id);
      if (!page) return null;
      const Icon = page.icon;

      return (
        <div
          key={item.id}
          onMouseEnter={() => handleMouseEnter(item.id)}
          onMouseUp={handleMouseUp}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-all select-none',
            isDragging && 'opacity-60 bg-white/10',
            isDragOver && 'bg-white/5 border border-dashed border-white/30',
            !isDragging && !isDragOver && 'hover:bg-white/5'
          )}
        >
          <div
            className="cursor-grab active:cursor-grabbing p-1 -m-1"
            onMouseDown={() => handleMouseDown(item.id)}
            onMouseLeave={handleMouseLeave}
          >
            <GripVertical className="w-4 h-4 text-white/30" />
          </div>
          <Icon className="w-5 h-5 text-white/70" />
          <span className="flex-1 text-sm text-white">{page.label}</span>
          <button
            onClick={() => toggleSidebarItem(item.id)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            title={item.enabled ? '隐藏' : '显示'}
          >
            {item.enabled ? (
              <Eye className="w-4 h-4 text-white/60" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/30" />
            )}
          </button>
        </div>
      );
    } else {
      const app = getUserApp(item.id);
      if (!app) return null;

      return (
        <div
          key={item.id}
          onMouseEnter={() => handleMouseEnter(item.id)}
          onMouseUp={handleMouseUp}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-all select-none',
            isDragging && 'opacity-60 bg-white/10',
            isDragOver && 'bg-white/5 border border-dashed border-white/30',
            !isDragging && !isDragOver && 'hover:bg-white/5'
          )}
        >
          <div
            className="cursor-grab active:cursor-grabbing p-1 -m-1"
            onMouseDown={() => handleMouseDown(item.id)}
            onMouseLeave={handleMouseLeave}
          >
            <GripVertical className="w-4 h-4 text-white/30" />
          </div>
          <div
            className={cn(
              'w-5 h-5 rounded flex items-center justify-center',
              app.color
            )}
          >
            <DynamicIcon name={app.icon} className="w-3 h-3" />
          </div>
          <span className="flex-1 text-sm text-white">{app.name}</span>
          <button
            onClick={() => removeSidebarItem(item.id)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/40 hover:text-red-400"
            title="从侧边栏移除"
          >
            <PinOff className="w-4 h-4" />
          </button>
        </div>
      );
    }
  };

  // 获取已启用的项目（按 order 排序）
  const enabledItems = sidebarItems
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);

  // 获取未固定的用户应用
  const unpinnedApps = userApps.filter((app) => !isInSidebar(app.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-card border-white/10 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            侧边栏设置
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* 说明文字 */}
          <p className="text-sm text-white/50">
            按住六点图标拖拽调整顺序，点击眼睛图标显示/隐藏项目。
          </p>

          {/* 已启用的项目列表 */}
          {enabledItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                当前显示的项目 ({enabledItems.length})
              </h3>
              <div ref={containerRef} className="space-y-1">
                {enabledItems.map(renderSortableItem)}
              </div>
            </div>
          )}

          {/* 已禁用但未移除的内置页面 */}
          {sidebarItems.some((item) => !item.enabled && item.type === 'builtin') && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                已隐藏的内置页面
              </h3>
              <div className="space-y-1">
                {sidebarItems
                  .filter((item) => !item.enabled && item.type === 'builtin')
                  .map((item) => {
                    const page = getBuiltinPage(item.id);
                    if (!page) return null;
                    const Icon = page.icon;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 opacity-60"
                      >
                        <div className="w-4" />
                        <Icon className="w-5 h-5 text-white/50" />
                        <span className="flex-1 text-sm text-white/70">
                          {page.label}
                        </span>
                        <button
                          onClick={() => toggleSidebarItem(item.id)}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors"
                          title="显示"
                        >
                          <EyeOff className="w-4 h-4 text-white/40" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 未固定的用户应用 */}
          {unpinnedApps.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                可添加的应用 ({unpinnedApps.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {unpinnedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => addSidebarItem(app.id, 'app')}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        app.color
                      )}
                    >
                      <DynamicIcon name={app.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{app.name}</p>
                      <p className="text-xs text-white/40 truncate">
                        点击固定到侧边栏
                      </p>
                    </div>
                    <Pin className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 空状态 */}
          {enabledItems.length === 0 && unpinnedApps.length === 0 && (
            <div className="text-center py-8">
              <LayoutTemplate className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">侧边栏暂无项目</p>
              <p className="text-sm text-white/30 mt-1">
                添加应用后可固定到侧边栏
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-white/10 hover:bg-white/20 text-white"
          >
            完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
