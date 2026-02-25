#!/bin/bash
set -e

EXT_UUID="gnome-weather@sungj"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$EXT_UUID"

echo "=== 心知/和风天气 GNOME 扩展部署 ==="

echo "[1/4] 编译 GSettings schema..."
glib-compile-schemas "$SRC_DIR/schemas/"

echo "[2/4] 复制扩展文件到 $EXT_DIR..."
mkdir -p "$EXT_DIR"
cp "$SRC_DIR/metadata.json" "$EXT_DIR/"
cp "$SRC_DIR/extension.js" "$EXT_DIR/"
cp "$SRC_DIR/prefs.js" "$EXT_DIR/"
cp "$SRC_DIR/stylesheet.css" "$EXT_DIR/"
cp -r "$SRC_DIR/schemas" "$EXT_DIR/"
if [ -d "$SRC_DIR/icons" ]; then
    cp -r "$SRC_DIR/icons" "$EXT_DIR/"
fi

echo "[3/4] 启用扩展..."
gnome-extensions enable "$EXT_UUID" 2>/dev/null || true

echo "[4/4] 完成!"
echo ""
echo "请重启 GNOME Shell 使扩展生效："
echo "  Wayland: 注销后重新登录"
echo "  X11:     按 Alt+F2 输入 r 回车"
echo ""
echo "首次使用请打开扩展设置，配置 API Key："
echo "  gnome-extensions prefs $EXT_UUID"
