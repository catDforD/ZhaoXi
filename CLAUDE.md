# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本代码库的指引。

## 项目概述

"Explore OS"（我的工作台）—— 一个基于 React 的个人工作台应用，用于管理待办事项、长期项目、日程安排、个人事务、生活手账和成就记录。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **UI 组件**: shadcn/ui（New York 风格）+ Radix UI 基础组件
- **状态管理**: Zustand（持久化到 localStorage）
- **动画**: Framer Motion
- **图标**: Lucide React
- **后端**: Express.js + SQLite3（sqlite3 包）
- **构建工具**: Vite，集成 kimi-plugin-inspect-react 插件

## 项目结构

```
app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件（自动生成）
│   │   ├── layout/          # 布局组件
│   │   └── features/        # 功能组件
│   ├── pages/               # 页面组件（Dashboard、TodoPage 等）
│   ├── stores/
│   │   └── appStore.ts      # Zustand 状态管理
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── hooks/               # 自定义 React Hooks
│   └── lib/
│       └── utils.ts         # 工具函数（cn 辅助函数）
├── server/                  # Express 后端
│   ├── index.ts             # 服务端入口
│   ├── routes/              # API 路由（todos、projects、events、personal）
│   └── db/                  # 数据库文件
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── components.json          # shadcn/ui 配置
```

## 开发命令

所有命令均在 `app/` 目录下执行：

```bash
# 前端开发（Vite 开发服务器）
npm run dev

# 生产构建
npm run build

# 运行 ESLint
npm run lint

# 预览生产构建
npm run preview

# 启动后端服务器（Express）
npm run server

# 启动后端服务器（热重载模式）
npm run server:dev

# 同时启动前后端（需要安装 concurrently）
npm run dev:all
```

## 架构说明

### 状态管理
- **Zustand store** 位于 `src/stores/appStore.ts`，管理所有客户端状态
- 使用 `persist` 中间件将数据持久化到 localStorage（键名：`workbench-storage`）
- 后端 API 路由存在，但应用主要使用本地状态

### 路由
- 不使用 React Router —— 通过 appStore 中的 `currentPage` 实现简单的状态驱动路由
- 页面通过 `App.tsx` 中的 switch 语句渲染
- 可用页面：dashboard、todos、projects、personal、schedule、journal、achievements、apps

### 组件组织
- **shadcn/ui 组件**：位于 `src/components/ui/`，自动生成，请勿手动修改
- **布局组件**：`src/components/layout/` —— 侧边栏、导航等
- **功能组件**：`src/components/features/` —— TodoItem、ProjectCard 等

### 样式
- 使用 Tailwind CSS，采用 CSS 变量实现主题（HSL 颜色格式）
- 毛玻璃效果使用 `backdrop-filter: blur()`
- 自定义颜色变量定义在 `tailwind.config.js` 和 `src/index.css`

### 后端 API

Express 服务器运行在 3001 端口，提供以下路由：
- `GET/POST/PUT/DELETE /api/todos` —— 待办事项管理
- `GET/POST/PUT/DELETE /api/projects` —— 长期项目管理
- `GET/POST/DELETE /api/events` —— 日程事件
- `GET/POST/DELETE /api/personal` —— 个人事务

### 添加 shadcn/ui 组件

```bash
cd app
npx shadcn add <组件名称>
```

## 环境管理

### Node 版本

项目使用 Node.js 20+。通过以下文件管理版本：
- `.nvmrc` —— nvm 版本管理
- `.node-version` —— 其他版本管理器兼容

```bash
# 使用正确版本
nvm use
```

### 同时启动前后端

```bash
# 需要安装 concurrently
npm install -D concurrently

# 一键启动前后端
npm run dev:all
```

### 环境变量

复制 `.env.example` 为 `.env.local` 并配置：

```bash
cp .env.example .env.local
```

### 端口占用

| 服务 | 默认端口 | 环境变量 |
|------|----------|----------|
| 前端 | 5173 | Vite 默认 |
| 后端 | 3001 | `PORT` |

## 核心类型定义

`src/types/index.ts` 中的主要类型：
- `Todo` —— id、title、completed、priority（'normal' | 'urgent'）
- `Project` —— id、title、deadline、progress、status
- `CalendarEvent` —— id、title、date、color、note
- `PersonalTask` —— id、title、budget、date、location、note
- `MoodType` —— 'happy' | 'calm' | 'tired' | 'excited' | 'sad' | 'numb'

## 构建配置

- **Vite**: base URL 设为 `./` 以支持相对路径
- **路径别名**: `@/` 映射到 `src/` 目录
- **kim inspect 插件**: 已集成到 vite.config.ts
- **ESLint**: TypeScript + React Hooks + React Refresh
