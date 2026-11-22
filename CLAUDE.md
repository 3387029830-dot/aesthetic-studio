# Aesthetic Studio — 工作约定

本目录用于制作高级感宣传片与网页（Apple 级审美）。

## 环境规则（重要）
- 这台电脑不是用户本人的：**禁止全局安装**（no `npm i -g`、no `brew`、no `pip install --user`、no `skills add -g`）。
- 每条 Bash 命令前都要 `source ./env.sh`（在本目录根）：它把 Node、FFmpeg、HOME 和所有缓存都限制在本目录内。
- git 操作**不要** source env.sh（需要真实 HOME 的凭据）。
- 新项目放 `projects/<name>/`，从 `templates/` 复制起步。
- HyperFrames 固定版本：`npx -y hyperframes@0.9.80 <cmd>`。

## 工具选择
| 需求 | 用 |
|---|---|
| 宣传片 / 动效视频（React 生态、复杂逻辑） | `templates/remotion-starter` + remotion-* skills |
| 宣传片 / 动效视频（HTML + GSAP，更快出片） | `templates/hyperframes-promo` + hyperframes skills |
| 复刻参考视频 | reverse-any-video skill |
| 高级感网页（滚动叙事） | `templates/web-starter`（Vite + GSAP ScrollTrigger + Lenis）+ frontend-design skill |
| 网页截图自查 | webapp-testing skill |
| 沉淀成自己的 skill | skill-creator skill |

## 审美底线（持续补充 → 未来封装成 skill）
- 先写文字：一句话核心卖点 → 分镜/版块表 → 确认后再写代码。
- 克制：一屏一个信息，大量留白，少颜色（黑/白 + 一个强调色）。
- 大字号层级对比强烈；字距收紧（-0.02 ~ -0.04em）。
- 动效用 expo/power 缓出，时长 0.8–1.6s，避免弹跳、旋转等廉价效果。
- design tokens 集中在一处，所有场景共用。
- 有配音时，先出音频，按音频时长排画面。
- 交付前截图/抽帧自查：文字溢出、对比度、节奏。

## 技术坑（实战记录）
- GSAP 对 `scaleX(0)` 的元素读不出 CSS 里的 rotate：旋转放在外层容器，内层只做 scale。
- 用 clip-path 拼接的两块面板，抖动或抗锯齿时会露出缝：下面垫一层完整底板，切开的那一刻再撤掉。
- 竖排大标题（writing-mode: vertical-rl）要加 `white-space: nowrap`，否则视口矮时会拆成多列、阅读顺序错乱。
- rsync 复制项目时不要 `--exclude dist`，会把 node_modules 里各个包的 dist 也排除掉。

