# 我的工作台 Explore OS - 技术规范文档

## 1. 组件清单

### shadcn/ui 组件
- Button - 按钮
- Card - 卡片容器
- Input - 输入框
- Checkbox - 复选框
- Badge - 标签
- Progress - 进度条
- Tabs - 标签页
- Dialog - 对话框
- Calendar - 日历
- Popover - 弹出层
- ScrollArea - 滚动区域
- Separator - 分隔线
- Tooltip - 提示框

### 自定义组件

#### 布局组件
- `Sidebar` - 侧边栏导航
- `MainLayout` - 主布局容器
- `GlassCard` - 毛玻璃卡片

#### 功能组件
- `TodoItem` - 待办事项项
- `ProjectCard` - 长期项目卡片
- `CalendarGrid` - 日历网格
- `Timeline` - 时间轴
- `MoodSelector` - 心情选择器
- `WeatherCard` - 天气卡片
- `HotList` - 热榜列表
- `StatCard` - 统计卡片

#### 动画组件
- `FadeTransition` - 淡入淡出过渡
- `CountUp` - 数字滚动
- `ProgressBar` - 动画进度条

---

## 2. 动画实现计划

| 动画 | 库 | 实现方式 | 复杂度 |
|------|-----|---------|--------|
| 页面切换 | Framer Motion | AnimatePresence + motion.div | 中 |
| 卡片悬浮 | CSS/Tailwind | hover:translate-y + shadow | 低 |
| 列表增删 | Framer Motion | layout + AnimatePresence | 中 |
| 进度条 | CSS + JS | width transition + state | 低 |
| 数字滚动 | 自定义Hook | requestAnimationFrame | 中 |
| 复选框勾选 | CSS | transform scale bounce | 低 |
| 日历切换 | Framer Motion | slide + fade | 中 |
| 毛玻璃效果 | CSS | backdrop-filter: blur | 低 |

---

## 3. 项目文件结构

```
/mnt/okcomputer/output/app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件
│   │   ├── layout/          # 布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   └── GlassCard.tsx
│   │   ├── features/        # 功能组件
│   │   │   ├── TodoItem.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── CalendarGrid.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── MoodSelector.tsx
│   │   │   ├── WeatherCard.tsx
│   │   │   ├── HotList.tsx
│   │   │   └── StatCard.tsx
│   │   └── animations/      # 动画组件
│   │       ├── FadeTransition.tsx
│   │       └── CountUp.tsx
│   ├── pages/               # 页面组件
│   │   ├── Dashboard.tsx    # 我的主页
│   │   ├── TodoPage.tsx     # 待办事项
│   │   ├── ProjectsPage.tsx # 长期事项
│   │   ├── PersonalPage.tsx # 个人事务
│   │   ├── SchedulePage.tsx # 日程管理
│   │   ├── JournalPage.tsx  # 生活手账
│   │   ├── AchievementsPage.tsx # 我的成就
│   │   └── AppsPage.tsx     # 应用中心
│   ├── hooks/               # 自定义Hooks
│   │   ├── useTodos.ts
│   │   ├── useProjects.ts
│   │   ├── useSchedule.ts
│   │   └── useCountUp.ts
│   ├── stores/              # 状态管理
│   │   └── appStore.ts      # Zustand store
│   ├── types/               # TypeScript类型
│   │   └── index.ts
│   ├── lib/                 # 工具函数
│   │   └── utils.ts
│   ├── api/                 # API接口
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server/                  # 后端API
│   ├── index.ts
│   ├── routes/
│   │   ├── todos.ts
│   │   ├── projects.ts
│   │   ├── schedule.ts
│   │   └── personal.ts
│   └── db/
│       └── database.ts
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 4. 依赖安装

### 前端依赖
```bash
# 动画库
npm install framer-motion

# 状态管理
npm install zustand

# 日期处理
npm install date-fns

# 图标
npm install lucide-react

# HTTP客户端
npm install axios
```

### 后端依赖
```bash
npm install express cors sqlite3
npm install -D @types/express @types/cors ts-node nodemon
```

---

## 5. 路由设计

| 路径 | 页面 | 描述 |
|------|------|------|
| / | Dashboard | 我的主页 |
| /todos | TodoPage | 待办事项 |
| /projects | ProjectsPage | 长期事项 |
| /personal | PersonalPage | 个人事务 |
| /schedule | SchedulePage | 日程管理 |
| /journal | JournalPage | 生活手账 |
| /achievements | AchievementsPage | 我的成就 |
| /apps | AppsPage | 应用中心 |

---

## 6. 数据类型定义

```typescript
// 待办事项
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: 'normal' | 'urgent';
  createdAt: Date;
}

// 长期项目
interface Project {
  id: string;
  title: string;
  deadline: Date;
  progress: number;
  status: 'active' | 'completed';
}

// 日程事件
interface Event {
  id: string;
  title: string;
  date: Date;
  color: string;
  note?: string;
}

// 个人事务
interface PersonalTask {
  id: string;
  title: string;
  budget?: number;
  date?: Date;
  location?: string;
  note?: string;
}

// 热榜项
interface HotItem {
  rank: number;
  title: string;
  heat: string;
}
```

---

## 7. API 设计

### 待办事项 API
- GET /api/todos - 获取所有待办
- POST /api/todos - 创建待办
- PUT /api/todos/:id - 更新待办
- DELETE /api/todos/:id - 删除待办

### 长期项目 API
- GET /api/projects - 获取所有项目
- POST /api/projects - 创建项目
- PUT /api/projects/:id - 更新项目
- DELETE /api/projects/:id - 删除项目

### 日程 API
- GET /api/events - 获取事件
- POST /api/events - 创建事件
- DELETE /api/events/:id - 删除事件

### 个人事务 API
- GET /api/personal - 获取事务
- POST /api/personal - 创建事务
- DELETE /api/personal/:id - 删除事务
