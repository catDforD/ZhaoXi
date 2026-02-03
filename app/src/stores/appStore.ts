import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Todo,
  Project,
  CalendarEvent,
  PersonalTask,
  HotItem,
  WeatherData,
  MoodType,
  DailyChallenge,
  WishlistItem,
  Statistics,
} from '@/types';

interface AppState {
  // 当前页面
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // 待办事项
  todos: Todo[];
  addTodo: (title: string, priority: 'normal' | 'urgent') => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  // 长期项目
  projects: Project[];
  addProject: (title: string, deadline: string) => void;
  updateProjectProgress: (id: string, progress: number) => void;
  deleteProject: (id: string) => void;

  // 日程事件
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  deleteEvent: (id: string) => void;
  getEventsByDate: (date: string) => CalendarEvent[];

  // 个人事务
  personalTasks: PersonalTask[];
  addPersonalTask: (task: Omit<PersonalTask, 'id'>) => void;
  deletePersonalTask: (id: string) => void;

  // 热榜数据
  hotList: HotItem[];
  setHotList: (items: HotItem[]) => void;

  // 天气数据
  weather: WeatherData | null;
  setWeather: (weather: WeatherData) => void;

  // 心情
  currentMood: MoodType;
  setMood: (mood: MoodType) => void;

  // 每日挑战
  dailyChallenges: DailyChallenge[];
  toggleChallenge: (date: string, challengeId: string) => void;

  // 愿望清单
  wishlist: WishlistItem[];
  addWishlistItem: (title: string, amount: number) => void;

  // 余额
  balance: number;
  setBalance: (amount: number) => void;

  // 背景图片
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;

  // 统计数据
  getStatistics: () => Statistics;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 当前页面
      currentPage: 'dashboard',
      setCurrentPage: (page) => set({ currentPage: page }),

      // 待办事项
      todos: [
        { id: '1', title: '活动室ps出售', completed: false, priority: 'normal', createdAt: new Date().toISOString() },
        { id: '2', title: '伙食费整理', completed: true, priority: 'urgent', createdAt: new Date().toISOString() },
      ],
      addTodo: (title, priority) => {
        const newTodo: Todo = {
          id: Date.now().toString(),
          title,
          completed: false,
          priority,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ todos: [newTodo, ...state.todos] }));
      },
      toggleTodo: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          ),
        }));
      },
      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        }));
      },

      // 长期项目
      projects: [
        { id: '1', title: '资料整理', deadline: '2025-12-31', progress: 20, status: 'active' },
      ],
      addProject: (title, deadline) => {
        const newProject: Project = {
          id: Date.now().toString(),
          title,
          deadline,
          progress: 0,
          status: 'active',
        };
        set((state) => ({ projects: [...state.projects, newProject] }));
      },
      updateProjectProgress: (id, progress) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, progress } : p
          ),
        }));
      },
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      // 日程事件
      events: [],
      addEvent: (event) => {
        const newEvent: CalendarEvent = {
          ...event,
          id: Date.now().toString(),
        };
        set((state) => ({ events: [...state.events, newEvent] }));
      },
      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        }));
      },
      getEventsByDate: (date) => {
        return get().events.filter((e) => e.date === date);
      },

      // 个人事务
      personalTasks: [
        { id: '1', title: '关于ai眼镜，ai耳机领域公司的投资建议', budget: 0 },
      ],
      addPersonalTask: (task) => {
        const newTask: PersonalTask = {
          ...task,
          id: Date.now().toString(),
        };
        set((state) => ({ personalTasks: [...state.personalTasks, newTask] }));
      },
      deletePersonalTask: (id) => {
        set((state) => ({
          personalTasks: state.personalTasks.filter((t) => t.id !== id),
        }));
      },

      // 热榜数据
      hotList: [
        { rank: 1, title: '北冥有鱼竟然是真的', heat: '1145万热度' },
        { rank: 2, title: '美联储再降息25个基点', heat: '1136万热度' },
        { rank: 3, title: '新技术将如何赋能旅游业', heat: '1125万热度' },
        { rank: 4, title: '家人这一页应是椿萱并茂', heat: '1115万热度' },
        { rank: 5, title: '请全国爸妈接招的生活小挑战', heat: '1043万热度' },
        { rank: 6, title: '跟着蛋神蒸鸡蛋', heat: '1027万热度' },
        { rank: 7, title: '杜克开启印度之旅', heat: '915万热度' },
      ],
      setHotList: (items) => set({ hotList: items }),

      // 天气数据
      weather: {
        temperature: -1,
        condition: 'cloudy',
        humidity: 77,
        windLevel: '≤3级',
        city: '保定市',
      },
      setWeather: (weather) => set({ weather }),

      // 心情
      currentMood: 'numb',
      setMood: (mood) => set({ currentMood: mood }),

      // 每日挑战
      dailyChallenges: [
        {
          date: new Date().toISOString().split('T')[0],
          items: [
            { id: '1', title: '深呼吸练习', completed: false },
            { id: '2', title: '23:00前入睡', completed: false },
          ],
        },
      ],
      toggleChallenge: (date, challengeId) => {
        set((state) => ({
          dailyChallenges: state.dailyChallenges.map((dc) =>
            dc.date === date
              ? {
                  ...dc,
                  items: dc.items.map((item) =>
                    item.id === challengeId
                      ? { ...item, completed: !item.completed }
                      : item
                  ),
                }
              : dc
          ),
        }));
      },

      // 愿望清单
      wishlist: [
        { id: '1', title: '关于ai眼镜，ai耳机领域公司的投资建议', amount: 0 },
      ],
      addWishlistItem: (title, amount) => {
        const newItem: WishlistItem = {
          id: Date.now().toString(),
          title,
          amount,
        };
        set((state) => ({ wishlist: [...state.wishlist, newItem] }));
      },

      // 余额
      balance: 0,
      setBalance: (amount) => set({ balance: amount }),

      // 背景图片
      backgroundImage: null,
      setBackgroundImage: (url) => set({ backgroundImage: url }),

      // 统计数据
      getStatistics: () => {
        const state = get();
        const completedTasks = state.todos.filter((t) => t.completed).length;
        const averageProgress =
          state.projects.length > 0
            ? Math.round(
                state.projects.reduce((sum, p) => sum + p.progress, 0) /
                  state.projects.length
              )
            : 0;
        const habitChallenges = state.dailyChallenges.reduce(
          (sum, dc) => sum + dc.items.filter((i) => i.completed).length,
          0
        );
        const scheduleEvents = state.events.length;

        return {
          completedTasks,
          averageProgress,
          habitChallenges,
          scheduleEvents,
        };
      },
    }),
    {
      name: 'workbench-storage',
    }
  )
);
