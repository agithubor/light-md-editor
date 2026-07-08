// 回归测试：校验 Tauri v2 tauri.conf.json 的 schema 修复是否生效
// 取消 cargo/tauri build，仅做配置层 JSON 解析与断言验证。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONF_PATH = join(__dirname, '..', 'src-tauri', 'tauri.conf.json');

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}

let raw, c;
try {
  raw = readFileSync(CONF_PATH, 'utf8');
  c = JSON.parse(raw);
  check('A1 JSON 合法可解析', true, 'parse ok');
} catch (e) {
  check('A1 JSON 合法可解析', false, 'parse error: ' + e.message);
  console.log('\n=== 汇总 ===');
  const allPass = results.every((r) => r.pass);
  console.log(`总判定: ${allPass ? 'ALL PASS' : 'HAS FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

// A2 fileAssociations：存在、含 ext 含 md 与 markdown、且无 icon 字段
const fa = c.bundle && c.bundle.fileAssociations;
const faExists = Array.isArray(fa) && fa.length > 0;
const faHasMd = faExists && fa.some((a) => Array.isArray(a.ext) && a.ext.includes('md'));
const faHasMarkdown = faExists && fa.some((a) => Array.isArray(a.ext) && a.ext.includes('markdown'));
const faNoIcon = faExists && fa.every((a) => !('icon' in a));
check('A2a fileAssociations 存在且非空', faExists);
check('A2b ext 含 "md"', faHasMd);
check('A2c ext 含 "markdown"', faHasMarkdown);
check('A2d 任何条目都不带 icon 字段（修复点1）', faNoIcon);

// A3 bundle.nsis 平级键已不存在
check('A3 bundle.nsis 平级键已不存在', c.bundle && c.bundle.nsis === undefined);

// A4 bundle.windows.nsis 完整迁移且未丢字段
const wnsis = c.bundle && c.bundle.windows && c.bundle.windows.nsis;
const nsisExists = !!wnsis;
const nsisLang = nsisExists && Array.isArray(wnsis.languages) &&
  wnsis.languages.includes('SimpChinese') && wnsis.languages.includes('English');
check('A4a bundle.windows.nsis 存在', nsisExists);
check('A4b displayLanguageSelector 存在', nsisExists && wnsis.displayLanguageSelector !== undefined);
check('A4c languages 含 SimpChinese 与 English', nsisLang);
check('A4d installMode === "perUser"', nsisExists && wnsis.installMode === 'perUser');
check('A4e shortcutName === "MD Editor"', nsisExists && wnsis.shortcutName === 'MD Editor');

// A5 其余关键字段未被误删/误改
check('A5a bundle.targets 含 "nsis"',
  c.bundle && Array.isArray(c.bundle.targets) && c.bundle.targets.includes('nsis'));
check('A5b bundle.icon 含 9 项且含 icons/icon.ico',
  c.bundle && Array.isArray(c.bundle.icon) && c.bundle.icon.length === 9 && c.bundle.icon.includes('icons/icon.ico'),
  c.bundle && Array.isArray(c.bundle.icon) ? `count=${c.bundle.icon.length}` : 'missing');
check('A5c identifier === "com.md-editor.app"', c.identifier === 'com.md-editor.app', `value=${c.identifier}`);
check('A5d app.withGlobalTauri === true', c.app && c.app.withGlobalTauri === true);
check('A5e app.windows[0].label === "main"',
  c.app && Array.isArray(c.app.windows) && c.app.windows[0] && c.app.windows[0].label === 'main');
const csp = c.app && c.app.security && c.app.security.csp;
check('A5f csp 含 unsafe-inline 与 ipc: http://ipc.localhost',
  typeof csp === 'string' && csp.includes('unsafe-inline') && csp.includes('ipc: http://ipc.localhost'));

// A6 （可选）fileAssociations 块内不含 "icon" 字样
const faText = raw.slice(raw.indexOf('"fileAssociations"'), raw.indexOf('"windows"'));
check('A6 fileAssociations 块内不含 "icon" 字样', !/"icon"/.test(faText));

console.log('\n=== 汇总 ===');
const allPass = results.every((r) => r.pass);
console.log(`通过项: ${results.filter((r) => r.pass).length}/${results.length}`);
console.log(`总判定: ${allPass ? 'ALL PASS' : 'HAS FAIL'}`);
process.exit(allPass ? 0 : 1);
