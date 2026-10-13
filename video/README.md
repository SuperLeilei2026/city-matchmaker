# 《毕业第一站》v0.6 产品介绍片

最终成片：`video/build/graduation-first-station-v0.6.mp4`。发布时将它作为 GitHub Release 资产提供，不把二进制中间文件提交进源码历史。

## 成片规格

- 82.022 秒，小于比赛要求的 2 分钟；
- 1920×1080，16:9，24 fps；
- H.264 视频、AAC 48 kHz 双声道音频；
- SHA-256：`ac3cbee45da7bf2ad0843452257979480b967dd68ffe3031a3191598c4ca6558`。

## 表达方式

视频从产品经理视角回答三个问题：毕业生真正缺少什么、总分推荐为什么不足、Agent 在决策中应该做什么。它以原创工业车站、冷青／洋红双城轨道和猫狗站务员建立记忆点，并把真实 v0.6 界面、真实 MiniMax-M3 提案、数据反例和明确的未知放进同一条叙事线。

视频不承诺“最适合的城市”、录取概率、WLB 或幸福预测。核心结论是：把两种都可能成立的生活放在同一座站台上，找出最可能改变决定的信息。

## MiniMax 生成记录

MiniMax Agent 中已提交 16:9 的 Hailuo 2.3 视觉片段任务 `452028641157402`。网页账户的 H3/H3-Max 积分不足；Hailuo 任务提交后，进度查询又返回 `50110: insufficient balance (1008)`，资产库未出现视频。因此最终交付没有冒称使用了未生成的素材。

完整 MiniMax 提示词保存在 [`docs/video-minimax-prompts.md`](../docs/video-minimax-prompts.md)。成片改用相同的原创视觉方案，由 [`tools/render_product_video.py`](../tools/render_product_video.py) 程序化生成画面，再与旁白和原创程序化音乐合成。这样既保留了明确的创意方案，也避免比赛发布被第三方额度状态阻断。

## 可复现材料

- 叙事、分镜和事实边界：[`docs/video-treatment.md`](../docs/video-treatment.md)
- 旁白：[`video/narration.txt`](narration.txt)
- 画面与音乐渲染器：[`tools/render_product_video.py`](../tools/render_product_video.py)
- 产品证据：`bundle/screenshots/` 与 `qa/real-agent-e2e-v0.6/`

渲染器输出无声画面和 WAV 音乐；旁白使用 macOS `Tingting` 语音生成；最终由 FFmpeg 合成为 H.264/AAC MP4。生成素材不承担产品事实展示，所有功能证据都来自真实 v0.6 界面。
