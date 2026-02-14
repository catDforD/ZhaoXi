# 常用命令参考

## 开发命令（在 app/ 目录下执行）

### 安装依赖
```bash
cd app
npm install
```

### 开发模式
```bash
# 启动 Tauri 开发服务器（推荐）
npm run tauri:dev

# 仅前端开发（不启动 Tauri）
npm run dev
```

### 构建
```bash
# 构建生产版本（桌面应用）
npm run tauri:build

# 生产构建（仅前端）
npm run build
```

### 代码检查
```bash
# 运行 ESLint
npm run lint
```

## 环境管理

### Node 版本
```bash
# 使用正确的 Node 版本
nvm use
```

### Rust 环境（如需重新安装）
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 添加 shadcn/ui 组件
```bash
cd app
npx shadcn add <组件名称>
```

## 系统命令（Linux）
```bash
# 文件列表
ls -la

# 搜索文件内容
grep -r "pattern" --include="*.ts" --include="*.tsx"

# 查找文件
find . -name "*.tsx" -type f
```

## Tauri 相关

### 开发服务器启动
```bash
cd app
npm run tauri:dev
```

### 构建桌面应用
```bash
cd app
npm run tauri:build
```
