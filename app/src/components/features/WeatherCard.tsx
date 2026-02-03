import { Cloud, Droplets, Wind, MapPin } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { useAppStore } from '@/stores/appStore';

export function WeatherCard() {
  const { weather } = useAppStore();

  if (!weather) return null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-8 h-8 text-white/80" />
          <span className="text-3xl font-bold text-white">{weather.temperature}°C</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/50">
          <MapPin className="w-4 h-4" />
          <span>{weather.city}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
          <Droplets className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm text-white/50">湿度</div>
            <div className="text-sm font-medium text-white">{weather.humidity}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
          <Wind className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-sm text-white/50">风力</div>
            <div className="text-sm font-medium text-white">{weather.windLevel}</div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
