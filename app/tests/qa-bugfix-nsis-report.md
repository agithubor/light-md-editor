# QA 回归测试报告：tauri.conf.json `bundle.windows.nsis` 修复

- **测试日期**：2026-07-07
- **被测文件**：`D:\pypro\md-editor\app\src-tauri\tauri.conf.json`
- **校验依据**：Tauri v2 官方 JSON Schema（`C:\Users\pc\AppData\Local\Temp\tauri-schema.json`，154KB）
- **测试手段**：Python `jsonschema` 4.17.3（`Draft202012Validator`），仅做 schema 层校验，未执行 `cargo build`/`tauri build`/`npm install`
- **测试脚本**：`D:\pypro\md-editor\app\tests\validate-tauri-conf-full.py`

---

## 一、修复回顾（本轮回归针对的改动）

| 项 | 修复前（v1 残留/非法） | 修复后（v2 合法） |
|----|----------------------|------------------|
| `bundle.windows.nsis.shortcutName` | 存在（字段不存在于 v2） | 已删除 |
| `bundle.windows.nsis.installMode` | `"perUser"`（v1 旧值） | `"currentUser"`（v2 合法值） |

---

## 二、全量 schema 校验结果

使用 `jsonschema.Draft202012Validator(schema).iter_errors(config)` 对整份配置做完整校验。

**结果：PASS —— 整份 `tauri.conf.json` 无任何 `ValidationError`，完全符合官方 schema（0 错误）。**

> 说明：schema 顶层本身即为完整 JSON Schema（含 `$schema`/`properties`/`definitions`），`#/definitions/...` 的 `$ref` 由 `jsonschema` 自动解析，无需手动处理。

---

## 三、针对性断言结果（11 项全部 PASS）

| # | 断言 | 结果 |
|---|------|------|
| 1 | `bundle.windows.nsis` 不存在 `shortcutName` 键 | ✅ PASS |
| 2 | `bundle.windows.nsis.installMode === "currentUser"` | ✅ PASS |
| 3 | `bundle.windows.nsis.languages` 含 `"SimpChinese"` 与 `"English"` | ✅ PASS |
| 4 | `bundle.windows.nsis.displayLanguageSelector === true` | ✅ PASS |
| 5 | `bundle.fileAssociations[0]` 无 `icon` 字段 | ✅ PASS |
| 6 | `bundle.fileAssociations[0].ext` 含 `"md"` 与 `"markdown"` | ✅ PASS |
| 7 | `bundle.fileAssociations[0].role === "Editor"` | ✅ PASS |
| 8 | `bundle` 下平级无 `nsis` 键 | ✅ PASS |
| 9 | `bundle.targets` 含 `"nsis"` | ✅ PASS |
| 10 | `app.withGlobalTauri === true` | ✅ PASS |
| 11 | `identifier === "com.md-editor.app"` | ✅ PASS |

---

## 四、路由判定

**路由判定 = NoOne**

- 全量 schema 校验：0 错误 ✅
- 针对性断言：11/11 全过 ✅
- 结论：**修复成功，整份 `tauri.conf.json` 已 100% 通过官方 schema 校验**，无需主理人进一步介入。

---

## 五、附：执行命令记录

```bash
# 1. 确认 schema 存在
ls -l /tmp/tauri-schema.json        # 154933 bytes，存在

# 2. 安装校验依赖
D:/Program/Python313/python.exe -m pip install jsonschema   # 4.17.3

# 3. 运行校验脚本
D:/Program/Python313/python.exe tests/validate-tauri-conf-full.py
# 退出码 EXIT=0  —— 表示全过
```

> 备注：本机存在多个 Python 解释器，`jsonschema` 安装到了 `D:\Program\Python313\python.exe`；脚本内 `SCHEMA_PATH` 已使用 Git Bash `/tmp` 对应的真实 Windows 路径 `C:\Users\pc\AppData\Local\Temp\tauri-schema.json`，以避免跨解释器路径解析问题。
