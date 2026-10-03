# 初赛源码交付核对

核对日期：2026-10-03。**本项目以 `bundle/main.splash` 为入口的 OctoScript 应用是初赛主交付，Web 是辅助材料。** v0.3.0 仍为本地版本，未创建标签、未推送；公开仓库登记与新版源码交付分开记录。

[官方初赛清单](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/competition-schedule.md#初赛需求成立作品能跑)要求 10/4 23:59（北京时间）前提供需求、可运行原型、启动说明、固定源码或包、演示、截图、数据限制及成员信息。[作品提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md)明确现阶段无需等待 Hub 上架。`main.splash` 的技术路径依据 [OctoScript App Flow](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/README.zh-CN.md#应用是什么)。

## 主交付检查

| 条目 | 状态 | 证据与下一步 |
| --- | --- | --- |
| 初赛仓库登记 | 已登记 | [MOST暴躁队回执](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)；不代表 v0.3 已上传或评审通过。 |
| 需求与目标用户 | 已有 | [产品设计](product-design.md)、[场景定位](competition-fit.md)：通过生活画像和反馈探索毕业后的城市，不预测幸福率或就业成功。 |
| OctoScript 程序与包 | 已实现并回归 | [main.splash](../bundle/main.splash)与 bundle 中的 manifest、listing、素材。AI方向后五题逐页，支持跳过、返回和画像单题编辑。 |
| 原生启动与复现 | 已提供命令及工具版本 | [octosense.md](octosense.md)、[runtime-lock.md](runtime-lock.md)。原生本地基本流程不依赖 Web 服务器或模型账户。 |
| 原生实际交互 | 最终通过 | [Joy 报告](../qa/native-joy-check.json)：12项界面、4项存档／迁移、7组对照，含试城计划；报告源码哈希与当前main一致。编辑单题中退出重启仍正确返回画像。 |
| 原生真实截图 | 已同步最终流程 | [逐题场景](../bundle/screenshots/06-scene.png)、[首次介绍](../bundle/screenshots/02-first-match.png)、[第二轮](../bundle/screenshots/03-second-match.png)、[画像](../bundle/screenshots/05-portrait.png)来自本轮真实 card-host。 |
| 正常、空与失败状态 | 已回归 | 明确拒绝、空画像、不确定候选、29／30／38旧档迁移、39字段存档恢复及模型不可用保护均通过。 |
| 包本地预检 | 最终通过 | `hub check --allow-unsigned` 仅 unsigned 警告，审核材料与生产源码一致。未来改包须重新 stamp/check。 |
| 固定源码版本 | 未完成 | 本地 v0.3 尚未建标签／推送，远端仍为 v0.2。回归后固定提交号及新标签，保留历史标签。 |
| 2–3 分钟演示 | 原生约2分31秒实录完成 | [主演示](demo.md)使用最终生产源码和独立card-host，无源码／状态注入；录制断言、完整解码、Chromium播放及成片画面检查通过。[报告](../qa/native-demo/recording-report.json)记录操作与影片指纹。Web影片另列为辅助。 |
| 数据、权限与隐私 | 已说明 | [来源](data-sources.md)：8 城32来源，47/136非空且均人工整理；[隐私](privacy.md)及 manifest 列明权限。全部公开测试使用合成资料。 |
| 作者与许可证 | 已有 | MOST暴躁队 / Leinstein，发布者 Leilei，支持为仓库 Issues；Apache-2.0，素材见 NOTICE。报名资格仍由赛务核验。 |

## 分开记录的后续状态

- **真实 Agent：尚未完成应用全链路验收。** 用户报告宿主已连接，但需本应用的真实响应、确认、执行及恢复记录。最终5项生产路径、21项注入检查通过，只证明受控机制；CM1当前处理气候／排除，五维手选。不能用“未真实模型验收”推导“OctoScript 基础应用不能运行”。
- **App Hub：未公开提交／上架。** 这是独立发布流程，包含签名与审核；不是当前源码初赛提交的前置阻断。本地预检也不等于人工批准。
- **Web：辅助验证已完成。** 41项Node、10组浏览器检查，0错误、0远端资料请求；[浏览器说明](web-qa.md)和[录像](demo.md)只证明辅助版本，不替代原生交互。

## 复现顺序

1. 先按 [原生说明](octosense.md)准备匹配版本的 `card-host`／`hub`，运行 `bundle/`；无需先启动 Web 或配置模型。
2. 运行 `tools/native_joy_smoke.py`、`tools/native_agent_smoke.py`，核对报告哈希和真实截图；真实模型验证另在完整 Shell 中进行。
3. 若需查看辅助 Web，再用 Node.js 22+ 执行 `node serve.mjs`。浏览器与录屏脚本所需 Playwright、Chromium、ffmpeg属于辅助验收工具。
4. 原生最终改动完成后重新生成包摘要、检查、固定版本并推送。提交时核对公开文件可读、原生能按说明复现、材料没有隐私或密钥。

当前不把尚未公开的本地 v0.3 写成已发布，也不把 Web 视频写成原生或真实 Agent 演示。
