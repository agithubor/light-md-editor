/**
 * bridge.test.mjs
 * ---------------------------------------------------------------------------
 * 桥接逻辑单测 (Section D of QA plan).
 *
 * 说明：前端桥接函数原本嵌在 app/index.html 的 <script> 内，不便直接 import。
 * 本文件把 index.html 中「与桥接语义完全一致」的代码原样复制出来（见下方
 * === COPIED BRIDGE SECTION === 注释块），并用 mock 全局验证行为。
 * 生产代码仍是 index.html 内那份；这里仅用于可单测验证，断言其「应然行为」。
 *
 * 若此处复制的逻辑与 index.html 实际逻辑不一致，会被如实记为缺陷。
 * ---------------------------------------------------------------------------
 */

// ============================== MOCKS ==============================
// 内存文件系统：path -> content
const MOCK_FS = {};
// 启动文件路径（供 get_startup_file_path 返回）
let STARTUP = null;
// 捕获 open-file 事件回调
const captured = {};

function makeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    _has: (k) => m.has(k),
    _get: (k) => m.get(k),
    _raw: m,
  };
}

const tauriMock = {
  core: {
    invoke: async (cmd, args) => {
      if (cmd === 'read_markdown') {
        if (!(args.path in MOCK_FS)) throw new Error('ENOENT: ' + args.path);
        return MOCK_FS[args.path];
      }
      if (cmd === 'write_markdown') {
        MOCK_FS[args.path] = args.content;
        return;
      }
      if (cmd === 'get_startup_file_path') {
        return STARTUP;
      }
      throw new Error('unknown command: ' + cmd);
    },
  },
  event: {
    listen: (ev, cb) => { if (ev === 'open-file') captured.openFileCb = cb; },
  },
};
// 全局 window 注入，桥接代码据此得到 TAURI
global.window = { __TAURI__: tauriMock };

// 简单 localStorage / 计数器
const localStorage = makeLocalStorage();
let toastCount = 0;
let lastToast = null;
function showToast(m) { toastCount++; lastToast = m; }
function updatePreview() {}
function updateCount() {}

const saveHint = { textContent: '', classList: { add() {}, remove() {} } };

const STORAGE_KEY = 'md_editor_content';
const FILENAME_KEY = 'md_editor_filename';
const LANG_KEY = 'md_editor_language';

const i18n = {
  'zh-CN': {
    welcomeDoc: '# Welcome',
    filenameDefault: '未命名文档',
    toastFileOpened: 'toastFileOpened',
    toastOpenFailed: 'toastOpenFailed',
    toastSaveFailed: 'toastSaveFailed',
    toastSaved: 'toastSaved',
    saved: 'saved',
  },
};
let currentLang = 'zh-CN';
function t(key) {
  const dict = i18n[currentLang] || i18n['zh-CN'];
  let s = dict[key];
  if (s === undefined) s = i18n['zh-CN'][key] || key;
  return s;
}

const editor = { value: '' };
const filenameInput = { value: '' };

// ====================== COPIED BRIDGE SECTION ======================
// 以下代码与 app/index.html 中桥接实现逐项保持一致（行号见各函数注释）。
// 任何与 index.html 的偏离都应视为缺陷。

// index.html:1414
const TAURI = window.__TAURI__ || null;
// index.html:1415
let currentFilePath = null; // null=无文件模式(存localStorage)；string=已打开文件绝对路径
// index.html:1416
function basename(p) { return (p || '').split(/[\\/]/).pop(); }
// index.html:1417-1426
async function loadFileFromPath(p) {
  try {
    const content = await TAURI.core.invoke('read_markdown', { path: p });
    currentFilePath = p;
    editor.value = content || '';
    filenameInput.value = basename(p);
    updatePreview(); updateCount();
    showToast(t('toastFileOpened'));
  } catch (e) { showToast(t('toastOpenFailed') + ': ' + e); }
}
// index.html:1427-1429
if (TAURI) {
  TAURI.event.listen('open-file', (ev) => loadFileFromPath(ev.payload.path));
}

// index.html:1821-1833 (autoSave 保存分支，原样复制)
let saveTimer;
function autoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (TAURI && currentFilePath) {
      try { await TAURI.core.invoke('write_markdown', { path: currentFilePath, content: editor.value }); }
      catch (e) { showToast(t('toastSaveFailed') + ': ' + e); }
    } else {
      localStorage.setItem(STORAGE_KEY, editor.value);
      localStorage.setItem(FILENAME_KEY, filenameInput.value);
    }
    showSaveHint();
  }, 500);
}
// index.html:1835-1839 (showSaveHint 依赖 saveHint，原样复制)
function showSaveHint() {
  saveHint.textContent = '✓ ' + t('saved');
  saveHint.classList.add('show');
  setTimeout(() => saveHint.classList.remove('show'), 1500);
}

// index.html:1842-1853 (saveToLocal 两个分支，原样复制)
function saveToLocal() {
  if (TAURI && currentFilePath) {
    TAURI.core.invoke('write_markdown', { path: currentFilePath, content: editor.value })
      .then(() => { showSaveHint(); showToast(t('toastSaved')); })
      .catch((e) => { showToast(t('toastSaveFailed') + ': ' + e); });
    return;
  }
  localStorage.setItem(STORAGE_KEY, editor.value);
  localStorage.setItem(FILENAME_KEY, filenameInput.value);
  showSaveHint();
  showToast(t('toastSaved'));
}

// index.html:1629-1652 init() 中的「启动路径分支」，原样复制（仅抽取该分支）
async function initStartupBranch() {
  let startupPath = null;
  if (TAURI) {
    try { startupPath = await TAURI.core.invoke('get_startup_file_path'); } catch (e) { startupPath = null; }
  }
  if (startupPath) {
    currentFilePath = startupPath;
    try {
      const c = await TAURI.core.invoke('read_markdown', { path: startupPath });
      editor.value = c || '';
    } catch (e) { editor.value = ''; showToast(t('toastOpenFailed') + ': ' + e); }
    filenameInput.value = basename(startupPath);
  } else {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      editor.value = saved;
    } else {
      editor.value = i18n[currentLang].welcomeDoc;
    }
    filenameInput.value = localStorage.getItem(FILENAME_KEY) || t('filenameDefault');
  }
}
// ==================== END COPIED BRIDGE SECTION ====================

// ============================== TEST HARNESS ==============================
let pass = 0, fail = 0;
const failures = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name + (detail ? ' -> ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' -> ' + detail : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resetState() {
  for (const k of Object.keys(MOCK_FS)) delete MOCK_FS[k];
  localStorage.clear();
  currentFilePath = null;
  editor.value = '';
  filenameInput.value = '';
  STARTUP = null;
  toastCount = 0;
  lastToast = null;
  // 注意：captured.openFileCb 由模块加载时注册一次，跨用例保留。
}

// ============================== TEST CASES ==============================
async function run() {
  console.log('\n[断言1] init 启动分支：startup 文件被加载');
  resetState();
  STARTUP = 'C:\\docs\\a.md';
  MOCK_FS[STARTUP] = '# Hello from a.md';
  await initStartupBranch();
  assert('currentFilePath === C:\\\\docs\\\\a.md', currentFilePath === 'C:\\docs\\a.md', currentFilePath);
  assert('editor.value === 文件内容', editor.value === '# Hello from a.md', JSON.stringify(editor.value));
  assert('filenameInput.value === a.md', filenameInput.value === 'a.md', filenameInput.value);
  // 注：init 启动分支按设计静默加载（不弹 toast）；toastFileOpened 由 loadFileFromPath 弹出（见断言4）。
  // 任务断言1 仅要求校验 currentFilePath/editor.value/filenameInput.value，已通过。

  console.log('\n[断言2] saveToLocal：currentFilePath 已设置 -> 真实写盘，localStorage 不被写');
  resetState();
  currentFilePath = 'C:\\docs\\a.md';
  editor.value = '# content two';
  saveToLocal();
  await sleep(20); // 等待 write_markdown 异步完成
  assert('MOCK_FS[currentFilePath] === editor.value', MOCK_FS[currentFilePath] === '# content two', JSON.stringify(MOCK_FS[currentFilePath]));
  assert('localStorage 未写入 STORAGE_KEY', !localStorage._has(STORAGE_KEY), 'STORAGE_KEY present: ' + localStorage._has(STORAGE_KEY));

  console.log('\n[断言3] saveToLocal：currentFilePath === null -> 走 localStorage 分支');
  resetState();
  currentFilePath = null;
  editor.value = '# content three';
  filenameInput.value = 'untitled.md';
  saveToLocal();
  assert('localStorage 写入 STORAGE_KEY', localStorage._get(STORAGE_KEY) === '# content three', localStorage._get(STORAGE_KEY));
  assert('MOCK_FS 未被写（无磁盘写回）', Object.keys(MOCK_FS).length === 0, 'MOCK_FS keys=' + Object.keys(MOCK_FS).join(','));

  console.log('\n[断言4] loadFileFromPath：加载新文件，currentFilePath/editor/filename 更新');
  resetState();
  MOCK_FS['C:\\docs\\b.md'] = '# from b.md';
  await loadFileFromPath('C:\\docs\\b.md');
  assert('currentFilePath === C:\\\\docs\\\\b.md', currentFilePath === 'C:\\docs\\b.md', currentFilePath);
  assert('editor.value === b.md 内容', editor.value === '# from b.md', editor.value);
  assert('filenameInput.value === b.md', filenameInput.value === 'b.md', filenameInput.value);
  assert('loadFileFromPath 弹出 toastFileOpened', lastToast === 'toastFileOpened', lastToast);

  console.log('\n[断言5] listen(open-file) 收到事件 -> 等价于 loadFileFromPath');
  resetState();
  assert('open-file 监听器已注册', typeof captured.openFileCb === 'function', typeof captured.openFileCb);
  MOCK_FS['C:\\docs\\c.md'] = '# from c.md';
  await captured.openFileCb({ payload: { path: 'C:\\docs\\c.md' } });
  assert('currentFilePath 更新为 c.md', currentFilePath === 'C:\\docs\\c.md', currentFilePath);
  assert('editor.value === c.md 内容', editor.value === '# from c.md', editor.value);
  assert('filenameInput.value === c.md', filenameInput.value === 'c.md', filenameInput.value);

  console.log('\n[断言6-附加] autoSave：currentFilePath 已设置 -> 真实写盘分支');
  resetState();
  currentFilePath = 'C:\\docs\\auto.md';
  editor.value = '# autosave content';
  autoSave();
  await sleep(600); // 等待 500ms 定时器触发
  assert('autoSave 写回 MOCK_FS', MOCK_FS[currentFilePath] === '# autosave content', JSON.stringify(MOCK_FS[currentFilePath]));
  assert('autoSave 未走 localStorage 分支', !localStorage._has(STORAGE_KEY), 'STORAGE_KEY present');

  console.log('\n=== D RESULT: PASS=' + pass + ' FAIL=' + fail + ' ===');
  if (fail > 0) {
    console.log('FAILED CASES:\n - ' + failures.join('\n - '));
    process.exit(1);
  }
}

run().catch((e) => { console.error('TEST ERROR:', e); process.exit(1); });
