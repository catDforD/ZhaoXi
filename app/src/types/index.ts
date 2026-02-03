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

// 热榜项
export interface HotItem {
  rank: number;
  title: string;
  heat: string;
}

// 天气数据
export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windLevel: string;
  city: string;
}

// 心情类型
export type MoodType = 'happy' | 'calm' | 'tired' | 'excited' | 'sad' | 'numb';

export interface Mood {
  type: MoodType;
  emoji: string;
  label: string;
}

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

// 打卡记录
export interface CheckInRecord {
  day: string;
  checked: boolean;
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

// 导航项
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}
