# 初赛仓库材料核对

核对日期：2026-10-03。目标版本：Joy City v0.3.0，源码、包、报告与演示一同归档。仓库登记、作品可运行、公开版本和真实 Agent 验收分别记录；只有主办方能确认评分、验收与晋级。

依据：[官方赛程·初赛交付](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/competition-schedule.md#初赛需求成立作品能跑)与[初赛仓库登记 Issue #13](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13)。赛程在“10/4 23:59 前提交”下列出简短需求、可运行原型及启动说明、固定版本、2–3 分钟演示、两张关键截图、数据来源与限制、已报名成员名单；未指定演示必须为某种视频格式或必须把视频字节提交到 Git。时间为北京时间。

## 已有材料与待完成事项

| 条目 | 状态 | 证据与边界 |
| --- | --- | --- |
| 初赛仓库登记 | 已验证 | [公开仓库](https://github.com/SuperLeilei2026/city-matchmaker)；[MOST暴躁队登记评论](https://github.com/gosimfoundation/hackathon-agenticapp26/issues/13#issuecomment-5964776262)。不代表 v0.3 已推送或评审通过。 |
| 简短需求与目标用户 | 已有 v0.3 材料 | 五个生活场景 → 可编辑画像 → 城市探索 → 反馈修正；面向考虑毕业后城市生活、尤其关注 AI 应用／产品实践的人。见 [产品设计](product-design.md)。现实推荐效果仍待验证。 |
| 可运行 Web 原型及启动说明 | 最终本地回归通过 | `node serve.mjs`；41 项 Node 测试、10 组浏览器流程通过，0 错误、0 远端资料请求。见 [验收记录](web-qa.md)。本地地址不能直接供其他机器访问。 |
| 原生包及环境 | 五维流程、迁移、跨引擎一致性已验 | [native-joy-check.json](../qa/native-joy-check.json)：7 项界面、3 项存档／迁移、7 组原生与 JS 对照，试城计划与共享配置一致。最终 Hub gate 通过，仅 unsigned 警告。见 [原生记录](octosense.md)与[运行版本](runtime-lock.md)。 |
| 受控 Agent 保护机制 | 生产路径与模拟响应已验 | [native-agent-check.json](../qa/native-agent-check.json)：5 项生产路径、21 项临时注入响应检查。真实模型未验；当前 CM1 有效操作为气候约束／排除城市，五维答案仍手动确认。 |
| 固定源码版本 | v0.3.0 | 新标签包含最终包、演示与报告；保留旧 `v0.1.0`、`v0.2.0`，不移动历史标签。 |
| 2–3 分钟当前演示 | v0.3 录制与播放验证通过 | `docs/demo-web.mp4`：151 秒，1440 × 1000，H.264，3,935,397 字节；[实际录制报告](../qa/demo-web/recording-report.json) passed 为 true。首轮上海，拒绝后南京／深圳／北京；无错误和外发请求。 |
| 两张以上关键截图 | v0.3 本地文件已生成 | [画像确认](../qa/desktop-portrait.png)、[首次介绍](../qa/desktop-first-match.png)、[反馈结果](../qa/desktop-result.png)。使用合成资料；最终发布前确认与提交源码一致。 |
| 操作结果与空／失败状态 | 本地已覆盖 | 五维改值、切换猫狗保留答案、明确拒绝保留、旧存档不猜新答案、空画像保持不确定；card-host 不提供模型时保留本地结果。 |
| 数据来源与限制 | 已核对 | 8 城、32 来源；136 条 Joy 信号中 47 条非空且全部 `editorial`，89 条 `unknown`。见 [来源说明](data-sources.md)。不把部分历史资料当统一时点城市排名。 |
| 作者、团队与支持方式 | 已有 | MOST暴躁队 / Leinstein；发布者 Leilei，支持入口为仓库 Issues。赛务报名资格未在本次独立复核。 |
| 许可证与素材说明 | 已有 | `LICENSE` 为 Apache-2.0；素材说明见 `NOTICE`。新增发布材料须保持同一授权边界。 |
| 隐私与合成资料 | 已列明 | [隐私说明](privacy.md)区分本地 Web、原生自由反馈发送与宿主历史；公开验收只用合成资料，注入逻辑仅存在于临时测试包。 |
| 真实 Agent 任务演示 | 未完成 | 需完整 Shell 的宿主授权、真实响应、用户确认、实际执行、存档与恢复。连接测试或模拟响应不能替代。 |
| App Hub 公开发布 | 未完成 | 本地包与签名测试不是公开上架。仓库登记与 App Hub 的提交／人工审核分别记录。 |

## 复现环境

- Web 产品：Node.js 22+、现代浏览器；无第三方运行依赖、无构建步骤、无需 API Key。`npm test` 执行 Node 检查，服务测试需允许监听本机端口。
- 浏览器验收：启动本地服务后运行 `APP_URL=http://127.0.0.1:4319 node qa/browser-smoke.mjs`，地址须与服务输出一致。需可用 Playwright／Chromium；若未装在默认模块路径，可用 `PLAYWRIGHT_MODULE` 指定模块入口。脚本使用独立上下文，不读取或清除日常浏览器资料。
- 演示录制：Playwright、Chromium、ffmpeg 与中文字体属于材料制作工具，不是产品运行依赖。`qa/demo-web/recording-report.json` 现对应 v0.3 实际录制，含源码哈希及操作时间点；播放记录已与该次录制及源码哈希对应。
- 原生：Apple silicon macOS 与记录中的 OctoSense／Makepad 工具；见 `tools/native_joy_smoke.py`、`tools/native_agent_smoke.py` 和 [运行版本](runtime-lock.md)。模拟窄屏不等于实体手机或其他宿主验证。

## 提交前最后核对

- 已完成两处修复后的最终回归：41 项 Node、10 组浏览器流程全部通过；发布前避免再引入未经验证的改动。
- v0.3 演示已实际录制 151 秒，已通过完整解码与浏览器播放检查；不把 Web 录屏当真实模型证据。
- 最终包 Hub gate 已通过，仅 unsigned 警告；包 BLAKE3 为 `383e79eaa30a4604d58df924464c12e4071706a053631ba1e31256bbcff3f81e`。以 v0.3.0 固定源码；本地检查不等于公开发布或 App Hub 批准。
- 从干净目录按 README 启动，公开链接与材料能打开；本地存在不等于已发布。
- 不公开密钥、真实档案、私有账号数据或临时测试注入逻辑。
- 真实模型、App Hub、实体手机和现实收益等未验证项目继续明确标注，不写成“全部达标”。
