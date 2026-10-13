# 源码与发布状态

更新：2026-10-14。MOST暴躁队 / Leinstein。公开仓库：[SuperLeilei2026/city-matchmaker](https://github.com/SuperLeilei2026/city-matchmaker)；[初赛登记回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。登记、GitHub Release 与 App Hub 人工审核是三个不同状态。

## v0.6 冻结候选

`v0.6.0` 将发布“从城市推荐器到双城决策实验室”的完整版本：

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
- bundle BLAKE3：`ccbbcc66831bccddc446891b122093c9ddbd89a8ba2bc6ad9aad9f19eff9b03c`

## 已完成验证

- 正式 v0.6 范围内 69 项 Node 测试全部通过；工作区另有 43 项未纳入本次发布的 v3 探索测试。
- `hub check bundle --allow-unsigned` 通过，仅有预期的未签名开发包警告。
- 原生完整双城流程 12 项检查通过，报告见 [`qa/native-departure-check.json`](../qa/native-departure-check.json)。
- 原生 Agent 生产失败回退 2 项与临时响应注入 38 项检查通过，报告见 [`qa/native-agent-check.json`](../qa/native-agent-check.json)。注入只发生在测试临时副本，不是模型调用。
- 在完整 OctoSense Shell 中，用最终候选从本地签名目录全新安装，并由 MiniMax-M3 完成一次真实 `DQ1` 调用。首次同意、提案不落盘、任务确认、城市确认和重启恢复均已逐步验证，见 [`qa/real-agent-e2e-v0.6/README.md`](../qa/real-agent-e2e-v0.6/README.md)。
- 82 秒 16:9、1080p 产品介绍片已完成，视频制作说明见 [`video/README.md`](../video/README.md)。

这些验证证明应用能够执行约定流程和权限边界，不证明城市建议准确、用户会更快乐或能获得特定 offer。

## 仍属未知

- 小陈、小雷本人尚未完成首轮试玩；仓库提供了测试脚本和记录模板，但不会把计划冒充结果。
- Kimi、Android、HarmonyOS、Windows、Linux、模型故障切换和真实岗位／房源核验未在本次冻结候选中覆盖。
- GitHub 标签和 Release 只证明不可移动来源与工作流结果；App Hub 维护者批准和公开目录上架需要单独核验。

## 发布链路

1. 将经过验证的源码、真实截图、隐私说明和发布工作流提交到公开仓库。
2. 创建不可移动的 `v0.6.0` 标签，由 `.github/workflows/publish-app.yml` 生成 GitHub attestation、`app.bundle.pack.json` 与 `release-receipt.json`。
3. 下载 Release 资产，核对 pack SHA-256、receipt、标签、提交与 bundle BLAKE3。
4. 因应用尚未首次进入公开目录，按 App Hub 当前规范在原 Issue #177 更新版本与本次 release 证据。
5. 维护者人工审核通过并由受保护目录工作流收录后，才能声称“App Hub 已上架”。

历史标签不会移动。本地后续迭代也不能冒称在先前截止时间前已经交付。
