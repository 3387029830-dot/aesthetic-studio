# Aesthetic Studio

用 Claude Code 制作高级感宣传片与网页的工作室：工具、skills、模板与审美经验的沉淀。

## 快速开始
```bash
bash setup.sh        # 首次：在本目录内安装 Node 24 与 FFmpeg（不碰系统环境）
source ./env.sh      # 每次开工前
```
然后在本目录启动 Claude Code，项目级 skills（`.claude/skills/`）会自动加载。

## 目录
```
.claude/skills/     项目级 skills（Remotion、HyperFrames、frontend-design、skill-creator…）
templates/
  remotion-starter/   Remotion（React）视频模板
  hyperframes-promo/  HyperFrames（HTML+GSAP）产品宣传片模板
  web-starter/        Vite + GSAP ScrollTrigger + Lenis 滚动叙事网页模板
projects/           具体作品
references/         调研资料
env.sh / setup.sh   隔离环境
CLAUDE.md           工作约定与审美底线
```

## 常用命令
```bash
# Remotion
cd templates/remotion-starter && npx remotion studio      # 预览
npx remotion render <Composition> out/video.mp4            # 渲染

# HyperFrames
cd templates/hyperframes-promo
npx -y hyperframes@0.9.80 preview
npx -y hyperframes@0.9.80 render --quality delivery -o out/video.mp4

# 网页
cd templates/web-starter && npm run dev
```

## Skills 来源
- [remotion-dev/skills](https://github.com/remotion-dev/skills)
- [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- [anthropics/skills](https://github.com/anthropics/skills)：frontend-design / skill-creator / webapp-testing

版本锁定见 `skills-lock.json`。Remotion 对 3 人以上公司需商业授权。
