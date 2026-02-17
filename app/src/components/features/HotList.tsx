import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  ExternalLink,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  deleteInfoSource,
  getInfoRefreshStatus,
  getInfoSettings,
  getInfoSources,
  getTodayInfoItems,
  refreshInfoNow,
  openExternalLink,
  updateInfoSettings,
  upsertInfoSource,
} from '@/lib/api';
import type { InfoItem, InfoSettings, InfoSource } from '@/types';

const DEFAULT_SETTINGS: InfoSettings = {
  pushTime: '09:00',
  includeKeywords: [],
  excludeKeywords: [],
  maxItemsPerDay: 20,
};

function toKeywords(value: string): string[] {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toText(value: string[]): string {
  return value.join(', ');
}

export function HotList() {
  const [sources, setSources] = useState<InfoSource[]>([]);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [settings, setSettings] = useState<InfoSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [includeKeywordsText, setIncludeKeywordsText] = useState('');
  const [excludeKeywordsText, setExcludeKeywordsText] = useState('');

  const sourceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const source of sources) {
      map.set(source.id, source.name);
    }
    return map;
  }, [sources]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [nextSources, nextItems, nextSettings, status] = await Promise.all([
        getInfoSources(),
        getTodayInfoItems(),
        getInfoSettings(),
        getInfoRefreshStatus(),
      ]);
      setSources(nextSources);
      setItems(nextItems);
      setSettings(nextSettings);
      setIncludeKeywordsText(toText(nextSettings.includeKeywords));
      setExcludeKeywordsText(toText(nextSettings.excludeKeywords));
      setLastRefreshAt(status.lastRefreshAt ?? null);
    } catch (error) {
      console.error('Failed to load info center data:', error);
      toast.error('加载每日信息中心失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    let lastRunDate = '';
    const intervalId = window.setInterval(() => {
      const now = new Date();
      const hh = `${now.getHours()}`.padStart(2, '0');
      const mm = `${now.getMinutes()}`.padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const currentDate = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
      if (currentTime === settings.pushTime && lastRunDate !== currentDate && !isRefreshing) {
        lastRunDate = currentDate;
        void handleRefresh();
      }
    }, 15000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [settings.pushTime, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshInfoNow();
      const [nextItems, status] = await Promise.all([getTodayInfoItems(), getInfoRefreshStatus()]);
      setItems(nextItems);
      setLastRefreshAt(status.lastRefreshAt ?? result.refreshedAt);
      if (result.success) {
        toast.success(`已更新 ${result.keptCount} 条今日信息`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to refresh info center:', error);
      toast.error('刷新失败，请稍后重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSourceToggle = async (source: InfoSource, enabled: boolean) => {
    try {
      await upsertInfoSource({
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.type,
        enabled,
        isPreset: source.isPreset,
      });
      setSources((prev) =>
        prev.map((item) => (item.id === source.id ? { ...item, enabled } : item))
      );
    } catch (error) {
      console.error('Failed to toggle source:', error);
      toast.error('更新信息源状态失败');
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await deleteInfoSource(sourceId);
      setSources((prev) => prev.filter((source) => source.id !== sourceId));
      toast.success('信息源已删除');
    } catch (error) {
      console.error('Failed to delete source:', error);
      toast.error('删除信息源失败');
    }
  };

  const handleAddSource = async () => {
    const name = newSourceName.trim();
    const url = newSourceUrl.trim();
    if (!name || !url) {
      toast.error('请输入信息源名称和 RSS URL');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error('RSS URL 必须以 http:// 或 https:// 开头');
      return;
    }
    try {
      const created = await upsertInfoSource({
        name,
        url,
        type: 'rss',
        enabled: true,
      });
      setSources((prev) => [created, ...prev]);
      setNewSourceName('');
      setNewSourceUrl('');
      toast.success('信息源已添加');
    } catch (error) {
      console.error('Failed to add source:', error);
      toast.error('添加信息源失败，请检查 URL 是否有效');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const nextSettings = await updateInfoSettings({
        pushTime: settings.pushTime,
        includeKeywords: toKeywords(includeKeywordsText),
        excludeKeywords: toKeywords(excludeKeywordsText),
        maxItemsPerDay: settings.maxItemsPerDay,
      });
      setSettings(nextSettings);
      setIncludeKeywordsText(toText(nextSettings.includeKeywords));
      setExcludeKeywordsText(toText(nextSettings.excludeKeywords));
      toast.success('每日信息设置已保存');
      setSettingsOpen(false);
    } catch (error) {
      console.error('Failed to save info settings:', error);
      toast.error('保存设置失败');
    }
  };

  const handleOpenLink = async (link: string) => {
    try {
      await openExternalLink(link);
    } catch (error) {
      console.error('Failed to open link with backend command:', error);
      window.open(link, '_blank');
    }
  };

  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-white">每日信息中心</span>
            <Bell className="w-4 h-4 text-white/50" />
          </div>
          <div className="text-xs text-white/50 mt-1">
            推送时间 {settings.pushTime}
            {lastRefreshAt ? ` · 最近更新 ${new Date(lastRefreshAt).toLocaleString()}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-white/40">加载中...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-white/40">暂无今日信息，点击右上角刷新或配置信息源</div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.id}
              className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => void handleOpenLink(item.link)}
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                  index < 3
                    ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white line-clamp-2">{item.title}</div>
                <div className="mt-1 text-xs text-white/50 flex items-center gap-2">
                  <span>{sourceNameMap.get(item.sourceId) ?? '未知来源'}</span>
                  {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleString()}</span>}
                </div>
                {item.matchedKeywords.length > 0 && (
                  <div className="mt-1 text-xs text-cyan-300/90 truncate">
                    关键词: {item.matchedKeywords.join(' / ')}
                  </div>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-white/40 mt-0.5" />
            </button>
          ))
        )}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-2xl glass-card border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>每日信息中心设置</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <div className="text-sm font-medium mb-2">推送时间（本地时间）</div>
              <Input
                type="time"
                value={settings.pushTime}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, pushTime: event.target.value || '09:00' }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium mb-2">包含关键词（逗号或换行分隔）</div>
                <Textarea
                  rows={4}
                  value={includeKeywordsText}
                  onChange={(event) => setIncludeKeywordsText(event.target.value)}
                  placeholder="AI, 投资, React"
                />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">排除关键词（逗号或换行分隔）</div>
                <Textarea
                  rows={4}
                  value={excludeKeywordsText}
                  onChange={(event) => setExcludeKeywordsText(event.target.value)}
                  placeholder="广告, 八卦"
                />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">每日最多保留条数</div>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.maxItemsPerDay}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  setSettings((prev) => ({
                    ...prev,
                    maxItemsPerDay: Math.max(1, Math.min(100, Math.round(value))),
                  }));
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">信息源</div>
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center gap-3 rounded-md border border-white/10 p-2.5"
                  >
                    <Switch
                      checked={source.enabled}
                      onCheckedChange={(checked) => void handleSourceToggle(source, checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{source.name}</div>
                      <div className="text-xs text-white/50 truncate">{source.url}</div>
                    </div>
                    {!source.isPreset && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-white/60 hover:text-red-300 hover:bg-red-500/15"
                        onClick={() => void handleDeleteSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2">
                <Input
                  value={newSourceName}
                  onChange={(event) => setNewSourceName(event.target.value)}
                  placeholder="来源名"
                />
                <Input
                  value={newSourceUrl}
                  onChange={(event) => setNewSourceUrl(event.target.value)}
                  placeholder="https://example.com/rss.xml"
                />
                <Button onClick={() => void handleAddSource()}>
                  <Plus className="w-4 h-4 mr-1" />添加
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-4 mt-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                取消
              </Button>
              <Button onClick={() => void handleSaveSettings()}>保存设置</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
