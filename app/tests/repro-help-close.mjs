// 回归测试：验证「内联 onclick → addEventListener」转换后，弹窗开关、Esc 关闭均可用。
// 运行：node tests/repro-help-close.mjs   （需 jsdom：npm i -D jsdom）
import { createRequire } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire('C:/Users/pc/.workbuddy/binaries/node/workspace/');
const { JSDOM, VirtualConsole } = require('jsdom');

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = require('path').resolve(__dirname, '../web/index.html');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail?.stack || e.message)));

let html = fs.readFileSync(htmlPath, 'utf8');
// 剥离所有外部 <script src>（vendor 用到 structuredClone 等 jsdom 不支持的 API；i18n 用 beforeParse 桩代替）
html = html.replace(/<script src="[^"]+"><\/script>\s*/g, '');

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  virtualConsole: vc,
  beforeParse(window) {
    // i18n 桩（真实环境由 i18n.js 提供）
    window.i18n = { 'zh-CN': { welcomeDoc: '', helpTitle: '使用帮助', helpOk: '知道了', help: '帮助', filenameDefault: '未命名' }, en: {} };
    window.t = (k) => (window.i18n['zh-CN'] && window.i18n['zh-CN'][k] != null) ? window.i18n['zh-CN'][k] : k;
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
    if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
    window.addEventListener('error', (e) => errors.push('window error: ' + (e.error?.stack || e.message)));
  }
});
process.on('unhandledRejection', (r) => errors.push('unhandledRejection: ' + (r?.stack || r)));
process.on('uncaughtException', (e) => errors.push('uncaughtException: ' + e.stack));

const { window } = dom;
const { document } = window;
await new Promise(r => setTimeout(r, 500));

let pass = true;
const log = (label, ok, extra='') => { if (!ok) pass = false; console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${extra ? ' :: ' + extra : ''}`); };

// 1) 初始化后不应再有任何内联 onclick 属性（已全部转为 addEventListener）
log('无残留内联 onclick 属性', document.querySelectorAll('[onclick]').length === 0, 'remaining=' + document.querySelectorAll('[onclick]').length);

// 2) 帮助弹窗初始应为打开（首次启动 auto-open，依赖 i18n 桩 + init 正常执行）
const modal = document.getElementById('help-modal');
log('帮助弹窗初始打开', modal.style.display === 'flex' && modal.classList.contains('show'));

// 3) 点击"知道了"关闭按钮（现在由 addEventListener 驱动）应关闭弹窗
document.querySelector('#help-modal .modal-footer button')
  .dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 400));
log('点击关闭后弹窗隐藏', modal.style.display === 'none' && !modal.classList.contains('show'), 'display=' + modal.style.display);

// 4) 工具栏"帮助"按钮（onclick=openHelp()）经 addEventListener 应可再次打开
const openBtn = [...document.querySelectorAll('button')].find(b => (b.getAttribute('title') || '') === '帮助' || b.textContent.includes('帮助'));
if (openBtn) {
  openBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 50));
  log('工具栏帮助按钮可重新打开弹窗', modal.style.display === 'flex' && modal.classList.contains('show'));
} else {
  log('找到工具栏帮助按钮', false, 'not found');
}

// 5) Esc 键应可关闭弹窗
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await new Promise(r => setTimeout(r, 400));
log('Esc 键关闭弹窗', modal.style.display === 'none' && !modal.classList.contains('show'), 'display=' + modal.style.display);

console.log('--- captured errors:', errors.length);
errors.slice(0, 8).forEach(e => console.log('   -', e.slice(0, 200)));
console.log(pass ? '\nRESULT: ALL PASS' : '\nRESULT: SOME FAILED');
process.exit(pass ? 0 : 1);
