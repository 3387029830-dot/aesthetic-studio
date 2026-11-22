#!/bin/bash
# 在新机器上恢复本地工具（全部装在本目录内，不碰系统环境）
# 用法：bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"
NODE_V=v24.22.3
ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH=x64
mkdir -p tools/bin .home .cache projects

if [ ! -x tools/node/bin/node ]; then
  F=node-$NODE_V-darwin-$ARCH.tar.gz
  (cd tools && curl -fsSLO https://nodejs.org/dist/$NODE_V/$F \
    && curl -fsSL https://nodejs.org/dist/$NODE_V/SHASUMS256.txt | grep " $F\$" | shasum -a 256 -c - \
    && tar xzf $F && mv node-$NODE_V-darwin-$ARCH node && rm $F)
fi

source ./env.sh

if [ ! -x tools/bin/ffmpeg ]; then
  mkdir -p tools/media && (cd tools/media && npm init -y >/dev/null && npm i ffmpeg-static ffprobe-static)
  ln -sf "$STUDIO/tools/media/node_modules/ffmpeg-static/ffmpeg" tools/bin/ffmpeg
  ln -sf "$STUDIO/tools/media/node_modules/ffprobe-static/bin/darwin/$ARCH/ffprobe" tools/bin/ffprobe
fi

for t in templates/remotion-starter templates/web-starter; do (cd "$t" && npm ci); done
echo "✓ 完成。使用前先运行：source ./env.sh"
