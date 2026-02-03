import { useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';

type HotPlatform = 'douyin' | 'baidu' | 'weibo';

const platforms = [
  { id: 'douyin' as HotPlatform, label: '抖音', color: 'bg-pink-500' },
  { id: 'baidu' as HotPlatform, label: '百度', color: 'bg-blue-500' },
  { id: 'weibo' as HotPlatform, label: '微博', color: 'bg-red-500' },
];

export function HotList() {
  const [activePlatform, setActivePlatform] = useState<HotPlatform>('douyin');
  const { hotList } = useAppStore();

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">热榜中心</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <RefreshCw className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Platform Tabs */}
      <div className="flex gap-2 mb-4">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => setActivePlatform(platform.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activePlatform === platform.id
                ? 'bg-white/20 text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
            )}
          >
            {platform.label}
          </button>
        ))}
      </div>

      {/* Hot List */}
      <div className="space-y-2">
        {hotList.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <span
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center text-xs font-bold',
                index < 3
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                  : 'bg-white/10 text-white/50'
              )}
            >
              {item.rank}
            </span>
            <span className="flex-1 text-sm text-white truncate">{item.title}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-400">{item.heat}</span>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Star className="w-4 h-4 text-white/30 hover:text-yellow-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
