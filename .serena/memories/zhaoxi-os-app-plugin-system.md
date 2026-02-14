# ZhaoXi OS 应用插件系统实现记录

## 实现概述
实现了完整的应用插件系统，支持用户动态添加 Web 应用和本地应用到工作台。

## 核心功能

### 1. 类型定义 (src/types/index.ts)
- `UserApp`: 用户应用类型，包含 id、name、description、icon、color、type、url/localPath、createdAt
- `RunningApp`: 运行中的应用状态

### 2. 状态管理 (src/stores/appStore.ts)
- `userApps`: 用户应用列表
- `runningApps`: 运行中的应用
- `activeAppId`: 当前激活的应用
- `addUserApp`: 添加应用
- `removeUserApp`: 删除应用
- `launchUserApp`: 启动应用
- `closeUserApp`: 关闭应用

### 3. 应用容器 (src/pages/AppContainer.tsx)
- iframe 沙箱加载应用
- 顶部导航栏（返回、应用信息、关闭按钮）
- 加载状态指示器
- 超时检测（10秒）
- 错误提示（针对 X-Frame-Options 限制的网站）
- "外部打开"按钮（使用 Tauri shell 插件）
- 本地应用路径解析（开发/生产环境兼容）

### 4. 应用中心页面 (src/pages/AppsPage.tsx)
- 内置应用展示（灰色、不可点击）
- 我的应用区域（动态加载 userApps）
- 添加应用按钮
- 应用卡片右键菜单（启动、删除）
- 类型标签（Web/本地）

### 5. 添加应用对话框 (src/components/features/AddAppDialog.tsx)
- 预设应用标签（8个 Web 应用 + 2个本地应用）
- 自定义应用标签
- 图标选择器（29个 Lucide 图标）
- 颜色主题选择器（13种颜色）
- 类型切换（Web/本地）
- URL/路径输入验证

### 6. 动态图标组件 (src/components/features/DynamicIcon.tsx)
- 根据图标名称动态渲染 Lucide 图标

### 7. 本地应用示例 (app/public/apps/pomodoro/index.html)
- 完整的番茄钟应用
- 可视化进度环
- 可配置专注/休息时长
- 自动切换模式
- 今日统计
- 音效提示
- 键盘快捷键（空格暂停/继续，R重置）
- 数据持久化（localStorage）

## 路由系统
- 用户应用路由格式: `app:{appId}`
- App.tsx 中 renderPage 函数处理 app: 前缀路由

## 文件变更清单

### 修改文件
- src/types/index.ts
- src/stores/appStore.ts
- src/App.tsx
- src/pages/AppsPage.tsx

### 新增文件
- src/pages/AppContainer.tsx
- src/components/features/AddAppDialog.tsx
- src/components/features/DynamicIcon.tsx
- src/lib/apps.ts
- app/public/apps/pomodoro/index.html

## 依赖安装
```bash
npm install @tauri-apps/plugin-shell
```

## 使用方法
1. 进入"应用中心"
2. 点击"添加应用"
3. 选择预设应用或自定义添加
4. 点击应用卡片在工作台内部打开
5. 受限网站会显示"外部打开"按钮

## 注意事项
- 许多网站（GitHub、Notion、Figma等）禁止 iframe 加载，会显示友好提示
- 本地应用在开发模式下通过 localhost:5173 访问
- 生产模式下使用 Tauri convertFileSrc 转换路径
