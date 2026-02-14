import { useState } from 'react';
import {
  Globe,
  Laptop,
  Notebook,
  Calendar,
  Mail,
  MessageCircle,
  Image,
  Music,
  Video,
  FileText,
  Bookmark,
  Star,
  Heart,
  Zap,
  Cloud,
  Database,
  Github,
  Layout,
  PenTool,
  ShoppingBag,
  MapPin,
  Camera,
  Bell,
  Search,
  Settings,
  Code,
  Terminal,
  Box,
  Grid3X3,
  Check,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/stores/appStore';
import { toast } from 'sonner';
import type { UserApp } from '@/types';

interface AddAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const availableIcons = [
  { name: 'Notebook', icon: Notebook, label: '笔记本' },
  { name: 'Calendar', icon: Calendar, label: '日历' },
  { name: 'Mail', icon: Mail, label: '邮件' },
  { name: 'MessageCircle', icon: MessageCircle, label: '消息' },
  { name: 'Image', icon: Image, label: '图片' },
  { name: 'Music', icon: Music, label: '音乐' },
  { name: 'Video', icon: Video, label: '视频' },
  { name: 'FileText', icon: FileText, label: '文档' },
  { name: 'Bookmark', icon: Bookmark, label: '书签' },
  { name: 'Star', icon: Star, label: '收藏' },
  { name: 'Heart', icon: Heart, label: '喜爱' },
  { name: 'Zap', icon: Zap, label: '闪电' },
  { name: 'Cloud', icon: Cloud, label: '云' },
  { name: 'Database', icon: Database, label: '数据库' },
  { name: 'Github', icon: Github, label: 'GitHub' },
  { name: 'Layout', icon: Layout, label: '布局' },
  { name: 'PenTool', icon: PenTool, label: '工具' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: '购物' },
  { name: 'MapPin', icon: MapPin, label: '位置' },
  { name: 'Camera', icon: Camera, label: '相机' },
  { name: 'Bell', icon: Bell, label: '提醒' },
  { name: 'Search', icon: Search, label: '搜索' },
  { name: 'Settings', icon: Settings, label: '设置' },
  { name: 'Code', icon: Code, label: '代码' },
  { name: 'Terminal', icon: Terminal, label: '终端' },
  { name: 'Box', icon: Box, label: '盒子' },
  { name: 'Globe', icon: Globe, label: '网页' },
  { name: 'Laptop', icon: Laptop, label: '电脑' },
  { name: 'Grid3X3', icon: Grid3X3, label: '网格' },
  { name: 'Timer', icon: Timer, label: '计时器' },
];

const colorThemes = [
  { value: 'bg-blue-500/20 text-blue-400', label: '蓝色', color: '#60a5fa' },
  { value: 'bg-purple-500/20 text-purple-400', label: '紫色', color: '#c084fc' },
  { value: 'bg-pink-500/20 text-pink-400', label: '粉色', color: '#f472b6' },
  { value: 'bg-red-500/20 text-red-400', label: '红色', color: '#f87171' },
  { value: 'bg-orange-500/20 text-orange-400', label: '橙色', color: '#fb923c' },
  { value: 'bg-yellow-500/20 text-yellow-400', label: '黄色', color: '#facc15' },
  { value: 'bg-green-500/20 text-green-400', label: '绿色', color: '#4ade80' },
  { value: 'bg-teal-500/20 text-teal-400', label: '青色', color: '#2dd4bf' },
  { value: 'bg-cyan-500/20 text-cyan-400', label: '天蓝', color: '#22d3ee' },
  { value: 'bg-indigo-500/20 text-indigo-400', label: '靛蓝', color: '#818cf8' },
  { value: 'bg-lime-500/20 text-lime-400', label: '柠绿', color: '#a3e635' },
  { value: 'bg-white/10 text-white', label: '白色', color: '#ffffff' },
  { value: 'bg-black/30 text-white', label: '黑色', color: '#000000' },
];

// 预设常用应用
const presetApps: Omit<UserApp, 'id' | 'createdAt'>[] = [
  {
    name: 'Notion',
    description: '笔记与知识管理',
    icon: 'Notebook',
    color: 'bg-white/10 text-white',
    type: 'web',
    url: 'https://notion.so',
  },
  {
    name: 'GitHub',
    description: '代码托管与协作',
    icon: 'Github',
    color: 'bg-black/30 text-white',
    type: 'web',
    url: 'https://github.com',
  },
  {
    name: 'Figma',
    description: '在线设计工具',
    icon: 'PenTool',
    color: 'bg-purple-500/20 text-purple-400',
    type: 'web',
    url: 'https://figma.com',
  },
  {
    name: 'Vercel',
    description: '前端部署平台',
    icon: 'Zap',
    color: 'bg-white/10 text-white',
    type: 'web',
    url: 'https://vercel.com',
  },
  {
    name: 'DeepSeek',
    description: 'AI 助手',
    icon: 'MessageCircle',
    color: 'bg-blue-500/20 text-blue-400',
    type: 'web',
    url: 'https://chat.deepseek.com',
  },
  {
    name: 'Claude',
    description: 'AI 助手',
    icon: 'MessageCircle',
    color: 'bg-orange-500/20 text-orange-400',
    type: 'web',
    url: 'https://claude.ai',
  },
  {
    name: 'Google 翻译',
    description: '在线翻译工具',
    icon: 'Globe',
    color: 'bg-blue-500/20 text-blue-400',
    type: 'web',
    url: 'https://translate.google.com',
  },
  {
    name: 'Excalidraw',
    description: '手绘风格白板',
    icon: 'PenTool',
    color: 'bg-purple-500/20 text-purple-400',
    type: 'web',
    url: 'https://excalidraw.com',
  },
  {
    name: '番茄钟',
    description: '本地番茄工作法计时器',
    icon: 'Timer',
    color: 'bg-red-500/20 text-red-400',
    type: 'local',
    localPath: '/apps/pomodoro/index.html',
  },
  {
    name: '开发者工具',
    description: '本地开发工具集合',
    icon: 'Code',
    color: 'bg-green-500/20 text-green-400',
    type: 'local',
    localPath: '/apps/devtools/index.html',
  },
];

export function AddAppDialog({ open, onOpenChange }: AddAppDialogProps) {
  const { addUserApp } = useAppStore();
  const [activeTab, setActiveTab] = useState('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // 自定义表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Globe');
  const [color, setColor] = useState('bg-blue-500/20 text-blue-400');
  const [appType, setAppType] = useState<'web' | 'local'>('web');
  const [url, setUrl] = useState('');
  const [localPath, setLocalPath] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setIcon('Globe');
    setColor('bg-blue-500/20 text-blue-400');
    setAppType('web');
    setUrl('');
    setLocalPath('');
    setSelectedPreset(null);
    setActiveTab('preset');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddPreset = () => {
    if (!selectedPreset) {
      toast.error('请选择一个应用');
      return;
    }

    const preset = presetApps.find((p) => p.name === selectedPreset);
    if (!preset) {
      toast.error('应用配置错误');
      return;
    }

    addUserApp(preset);
    handleClose();
  };

  const handleAddCustom = () => {
    if (!name.trim()) {
      toast.error('请输入应用名称');
      return;
    }

    if (appType === 'web' && !url.trim()) {
      toast.error('请输入应用 URL');
      return;
    }

    if (appType === 'web' && !isValidUrl(url)) {
      toast.error('请输入有效的 URL，需要以 http:// 或 https:// 开头');
      return;
    }

    if (appType === 'local' && !localPath.trim()) {
      toast.error('请输入本地应用路径');
      return;
    }

    addUserApp({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      type: appType,
      url: appType === 'web' ? url.trim() : undefined,
      localPath: appType === 'local' ? localPath.trim() : undefined,
    });

    handleClose();
  };

  const isValidUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900/95 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">添加应用</DialogTitle>
          <DialogDescription className="text-white/50">
            选择预设应用或自定义添加 Web 应用/本地应用
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger
              value="preset"
              className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
            >
              预设应用
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white"
            >
              自定义
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              {presetApps.map((preset) => {
                const IconComponent =
                  availableIcons.find((i) => i.name === preset.icon)?.icon || Globe;
                const isSelected = selectedPreset === preset.name;

                return (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedPreset(preset.name)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${preset.color}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="text-sm font-medium text-white">{preset.name}</div>
                    <div className="text-xs text-white/40 truncate">{preset.description}</div>
                  </button>
                );
              })}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose} className="border-white/20 text-white hover:bg-white/10">
                取消
              </Button>
              <Button
                onClick={handleAddPreset}
                disabled={!selectedPreset}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-50"
              >
                添加选中应用
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/80">
                    应用名称 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：Notion"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white/80">
                    描述
                  </Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="简短描述应用用途"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">应用类型</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={appType === 'web' ? 'default' : 'outline'}
                    onClick={() => setAppType('web')}
                    className={
                      appType === 'web'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'border-white/20 text-white/70 hover:bg-white/10'
                    }
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Web 应用
                  </Button>
                  <Button
                    type="button"
                    variant={appType === 'local' ? 'default' : 'outline'}
                    onClick={() => setAppType('local')}
                    className={
                      appType === 'local'
                        ? 'bg-green-500/20 text-green-300 border-green-500/30'
                        : 'border-white/20 text-white/70 hover:bg-white/10'
                    }
                  >
                    <Laptop className="w-4 h-4 mr-2" />
                    本地应用
                  </Button>
                </div>
              </div>

              {appType === 'web' ? (
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-white/80">
                    应用 URL <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <p className="text-xs text-white/40">需要以 http:// 或 https:// 开头</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="localPath" className="text-white/80">
                    本地路径 <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="localPath"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    placeholder="index.html"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                  <p className="text-xs text-white/40">
                    相对于插件目录的路径，目前仅支持 Web 应用
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white/80">图标</Label>
                <div className="grid grid-cols-7 gap-2">
                  {availableIcons.map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = icon === item.name;

                    return (
                      <button
                        key={item.name}
                        onClick={() => setIcon(item.name)}
                        title={item.label}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-transparent'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">主题颜色</Label>
                <div className="flex flex-wrap gap-2">
                  {colorThemes.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setColor(theme.value)}
                      title={theme.label}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === theme.value
                          ? 'border-white scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: theme.color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose} className="border-white/20 text-white hover:bg-white/10">
                取消
              </Button>
              <Button
                onClick={handleAddCustom}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30"
              >
                添加应用
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
