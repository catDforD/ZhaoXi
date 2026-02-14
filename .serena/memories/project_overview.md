# ZhaoXi OS (shedule) 项目概述

## 项目简介
"ZhaoXi OS"（我的工作台）—— 一个基于 **Tauri** 的个人工作台桌面应用，用于管理待办事项、长期项目、日程安排、个人事务、生活手账和成就记录。

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
│   ├── pages/               # 页面组件
│   ├── stores/              # Zustand 状态管理
│   ├── types/               # TypeScript 类型定义
│   ├── hooks/               # 自定义 React Hooks
│   └── lib/                 # 工具函数
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs          # 主入口
│   │   ├── database.rs      # SQLite 数据库初始化
│   │   └── commands.rs      # Tauri 命令（API 实现）
│   └── icons/               # 应用图标
```

## 核心功能模块
1. **Dashboard** - 仪表盘，显示概览信息
2. **Todos** - 待办事项管理
3. **Projects** - 长期项目管理
4. **Schedule** - 日程安排
5. **Personal** - 个人事务
6. **Journal** - 生活手账
7. **Achievements** - 成就记录
8. **Apps** - 应用中心

## 路由机制
不使用 React Router —— 通过 appStore 中的 `currentPage` 实现简单的状态驱动路由，页面通过 `App.tsx` 中的 switch 语句渲染。

## 数据库
SQLite 数据库文件存储在系统应用数据目录，包含表：
- `todos` - 待办事项
- `projects` - 长期项目
- `events` - 日程事件
- `personal_tasks` - 个人事务
