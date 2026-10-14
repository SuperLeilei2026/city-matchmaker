# 源码与发布状态

更新：2026-10-14。MOST暴躁队 / Leinstein。公开仓库：[SuperLeilei2026/city-matchmaker](https://github.com/SuperLeilei2026/city-matchmaker)；[初赛登记回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。登记、GitHub Release 与 App Hub 人工审核是三个不同状态。

## v0.6.0 已公开发布

`v0.6.0` 已于 2026-10-14 以不可移动标签公开发布“从城市推荐器到双城决策实验室”的完整版本：

- 已有候选／还没有方向双入口；
- 行业、具体职业方向、兴趣、预算和气候红线；
- 约束状态与内部偏好顺序分离，主界面不展示总分；
- 用户亲选决赛两城、封存原始倾向、完成发展线／日常线／落地线三幕 PK；
- 每幕同时展示事实、编辑判断、反例和未知；
- 系统 Agent 只提出一个可能改变决定的问题及一项核验任务；
- 任务和先验证城市分别确认后才保存；
- 双城通行证保留先验证城市、备选城市和改选条件；
- Web 五阶段状态、旧存档迁移与原生 v4 58 字段存档。

最终源码候选指纹：

- `bundle/main.splash` SHA-256：`91eb0086601f34e7eed5512ce604fd0c0f5485db1f30d7d277ba147413498375`
- 本地开发 manifest stamp：`ccbbcc66831bccddc446891b122093c9ddbd89a8ba2bc6ad9aad9f19eff9b03c`

公开发布证据：

- [v0.6.0 GitHub Release](https://github.com/SuperLeilei2026/city-matchmaker/releases/tag/v0.6.0)，提交 `4b7f62789c7ddd842dd6bf5261883f1a6de69139`；
- [B 站项目介绍视频](https://www.bilibili.com/video/BV1gvpy6qEho/)作为评审观看入口；它是冻结 Tag 之后补充的展示材料，不改变 v0.6.0 源码、包与摘要；
- [GitHub Actions run 38447560800](https://github.com/SuperLeilei2026/city-matchmaker/actions/runs/38447560800) 的 `prepare` 与 `publish` 均通过；
- release pack SHA-256：`9b24fe311f683ef10aff57bd219cb23eb5369461e21b697dbd4136cddfa85d00`；
- 工作流当前 Hub 重新计算并签入 provenance 的 bundle BLAKE3：`eca6abb436954b5855fddab233f2806cbdcfa8fc719f38a3ca187ff710b5f04c`；
- [82 秒产品介绍片](https://github.com/SuperLeilei2026/city-matchmaker/releases/download/v0.6.0/graduation-first-station-v0.6.mp4) SHA-256：`ac3cbee45da7bf2ad0843452257979480b967dd68ffe3031a3191598c4ca6558`。

本地开发 stamp 与工作流发布 digest 来自不同版本的 Hub 工具；App Hub 审核使用工作流 attested 的 `eca6…` 作为本次提交身份。

## 已完成验证

- 正式 v0.6 范围内 69 项 Node 测试全部通过；工作区另有 43 项未纳入本次发布的 v3 探索测试。
- `hub check bundle --allow-unsigned` 通过，仅有预期的未签名开发包警告。
- 原生完整双城流程 12 项检查通过，报告见 [`qa/native-departure-check.json`](../qa/native-departure-check.json)。
- 原生 Agent 生产失败回退 2 项与临时响应注入 38 项检查通过，报告见 [`qa/native-agent-check.json`](../qa/native-agent-check.json)。注入只发生在测试临时副本，不是模型调用。
- 在完整 OctoSense Shell 中，用最终候选从本地签名目录全新安装，并由 MiniMax-M3 完成一次真实 `DQ1` 调用。首次同意、提案不落盘、任务确认、城市确认和重启恢复均已逐步验证，见 [`qa/real-agent-e2e-v0.6/README.md`](../qa/real-agent-e2e-v0.6/README.md)。
- 82 秒 16:9、1080p 产品介绍片已完成并作为 Release 资产公开，制作说明见 [`video/README.md`](../video/README.md)。

这些验证证明应用能够执行约定流程和权限边界，不证明城市建议准确、用户会更快乐或能获得特定 offer。

## 仍属未知

- 小陈、小雷本人尚未完成首轮试玩；仓库提供了测试脚本和记录模板，但不会把计划冒充结果。
- Kimi、Android、HarmonyOS、Windows、Linux、模型故障切换和真实岗位／房源核验未在本次冻结候选中覆盖。
- GitHub 标签和 Release 只证明不可移动来源与工作流结果；App Hub 维护者批准和公开目录上架仍需单独核验。

## App Hub 提交状态

应用尚未首次进入 App Hub 公开目录，因此按当前规范复用原 Issue：

- [App Hub Issue #177](https://github.com/OctoSense-org/OctoSense-App-Hub/issues/177) 的标题、Version 与正文已经更新到 v0.6.0；
- [v0.6.0 release 证据评论](https://github.com/OctoSense-org/OctoSense-App-Hub/issues/177#issuecomment-6152613807) 已公开提交；
- 完整提交正文与评论副本见 [`app-hub-update-v0.6.md`](app-hub-update-v0.6.md)；
- 当前状态是 **GitHub release ready for review / 待 App Hub 维护者审核**，不能表述为已经进入公开目录。

维护者人工审核通过并由受保护目录工作流收录后，才能声称“App Hub 已上架”。

历史标签不会移动。本地后续迭代也不能冒称在先前截止时间前已经交付。
