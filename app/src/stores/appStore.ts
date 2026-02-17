import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type {
  Todo,
  Project,
  CalendarEvent,
  PersonalTask,
  Inspiration,
  HotItem,
  WeatherData,
  MoodType,
  DailyChallenge,
  WishlistItem,
  Statistics,
  UserApp,
  RunningApp,
  SidebarItem,
} from '@/types';
import * as api from '@/lib/api';

const DEFAULT_BUILTIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard', type: 'builtin', enabled: true, order: 0 },
  { id: 'todos', type: 'builtin', enabled: true, order: 1 },
  { id: 'projects', type: 'builtin', enabled: true, order: 2 },
  { id: 'personal', type: 'builtin', enabled: true, order: 3 },
  { id: 'schedule', type: 'builtin', enabled: true, order: 4 },
  { id: 'inspiration', type: 'builtin', enabled: true, order: 5 },
  { id: 'journal', type: 'builtin', enabled: true, order: 6 },
  { id: 'achievements', type: 'builtin', enabled: true, order: 7 },
  { id: 'apps', type: 'builtin', enabled: true, order: 8 },
  { id: 'agent', type: 'builtin', enabled: true, order: 9 },
];

function ensureBuiltinSidebarItems(items: SidebarItem[]): SidebarItem[] {
  const merged = [...items];
  for (const builtinItem of DEFAULT_BUILTIN_SIDEBAR_ITEMS) {
    if (!merged.some((item) => item.id === builtinItem.id)) {
      merged.push({ ...builtinItem, order: merged.length });
    }
  }
  return merged
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));
}

interface AppState {
  // 当前页面
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // 待办事项
  todos: Todo[];
  isLoadingTodos: boolean;
  fetchTodos: () => Promise<void>;
  addTodo: (title: string, priority: 'normal' | 'urgent') => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoTitle: (id: string, title: string) => Promise<void>;

  // 长期项目
  projects: Project[];
  isLoadingProjects: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (title: string, deadline: string) => Promise<void>;
  updateProjectProgress: (id: string, progress: number) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // 日程事件
  events: CalendarEvent[];
  isLoadingEvents: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (date: string) => CalendarEvent[];

  // 个人事务
  personalTasks: PersonalTask[];
  isLoadingPersonalTasks: boolean;
  fetchPersonalTasks: () => Promise<void>;
  addPersonalTask: (task: Omit<PersonalTask, 'id'>) => Promise<void>;
  deletePersonalTask: (id: string) => Promise<void>;

  // 灵感记录
  inspirations: Inspiration[];
  isLoadingInspirations: boolean;
  fetchInspirations: (includeArchived?: boolean) => Promise<void>;
  addInspiration: (content: string) => Promise<void>;
  toggleInspirationArchived: (id: string, isArchived: boolean) => Promise<void>;
  deleteInspiration: (id: string) => Promise<void>;

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

  // 初始化数据
  initializeData: () => Promise<void>;

  // 周打卡
  weeklyCheckIns: boolean[];
  toggleCheckIn: (index: number) => void;

  // 用户自定义应用
  userApps: UserApp[];
  runningApps: RunningApp[];
  activeAppId: string | null;
  addUserApp: (app: Omit<UserApp, 'id' | 'createdAt'>) => void;
  removeUserApp: (id: string) => void;
  launchUserApp: (id: string) => void;
  closeUserApp: (id: string) => void;
  updateUserApp: (id: string, updates: Partial<UserApp>) => void;

  // 侧边栏配置
  sidebarItems: SidebarItem[];
  addSidebarItem: (id: string, type: 'builtin' | 'app') => void;
  removeSidebarItem: (id: string) => void;
  toggleSidebarItem: (id: string) => void;
  reorderSidebarItems: (items: SidebarItem[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 当前页面
      currentPage: 'dashboard',
      setCurrentPage: (page) => set({ currentPage: page }),

      // 待办事项
      todos: [],
      isLoadingTodos: false,
      fetchTodos: async () => {
        set({ isLoadingTodos: true });
        try {
          const todos = await api.getTodos();
          set({ todos });
        } catch (error) {
          console.error('Failed to fetch todos:', error);
        } finally {
          set({ isLoadingTodos: false });
        }
      },
      addTodo: async (title, priority) => {
        try {
          const newTodo = await api.createTodo(title, priority);
          set((state) => ({ todos: [newTodo, ...state.todos] }));
        } catch (error) {
          console.error('Failed to add todo:', error);
        }
      },
      toggleTodo: async (id) => {
        const todo = get().todos.find((t) => t.id === id);
        if (!todo) return;
        try {
          await api.updateTodo({
            id,
            completed: !todo.completed,
          });
          set((state) => ({
            todos: state.todos.map((t) =>
              t.id === id ? { ...t, completed: !t.completed } : t
            ),
          }));
        } catch (error) {
          console.error('Failed to toggle todo:', error);
        }
      },
      deleteTodo: async (id) => {
        try {
          await api.deleteTodo(id);
          set((state) => ({
            todos: state.todos.filter((t) => t.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete todo:', error);
        }
      },
      updateTodoTitle: async (id, title) => {
        try {
          await api.updateTodo({ id, title });
          set((state) => ({
            todos: state.todos.map((t) =>
              t.id === id ? { ...t, title } : t
            ),
          }));
        } catch (error) {
          console.error('Failed to update todo title:', error);
          toast.error('更新待办事项失败');
        }
      },

      // 长期项目
      projects: [],
      isLoadingProjects: false,
      fetchProjects: async () => {
        set({ isLoadingProjects: true });
        try {
          const projects = await api.getProjects();
          set({ projects });
        } catch (error) {
          console.error('Failed to fetch projects:', error);
        } finally {
          set({ isLoadingProjects: false });
        }
      },
      addProject: async (title, deadline) => {
        try {
          const newProject = await api.createProject(title, deadline);
          set((state) => ({ projects: [...state.projects, newProject] }));
        } catch (error) {
          console.error('Failed to add project:', error);
        }
      },
      updateProjectProgress: async (id, progress) => {
        try {
          await api.updateProject({ id, progress });
          set((state) => ({
            projects: state.projects.map((p) =>
              p.id === id ? { ...p, progress } : p
            ),
          }));
        } catch (error) {
          console.error('Failed to update project progress:', error);
        }
      },
      deleteProject: async (id) => {
        try {
          await api.deleteProject(id);
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete project:', error);
        }
      },

      // 日程事件
      events: [],
      isLoadingEvents: false,
      fetchEvents: async () => {
        set({ isLoadingEvents: true });
        try {
          const events = await api.getEvents();
          set({ events });
        } catch (error) {
          console.error('Failed to fetch events:', error);
        } finally {
          set({ isLoadingEvents: false });
        }
      },
      addEvent: async (event) => {
        try {
          const newEvent = await api.createEvent(
            event.title,
            event.date,
            event.color,
            event.note
          );
          set((state) => ({ events: [...state.events, newEvent] }));
          toast.success('事件添加成功');
        } catch (error) {
          console.error('Failed to add event:', error);
          toast.error('添加事件失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      },
      deleteEvent: async (id) => {
        try {
          await api.deleteEvent(id);
          set((state) => ({
            events: state.events.filter((e) => e.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete event:', error);
        }
      },
      getEventsByDate: (date) => {
        return get().events.filter((e) => e.date === date);
      },

      // 个人事务
      personalTasks: [],
      isLoadingPersonalTasks: false,
      fetchPersonalTasks: async () => {
        set({ isLoadingPersonalTasks: true });
        try {
          const tasks = await api.getPersonalTasks();
          set({ personalTasks: tasks });
        } catch (error) {
          console.error('Failed to fetch personal tasks:', error);
        } finally {
          set({ isLoadingPersonalTasks: false });
        }
      },
      addPersonalTask: async (task) => {
        try {
          const newTask = await api.createPersonalTask(
            task.title,
            task.budget,
            task.date,
            task.location,
            task.note
          );
          set((state) => ({ personalTasks: [...state.personalTasks, newTask] }));
          toast.success('事务添加成功');
        } catch (error) {
          console.error('Failed to add personal task:', error);
          toast.error('添加事务失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      },
      deletePersonalTask: async (id) => {
        try {
          await api.deletePersonalTask(id);
          set((state) => ({
            personalTasks: state.personalTasks.filter((t) => t.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete personal task:', error);
        }
      },

      // 灵感记录
      inspirations: [],
      isLoadingInspirations: false,
      fetchInspirations: async (includeArchived = true) => {
        set({ isLoadingInspirations: true });
        try {
          const inspirations = await api.getInspirations(includeArchived);
          set({ inspirations });
        } catch (error) {
          console.error('Failed to fetch inspirations:', error);
        } finally {
          set({ isLoadingInspirations: false });
        }
      },
      addInspiration: async (content) => {
        const trimmed = content.trim();
        if (!trimmed) {
          toast.error('请输入灵感内容');
          return;
        }
        try {
          const newInspiration = await api.createInspiration(trimmed);
          set((state) => ({ inspirations: [newInspiration, ...state.inspirations] }));
        } catch (error) {
          console.error('Failed to add inspiration:', error);
          toast.error('新增灵感失败');
        }
      },
      toggleInspirationArchived: async (id, isArchived) => {
        try {
          const updated = await api.toggleInspirationArchived({ id, isArchived });
          set((state) => ({
            inspirations: state.inspirations.map((item) =>
              item.id === id ? updated : item
            ),
          }));
        } catch (error) {
          console.error('Failed to update inspiration archive status:', error);
          toast.error('更新灵感状态失败');
        }
      },
      deleteInspiration: async (id) => {
        try {
          await api.deleteInspiration(id);
          set((state) => ({
            inspirations: state.inspirations.filter((item) => item.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete inspiration:', error);
          toast.error('删除灵感失败');
        }
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
        set((state) => {
          // Check if date exists, if not create it
          const existingChallenge = state.dailyChallenges.find((dc) => dc.date === date);
          if (!existingChallenge) {
            return {
              dailyChallenges: [
                ...state.dailyChallenges,
                {
                  date,
                  items: [
                    { id: '1', title: '深呼吸练习', completed: challengeId === '1' },
                    { id: '2', title: '23:00前入睡', completed: challengeId === '2' },
                  ],
                },
              ],
            };
          }
          // Update existing challenge
          return {
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
          };
        });
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

      // 周打卡
      weeklyCheckIns: [false, false, false, false, false, false, false],
      toggleCheckIn: (index) => {
        set((state) => {
          const newCheckIns = [...state.weeklyCheckIns];
          newCheckIns[index] = !newCheckIns[index];
          return { weeklyCheckIns: newCheckIns };
        });
      },

      // 用户自定义应用
      userApps: [],
      runningApps: [],
      activeAppId: null,
      addUserApp: (app) => {
        const newApp: UserApp = {
          ...app,
          id: `${app.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          userApps: [...state.userApps, newApp],
        }));
        toast.success(`应用 "${app.name}" 添加成功`);
      },
      removeUserApp: (id) => {
        set((state) => ({
          userApps: state.userApps.filter((a) => a.id !== id),
          runningApps: state.runningApps.filter((r) => r.appId !== id),
          activeAppId: state.activeAppId === id ? null : state.activeAppId,
        }));
        toast.success('应用已删除');
      },
      launchUserApp: (id) => {
        const app = get().userApps.find((a) => a.id === id);
        if (!app) {
          toast.error('应用不存在');
          return;
        }
        set((state) => {
          const isRunning = state.runningApps.some((r) => r.appId === id);
          return {
            runningApps: isRunning
              ? state.runningApps
              : [...state.runningApps, { appId: id, startTime: Date.now() }],
            activeAppId: id,
          };
        });
      },
      closeUserApp: (id) => {
        set((state) => ({
          runningApps: state.runningApps.filter((r) => r.appId !== id),
          activeAppId: state.activeAppId === id ? null : state.activeAppId,
        }));
      },
      updateUserApp: (id, updates) => {
        set((state) => ({
          userApps: state.userApps.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }));
        toast.success('应用信息已更新');
      },

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

      // 初始化数据
      initializeData: async () => {
        const state = get();
        await Promise.all([
          state.fetchTodos(),
          state.fetchProjects(),
          state.fetchEvents(),
          state.fetchPersonalTasks(),
          state.fetchInspirations(false),
        ]);

        // 初始化侧边栏配置（如果还没有）
        // 注意：需要在异步操作后重新获取状态，因为 persist 中间件可能已经恢复了状态
        const currentState = get();
        set({ sidebarItems: ensureBuiltinSidebarItems(currentState.sidebarItems) });
      },

      // 侧边栏配置
      sidebarItems: [],
      addSidebarItem: (id, type) => {
        const state = get();
        const exists = state.sidebarItems.some((item) => item.id === id);
        if (exists) {
          // 如果已存在，启用它
          set({
            sidebarItems: state.sidebarItems.map((item) =>
              item.id === id ? { ...item, enabled: true } : item
            ),
          });
        } else {
          // 添加新项目
          const newItem: SidebarItem = {
            id,
            type,
            enabled: true,
            order: state.sidebarItems.length,
          };
          set({ sidebarItems: [...state.sidebarItems, newItem] });
        }
      },
      removeSidebarItem: (id) => {
        const state = get();
        const item = state.sidebarItems.find((i) => i.id === id);
        if (item?.type === 'builtin') {
          // 内置页面只禁用，不删除
          set({
            sidebarItems: state.sidebarItems.map((i) =>
              i.id === id ? { ...i, enabled: false } : i
            ),
          });
        } else {
          // 用户应用直接删除
          set({
            sidebarItems: state.sidebarItems.filter((i) => i.id !== id),
          });
        }
      },
      toggleSidebarItem: (id) => {
        set((state) => ({
          sidebarItems: state.sidebarItems.map((item) =>
            item.id === id ? { ...item, enabled: !item.enabled } : item
          ),
        }));
      },
      reorderSidebarItems: (items) => {
        set({ sidebarItems: items });
      },
    }),
    {
      name: 'workbench-storage',
      // 只持久化非数据库数据
      partialize: (state) => ({
        currentPage: state.currentPage,
        hotList: state.hotList,
        weather: state.weather,
        currentMood: state.currentMood,
        dailyChallenges: state.dailyChallenges,
        wishlist: state.wishlist,
        balance: state.balance,
        backgroundImage: state.backgroundImage,
        weeklyCheckIns: state.weeklyCheckIns,
        userApps: state.userApps,
        sidebarItems: state.sidebarItems,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.sidebarItems)) {
          state.sidebarItems = DEFAULT_BUILTIN_SIDEBAR_ITEMS;
          return;
        }
        state.sidebarItems = ensureBuiltinSidebarItems(state.sidebarItems);
      },
    }
  )
);
