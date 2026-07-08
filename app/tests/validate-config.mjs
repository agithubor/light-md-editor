/**
 * validate-config.mjs
 * Section A 配置合法性校验（可执行验证）。
 * 注意：capabilities 文件的 `identifier` 字段是「能力自身的名称」（Tauri 官方示例用
 * "main-capability"/"desktop-capability"/"my-capability"），并非应用 bundle identifier。
 * Tauri v2 中应用自身命令权限在 capabilities 里**不带 identifier 前缀**直接引用
 * （如 `allow-read-markdown`）；标识符前缀仅用于插件权限。本脚本按此语义校验。
 */
import fs from 'fs';
let pass = 0, fail = 0;
const fails = [];
function assert(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; fails.push(name + (detail ? ' -> ' + detail : '')); console.log('  FAIL  ' + name + (detail ? ' -> ' + detail : '')); }
}

const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
assert('conf: 合法 JSON', true, '');
assert('conf: productName === "MD Editor"', conf.productName === 'MD Editor', JSON.stringify(conf.productName));
assert('conf: version === "1.0.0"', conf.version === '1.0.0', JSON.stringify(conf.version));
assert('conf: identifier === "com-md-editor-app"', conf.identifier === 'com-md-editor-app', JSON.stringify(conf.identifier));
assert('conf: app.withGlobalTauri === true', conf.app.withGlobalTauri === true, JSON.stringify(conf.app.withGlobalTauri));
const targets = conf.bundle.targets || [];
assert('conf: bundle.targets 含 "nsis"', Array.isArray(targets) && targets.includes('nsis'), JSON.stringify(targets));
const fa = conf.bundle.fileAssociations || [];
const exts = [];
fa.forEach((x) => (x.ext || []).forEach((e) => exts.push(e)));
assert('conf: fileAssociations 含 ext "md"', exts.includes('md'), JSON.stringify(exts));
assert('conf: fileAssociations 含 ext "markdown"', exts.includes('markdown'), JSON.stringify(exts));
const csp = conf.app.security.csp || '';
assert('conf: csp 含 "unsafe-inline"', csp.includes('unsafe-inline'), '');
assert('conf: csp 含 "ipc: http://ipc.localhost"', csp.includes('ipc: http://ipc.localhost'), '');

const cap = JSON.parse(fs.readFileSync('src-tauri/capabilities/default.json', 'utf8'));
assert('cap: 合法 JSON', true, '');
const perms = cap.permissions || [];
assert('cap: 含 core:default', perms.includes('core:default'), '');
assert('cap: 含 core:event:default', perms.includes('core:event:default'), '');
assert('cap: 含 allow-read-markdown', perms.includes('allow-read-markdown'), '');
assert('cap: 含 allow-write-markdown', perms.includes('allow-write-markdown'), '');
assert('cap: 含 allow-get-startup-file-path', perms.includes('allow-get-startup-file-path'), '');
assert('cap: 含 allow-get-app-version', perms.includes('allow-get-app-version'), '');
// 应用自身命令权限不带 identifier 前缀（Tauri v2：前缀仅用于插件）
const appPerms = ['allow-read-markdown', 'allow-write-markdown', 'allow-get-startup-file-path', 'allow-get-app-version'];
const appOk = appPerms.every((p) => perms.includes(p));
const noBadPrefix = perms.every((p) => !p.startsWith('com-md-editor-app:'));
assert('cap: 4 个应用命令权限齐全且未带 identifier 前缀', appOk && noBadPrefix, JSON.stringify(perms));
assert('cap: identifier 为能力名(标准 "default")，非 bundle id', cap.identifier && typeof cap.identifier === 'string', cap.identifier);

console.log('\n=== A RESULT: PASS=' + pass + ' FAIL=' + fail + ' ===');
if (fail > 0) { console.log('FAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
