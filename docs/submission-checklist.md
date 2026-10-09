# 初赛源码与后续迭代核对

更新：2026-10-07。初赛主交付是 `bundle/main.splash` 的 OctoScript 应用；Web 为辅助材料。v0.3 源码与实录此前已公开，v0.4 是之后的极简体验迭代。本次更新不冒称在 10 月 4 日 23:59 前完成，也不推断赛务是否采用后续提交。10 月 6 日 20:00 是官方计划的晋级公布时间，不是提交截止。

| 条目 | 材料与边界 |
| --- | --- |
| 初赛仓库登记 | [MOST暴躁队回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)，成员 Leinstein；本轮不重复发送或更改报名。 |
| 需求与人群 | [产品设计](product-design.md)、[场景定位](competition-fit.md)：AI 产品人群的城市生活探索，不预测幸福或职业成功。 |
| 原生源码与运行 | `bundle/main.splash`、manifest、listing、素材；[运行说明](octosense.md)与[工具基底](runtime-lock.md)。无需 Web 服务器或模型账户即可浏览、收藏、比较。 |
| v0.4 交互证据 | [极简流程报告](../qa/native-discovery-check.json)和[原生截图](../bundle/screenshots)。核对当前 main 哈希，不沿用旧五题报告。 |
| 迁移与空状态 | 浏览轮次终点、至多两城收藏、资料返回、重启与旧格式迁移由本版原生脚本检查。翻页不排除，收藏不推断五维。 |
| Agent 保护与真实调用 | [Agent 保护报告](../qa/native-agent-check.json)包含服务不可用与临时响应测试；[完整 Shell 报告](../qa/real-agent-e2e-v0.4/README.md)另行记录一次真实 MiniMax-M3 提案、确认、保存与重启恢复。 |
| 包检查与发布证明 | [历史开发 gate](../qa/app-hub-gate-v0.4.json)按 App Hub `78dfda5` 构建工具通过，仅 unsigned warning。最终 v0.4 采用 `.github/workflows/publish-app.yml`：固定 App Hub `655114c`，由 GitHub 对 Tag 字节生成证明与 release pack；不使用开发者私钥。工作流成功、Tag、Release 或 Issue 都不等于人工审核通过。 |
| 固定版本 | 当前版本见 [publication.md](publication.md)；旧 v0.3 初赛提交保留，不移动历史标签。 |
| 演示影片 | [v0.4 原生影片](demo-native-v0.4.mp4)长 2 分 38 秒，完整解码及关键帧抽查通过；[录制报告](../qa/native-demo-v0.4/recording-report.json)记录真实 UI 操作与 Agent 不可用边界。v0.3 影片只保留为历史材料。 |
| 数据与隐私 | 8城、32来源、47条人工整理信号、89条未知；[来源](data-sources.md)、[隐私](privacy.md)。公开截图与测试使用合成资料。 |
| 作者与许可证 | MOST暴躁队 / Leinstein；发布者 Leilei；Apache-2.0，素材声明见 NOTICE。 |

仍未完成且独立记录：Kimi 与模型切换/故障转移、实体手机与其他平台验证、GitHub release pack 复核及 App Hub 人工审核。本地参考宿主或一次 MiniMax-M3 验收均不代表已上架，未上架也不能直接推导源码没有提交。

官方固定版[赛程](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/0db87b582438f0f01534435b8537e8c89bcd303d/docs/competition-schedule.md)与[作品提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/0db87b582438f0f01534435b8537e8c89bcd303d/docs/app-hub-submission.md)记载了源码、可运行作品和材料要求，源码提交无需等待 Hub 上架。当前未找到 MOST暴躁队公开晋级证据；10 月 9 日冻结与 10 月 12 日材料只在官方确认晋级后适用。当前公开状态与边界见[源码与发布状态](publication.md)。
