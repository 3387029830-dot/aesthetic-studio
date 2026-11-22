# 用 Claude 做视频 · 前置调研（2026-11）

## 一、核心认知：Claude 不"生成"视频，它"编排"视频

Claude 本身不出像素，主流做法分四条路线：

| 路线 | 原理 | 适合 | 代表工具 |
|---|---|---|---|
| A. 代码即视频（React） | Claude 写 React 组件 → Remotion 渲染 MP4 | 产品宣传片、数据动画、字幕/片头、批量模板视频 | Remotion + 官方 skills |
| B. 代码即视频（HTML） | Claude 写 HTML/CSS/GSAP → 无头浏览器逐帧录制 | 同上，门槛更低；网页转视频 | HeyGen HyperFrames |
| C. 数学/知识讲解动画 | Claude 写 Python → Manim 渲染 | 3B1B 风格科普、公式推导、算法讲解 | manim-video skill |
| D. 剪辑真实素材 | 转写成文字 → Claude 读文本决定剪辑点 → FFmpeg 执行 | 口播粗剪、去废话、拼接、加字幕 | video-use、mcp-video |
| E. AI 生成画面 | Claude 写分镜/提示词 → 调 Veo/Kling/Seedance 等 API | 实拍感镜头、B-roll、短片 | fal MCP、ElevenLabs MCP、Higgsfield |

实际项目往往是组合：**脚本(Claude) → 配音(TTS) → 画面(A/B/C/E) → 合成(FFmpeg/Remotion)**。

---

## 二、筛选后的 Skill / MCP 清单

### ⭐ 第一梯队（官方或高活跃，推荐先装）

1. **Remotion 官方 Agent Skills** — `remotion-dev/skills`
   - 安装：`npx skills add remotion-dev/skills`（落在 `.claude/skills/remotion/`）
   - 含 best-practices、create、render、captions 等子 skill
   - 需 Node 18+；商业使用注意 Remotion 的公司授权条款
   - 文档：https://www.remotion.dev/docs/ai/claude-code ｜ https://www.remotion.dev/skills

2. **HyperFrames**（HeyGen 开源，Apache-2.0，2026-04 发布）
   - 安装：`npx skills add heygen-com/hyperframes`
   - 渲染：`npx hyperframes render my-video.html --output out.mp4`
   - 自带"计划 → 写 HTML → lint → 预览 → 渲染"的生产流程，另有 website-to-video
   - 仓库：https://github.com/heygen-com/hyperframes

3. **video-use**（Browser Use 团队）— 剪真实素材
   - 素材扔进文件夹 → 说需求 → 输出 `edit/final.mp4`；LLM 不"看"视频，读转写文本
   - 转写依赖 ElevenLabs Key（fork `freecut` 换成免费后端）
   - 仓库：https://github.com/browser-use/video-use

### 第二梯队（全家桶，功能多但需审代码）

4. **claude-code-video-toolkit**（digitalsamba，MIT，~1.8k★）
   - Remotion + ElevenLabs + FFmpeg + Playwright 录屏 + Python 配音/配乐/图像工具
   - https://github.com/digitalsamba/claude-code-video-toolkit

5. **OpenMontage**（AGPL-3.0）
   - 全流程：调研→脚本→素材生成→剪辑→合成；**先出带成本估算的方案，确认后才花钱**（值得借鉴）
   - AGPL 对商业闭源有传染性，注意
   - https://github.com/calesthio/OpenMontage

6. **manim-video skill**（Hermes/NousResearch 版最常见）
   - Manim CE + LaTeX + ffmpeg，可选 ElevenLabs 配音；强制"先写规划文档再写代码"
   - https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/creative/creative-manim-video

### MCP（工具层）

| MCP | 用途 | 备注 |
|---|---|---|
| mcp-video | 本地 FFmpeg 剪辑，80+ 工具 | `claude mcp add mcp-video -- uvx mcp-video`，需自装 ffmpeg |
| ElevenLabs MCP | 配音、音乐、音效（现在也有图/视频） | OAuth 连接，按量付费 |
| fal MCP | 600+ 模型：Veo 3 / Kling / Seedance 等 | 需 `FAL_KEY`，按量计费 |
| Higgsfield / UnificAlly | 聚合多家视频模型 | 第三方托管，注意数据去向 |

⚠️ 第三方 skill 市场（skillsmp、skills.sh、claudemarketplaces…）大量镜像/fork，**只从官方仓库装，装前读一遍 SKILL.md 和脚本**。

---

## 三、方法论（各教程共识提炼）

1. **先文字后画面**：脚本 → 分镜表（镜头号/时长/画面/文字/音频提示/转场）→ 确认后再写代码。Manim 和 HyperFrames 的 skill 都强制这一步。
2. **音频驱动时长**（最多人踩的坑）：先生成配音，测出每段真实时长，再让画面按音频时长排帧；不要先定画面再硬塞配音，会音画漂移。
3. **双终端迭代**：一个跑 `npx remotion studio`（实时预览），一个跑 `claude`，边看边改，最后再 render。
4. **视觉规范前置**：一份 design tokens（配色、字体、字号、动效节奏、留白），所有场景共用，避免"每个镜头风格不一样"。
5. **场景拆分**：每个镜头一个组件/HTML 文件，单独可预览、可替换，方便局部重做。
6. **花钱前先报价**：调付费 API（TTS、视频模型）前，让 Claude 先列清单和预估成本，确认后再执行（借鉴 OpenMontage）。
7. **成片复查**：渲染后抽帧/让模型复查音画同步、字幕错别字、文字溢出。

典型案例参考：
- 15 分钟教程 30 分钟做完：先和 Claude 磨稿 → 自己录音 → Claude 围绕音频搭 Remotion，并标出哪里需要录屏 — https://danyuchn.github.io/blog/posts/en/remotion-claude-code-videos
- Shopify 应用商店视频 $0 制作：Claude Code + 录屏 + AI 配音，首次合成即同步 — https://www.attributionapp.com/blog/how-we-built-shopify-video-with-ai/
- 全 AI 产品 demo 视频（含音画同步调试过程）— https://dev.to/javieraguilarai/i-made-a-product-demo-video-entirely-with-ai-e6h

---

## 四、本机前置准备清单

- [ ] Node.js ≥ 18（`node -v`）
- [ ] FFmpeg（`brew install ffmpeg`）
- [ ] Python ≥ 3.9 + uv（Manim / mcp-video / toolkit 用）
- [ ] 确定视频类型 → 选路线（A/B/C/D/E）
- [ ] 按路线装对应 skill（建议从 Remotion 或 HyperFrames 二选一起步）
- [ ] 如需配音：ElevenLabs 账号 + API Key（或免费替代）
- [ ] 如需 AI 画面：fal 账号 + `FAL_KEY`
- [ ] 准备：品牌素材（logo/配色/字体）、参考视频、目标平台尺寸（16:9 / 9:16）与时长

## 中文教程
- https://www.heyuan110.com/zh/posts/ai/2026-01-26-claude-code-remotion-video/
- https://m.runoob.com/claude-code/claude-code-remotion-best-practices.html
- 英文快速上手：https://apidog.com/blog/claude-code-remotion ｜ https://www.tella.com/blog/how-to-use-remotion-agent-skills-with-claude-code
