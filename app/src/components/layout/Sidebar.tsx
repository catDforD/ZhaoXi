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
  Trash2
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface SidebarProps {
  className?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '我的主页', icon: LayoutGrid },
  { id: 'todos', label: '待办事项', icon: CheckSquare },
  { id: 'projects', label: '长期事项', icon: Target },
  { id: 'personal', label: '个人事务', icon: User },
  { id: 'schedule', label: '日程管理', icon: Calendar },
  { id: 'journal', label: '生活手账', icon: Heart },
  { id: 'achievements', label: '我的成就', icon: Trophy },
  { id: 'apps', label: '应用中心', icon: Grid3X3 },
];

export function Sidebar({ className }: SidebarProps) {
  const { currentPage, setCurrentPage, backgroundImage, setBackgroundImage } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  return (
    <>
      <aside className={cn("w-[200px] h-screen flex flex-col glass-card border-r border-white/10 rounded-none", className)}>
        {/* Logo */}
        <div className="p-6 pb-4">
          <h1 className="text-xl font-bold text-white">朝夕</h1>
          <p className="text-xs text-white/50 mt-1 tracking-wider">ZhaoXi OS</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/8 hover:text-white/90'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
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
          <div className="space-y-6 py-4">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
