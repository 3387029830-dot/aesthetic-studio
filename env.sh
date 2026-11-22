# Studio 隔离环境：source 这个文件后，所有工具和缓存都只写在 studio/ 目录内
# 用法：source ./env.sh
STUDIO="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")" && pwd)"
export STUDIO
export REAL_HOME="${REAL_HOME:-$HOME}"

# 工具优先用本目录的
export PATH="$STUDIO/tools/node/bin:$STUDIO/tools/bin:$PATH"

# 把 HOME 和各类缓存重定向到本目录，防止写入真实主目录
export HOME="$STUDIO/.home"
export XDG_CACHE_HOME="$STUDIO/.cache"
export XDG_CONFIG_HOME="$STUDIO/.home/.config"
export XDG_DATA_HOME="$STUDIO/.home/.local/share"
export npm_config_cache="$STUDIO/.cache/npm"
export npm_config_prefix="$STUDIO/tools/npm-global"
export npm_config_update_notifier=false
export PUPPETEER_CACHE_DIR="$STUDIO/.cache/puppeteer"
export PLAYWRIGHT_BROWSERS_PATH="$STUDIO/.cache/ms-playwright"
export DISABLE_TELEMETRY=1
export DO_NOT_TRACK=1
export HYPERFRAMES_NO_TELEMETRY=1
export HYPERFRAMES_SKIP_SKILLS=1
export REMOTION_DISABLE_TELEMETRY=1
export PATH="$STUDIO/tools/npm-global/bin:$PATH"

# Blender：程序在 tools/Blender.app，配置/脚本/扩展都锁在本目录
export BLENDER_USER_RESOURCES="$STUDIO/.home/blender"
export BLENDER_USER_CONFIG="$STUDIO/.home/blender/config"
export BLENDER_USER_SCRIPTS="$STUDIO/.home/blender/scripts"
export BLENDER_USER_EXTENSIONS="$STUDIO/.home/blender/extensions"
export BLENDER_USER_DATAFILES="$STUDIO/.home/blender/datafiles"
