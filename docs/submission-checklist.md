# 初赛源码与后续迭代核对

更新：2026-10-05。初赛主交付是 `bundle/main.splash` 的 OctoScript 应用；Web 为辅助材料。v0.3 源码与实录此前已公开，v0.4 是之后的极简体验迭代。本次更新不冒称在旧截止时间前完成，也不推断赛务是否采用后续提交。

| 条目 | 材料与边界 |
| --- | --- |
| 初赛仓库登记 | [MOST暴躁队回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)，成员 Leinstein；本轮不重复发送或更改报名。 |
| 需求与人群 | [产品设计](product-design.md)、[场景定位](competition-fit.md)：AI 产品人群的城市生活探索，不预测幸福或职业成功。 |
| 原生源码与运行 | `bundle/main.splash`、manifest、listing、素材；[运行说明](octosense.md)与[工具基底](runtime-lock.md)。无需 Web 服务器或模型账户即可浏览、收藏、比较。 |
| v0.4 交互证据 | [极简流程报告](../qa/native-discovery-check.json)和[原生截图](../bundle/screenshots)。核对当前 main 哈希，不沿用旧五题报告。 |
| 迁移与空状态 | 浏览轮次终点、至多两城收藏、资料返回、重启与旧格式迁移由本版原生脚本检查。翻页不排除，收藏不推断五维。 |
| Agent 保护 | [Agent 报告](../qa/native-agent-check.json)包含服务不可用与临时响应测试；不是外部模型成功证据。 |
| 包检查 | 每次改包重新 stamp/check；unsigned 本地检查不等于正式签名或人工审核。 |
| 固定版本 | 当前版本见 [publication.md](publication.md)；旧 v0.3 初赛提交保留，不移动历史标签。 |
| 演示影片 | [v0.3 原生影片](demo.md)保留为历史材料，不代表 v0.4 新交互。新流程以实际应用和当前截图/报告为准。 |
| 数据与隐私 | 8城、32来源、47条人工整理信号、89条未知；[来源](data-sources.md)、[隐私](privacy.md)。公开截图与测试使用合成资料。 |
| 作者与许可证 | MOST暴躁队 / Leinstein；发布者 Leilei；Apache-2.0，素材声明见 NOTICE。 |

仍未完成且独立记录：真实模型完整链路验收、实体手机与其他平台验证、App Hub 公开签名与审核。本地参考宿主可运行不代表已上架，未上架也不能直接推导源码没有提交。

此前核对的官方 [初赛清单](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/competition-schedule.md) 与 [作品提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md)记载了源码、可运行作品和材料要求，源码提交无需等待 Hub 上架。报名资格、截止时间后的更新是否采纳及评审结果，以主办方最终记录为准；本次代码迭代不声称已重新核验赛务。
