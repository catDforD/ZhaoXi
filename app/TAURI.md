# Tauri 桌面应用构建指南

本项目已迁移为 Tauri 桌面应用，使用 Rust 作为后端，SQLite 作为本地数据库。

## 架构变化

### 原架构 (Express + React)
```
React Frontend ──HTTP──> Express Backend ──> SQLite
```

### 新架构 (Tauri)
```
React Frontend ──Tauri IPC──> Rust Backend ──> SQLite
```

## 前置要求

1. **Node.js** 20+ (`nvm use`)
2. **Rust** 最新稳定版
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
3. **系统依赖**
   - Ubuntu/Debian: `sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev`
   - macOS: Xcode Command Line Tools
   - Windows: Microsoft Visual Studio C++ Build Tools

## 安装依赖

```bash
cd app

# 安装 Node.js 依赖
npm install

# Rust 依赖会在第一次构建时自动安装
```

## 开发模式

```bash
# 启动 Tauri 开发服务器（前后端同时启动）
npm run tauri:dev

# 或直接使用
npx tauri dev
```

## 构建生产版本

```bash
# 构建桌面应用
npm run tauri:build

# 输出目录
# - Linux: src-tauri/target/release/bundle/
# - macOS: src-tauri/target/release/bundle/
# - Windows: src-tauri\target\release\bundle\
```

## 项目结构

```
app/
├── src/                    # React 前端代码
│   ├── lib/api.ts         # Tauri API 封装（调用 Rust 命令）
│   └── stores/            # Zustand 状态管理
├── src-tauri/             # Rust 后端代码
│   ├── src/
│   │   ├── main.rs        # 主入口
│   │   ├── database.rs    # SQLite 数据库初始化
│   │   └── commands.rs    # Tauri 命令（API 实现）
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri 配置
└── package.json
```

## 数据库位置

SQLite 数据库文件存储在系统应用数据目录：
- **Linux**: `~/.local/share/com.explore-os.app/workbench.db`
- **macOS**: `~/Library/Application Support/com.explore-os.app/workbench.db`
- **Windows**: `%APPDATA%\com.explore-os.app\workbench.db`

## 新增/修改的文件

### 新增文件
1. `src-tauri/src/main.rs` - Rust 主程序
2. `src-tauri/src/database.rs` - 数据库模块
3. `src-tauri/src/commands.rs` - API 命令
4. `src-tauri/Cargo.toml` - Rust 依赖
5. `src-tauri/tauri.conf.json` - Tauri 配置
6. `src/lib/api.ts` - 前端 API 封装

### 修改文件
1. `package.json` - 添加 Tauri 脚本和依赖
2. `src/stores/appStore.ts` - 改用 API 调用而非 localStorage
3. `src/App.tsx` - 添加数据初始化

## 功能特性

- ✅ 本地 SQLite 数据库，数据完全私有
- ✅ 单机运行，无需网络
- ✅ 系统托盘支持（可扩展）
- ✅ 自动更新支持（可配置）
- ✅ 原生性能，小巧包体积

## 常见问题

### 构建失败：找不到 libwebkit2gtk
```bash
sudo apt-get install libwebkit2gtk-4.1-dev
```

### Rust 编译错误
```bash
# 清理并重新构建
cargo clean --manifest-path src-tauri/Cargo.toml
npm run tauri:build
```

### 数据库权限错误
确保应用数据目录有写入权限，或手动创建目录。
