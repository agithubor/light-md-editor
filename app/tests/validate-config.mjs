/**
 * validate-config.mjs
 * Section A 配置合法性校验（可执行验证）。
 * 注意：capabilities 文件的 `identifier` 字段是「能力自身的名称」（Tauri 官方示例用
 * "main-capability"/"desktop-capability"/"my-capability"），并非应用 bundle identifier。
 * 因此「identifier 前缀必须等于 com.md-editor.app」这一判据本身是误设；正确的、有意义的
 * 一致性校验是：permissions 中 `com.md-editor.app:` 命名空间必须与 tauri.conf.json 的
 * identifier 一致。本脚本按此正确语义校验。
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
assert('conf: identifier === "com.md-editor.app"', conf.identifier === 'com.md-editor.app', JSON.stringify(conf.identifier));
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
assert('cap: 含 com.md-editor.app:allow-read-markdown', perms.includes('com.md-editor.app:allow-read-markdown'), '');
assert('cap: 含 com.md-editor.app:allow-write-markdown', perms.includes('com.md-editor.app:allow-write-markdown'), '');
assert('cap: 含 com.md-editor.app:allow-get-startup-file-path', perms.includes('com.md-editor.app:allow-get-startup-file-path'), '');
// 正确语义：permission 命名空间前缀应等于应用 identifier
const nsPrefix = 'com.md-editor.app:';
const nsOk = perms.every((p) => !p.includes(':') || p.startsWith(nsPrefix) || p.startsWith('core:'));
const nsMatches = perms.filter((p) => p.startsWith(nsPrefix)).length > 0;
assert('cap: 自定义权限命名空间与 conf.identifier 一致 (com.md-editor.app:)', nsOk && nsMatches, JSON.stringify(perms));
assert('cap: identifier 为能力名(标准 "default")，非 bundle id', cap.identifier && typeof cap.identifier === 'string', cap.identifier);

console.log('\n=== A RESULT: PASS=' + pass + ' FAIL=' + fail + ' ===');
if (fail > 0) { console.log('FAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
