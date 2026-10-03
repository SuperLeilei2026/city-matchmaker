# 初赛源码与发布状态

更新：2026-10-03。队伍：MOST暴躁队；成员：Leinstein。仓库：[SuperLeilei2026/city-matchmaker](https://github.com/SuperLeilei2026/city-matchmaker)；[初赛地址登记回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。仓库登记不等于评审通过。

## 主交付与版本

**本项目初赛主交付是 OctoScript 脚本应用包 `bundle/`，程序入口为 `bundle/main.splash`。** `manifest.json`、`listing.json`、素材、原生真实截图与复现说明随包提供。Web 版用于辅助体验、规则对照和交互说明，不能替代原生应用运行证据。

这对应官方 [App Flow 的 script-app 路径](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/README.zh-CN.md#设计流程)：`main.splash` 由 Makepad Script 在 Splash 环境求值，与 `page.card` 的 L0 解析路径不同；不因后缀为 `.splash` 而误判缺少 OctoScript 参赛应用。

**v0.3.0 目前是本地开发版本，尚未创建标签、尚未推送。** 本次只读远端核对时，公开 `main` 仍为 `131e752`，最新公开标签为 `v0.2.0`。旧标签保留，不移动。原生流程已完成本轮复验；公开提交后再以实际提交号和标签更新本页。

源码初赛提交与 App Hub 公开上架是两条状态。[赛事提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md)写明现阶段按公开源码和可运行作品评审，无需等待 Hub 上架。官方 App Flow 也明确参赛不会自动提交到 App Hub。本项目未公开上架；这不应被写成当前源码提交的前置阻断。

## 交付与证据

- **原生主程序。** [main.splash](../bundle/main.splash)；启动、生成和测试命令见 [OctoScript 包说明](octosense.md)，工具基底见 [runtime-lock.md](runtime-lock.md)。
- **原生真实截图。** [首次介绍](../bundle/screenshots/02-first-match.png)、[反馈后结果](../bundle/screenshots/03-second-match.png)、[画像](../bundle/screenshots/05-portrait.png)、[逐题场景](../bundle/screenshots/06-scene.png)。已随本轮真实 card-host 验收更新，使用合成资料。
- **原生测试。** [Joy 报告](../qa/native-joy-check.json)、[Agent 报告](../qa/native-agent-check.json)记录被测源码哈希。两份报告的源码哈希均与当前生产 `main.splash` 一致；单题编辑中退出重启后返回画像已加入回归。
- **原生主演示。** [约2分31秒真实 card-host 录像](demo-native.mp4)与[录制报告](../qa/native-demo/recording-report.json)，包含逐题选择、画像修订、两轮推荐及服务不可用保护；无源码／状态注入，录制、完整解码、Chromium实际播放与成片抽帧检查通过。
- **辅助 Web。** [Web 录像](demo-web.mp4)与[浏览器报告](../qa/browser-smoke-result.json)用于交互对照；两部影片的范围分别见 [demo.md](demo.md)，均无真实模型成功。
- **数据。** 8 城、32 来源、136 条 Joy 信号；47 条人工分档，89 条未知，详见 [来源说明](data-sources.md)。

## 验证状态

| 范围 | 已有证据 | 当前边界 |
| --- | --- | --- |
| 原生 Joy 流程 | 最终 12 项界面、4 项存档／迁移、7 组原生与 JS 对照通过，含试城计划一致性 | 39字段存档兼容29／30／38旧档；这不证明现实推荐有效或真实模型成功 |
| 原生 Agent 保护机制 | 最终 5 项生产路径、21 项临时响应注入检查通过 | 注入只在临时包；不是 MiniMax／Kimi 的真实返回 |
| 包检查 | 最终 `hub check --allow-unsigned` 通过，仅 unsigned 警告；审核材料与生产源码一致 | 不等于正式签名或 App Hub 批准；以后改包须重新检查 |
| 辅助规则与 Web | 41 项 Node、10 组浏览器流程通过；0 页面错误、0 远端资料请求 | 仅覆盖各报告对应的源码，不能替代原生启动与交互 |
| 原生主演示 | 约2分31秒真实card-host操作；生产源码哈希一致，无注入，录制、完整解码、Chromium播放和画面检查通过 | 模型服务不可用的真实失败处理，不是模型成功证据 |
| 辅助 Web 录像 | 151秒；录制、完整解码和浏览器播放通过 | 不能代替原生操作结果或真实模型证据 |
| v0.3 公开源码 | 本地开发中 | 标签、推送尚未完成；没有公开在线 Web Demo |

## 真实模型边界

CM1 保留结构化提案、用户确认、执行、保存与读回保护。当前有用的 Agent 操作是追加气候避开项或明确排除候选城市；五维答案由用户手选。旧 `priority/focus` 字段不能被演示成已能修改五维画像。

用户已报告宿主连接完成，但本应用真实模型返回、确认执行与恢复全链路仍没有验收证据。card-host 按官方设计不提供 octos 服务，无服务提示只能证明失败处理；不能据此认定真实模型已通过或把配置账户当作本地基础流程的前提。详见 [原生说明](octosense.md)。

原生新入口回归、截图与包检查已完成；下一步固定源码并推送。真实模型验收和以后选择进行的 App Hub 签名／审核分别记录，不混同为初赛源码是否已经提交。

## 数据与隐私

MBTI、星座、学校、年龄不产生城市分数；住房与通勤缺少可比样本时只作待核验条件。原生自由反馈会发送给宿主模型，用户可能自行写入隐私；公开证据只用合成资料。完整说明见 [privacy.md](privacy.md)。
