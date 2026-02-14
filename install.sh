#!/bin/bash

# YesnoteLite 安装脚本
# 自动检测芯片类型并安装对应版本

set -e

echo "🚀 YesnoteLite v0.1.0 安装程序"
echo "================================"
echo ""

# 检测芯片类型
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    DMG_FILE="YesnoteLite-0.1.0-arm64.dmg"
    echo "✓ 检测到 Apple Silicon (M1/M2/M3) 芯片"
elif [ "$ARCH" = "x86_64" ]; then
    DMG_FILE="YesnoteLite-0.1.0-x64.dmg"
    echo "✓ 检测到 Intel 芯片"
else
    echo "❌ 无法识别的芯片类型: $ARCH"
    exit 1
fi

echo "📦 将安装: $DMG_FILE"
echo ""

# 检查 DMG 文件是否存在
if [ ! -f "release/0.1.0/$DMG_FILE" ]; then
    echo "❌ 错误: 找不到安装文件 release/0.1.0/$DMG_FILE"
    echo "请先运行 'npm run build' 构建应用"
    exit 1
fi

echo "🔧 正在挂载 DMG..."
# 挂载 DMG 并提取挂载点路径（包含空格）
MOUNT_POINT=$(hdiutil attach "release/0.1.0/$DMG_FILE" | grep Volumes | sed 's/.*\(\/Volumes\/.*\)/\1/')

if [ -z "$MOUNT_POINT" ]; then
    echo "❌ 挂载 DMG 失败"
    exit 1
fi

echo "✓ DMG 已挂载到: $MOUNT_POINT"

# 复制应用到 Applications
echo "📋 正在复制应用到 /Applications..."
if [ -d "/Applications/YesnoteLite.app" ]; then
    echo "⚠️  检测到已安装的版本，正在覆盖..."
    rm -rf "/Applications/YesnoteLite.app"
fi

cp -R "$MOUNT_POINT/YesnoteLite.app" /Applications/

# 卸载 DMG
echo "🧹 正在清理..."
hdiutil detach "$MOUNT_POINT" -quiet

# 移除隔离属性（避免"已损坏"提示）
echo "🔓 正在移除隔离属性..."
xattr -cr /Applications/YesnoteLite.app

echo ""
echo "✅ 安装完成！"
echo ""
echo "📝 使用说明:"
echo "  1. 在 Launchpad 或 Applications 文件夹中找到 YesnoteLite"
echo "  2. 双击启动应用"
echo "  3. 按 Cmd+? 查看快捷键帮助"
echo ""
echo "🎉 开始享受高效的笔记体验吧！"
