# fetch_vendor.ps1
# ---------------------------------------------------------------------------
# 离线依赖库下载脚本（一次性使用）。
# 在 app/vendor/ 目录下用 PowerShell 运行：  .\fetch_vendor.ps1
# 用途：当网络可用时，从 jsDelivr 拉取全部前端 vendor 库；若 CI / 打包机
#       需要重新获取，可直接重跑本脚本。所有文件均已随仓库落地，正常情况无需执行。
#
# 实际版本（下载时解析）：
#   marked              -> npm/marked            (latest，无锁版本)
#   katex               -> katex@0.16.9          (含 css/js/fonts)
#   mermaid             -> mermaid@10            (latest 10.x)
#   dom-to-image-more   -> dom-to-image-more@3.5.0
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"
$base = "https://cdn.jsdelivr.net/npm"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

function Fetch($rel, $out) {
    $url = "$base/$rel"
    $dst = Join-Path $root $out
    Write-Host "GET $url -> $out"
    Invoke-WebRequest -Uri $url -OutFile $dst -UseBasicParsing
}

# 1) 核心 JS / CSS
Fetch "marked/marked.min.js"                                              "marked/marked.min.js"
Fetch "katex@0.16.9/dist/katex.min.css"                                   "katex/katex.min.css"
Fetch "katex@0.16.9/dist/katex.min.js"                                    "katex/katex.min.js"
Fetch "katex@0.16.9/dist/contrib/auto-render.min.js"                      "katex/contrib/auto-render.min.js"
Fetch "mermaid@10/dist/mermaid.min.js"                                    "mermaid/mermaid.min.js"
Fetch "dom-to-image-more@3.5.0/dist/dom-to-image-more.min.js"            "dom-to-image-more/dom-to-image-more.min.js"

# 2) KaTeX 字体（0.16.9 共 20 个 woff2，必须齐全，否则离线公式无样式）
$katexFonts = @(
    "KaTeX_AMS-Regular","KaTeX_Caligraphic-Bold","KaTeX_Caligraphic-Regular",
    "KaTeX_Fraktur-Bold","KaTeX_Fraktur-Regular","KaTeX_Main-Bold",
    "KaTeX_Main-BoldItalic","KaTeX_Main-Italic","KaTeX_Main-Regular",
    "KaTeX_Math-BoldItalic","KaTeX_Math-Italic","KaTeX_SansSerif-Bold",
    "KaTeX_SansSerif-Italic","KaTeX_SansSerif-Regular","KaTeX_Script-Regular",
    "KaTeX_Size1-Regular","KaTeX_Size2-Regular","KaTeX_Size3-Regular",
    "KaTeX_Size4-Regular","KaTeX_Typewriter-Regular"
)
foreach ($f in $katexFonts) {
    Fetch "katex@0.16.9/dist/fonts/$f.woff2" "katex/fonts/$f.woff2"
}

Write-Host "All vendor assets fetched."
