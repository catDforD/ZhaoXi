import { useState } from 'react';
import { format } from 'date-fns';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Loader2,
  MapPin,
  RefreshCw,
  Settings,
  Sun,
  Wind,
} from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { useAppStore } from '@/stores/appStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function WeatherCard() {
  const {
    weather,
    weatherStatus,
    weatherError,
    weatherSettings,
    fetchWeather,
    updateWeatherCity,
  } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cityInput, setCityInput] = useState(weatherSettings.city);

  const handleSaveCity = async () => {
    const updated = await updateWeatherCity(cityInput);
    if (updated) {
      setSettingsOpen(false);
    }
  };

  const renderWeatherIcon = () => {
    if (!weather) return <Cloud className="w-8 h-8 text-white/80" />;
    switch (weather.condition) {
      case 'clear':
        return <Sun className="w-8 h-8 text-yellow-300" />;
      case 'rain':
        return <CloudRain className="w-8 h-8 text-blue-300" />;
      case 'snow':
        return <CloudSnow className="w-8 h-8 text-cyan-200" />;
      case 'thunder':
        return <CloudLightning className="w-8 h-8 text-yellow-200" />;
      case 'fog':
        return <CloudFog className="w-8 h-8 text-slate-200" />;
      default:
        return <Cloud className="w-8 h-8 text-white/80" />;
    }
  };

  return (
    <>
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {renderWeatherIcon()}
            <span className="text-3xl font-bold text-white">
              {weather ? `${weather.temperature}°C` : '--'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchWeather(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="刷新天气"
            >
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
            <button
              type="button"
              onClick={() => {
                setCityInput(weatherSettings.city);
                setSettingsOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="设置城市"
            >
              <Settings className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-sm text-white/50">
            <MapPin className="w-4 h-4" />
            <span>{weather?.locationName ?? weatherSettings.city}</span>
          </div>
          <div className="text-xs text-white/40">
            {weather?.updatedAt ? `更新于 ${format(new Date(weather.updatedAt), 'HH:mm')}` : '尚未更新'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
            <Droplets className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm text-white/50">湿度</div>
              <div className="text-sm font-medium text-white">
                {weather ? `${weather.humidity}%` : '--'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
            <Wind className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm text-white/50">风力</div>
              <div className="text-sm font-medium text-white">
                {weather ? weather.windLevel : '--'}
              </div>
            </div>
          </div>
        </div>

        {weatherStatus === 'loading' && (
          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在更新天气...
          </div>
        )}
        {weatherStatus === 'error' && (
          <div className="mt-3 text-xs text-red-300/90">
            天气更新失败{weatherError ? `：${weatherError}` : ''}。
          </div>
        )}
      </GlassCard>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>设置天气城市</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder="例如：保定、北京、上海"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void handleSaveCity()}>保存并刷新</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
