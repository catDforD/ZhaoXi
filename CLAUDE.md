# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供本代码库的指引。

## 项目概述

"Explore OS"（我的工作台）—— 一个基于 **Tauri** 的个人工作台桌面应用，用于管理待办事项、长期项目、日程安排、个人事务、生活手账和成就记录。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **桌面框架**: Tauri v2 (Rust + WebView)
- **UI 组件**: shadcn/ui（New York 风格）+ Radix UI 基础组件
- **状态管理**: Zustand
- **数据库**: SQLite (通过 sqlx 在 Rust 后端访问)
- **动画**: Framer Motion
- **图标**: Lucide React
- **构建工具**: Vite + Tauri CLI

## 项目结构

```
app/
├── src/                    # React 前端代码
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
│   ├── lib/
│   │   ├── utils.ts         # 工具函数（cn 辅助函数）
│   │   └── api.ts           # Tauri API 封装
│   └── App.tsx              # 应用入口
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs          # 主入口
│   │   ├── database.rs      # SQLite 数据库初始化
│   │   └── commands.rs      # Tauri 命令（API 实现）
│   ├── Cargo.toml           # Rust 依赖配置
│   ├── tauri.conf.json      # Tauri 配置
│   └── icons/               # 应用图标
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── components.json          # shadcn/ui 配置
```

## 开发命令

所有命令均在 `app/` 目录下执行：

```bash
# 安装依赖
npm install

# 开发模式（启动 Tauri 开发服务器）
npm run tauri:dev

# 构建生产版本
npm run tauri:build

# 原生前端开发（仅 Vite，不启动 Tauri）
npm run dev

# 生产构建（仅前端）
npm run build

# 运行 ESLint
npm run lint
```

## 架构说明

### Tauri 架构

```
┌─────────────────────────────────────┐
│         Tauri 桌面应用               │
│  ┌─────────────────────────────┐   │
│  │    WebView (前端 UI)         │   │
│  │    - React + Vite           │   │
│  │    - Tailwind + shadcn      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │    Rust 后端层               │   │
│  │    - SQLite 数据库          │   │
│  │    - Tauri Commands         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 状态管理
- **Zustand store** 位于 `src/stores/appStore.ts`
- 数据通过 Tauri Commands 与 Rust 后端通信
- SQLite 数据库存储在应用数据目录，持久化保存

### 路由
- 不使用 React Router —— 通过 appStore 中的 `currentPage` 实现简单的状态驱动路由
- 页面通过 `App.tsx` 中的 switch 语句渲染
- 可用页面：dashboard、todos、projects、personal、schedule、journal、achievements、apps

### 后端 API (Tauri Commands)

所有数据操作通过 Tauri IPC 调用 Rust 命令：

**待办事项**
- `get_todos` - 获取所有待办
- `create_todo` - 创建待办
- `update_todo` - 更新待办
- `delete_todo` - 删除待办

**项目管理**
- `get_projects` - 获取所有项目
- `create_project` - 创建项目
- `update_project` - 更新项目
- `delete_project` - 删除项目

**日程事件**
- `get_events` - 获取所有事件
- `get_events_by_date` - 按日期获取事件
- `create_event` - 创建事件
- `update_event` - 更新事件
- `delete_event` - 删除事件

**个人事务**
- `get_personal_tasks` - 获取所有个人事务
- `create_personal_task` - 创建个人事务
- `update_personal_task` - 更新个人事务
- `delete_personal_task` - 删除个人事务

### 组件组织
- **shadcn/ui 组件**：位于 `src/components/ui/`，自动生成，请勿手动修改
- **布局组件**：`src/components/layout/` —— 侧边栏、导航等
- **功能组件**：`src/components/features/` —— TodoItem、ProjectCard 等

### 样式
- 使用 Tailwind CSS，采用 CSS 变量实现主题（HSL 颜色格式）
- 毛玻璃效果使用 `backdrop-filter: blur()`
- 自定义颜色变量定义在 `tailwind.config.js` 和 `src/index.css`

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

### Rust 环境

需要安装 Rust 工具链：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 系统依赖

**Ubuntu/Debian:**
```bash
sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
安装 Microsoft Visual Studio C++ Build Tools

## 数据库

SQLite 数据库文件存储在系统应用数据目录：
- **Linux**: `~/.local/share/com.explore-os.app/workbench.db`
- **macOS**: `~/Library/Application Support/com.explore-os.app/workbench.db`
- **Windows**: `%APPDATA%\com.explore-os.app\workbench.db`

数据库在应用启动时自动初始化，包含以下表：
- `todos` - 待办事项
- `projects` - 长期项目
- `events` - 日程事件
- `personal_tasks` - 个人事务

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
- **Tauri**: 配置在 `src-tauri/tauri.conf.json`
- **ESLint**: TypeScript + React Hooks + React Refresh

## 详细文档

- [Tauri 构建指南](app/TAURI.md) - Tauri 桌面应用的详细构建说明
