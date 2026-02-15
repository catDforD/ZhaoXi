import { useState } from 'react';
import { Grid3X3, Calculator, Notebook, Image, Music, Film, BookOpen, Gamepad2, MessageCircle, Mail, Camera, Map, Plus, ExternalLink, Trash2, MoreVertical, Globe, Pin, PinOff, LayoutTemplate, Settings2 } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { DynamicIcon } from '@/components/features/DynamicIcon';
import { AddAppDialog } from '@/components/features/AddAppDialog';
import { SidebarSettingsDialog } from '@/components/features/SidebarSettingsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UserApp } from '@/types';

interface BuiltInAppItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const builtInApps: BuiltInAppItem[] = [
  { id: 'calc', name: '计算器', description: '快速计算工具', icon: Calculator, color: 'bg-blue-500/20 text-blue-400' },
  { id: 'notes', name: '备忘录', description: '记录重要事项', icon: Notebook, color: 'bg-yellow-500/20 text-yellow-400' },
  { id: 'gallery', name: '相册', description: '管理你的照片', icon: Image, color: 'bg-purple-500/20 text-purple-400' },
  { id: 'music', name: '音乐', description: '享受音乐时光', icon: Music, color: 'bg-pink-500/20 text-pink-400' },
  { id: 'video', name: '视频', description: '观看精彩视频', icon: Film, color: 'bg-red-500/20 text-red-400' },
  { id: 'reader', name: '阅读', description: '阅读电子书', icon: BookOpen, color: 'bg-green-500/20 text-green-400' },
  { id: 'game', name: '游戏', description: '休闲娱乐', icon: Gamepad2, color: 'bg-orange-500/20 text-orange-400' },
  { id: 'chat', name: '聊天', description: '即时通讯', icon: MessageCircle, color: 'bg-cyan-500/20 text-cyan-400' },
  { id: 'email', name: '邮件', description: '收发邮件', icon: Mail, color: 'bg-indigo-500/20 text-indigo-400' },
  { id: 'camera', name: '相机', description: '拍摄照片', icon: Camera, color: 'bg-teal-500/20 text-teal-400' },
  { id: 'map', name: '地图', description: '导航定位', icon: Map, color: 'bg-lime-500/20 text-lime-400' },
];

export function AppsPage() {
  const {
    userApps,
    sidebarItems,
    setCurrentPage,
    launchUserApp,
    removeUserApp,
    addSidebarItem,
    removeSidebarItem,
  } = useAppStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSidebarSettingsOpen, setIsSidebarSettingsOpen] = useState(false);

  const handleBuiltInAppClick = (appName: string) => {
    toast.info(`"${appName}" 功能即将上线，敬请期待！`);
  };

  const handleUserAppClick = (app: UserApp) => {
    launchUserApp(app.id);
    setCurrentPage(`app:${app.id}`);
  };

  const handleDeleteApp = (app: UserApp, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除应用 "${app.name}" 吗？`)) {
      removeUserApp(app.id);
    }
  };

  // 检查应用是否已固定到侧边栏
  const isPinnedToSidebar = (appId: string) => {
    return sidebarItems.some((item) => item.id === appId && item.enabled);
  };

  // 处理固定/取消固定
  const handleTogglePin = (app: UserApp, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinnedToSidebar(app.id)) {
      removeSidebarItem(app.id);
      toast.success(`"${app.name}" 已从侧边栏移除`);
    } else {
      addSidebarItem(app.id, 'app');
      toast.success(`"${app.name}" 已固定到侧边栏`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Grid3X3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">应用中心</h2>
            <p className="text-sm text-white/50">管理和启动你的应用</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsSidebarSettingsOpen(true)}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            侧边栏设置
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加应用
          </Button>
        </div>
      </div>

      {/* 侧边栏配置卡片 */}
      <GlassCard className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">自定义侧边栏</h3>
            <p className="text-xs text-white/50">
              已固定 {sidebarItems.filter(i => i.type === 'app' && i.enabled).length} 个应用，点击右上角"侧边栏设置"进行管理
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 内置应用区域 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          内置应用
          <span className="text-xs text-white/40 font-normal">(即将上线)</span>
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {builtInApps.map((app) => {
            const Icon = app.icon;
            return (
              <GlassCard
                key={app.id}
                className="p-5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                hover
                onClick={() => handleBuiltInAppClick(app.name)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${app.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">{app.name}</h3>
                  <p className="text-xs text-white/50">{app.description}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* 我的应用区域 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          我的应用
          <span className="text-xs text-white/40 font-normal">({userApps.length} 个)</span>
        </h3>

        {userApps.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">还没有自定义应用</h3>
            <p className="text-sm text-white/50 mb-4">点击右上角"添加应用"按钮，添加你喜欢的 Web 应用</p>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(true)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加第一个应用
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {userApps.map((app) => (
              <GlassCard
                key={app.id}
                className={cn(
                  "p-5 cursor-pointer group relative",
                  isPinnedToSidebar(app.id) && "border-purple-500/40"
                )}
                hover
                onClick={() => handleUserAppClick(app)}
              >
                {/* 固定指示器 */}
                {isPinnedToSidebar(app.id) && (
                  <div className="absolute top-2 left-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Pin className="w-3 h-3 text-purple-400" />
                    </div>
                  </div>
                )}

                {/* 操作菜单 */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900/95 border-white/10">
                      <DropdownMenuItem
                        className="text-white/80 hover:text-white focus:text-white hover:bg-white/10 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserAppClick(app);
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        启动应用
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(
                          "cursor-pointer",
                          isPinnedToSidebar(app.id)
                            ? "text-yellow-400 hover:text-yellow-300 focus:text-yellow-300 hover:bg-yellow-500/20"
                            : "text-white/80 hover:text-white focus:text-white hover:bg-white/10"
                        )}
                        onClick={(e) => handleTogglePin(app, e)}
                      >
                        {isPinnedToSidebar(app.id) ? (
                          <>
                            <PinOff className="w-4 h-4 mr-2" />
                            取消固定
                          </>
                        ) : (
                          <>
                            <Pin className="w-4 h-4 mr-2" />
                            固定到侧边栏
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 hover:text-red-300 focus:text-red-300 hover:bg-red-500/20 cursor-pointer"
                        onClick={(e) => handleDeleteApp(app, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除应用
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${app.color}`}>
                    <DynamicIcon name={app.icon} className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-medium text-white mb-1">{app.name}</h3>
                  <p className="text-xs text-white/50 line-clamp-1">{app.description || app.url || '本地应用'}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {app.type === 'web' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-0.5">
                        <Globe className="w-3 h-3" />
                        Web
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        本地
                      </span>
                    )}
                    {isPinnedToSidebar(app.id) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-0.5">
                        <Pin className="w-3 h-3" />
                        已固定
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}

            {/* 添加按钮卡片 */}
            <GlassCard
              className="p-5 cursor-pointer border-dashed border-2 border-white/10 hover:border-purple-500/30 flex items-center justify-center"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-white/5">
                  <Plus className="w-7 h-7 text-white/40" />
                </div>
                <h3 className="text-base font-medium text-white/60">添加应用</h3>
                <p className="text-xs text-white/30">点击添加新应用</p>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <GlassCard className="p-6">
        <h3 className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-xs text-purple-400">?</span>
          如何使用
        </h3>
        <ul className="text-sm text-white/50 space-y-1 list-disc list-inside">
          <li>点击"添加应用"添加你喜欢的 Web 应用（如 Notion、GitHub、Figma 等）</li>
          <li>添加的应用会在工作台内部打开，无需切换窗口</li>
          <li>右键点击应用卡片或点击菜单按钮可进行删除操作</li>
          <li>使用"固定到侧边栏"功能将常用应用添加到侧边栏快速访问</li>
          <li>应用数据保存在本地，重启后仍然保留</li>
        </ul>
      </GlassCard>

      {/* 添加应用对话框 */}
      <AddAppDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

      {/* 侧边栏设置对话框 */}
      <SidebarSettingsDialog
        open={isSidebarSettingsOpen}
        onOpenChange={setIsSidebarSettingsOpen}
      />
    </div>
  );
}
