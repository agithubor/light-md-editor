#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QA 回归测试：md-editor tauri.conf.json 全量 schema 校验 + 针对性断言
仅做 schema 层校验，不执行 cargo build / tauri build / npm install
"""
import json
import sys

import jsonschema

SCHEMA_PATH = r"C:\Users\pc\AppData\Local\Temp\tauri-schema.json"
CONF_PATH = r"D:\pypro\md-editor\app\src-tauri\tauri.conf.json"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    schema = load_json(SCHEMA_PATH)
    config = load_json(CONF_PATH)

    # ---------- 1. 全量 schema 校验 ----------
    validator = jsonschema.Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(config), key=lambda e: list(e.path))
    schema_ok = len(errors) == 0

    print("=" * 60)
    print("【1/2】全量 schema 校验 (jsonschema.validate vs 官方 schema)")
    print("=" * 60)
    if schema_ok:
        print("PASS: 整份 tauri.conf.json 无任何 ValidationError，完全符合官方 schema。")
    else:
        print("FAIL: 发现 %d 处非法字段：" % len(errors))
        for e in errors:
            path = "/".join(str(p) for p in e.path) or "<root>"
            print("  - 路径: %s" % path)
            print("      消息: %s" % e.message)
            if e.validator:
                print("      校验器: %s" % e.validator)

    # ---------- 2. 针对性断言 ----------
    print("")
    print("=" * 60)
    print("【2/2】针对性断言")
    print("=" * 60)

    checks = []
    bundle = config.get("bundle", {})
    nsis = bundle.get("windows", {}).get("nsis", {})

    # A. bundle.windows.nsis 不存在 shortcutName 键
    checks.append(("nsis 无 shortcutName 键",
                   "shortcutName" not in nsis))

    # B. installMode === currentUser
    checks.append(("installMode === currentUser",
                   nsis.get("installMode") == "currentUser"))

    # C. languages 含 SimpChinese/English 且 displayLanguageSelector === true
    langs = nsis.get("languages", [])
    checks.append(("languages 含 SimpChinese 与 English",
                   ("SimpChinese" in langs) and ("English" in langs)))
    checks.append(("displayLanguageSelector === true",
                   nsis.get("displayLanguageSelector") is True))

    # D. fileAssociations[0]
    fa = (bundle.get("fileAssociations") or [{}])[0]
    checks.append(("fileAssociations[0] 无 icon 字段",
                   "icon" not in fa))
    fa_ext = fa.get("ext", [])
    checks.append(("fileAssociations[0].ext 含 md 与 markdown",
                   ("md" in fa_ext) and ("markdown" in fa_ext)))
    checks.append(("fileAssociations[0].role === Editor",
                   fa.get("role") == "Editor"))

    # E. bundle 下平级无 nsis 键
    checks.append(("bundle 下平级无 nsis 键",
                   "nsis" not in bundle))

    # F. targets 含 nsis / withGlobalTauri / identifier
    targets = bundle.get("targets", [])
    checks.append(("bundle.targets 含 nsis", "nsis" in targets))
    checks.append(("app.withGlobalTauri === true",
                   config.get("app", {}).get("withGlobalTauri") is True))
    checks.append(("identifier === com.md-editor.app",
                   config.get("identifier") == "com.md-editor.app"))

    all_asserts_ok = True
    for name, ok in checks:
        status = "PASS" if ok else "FAIL"
        if not ok:
            all_asserts_ok = False
        print("  [%s] %s" % (status, name))

    # ---------- 路由判定 ----------
    print("")
    print("=" * 60)
    print("路由判定")
    print("=" * 60)
    if not schema_ok:
        route = "Engineer"
        reason = "全量 schema 校验仍发现非法字段，需主理人修复（见上方错误清单）。"
    elif not all_asserts_ok:
        route = "Engineer"
        reason = "全量校验通过，但针对性断言存在失败项，需主理人修正配置。"
    else:
        route = "NoOne"
        reason = "全量 schema 校验 0 错误，针对性断言全过，修复成功。"

    print("路由判定 = %s" % route)
    print("理由: %s" % reason)
    print("整份 tauri.conf.json 是否已 100%% 通过官方 schema 校验: %s"
          % ("是" if schema_ok else "否"))

    # 退出码：全过=0，否则=1（便于 CI 判定）
    sys.exit(0 if (schema_ok and all_asserts_ok) else 1)


if __name__ == "__main__":
    main()
