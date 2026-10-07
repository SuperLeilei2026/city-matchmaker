# 官方 App Flow 核查记录

核查：**2026-10-03 23:01（北京时间，UTC+8）**。官方 `OctoScript-App-Design-Flow/main` 的精确提交为 [`0e59346e810ed694702b1df48f4283dc8104358c`](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/tree/0e59346e810ed694702b1df48f4283dc8104358c)，通过只读 `git ls-remote` 核对。本页引用该提交的技术说明；不将阅读最新文档等同于已升级或验证全部最新宿主。

## 结论与对应产物

**Joy City 的初赛主交付是 `bundle/main.splash` 运行的 OctoScript 脚本应用，Web 仅用于辅助体验和规则对照。** 当前技术路线符合官方文字需求到应用的 [script-app Flow](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/0e59346e810ed694702b1df48f4283dc8104358c/flows/script-app/FLOW.md)，无需为符合该路线改成网页或重写为 L0 卡片。

| 路线／内容 | 官方含义与本项目对应 |
| --- | --- |
| script-app | 程序为 `main.splash`，由 Makepad Script 在 Splash 隔离环境中求值；应用本身无需编译 Rust。 |
| L0 卡片 | 使用 `page.card` 与 `kit/` 等内容，解析路径不同；没有 `page.card` 不构成本项目 script-app 缺件。 |
| 应用包 | `manifest.json` 声明身份、版本、权限与完整性；`listing.json` 提供展示信息；另有程序、本地素材、listing 指向的真实截图。该包对应本仓库 `bundle/`。 |
| 包外材料 | 生成模板、共享数据、需求、测试和 Web 可留在源码仓库，但不混入应用包。它们不能替代主程序实际运行。 |

依据：[固定版本 README·应用是什么](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/0e59346e810ed694702b1df48f4283dc8104358c/README.zh-CN.md#应用是什么)。

## 已核验的工具与服务边界

本轮主代理在官方 Flow 本地目录实际执行 `python3 tools/octo doctor`，显式指定已测 `hub`、`card-host`。**退出码 0，PASS**：Python 3.9.6、App Hub checkout、两个工具路径及 script-app 模板均显示 `[ok]`，最终输出 ready。Cargo 不在 PATH 仅显示信息提示。此结果证明已有工具可被发现，不证明首次构建、所有宿主版本或真实模型调用已通过；工具指纹见 [runtime-lock.md](runtime-lock.md)。

官方 [README·黑客松起步](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/d618d4eb7e804d27b0906eb4e1df35fb4224314c/README.zh-CN.md#黑客松从这里开始)明确：**card-host 不提供模型和 octos 宿主服务**。因此真实 card-host 的无服务提示可以验证失败处理，不能作为模型成功证据，也不能单凭该提示认定程序调用错误。应用的本地基本流程应独立可用。项目已有 `tools/run-native.sh` 入口，先检查包再运行原生窗口；不会为掩盖不一致而自动重新 stamp。

## 初赛源码不等于 App Hub 上架

[赛事提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md#当前使用方式)写明现阶段按公开源码和可运行作品评审，无需等待 Hub 上架；官方 Flow 自身只决定技术路径，不决定比赛规则。App Hub 的发布者签名、提交与人工审核属于独立发布流程。当前 unsigned 本地预检通过不等于上架，也不应被写成初赛源码不能提交。

## v0.3 历史落实记录

下表记录当时的 v0.3，不是 v0.4 生产源码的验收。当前浏览、收藏和比较流程见 [原生说明](octosense.md) 与 [极简流程报告](../qa/native-discovery-check.json)；旧报告不能跨版本继承。

| 优先级 | 当前状态与下一步 |
| --- | --- |
| 当时完成的原生证据 | v0.3 五题逐页、单题编辑重启修复通过12项界面、4项存档／迁移、7组对照；当时 Agent 5+21检查通过。当时包检查仅unsigned警告。报告与截图可在 [v0.3 固定提交](https://github.com/SuperLeilei2026/city-matchmaker/tree/f4566a5f0bb254829e8ed193541ebd0a539e10ec)追溯，不代表当前main哈希。 |
| P0：固定源码交付 | 已完成：原生 v0.3、报告与影片已推送，远端核对为 [`f4566a5`](https://github.com/SuperLeilei2026/city-matchmaker/tree/f4566a5f0bb254829e8ed193541ebd0a539e10ec)。旧版本标签保留，不移动；当前版本状态见 publication.md。 |
| P1：真实 Agent 深化 | `card-host` 原生实录展示真实服务不可用保护；完整 Shell 又以隔离合成资料跑通一次 MiniMax-M3 返回、CM1 提案、确认执行、保存与重启恢复，见[真实 Agent 报告](../qa/real-agent-e2e-v0.4/README.md)。CM1有效操作为气候约束／排除，五维手选；Kimi 尚未验证。Web录像只作辅助。 |
| 独立后续：App Hub | 尚未公开上架；若进行公开分发，再按官方签名与审核流程推进，不把它与本轮源码交付混为一项。 |

本页只记录路线和证据边界。当前发布进展见 [publication.md](publication.md)，原生复现见 [octosense.md](octosense.md)；不以 Web 测试、文档更新或工具检查替代原生实际验收。
