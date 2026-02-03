import { Grid3X3, Calculator, Notebook, Image, Music, Film, BookOpen, Gamepad2, MessageCircle, Mail, Camera, Map } from 'lucide-react';
import { GlassCard } from '@/components/layout/GlassCard';

interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const apps: AppItem[] = [
  { id: '1', name: '计算器', description: '快速计算工具', icon: Calculator, color: 'bg-blue-500/20 text-blue-400' },
  { id: '2', name: '备忘录', description: '记录重要事项', icon: Notebook, color: 'bg-yellow-500/20 text-yellow-400' },
  { id: '3', name: '相册', description: '管理你的照片', icon: Image, color: 'bg-purple-500/20 text-purple-400' },
  { id: '4', name: '音乐', description: '享受音乐时光', icon: Music, color: 'bg-pink-500/20 text-pink-400' },
  { id: '5', name: '视频', description: '观看精彩视频', icon: Film, color: 'bg-red-500/20 text-red-400' },
  { id: '6', name: '阅读', description: '阅读电子书', icon: BookOpen, color: 'bg-green-500/20 text-green-400' },
  { id: '7', name: '游戏', description: '休闲娱乐', icon: Gamepad2, color: 'bg-orange-500/20 text-orange-400' },
  { id: '8', name: '聊天', description: '即时通讯', icon: MessageCircle, color: 'bg-cyan-500/20 text-cyan-400' },
  { id: '9', name: '邮件', description: '收发邮件', icon: Mail, color: 'bg-indigo-500/20 text-indigo-400' },
  { id: '10', name: '相机', description: '拍摄照片', icon: Camera, color: 'bg-teal-500/20 text-teal-400' },
  { id: '11', name: '地图', description: '导航定位', icon: Map, color: 'bg-lime-500/20 text-lime-400' },
];

export function AppsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Grid3X3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">应用中心</h2>
          <p className="text-sm text-white/50">探索更多实用工具</p>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-4 gap-4">
        {apps.map((app) => {
          const Icon = app.icon;
          return (
            <GlassCard
              key={app.id}
              className="p-5 cursor-pointer"
              hover
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

      {/* Coming Soon */}
      <GlassCard className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <Grid3X3 className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">更多应用即将上线</h3>
        <p className="text-sm text-white/50">敬请期待更多精彩功能</p>
      </GlassCard>
    </div>
  );
}
