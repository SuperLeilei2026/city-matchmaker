# 源码与发布状态

更新：2026-10-07。MOST暴躁队 / Leinstein。仓库：[SuperLeilei2026/city-matchmaker](https://github.com/SuperLeilei2026/city-matchmaker)；[初赛登记回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。登记不等于评审通过或晋级；目前没有本队晋级的公开官方证据。

## 当前交付

主交付是 OctoScript 原生脚本包 `bundle/`，入口 `main.splash`，附 manifest、listing、素材与真实截图。采用官方 [script-app Flow](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/flows/script-app/FLOW.md)，无需本应用 Rust 代码。Web 保留 v0.3 交互，仅作辅助研究。

**v0.4.0：先看城市，留两座再比较。** 不要求先填问卷；收藏和翻页不推断五维。有明确偏好时再按共用规则比较，拿不准才可选补一题。

v0.4 为 10 月 5 日的后续迭代，不能冒称在此前初赛截止时间前交付。此前已公开的 v0.3 源码与实录保留于 [`f4566a5`](https://github.com/SuperLeilei2026/city-matchmaker/tree/f4566a5f0bb254829e8ed193541ebd0a539e10ec)，旧标签不移动；主办方是否采纳后续更新未知。本次不重复留言或修改报名。

## 本版材料

- **程序与复现：** [原生说明](octosense.md)、[工具基底](runtime-lock.md)、[产品需求](../BRIEF.md)。本地基本流程不依赖模型或 Web 服务器。
- **真实截图：** [直接看城市](../bundle/screenshots/01-discovery.png)、[两城比较](../bundle/screenshots/02-comparison.png)、[可选追问](../bundle/screenshots/03-optional-question.png)、[资料](../bundle/screenshots/04-profile.png)。合成资料，来自真实 card-host。
- **当前验证：** [原生流程](../qa/native-discovery-check.json)、[Agent 保护](../qa/native-agent-check.json)、[存档与规则对照](../qa/native-discovery-contract.json)。报告记录当前生产程序指纹，临时注入只用于保护机制和规则对照。
- **数据：** 八城、32来源、136条信号中47条人工整理、89条未知；[资料边界](data-sources.md)、[匹配规则](matching-model.md)。SVG 是生活想象，不是路线或实景证明。
- **当前影片：** [v0.4 原生实录、边界与历史影片](demo.md)。当前候选片长 2 分 38 秒，来自真实 `card-host` 操作并完整解码通过；它展示真实 Agent 不可用状态，不冒充模型成功。

## 独立记录的边界

本地最终验收：19项生产 UI、4项 Agent 生产路径与23项临时响应保护、5项存档合同、8步跨实现状态、7组排名/区间/试城计划通过；JS 整套55项通过。三个原生报告与 v0.4 录屏对应生产 SHA-256 `8ad19df2a9375b68624aec5cd25c5c9b4ca5e68b88c5736008f708db5d1969ca`。使用 App Hub `78dfda5f33638e1869c36bceef5713342aae861c` 构建的本次已测 gate 执行 `hub check --allow-unsigned` 通过，仅有未签名警告；包 BLAKE3 为 `4d438c6610b700f66eb89c50ef7dbf5d8604f7356df8a6423be05ca166b4b015`，记录见 [app-hub-gate-v0.4.json](../qa/app-hub-gate-v0.4.json)。

原生参考宿主可运行、本地包检查、公开源码、完整 Shell 安装、真实模型链路以及 App Hub 上架是不同状态，不能相互替代。

`card-host` 不提供模型服务。当前 Agent 的有效动作主要是追加气候避开项与明确拒绝当前城市；五维由用户确认选项。官方 Desktop 完整 Shell 已以隔离合成资料跑通一次 MiniMax-M3 返回、确认、执行、保存与恢复，见[真实 Agent 全链路报告](../qa/real-agent-e2e-v0.4/README.md)。临时响应测试仍不代表真实调用，Kimi 与其他平台尚未验证。

**未公开上架 App Hub。** 固定版本的[赛事提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/0db87b582438f0f01534435b8537e8c89bcd303d/docs/app-hub-submission.md)允许按源码和可运行作品评审，无需等待上架。本地 unsigned 检查也不代表已提交 Issue、完成人工审核或公开上架。公开核对项见[提交清单](submission-checklist.md)，人工审查问题的候选答案见 [REVIEW-ANSWERS.md](../tools/REVIEW-ANSWERS.md)。

公开证据仅使用合成资料；真实个人进度、私钥、模型密钥与自由反馈不上传，详见 [隐私说明](privacy.md)。
