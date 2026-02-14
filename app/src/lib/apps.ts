import type { UserApp } from '@/types';

/**
 * 应用管理工具函数
 *
 * 当前版本使用 localStorage 通过 Zustand persist 进行数据持久化。
 * 这些工具函数为后续可能的文件系统存储提供接口封装。
 */

const STORAGE_KEY = 'workbench-user-apps';

/**
 * 生成唯一应用 ID
 */
export function generateAppId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);
  const random = Date.now().toString(36).substring(2, 7);
  return `${slug}-${random}`;
}

/**
 * 从 localStorage 加载用户应用列表
 * 注意：当前使用 Zustand persist 自动处理，此函数备用
 */
export function loadUserAppsFromStorage(): UserApp[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    // Zustand persist 存储格式是嵌套的，需要提取 state.userApps
    if (parsed.state && Array.isArray(parsed.state.userApps)) {
      return parsed.state.userApps;
    }
    return [];
  } catch (error) {
    console.error('Failed to load user apps from storage:', error);
    return [];
  }
}

/**
 * 验证应用配置是否有效
 */
export function validateAppConfig(app: Partial<UserApp>): { valid: boolean; error?: string } {
  if (!app.name || app.name.trim().length === 0) {
    return { valid: false, error: '应用名称不能为空' };
  }

  if (app.name.length > 50) {
    return { valid: false, error: '应用名称不能超过 50 个字符' };
  }

  if (app.type === 'web') {
    if (!app.url || app.url.trim().length === 0) {
      return { valid: false, error: 'Web 应用必须提供 URL' };
    }

    try {
      const url = new URL(app.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { valid: false, error: 'URL 必须以 http:// 或 https:// 开头' };
      }
    } catch {
      return { valid: false, error: '无效的 URL 格式' };
    }
  }

  if (app.type === 'local') {
    if (!app.localPath || app.localPath.trim().length === 0) {
      return { valid: false, error: '本地应用必须提供路径' };
    }
  }

  return { valid: true };
}

/**
 * 创建新的用户应用
 */
export function createUserApp(
  config: Omit<UserApp, 'id' | 'createdAt'>
): UserApp {
  const now = new Date().toISOString();

  return {
    ...config,
    id: generateAppId(config.name),
    createdAt: now,
  };
}

/**
 * 获取应用的显示 URL
 * Web 应用返回 url，本地应用返回 localPath
 */
export function getAppDisplayUrl(app: UserApp): string | undefined {
  if (app.type === 'web') {
    return app.url;
  }
  return app.localPath;
}

/**
 * 检查 URL 是否安全（防止 XSS）
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 只允许 http 和 https 协议
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 预设的常用 Web 应用配置
 */
export const PRESET_APPS: Omit<UserApp, 'id' | 'createdAt'>[] = [
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
];

/**
 * 可用的图标列表
 */
export const AVAILABLE_ICONS = [
  'Notebook',
  'Calendar',
  'Mail',
  'MessageCircle',
  'Image',
  'Music',
  'Video',
  'FileText',
  'Bookmark',
  'Star',
  'Heart',
  'Zap',
  'Cloud',
  'Database',
  'Github',
  'Layout',
  'PenTool',
  'ShoppingBag',
  'MapPin',
  'Camera',
  'Bell',
  'Search',
  'Settings',
  'Code',
  'Terminal',
  'Box',
  'Globe',
  'Laptop',
  'Grid3X3',
] as const;

/**
 * 可用的颜色主题
 */
export const COLOR_THEMES = [
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
  'bg-pink-500/20 text-pink-400',
  'bg-red-500/20 text-red-400',
  'bg-orange-500/20 text-orange-400',
  'bg-yellow-500/20 text-yellow-400',
  'bg-green-500/20 text-green-400',
  'bg-teal-500/20 text-teal-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-indigo-500/20 text-indigo-400',
  'bg-lime-500/20 text-lime-400',
  'bg-white/10 text-white',
  'bg-black/30 text-white',
] as const;
