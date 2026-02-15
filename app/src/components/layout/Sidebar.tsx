import { useState, useRef } from 'react';
import {
  LayoutGrid,
  CheckSquare,
  Target,
  User,
  Calendar,
  Heart,
  Trophy,
  Grid3X3,
  Settings,
  Image as ImageIcon,
  Trash2,
  PanelLeft,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/features/DynamicIcon';
import { SidebarSettingsDialog } from '@/components/features/SidebarSettingsDialog';
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
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const {
    currentPage,
    setCurrentPage,
    backgroundImage,
    setBackgroundImage,
    sidebarItems,
    userApps,
    launchUserApp,
  } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarSettingsOpen, setSidebarSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundImage(null);
  };

  // 获取内置页面定义
  const getBuiltinPage = (id: string): BuiltinPageDef | undefined => {
    return BUILTIN_PAGES.find((p) => p.id === id);
  };

  // 获取用户应用
  const getUserApp = (id: string) => {
    return userApps.find((a) => a.id === id);
  };

  // 处理侧边栏项点击
  const handleItemClick = (item: SidebarItem) => {
    if (item.type === 'builtin') {
      setCurrentPage(item.id);
    } else {
      // 用户应用
      launchUserApp(item.id);
      setCurrentPage(`app:${item.id}`);
    }
  };

  // 获取当前项是否激活
  const isItemActive = (item: SidebarItem): boolean => {
    if (item.type === 'builtin') {
      return currentPage === item.id;
    }
    return currentPage === `app:${item.id}`;
  };

  // 渲染侧边栏项
  const renderSidebarItem = (item: SidebarItem) => {
    const isActive = isItemActive(item);

    if (item.type === 'builtin') {
      const page = getBuiltinPage(item.id);
      if (!page) return null;
      const Icon = page.icon;

      return (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left',
            isActive
              ? 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/8 hover:text-white/90'
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{page.label}</span>
        </button>
      );
    } else {
      // 用户应用
      const app = getUserApp(item.id);
      if (!app) return null;

      return (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left group',
            isActive
              ? 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/8 hover:text-white/90'
          )}
        >
          <div className={cn('w-5 h-5 rounded flex items-center justify-center', app.color)}>
            <DynamicIcon name={app.icon} className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium">{app.name}</span>
        </button>
      );
    }
  };

  // 获取启用的侧边栏项（已排序）
  // 添加回退：如果 sidebarItems 还未加载，使用空数组
  const enabledItems = (sidebarItems || [])
    .filter((item) => item.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <aside className={cn("w-[200px] h-screen flex flex-col glass-card border-r border-white/10 rounded-none", className)}>
        {/* Logo */}
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold text-white">朝夕</h1>
          <p className="text-xs text-white/50 mt-1 tracking-wider">ZhaoXi OS</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {enabledItems.map(renderSidebarItem)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">相伴朝夕</span>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 背景图片设置 */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">背景图片</h3>
              <div className="space-y-4">
                {backgroundImage && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden">
                    <img
                      src={backgroundImage}
                      alt="背景预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    上传图片
                  </Button>
                  {backgroundImage && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveBackground}
                      className="bg-white/5 border-white/10 text-red-400 hover:bg-white/10 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      移除
                    </Button>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  支持 JPG、PNG 格式，建议尺寸 1920x1080 或更大
                </p>
              </div>
            </div>

            {/* 侧边栏设置 */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-white mb-3">侧边栏</h3>
              <Button
                variant="outline"
                onClick={() => {
                  setSettingsOpen(false);
                  setSidebarSettingsOpen(true);
                }}
                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <PanelLeft className="w-4 h-4 mr-2" />
                配置侧边栏
              </Button>
              <p className="text-xs text-white/40 mt-2">
                自定义显示在侧边栏的页面和应用
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar Settings Dialog */}
      <SidebarSettingsDialog
        open={sidebarSettingsOpen}
        onOpenChange={setSidebarSettingsOpen}
      />
    </>
  );
}
