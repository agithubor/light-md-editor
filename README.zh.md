<div align="center">

# 轻量md编辑器

一款轻量、免费、本地优先的 Markdown 编辑器。<br>
**双击任意 `.md` 文件即可打开编辑，保存时直接写回原文件，断网也能用。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)[![桌面版](https://img.shields.io/badge/Architecture-Tauri%20v2-success)](./app)[![多语言](https://img.shields.io/badge/I18N-10%20Languages-orange)](./i18n.js)

</div>

---

## 📌 项目由来（改自他人作品，特此致谢）

本项目的编辑器内核，来自 **冷逸（沃垠AI）** 创作的纯网页版 Markdown 编辑器——一个单文件 HTML 应用（`markdown-editor.html`），原仓库：<https://github.com/woyin2024/lengyi-markdown-editor.git>。

原版体验已经很好，但它是「网页应用」：保存只存在浏览器 `localStorage`、双击 `.md` 不会用它本身打开、且依赖 CDN 加载第三方库（断网不可用）。

本仓库在**不改动原版编辑逻辑**的前提下，把它封装成了一个 **Tauri v2 桌面程序**，新增了：

- 系统级关联 `.md` / `.markdown`，双击即用本程序打开；
- 保存时**真实写回磁盘上的原文件**（替代原版的缓存）；
- 第三方库全部本地化打包，**完全离线可用**；
- 单实例运行（已开窗口时再双击 `.md` 在当前窗口打开）。

原有界面、快捷键、多语言、导出等能力**全部保留**。原作品基于 MIT 协议开源，本仓库沿用同一协议。

---

## ✨ 功能特性

### 🖥️ 桌面增强（本仓库新增）
- **自动关联 `.md` / `.markdown`**：安装后双击 Markdown 文件即用本程序打开。
- **真实磁盘读写**：保存直接写回原文件路径，不再只是浏览器缓存。
- **完全离线**：marked / KaTeX / Mermaid / dom-to-image-more 已本地化（`app/vendor/`），无网也能预览公式与图表。
- **单实例**：已运行时再双击 `.md` 会在当前窗口打开，不重复启动。

### 📝 继承自原版的完整编辑体验
- 实时预览、双栏 / 单栏 / 纯预览、源码模式、可拖拽分栏（比例记忆）
- 丰富编辑工具：标题、加粗 / 斜体 / 下划线 / 删除线 / 上下标、列表、引用、代码、链接图片、表格、查找替换
- 10 种语言界面：简 / 繁中、English、日本語、한국어、Español、Français、Deutsch、Русский、Português（偏好记忆）
- 深色 / 浅色主题，一键切换并自动保存
- 多格式导出：`.md` / `.html` / `.doc` / `.pdf` / `.png`
- 完整快捷键：`Ctrl+S` 保存、`Ctrl+B` 加粗、`Ctrl+I` 斜体、`Ctrl+F` 查找替换等

---

## 🛠️ 技术架构

- **桌面框架**：Tauri v2（Windows 端复用系统 WebView2，安装包仅数 MB）
- **前端**：原版 `markdown-editor.html`（HTML5 + CSS3 + 原生 JS，无框架），仅新增约 30 行 Tauri 桥接（`app/index.html`）
- **桥接**：Rust 暴露 `read_markdown` / `write_markdown` / `get_startup_file_path` 命令；前端通过 `window.__TAURI__` 调用；双击 `.md` 经「命令行参数 + 单实例」链路载入
- **原有依赖**：`marked.js`（渲染）、`KaTeX`（公式）、`Mermaid 10`（图表）、`dom-to-image-more`（图片导出）

---

## 📁 项目结构

```
.
├── markdown-editor.html    # 原版网页编辑器（单文件，来自 冷逸 / 沃垠AI）
├── i18n.js                 # 多语言字典（10 种语言，来自原版）
├── web-to-md-proxy.py      # 本地代理脚本（可选，来自原版）
├── app/                    # Tauri 桌面封装工程（本仓库新增）
│   ├── index.html          # 改造后的前端入口（桥接真实文件读写）
│   ├── i18n.js             # 复制并新增 3 个提示词
│   ├── vendor/             # 本地化第三方库（离线）
│   └── src-tauri/          # Rust 源码 / 配置 / 图标
├── .github/workflows/      # GitHub Actions 云端构建
└── README.md               # 本文件
```

---

## 🚀 快速开始（普通用户）

1. 到本仓库 **Releases** 或 **Actions → Artifacts** 下载 `MD Editor_x.x.x_x64-setup.exe`；
2. 安装后，双击任意 `.md` 文件即可用本程序编辑；
3. 编辑后保存（`Ctrl+S` 或自动保存）会直接写回原文件。

> ⚠️ 安装包**未签名**，Windows SmartScreen 可能拦截，点「更多信息 → 仍要运行」即可（自用无碍）。

---

## 🔧 从源码构建

### 方式一：GitHub Actions（推荐，本机零依赖）
推送到 `main` / `master` 后，`windows-latest` runner 自动编译并产出 NSIS 安装包，到 Actions 页面下载 Artifact 即可（本机无需安装 Rust / VS / NSIS）。

### 方式二：本机构建
需 Windows + Rust (MSVC 目标) + Node 22 + NSIS（或 VS Build Tools 2022「使用 C++ 的桌面开发」）：

```bash
cd app
npm install
npm run tauri build
```

产物位于：`app/src-tauri/target/release/bundle/nsis/MD Editor_1.0.0_x64-setup.exe`

---

## 📜 开源协议与致谢

- 原版编辑器由 **冷逸（沃垠AI）** 创作，基于 [MIT License](LICENSE) 开源，原仓库：<https://github.com/woyin2024/lengyi-markdown-editor.git>
- 本仓库在其基础上进行桌面化封装，沿用同一 MIT 协议。
- 感谢原作者的优秀作品，让这个轻量编辑器得以在桌面上延续。

---

<div align="center">

如果它帮到了你，给个 ⭐ 吧。

**写得好，比什么都重要。**

</div>
