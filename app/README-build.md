# MD Editor · 构建与打包指引（Windows）

本目录是一个 **Tauri v2** 桌面工程，把原网页版 Markdown 编辑器封装为可安装程序，支持双击 `.md`/`.markdown` 自动打开、保存真实写回磁盘、离线可用。

> ⚠️ 当前沙箱（无 MSVC 链接器 / 无 NSIS）无法在此编译出 `.exe`。请在你自己的 Windows 开发机上按以下步骤一键出包。

## 一、前置依赖（仅需首次安装）

1. **Windows 10 / 11**（已自带 WebView2 运行时；若没有，去微软官网装 "WebView2 Runtime"）
2. **Node.js 22+**（含 npm）
3. **Rust 稳定版（MSVC 目标）**
   - 装 Rust：https://rustup.rs → 选 MSVC (默认)
   - 需 **MSVC 链接器**：安装 **Visual Studio Build Tools 2022** 并勾选「使用 C++ 的桌面开发」工作负载，或：
     ```powershell
     winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
     ```
4. **NSIS**（打 `.exe` 安装包用）
   ```powershell
   winget install Nullsoft.NSIS
   ```
   装完后确保 `makensis` 在 PATH（重新打开终端确认）。

## 二、构建安装包

```powershell
cd app
npm install
npm run tauri build
```

成功后安装包位于：

```
app/src-tauri/target/release/bundle/nsis/MD Editor_1.0.0_x64-setup.exe
```

双击该 `setup.exe` 安装即可。安装程序会自动：
- 把 `.md` / `.markdown` 关联到本程序
- 在开始菜单 / 桌面创建「MD Editor」快捷方式

## 三、日常开发预览

```powershell
cd app
npm run tauri dev
```

`tauri dev` 会先启动 Vite 静态服务器（:5173）再拉起窗口，支持热更新。

## 四、使用行为说明

| 场景 | 行为 |
|------|------|
| 直接启动程序（无文件） | 同原网页版：空白新文档，内容存 localStorage |
| 双击 `.md` / `.markdown` | 用本程序打开并载入内容 |
| 已运行时再双击另一个 `.md` | 在已打开窗口载入该文件（单实例，聚焦窗口） |
| 编辑后自动/手动保存 | **真实写回原文件路径**（不再只是 localStorage） |
| 断网 | 预览(marked/katex/mermaid)、导入、导出、多语言、快捷键均正常（库已本地化） |
| 导入 / 清空 | 自动脱离之前的磁盘文件，避免误写回 |

> 注意：原网页版里 `exportWord()` 导出的 `.doc` 文件内部仍通过 CDN 引入 KaTeX 用于公式渲染（仅影响「导出产物」的联网显示，主程序完全离线）。如需导出文件也离线自包含，可后续把本地 KaTeX 内联进导出模板。

## 五、目录结构速览

```
app/
├── web/                  # 前端静态资源（frontendDist，已与 src-tauri/node_modules 物理隔离）
│   ├── index.html        # 改造后的前端主文档（仅新增约 30 行 Tauri 桥接）
│   ├── i18n.js           # 多语言（zh-CN 新增 3 个 toast key）
│   └── vendor/           # 本地化第三方库（marked/katex/mermaid/dom-to-image-more）
├── src-tauri/            # Rust 端：命令 + 文件关联 + 打包配置
│   ├── src/main.rs
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── capabilities/default.json
├── docs/                 # 架构设计 + 时序/类图
└── tests/                # QA 验证脚本与报告
```
