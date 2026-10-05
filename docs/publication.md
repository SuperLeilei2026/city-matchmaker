# 源码与发布状态

更新：2026-10-05。MOST暴躁队 / Leinstein。仓库：[SuperLeilei2026/city-matchmaker](https://github.com/SuperLeilei2026/city-matchmaker)；[初赛登记回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。登记不等于评审通过。

## 当前交付

主交付是 OctoScript 原生脚本包 `bundle/`，入口 `main.splash`，附 manifest、listing、素材与真实截图。采用官方 [script-app Flow](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/flows/script-app/FLOW.md)，无需本应用 Rust 代码。Web 保留 v0.3 交互，仅作辅助研究。

**v0.4.0：先看城市，留两座再比较。** 不要求先填问卷；收藏和翻页不推断五维。有明确偏好时再按共用规则比较，拿不准才可选补一题。

v0.4 为 10 月 5 日的后续迭代，不能冒称在此前初赛截止时间前交付。此前已公开的 v0.3 源码与实录保留于 [`f4566a5`](https://github.com/SuperLeilei2026/city-matchmaker/tree/f4566a5f0bb254829e8ed193541ebd0a539e10ec)，旧标签不移动；主办方是否采纳后续更新未知。本次不重复留言或修改报名。

## 本版材料

- **程序与复现：** [原生说明](octosense.md)、[工具基底](runtime-lock.md)、[产品需求](../BRIEF.md)。本地基本流程不依赖模型或 Web 服务器。
- **真实截图：** [直接看城市](../bundle/screenshots/01-discovery.png)、[两城比较](../bundle/screenshots/02-comparison.png)、[可选追问](../bundle/screenshots/03-optional-question.png)、[资料](../bundle/screenshots/04-profile.png)。合成资料，来自真实 card-host。
- **当前验证：** [原生流程](../qa/native-discovery-check.json)、[Agent 保护](../qa/native-agent-check.json)、[存档与规则对照](../qa/native-discovery-contract.json)。报告记录当前生产程序指纹，临时注入只用于保护机制和规则对照。
- **数据：** 八城、32来源、136条信号中47条人工整理、89条未知；[资料边界](data-sources.md)、[匹配规则](matching-model.md)。SVG 是生活想象，不是路线或实景证明。
- **历史影片：** [v0.3 原生实录与辅助 Web 录像](demo.md)记录旧交互，不作为 v0.4 新流程的运行证据。

## 独立记录的边界

本地最终验收：19项生产 UI、4项 Agent 生产路径与23项临时响应保护、5项存档合同、8步跨实现状态、7组排名/区间/试城计划通过；JS 整套55项通过。三个原生报告对应生产 SHA-256 `8ad19df2a9375b68624aec5cd25c5c9b4ca5e68b88c5736008f708db5d1969ca`。`hub check --allow-unsigned` 通过，仅未签名警告；包 BLAKE3 为 `4d438c6610b700f66eb89c50ef7dbf5d8604f7356df8a6423be05ca166b4b015`。

原生参考宿主可运行、本地包检查、公开源码、完整 Shell 安装、真实模型链路以及 App Hub 上架是不同状态，不能相互替代。

`card-host` 不提供模型服务。当前 Agent 的有效动作主要是追加气候避开项与明确拒绝当前城市；五维由用户确认选项。用户已报告宿主连接完成，但本应用真实模型返回、确认、执行与恢复尚未验收。临时响应测试不代表 MiniMax/Kimi 成功调用。

**未公开上架 App Hub。** 此前核对的 [赛事提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md)允许按源码和可运行作品评审，无需等待上架。本地 unsigned 检查也不代表人工审核通过。

公开证据仅使用合成资料；真实个人进度、私钥、模型密钥与自由反馈不上传，详见 [隐私说明](privacy.md)。
