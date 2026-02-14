# 代码风格和约定

## 语言
- TypeScript/React 代码使用英文
- 注释和文档根据目标读者使用中文或英文
- UI 文本使用中文

## TypeScript 规范

### 类型定义
- 接口使用 `PascalCase` 命名
- 类型定义放在 `src/types/index.ts`
- 优先使用接口（interface）而非类型别名（type）

### 命名约定
- 组件：PascalCase (如 `TodoPage`, `Sidebar`)
- 函数：camelCase (如 `useAppStore`, `initializeData`)
- 常量：UPPER_SNAKE_CASE
- 类型/接口：PascalCase

### 文件组织
- 组件放在 `src/components/` 下，按功能分组
- 页面放在 `src/pages/` 下
- 自定义 hooks 放在 `src/hooks/` 下
- 工具函数放在 `src/lib/` 下

## React 规范

### 组件结构
- 使用函数组件 + Hooks
- 使用 `export default` 导出页面组件
- 使用命名导出导出辅助组件

### 状态管理
- 使用 Zustand 进行全局状态管理
- store 定义在 `src/stores/appStore.ts`
- 通过 Tauri IPC 调用 Rust 后端命令

### 路由
- 不使用 React Router
- 使用 `currentPage` 状态驱动页面切换
- 在 `App.tsx` 中使用 switch 语句渲染不同页面

## 样式规范

### Tailwind CSS
- 使用 Tailwind 的 utility classes
- 自定义颜色变量定义在 `tailwind.config.js`
- 使用 HSL 格式定义颜色变量

### shadcn/ui 组件
- 自动生成，不要手动修改
- 使用 `npx shadcn add <组件名>` 添加新组件

## 导入路径
- 使用 `@/` 别名指向 `src/` 目录
- 示例：`import { Sidebar } from '@/components/layout/Sidebar'`

## 动画
- 使用 Framer Motion 实现过渡动画
- 页面切换使用 `AnimatePresence` + `motion.div`

## 图标
- 使用 Lucide React 图标库
- 导入方式：`import { IconName } from 'lucide-react'`
