// 待办事项
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'normal' | 'urgent';
  createdAt: string;
}

// 长期项目
export interface Project {
  id: string;
  title: string;
  deadline: string;
  progress: number;
  status: 'active' | 'completed';
}

// 日程事件
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: 'blue' | 'orange' | 'green' | 'teal' | 'red';
  note?: string;
}

// 个人事务
export interface PersonalTask {
  id: string;
  title: string;
  budget?: number;
  date?: string;
  location?: string;
  note?: string;
}

export interface Inspiration {
  id: string;
  content: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// 热榜项
export interface HotItem {
  rank: number;
  title: string;
  heat: string;
}

export interface InfoSource {
  id: string;
  name: string;
  type: 'rss';
  url: string;
  enabled: boolean;
  isPreset: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InfoSettings {
  pushTime: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  maxItemsPerDay: number;
}

export interface InfoItem {
  id: string;
  sourceId: string;
  title: string;
  link: string;
  summary?: string;
  publishedAt?: string;
  score: number;
  matchedKeywords: string[];
  fetchedAt: string;
}

export interface InfoRefreshResponse {
  success: boolean;
  fetchedCount: number;
  keptCount: number;
  message: string;
  refreshedAt: string;
}

export interface InfoRefreshStatus {
  lastRefreshAt?: string;
  lastSuccess: boolean;
  message: string;
  todayCount: number;
}

export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'fog'
  | 'thunder'
  | 'unknown';

// 天气数据
export interface WeatherData {
  temperature: number;
  condition: WeatherCondition;
  humidity: number;
  windLevel: string;
  city: string;
  updatedAt: string;
  source: 'open-meteo';
  locationName: string;
}

export interface WeatherSettings {
  city: string;
  lat: number;
  lon: number;
  cacheMinutes: number;
}

// 心情类型
export type MoodType = 'happy' | 'calm' | 'tired' | 'excited' | 'sad' | 'numb';

// 挑战项
export interface Challenge {
  id: string;
  title: string;
  completed: boolean;
}

// 每日挑战
export interface DailyChallenge {
  date: string;
  items: Challenge[];
}

// 愿望清单项
export interface WishlistItem {
  id: string;
  title: string;
  amount: number;
}

// 统计数据
export interface Statistics {
  completedTasks: number;
  averageProgress: number;
  habitChallenges: number;
  scheduleEvents: number;
}

// 用户自定义应用
export interface UserApp {
  id: string;                    // 唯一标识 (如 "notion-001")
  name: string;                  // 应用名称
  description: string;           // 应用描述
  icon: string;                  // Lucide 图标名称
  color: string;                 // 主题颜色类名
  type: 'web' | 'local';         // 应用类型
  url?: string;                  // Web 应用 URL
  localPath?: string;            // 本地应用路径（相对于插件目录）
  createdAt: string;             // 创建时间
}

// 应用运行实例状态
export interface RunningApp {
  appId: string;
  startTime: number;
}

// 侧边栏项目类型
export interface SidebarItem {
  id: string;           // 唯一标识（内置页面用原ID，用户应用用 appId）
  type: 'builtin' | 'app';  // 类型：内置页面 或 用户应用
  enabled: boolean;     // 是否启用（显示在侧边栏）
  order: number;        // 排序顺序
}

// 内置页面定义
export interface BuiltinPage {
  id: string;
  label: string;
  icon: string;  // Lucide 图标名称
}
