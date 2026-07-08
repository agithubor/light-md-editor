# QA 测试报告 — Tauri v2 Markdown 桌面工程

- **被测对象**：`D:\pypro\md-editor\app\`（工程师交付，IS_PASS: YES）
- **测试工程师**：严过关（software-qa-engineer）
- **测试范围**：A 配置合法性 / B 前端桥接正确性 / C vendor 离线完整性 / D 桥接逻辑单测 / E 智能路由判定
- **环境约束**：本沙箱无 MSVC 链接器、无 NSIS，**未执行 `cargo build` / `tauri build` / `npm install`**，仅做可执行静态验证 + Node 单测。

---

## 总览

| 章节 | 验证项 | 结果 |
|------|--------|------|
| A | 配置合法性（tauri.conf.json / capabilities） | ✅ 18/18 通过 |
| B | index.html 桥接正确性（grep + 判读） | ✅ 全部通过 |
| C | vendor 离线完整性 | ✅ 全部通过 |
| D | 桥接逻辑单测（bridge.test.mjs） | ✅ 17/17 通过 |
| E | 智能路由判定 | ➡️ **NoOne**（无源码缺陷） |

**路由判定 = NoOne**
**测试通过率 = 100%**（配置 18/18、桥接单测 17/17、vendor 语法 5/5、文件齐全 6/6、字体 20/20）
**遗留源码缺陷数 = 0**

---

## A. 配置合法性（node 校验）

> 复现脚本：`node tests/validate-config.mjs`（已随本交付留在 `tests/`）

```
PASS  conf: 合法 JSON
PASS  conf: productName === "MD Editor"
PASS  conf: version === "1.0.0"
PASS  conf: identifier === "com.md-editor.app"
PASS  conf: app.withGlobalTauri === true
PASS  conf: bundle.targets 含 "nsis"
PASS  conf: fileAssociations 含 ext "md"
PASS  conf: fileAssociations 含 ext "markdown"
PASS  conf: csp 含 "unsafe-inline"
PASS  conf: csp 含 "ipc: http://ipc.localhost"
PASS  cap: 合法 JSON
PASS  cap: 含 core:default
PASS  cap: 含 core:event:default
PASS  cap: 含 com.md-editor.app:allow-read-markdown
PASS  cap: 含 com.md-editor.app:allow-write-markdown
PASS  cap: 含 com.md-editor.app:allow-get-startup-file-path
PASS  cap: 自定义权限命名空间与 conf.identifier 一致 (com.md-editor.app:)
PASS  cap: identifier 为能力名(标准 "default")，非 bundle id

=== A RESULT: PASS=18 FAIL=0 ===
```

### 关于 capabilities `identifier` 字段的澄清（关键判定点）

首次按任务字面判据「capabilities.identifier 前缀须等于 `com.md-editor.app`」校验时，得到 1 个 FAIL（实际值为 `"default"`）。经核对 **Tauri v2 官方文档**（`https://v2.tauri.app/security/capabilities/`）确认：

- capability 文件里的 `identifier` 是**该能力自身的名称**（官方示例用 `"main-capability"`、`"desktop-capability"`、`"my-capability"`），**并非**应用 bundle identifier。
- 应用 bundle identifier 只存在于 `tauri.conf.json`（`com.md-editor.app`），本工程已正确设置。
- **真正有意义的一致性**是：自定义权限的命名空间 `com.md-editor.app:` 必须与 `tauri.conf.json` 的 identifier 一致 —— 本工程 3 个 `allow-*` 权限均使用 `com.md-editor.app:` 前缀，**完全一致**。

结论：该 FAIL 属于**验收判据误设（测试侧问题，非源码缺陷）**，已按 Tauri 正确语义修正校验逻辑（见上表最后两项），复测 **18/18 通过**。此事项**不路由给 Engineer**，仅在报告中澄清，避免误改正确的 `"default"` 命名。

---

## B. index.html 桥接正确性（grep + 人工判读）

| 判据 | grep 命中 | 结论 |
|------|-----------|------|
| `const TAURI = window.__TAURI__ \|\| null;` 守卫 | `index.html:1414` | ✅ 存在，浏览器直开不报错 |
| `currentFilePath` 全局变量 | `index.html:1415` 声明 | ✅ 存在 |
| 3 处 invoke：`read_markdown` / `write_markdown` / `get_startup_file_path` | `1419,1640` / `1825,1844` / `1635` | ✅ 三个命令均出现 |
| `init()` 内有 `get_startup_file_path` 分支 | `index.html:1635` | ✅ 有 |
| `autoSave()` 按 `TAURI && currentFilePath` 分支 | `index.html:1824` | ✅ 有 |
| `saveToLocal()` 按 `TAURI && currentFilePath` 分支 | `index.html:1843` | ✅ 有（有路径则写盘，否则落 localStorage） |
| `loadFile` / `clearDoc` 内 `currentFilePath = null;` | `index.html:2200`（`loadFile`）、`index.html:2241`（`clearDoc`） | ✅ 存在，防误写回原磁盘文件 |
| `cdn.jsdelivr` 仅出现在 `exportHTML()` 内嵌模板字符串 | 命中 3 行：`1951 / 1980 / 1981` | ✅ 均位于 `exportHTML` 的反引号模板（1945–1996），非真实 `<script src>`/`<link href>` |

**说明**：`exportHTML()`（第 1932 行起，模板字符串起止 1945–1996）用于把 Markdown 导出为独立 HTML 文件，其中内嵌 `cdn.jsdelivr` 的 `<link>`/`<script>` 仅作用于**导出的离线 HTML 文件**（在联网浏览器中渲染公式），**主应用文档本身不引用任何 CDN**（见 C.4 全部走 `vendor/`）。符合任务判据（命中必须在 export 模板字符串内），**非缺陷**。

---

## C. vendor 离线完整性

### C.1 / C.4 文件存在且非空，且 index.html 引用路径与磁盘一致

```
vendor/marked/marked.min.js            39903 bytes   ← index.html:1388 引用一致 ✅
vendor/katex/katex.min.css             23196 bytes   ← index.html:1004 引用一致 ✅
vendor/katex/katex.min.js             277038 bytes   ← index.html:1390 引用一致 ✅
vendor/katex/contrib/auto-render.min.js 3478 bytes  ← index.html:1391 引用一致 ✅
vendor/mermaid/mermaid.min.js        3337508 bytes   ← index.html:1392 引用一致 ✅
vendor/dom-to-image-more/dom-to-image-more.min.js 16581 bytes ← index.html:1389 引用一致 ✅
```

全部 6 个文件存在且非空；index.html 中 6 条 `vendor/` 引用与磁盘实际路径逐一对应，无悬空引用。

### C.2 katex 字体数量（woff2）

```
vendor/katex/fonts/*.woff2 数量 = 20
```
恰好 20 个（KaTeX 0.16.9 标准字体集：AMS / Caligraphic-Bold/Regular / Fraktur-Bold/Regular / Main-Bold/BoldItalic/Italic/Regular / Math-BoldItalic/Italic / SansSerif-Bold/Italic/Regular / Script-Regular / Size1–4-Regular / Typewriter-Regular）。✅

### C.3 JS 库语法检查（`node --check`）

```
PASS: vendor/marked/marked.min.js
PASS: vendor/katex/katex.min.js
PASS: vendor/katex/contrib/auto-render.min.js
PASS: vendor/mermaid/mermaid.min.js
PASS: vendor/dom-to-image-more/dom-to-image-more.min.js
```
5/5 全部通过，无语法错误。✅

---

## D. 桥接逻辑单测（bridge.test.mjs）

> 复现命令：`node tests/bridge.test.mjs`
> 做法：把 `index.html` 中 `TAURI`/`currentFilePath`/`basename`/`loadFileFromPath`/`autoSave`/`saveToLocal`/`init` 启动分支**原样复制**进测试，mock `window.__TAURI__`（含 `core.invoke` + `event.listen`）、`editor`、`filenameInput`、内存 `localStorage`、`updatePreview`/`updateCount`/`showToast`/`t`，验证行为。

```
[断言1] init 启动分支：startup 文件被加载
  PASS  currentFilePath === C:\docs\a.md
  PASS  editor.value === 文件内容
  PASS  filenameInput.value === a.md
[断言2] saveToLocal：currentFilePath 已设置 -> 真实写盘，localStorage 不被写
  PASS  MOCK_FS[currentFilePath] === editor.value
  PASS  localStorage 未写入 STORAGE_KEY
[断言3] saveToLocal：currentFilePath === null -> 走 localStorage 分支
  PASS  localStorage 写入 STORAGE_KEY
  PASS  MOCK_FS 未被写（无磁盘写回）
[断言4] loadFileFromPath：加载新文件，currentFilePath/editor/filename 更新
  PASS  currentFilePath === C:\docs\b.md
  PASS  editor.value === b.md 内容
  PASS  filenameInput.value === b.md
  PASS  loadFileFromPath 弹出 toastFileOpened
[断言5] listen(open-file) 收到事件 -> 等价于 loadFileFromPath
  PASS  open-file 监听器已注册
  PASS  currentFilePath 更新为 c.md
  PASS  editor.value === c.md 内容
  PASS  filenameInput.value === c.md
[断言6-附加] autoSave：currentFilePath 已设置 -> 真实写盘分支
  PASS  autoSave 写回 MOCK_FS
  PASS  autoSave 未走 localStorage 分支

=== D RESULT: PASS=17 FAIL=0 ===
```

**说明（测试侧自修 1）**：首轮运行断言 1 内我额外加了一条「init 分支应弹出 toastFileOpened」，结果 FAIL。核对 `index.html` 后发现：`init()` 启动分支按设计**静默**加载启动文件（不弹 toast），`toastFileOpened` 仅由用户/深链触发的 `loadFileFromPath` 弹出——任务断言 1 本身也只要求校验 `currentFilePath/editor.value/filenameInput.value`。该 FAIL 属**测试代码自身过度断言**，已移除并改在断言 4 中校验 `loadFileFromPath` 的 toast 行为（已 PASS）。不计为源码缺陷。

---

## E. 智能路由判定

| 检查类别 | 是否发现源码缺陷 | 处置 |
|----------|------------------|------|
| index.html 桥接错误 | 否（D 单测 17/17 通过，B grep 全部符合） | — |
| tauri.conf.json 非法 | 否（A 全部通过） | — |
| capabilities 权限缺漏 | 否（3 个 `allow-*` + `core:default`/`core:event:default` 齐全；命名空间与 identifier 一致） | — |
| vendor 缺失/语法错 | 否（6 文件齐全、5 库语法通过、字体 20/20） | — |
| capabilities.identifier 误判 | 否（属验收判据误设，已按 Tauri 语义修正校验，非源码问题） | 测试侧自修 |
| 桥接单测过度断言 | 否（测试侧过度断言，已自修） | 测试侧自修 |

**路由判定 = NoOne**（无源码缺陷，全部通过；2 处为测试侧自修，不阻塞交付）。

---

## 遗留问题与观察

- **源码缺陷数：0**。
- **非阻塞观察（1 条，不计入缺陷）**：`exportHTML()` 导出的独立 `.html` 仍通过 `cdn.jsdelivr` 引入 KaTeX（仅用于导出文件在联网浏览器中的公式渲染）。主应用本身完全离线（全部走 `vendor/`）。若希望导出的 HTML 也完全离线自包含，可后续改为内联 KaTeX 或打包本地 KaTeX 副本——属增强项，非本次阻塞缺陷。
- **测试侧自修（2 处，已闭环，不遗留）**：
  1. 修正 capabilities `identifier` 验收判据（按 Tauri v2 官方语义：identifier 为能力名，非 bundle id）。
  2. 移除桥接单测中 init 分支的过度 toast 断言，改在 `loadFileFromPath` 处校验。

---

## 交付物清单

| 文件 | 说明 |
|------|------|
| `app/tests/bridge.test.mjs` | 桥接逻辑单测（17/17 通过） |
| `app/tests/validate-config.mjs` | A 节配置合法性校验脚本（18/18 通过，附带 Tauri 语义修正） |
| `app/tests/qa-report.md` | 本报告 |
