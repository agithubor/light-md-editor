# QA Bugfix 回归测试报告

- **测试对象**：`D:\pypro\md-editor\app\src-tauri\tauri.conf.json`
- **测试类型**：Tauri v2 schema 校验错误回归验证（配置层，未执行编译）
- **测试人**：严过关（QA 工程师）
- **验证脚本**：`D:\pypro\md-editor\app\tests\validate-tauri-conf-regression.mjs`
- **执行命令**：`node tests/validate-tauri-conf-regression.mjs`
- **退出码**：`0`（全部断言通过）

## 修复背景
原文件存在两处 Tauri v2 schema 非法：
1. `bundle.fileAssociations[].icon` 字段（Tauri v2 不允许逐条文件关联图标）。
2. `bundle.nsis` 平级块（应迁移到 `bundle.windows.nsis`）。

## 断言结果（逐项）

| 编号 | 断言 | 结果 | 详情 |
|------|------|------|------|
| A1 | JSON 合法可解析 | ✅ PASS | parse ok |
| A2a | `bundle.fileAssociations` 存在且非空 | ✅ PASS | 1 条 |
| A2b | `ext` 含 `"md"` | ✅ PASS | — |
| A2c | `ext` 含 `"markdown"` | ✅ PASS | — |
| A2d | 任何条目都不带 `icon` 字段（修复点1） | ✅ PASS | 无 icon |
| A3 | `bundle.nsis` 平级键已不存在 | ✅ PASS | `undefined` |
| A4a | `bundle.windows.nsis` 存在 | ✅ PASS | — |
| A4b | `displayLanguageSelector` 存在 | ✅ PASS | `true` |
| A4c | `languages` 含 SimpChinese 与 English | ✅ PASS | — |
| A4d | `installMode === "perUser"` | ✅ PASS | — |
| A4e | `shortcutName === "MD Editor"` | ✅ PASS | — |
| A5a | `bundle.targets` 含 `"nsis"` | ✅ PASS | — |
| A5b | `bundle.icon` 含 9 项且含 `icons/icon.ico` | ✅ PASS | count=9 |
| A5c | `identifier === "com.md-editor.app"` | ✅ PASS | — |
| A5d | `app.withGlobalTauri === true` | ✅ PASS | — |
| A5e | `app.windows[0].label === "main"` | ✅ PASS | — |
| A5f | `csp` 含 `unsafe-inline` 与 `ipc: http://ipc.localhost` | ✅ PASS | — |
| A6 | `fileAssociations` 块内不含 `"icon"` 字样（可选） | ✅ PASS | — |

**通过项：18 / 18**，总判定：**ALL PASS**。

## Node 输出（节选）
```
PASS | A1 JSON 合法可解析 | parse ok
PASS | A2d 任何条目都不带 icon 字段（修复点1）
PASS | A3 bundle.nsis 平级键已不存在
PASS | A4a bundle.windows.nsis 存在
PASS | A4e shortcutName === "MD Editor"
PASS | A5b bundle.icon 含 9 项且含 icons/icon.ico | count=9
...
=== 汇总 ===
通过项: 18/18
总判定: ALL PASS
```

## 路由判定
- **路由判定 = NoOne**
- 原两个 schema 错误**均已消除**：
  - 修复点 1（文件关联 `icon` 字段）：已删除，无残留。
  - 修复点 2（`nsis` 平级键）：已迁移至 `bundle.windows.nsis`，且 `displayLanguageSelector`/`languages`/`installMode`/`shortcutName` 全部保留，无字段丢失。
  - 其余关键字段（`targets`、`icon` 9 项、`identifier`、`withGlobalTauri`、`windows[0].label`、`csp`）均未被误改。

无需返工，回归验证成功。
