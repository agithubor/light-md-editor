#!/usr/bin/env python3
"""生成 MD Editor 桌面应用图标（无需联网、无需 tauri CLI）。

在 app/src-tauri/icons/ 目录下运行：python gen_icons.py
依赖：Pillow (pip install pillow)

生成的文件（与 tauri.conf.json 中 bundle.icon / fileAssociations.icon 一一对应）：
  - icon-source.png      1024x1024 源图（供 `tauri icon` 命令使用）
  - icon.png             1024
  - 32x32.png            32
  - 128x128.png          128
  - 128x128@2x.png       256
  - Square30x30Logo.png  30
  - Square70x70Logo.png  70
  - Square150x150Logo.png 150
  - StoreLogo.png        50
  - icon.ico             多尺寸 Windows 图标
  - md-file.ico          .md 文件关联图标（复用 icon.ico）
"""
import os
import shutil

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SIZE = 1024
BG = "#212529"
FG = "white"
TEXT = "MD"


def load_font(pixel: int) -> ImageFont.ImageFont:
    """尽量使用系统中可用的粗体无衬线字体，失败则回退默认字体。"""
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, pixel)
            except Exception:  # noqa: BLE001 - 字体加载失败直接回退
                continue
    return ImageFont.load_default()


def make_source() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(img)
    font = load_font(int(SIZE * 0.42))
    # anchor="mm" 表示以文字几何中心对齐到给定坐标，实现真正居中
    draw.text((SIZE // 2, SIZE // 2), TEXT, font=font, fill=FG, anchor="mm")
    return img


def main() -> None:
    src = make_source()

    # 源图（供 `tauri icon` 命令进一步生成 macOS/Linux 等多平台图标）
    src.save(os.path.join(HERE, "icon-source.png"))

    # 各尺寸 PNG（tauri.conf.json bundle.icon 列表）
    targets = {
        "icon.png": SIZE,
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "Square30x30Logo.png": 30,
        "Square70x70Logo.png": 70,
        "Square150x150Logo.png": 150,
        "StoreLogo.png": 50,
    }
    for name, dim in targets.items():
        out = src.resize((dim, dim), Image.LANCZOS)
        out.save(os.path.join(HERE, name))

    # 多尺寸 Windows 图标
    src.save(
        os.path.join(HERE, "icon.ico"),
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )

    # .md 文件关联图标（与 icon.ico 一致）
    shutil.copyfile(
        os.path.join(HERE, "icon.ico"),
        os.path.join(HERE, "md-file.ico"),
    )

    print("icons generated:")
    for f in sorted(os.listdir(HERE)):
        print("   ", f)


if __name__ == "__main__":
    main()
