# Joy City：项目定位与参赛场景

更新：2026-10-05。本页描述当前产品；没有更改外部报名记录。固定版本与已提交材料见 [发布状态](publication.md)。

## 交付定位

初赛主交付是 `bundle/` 中的 OctoScript 应用，入口 `bundle/main.splash`。真实原生截图、运行说明与验收报告为主要证据；Web 仅作辅助研究。

技术路径依据官方 [App Flow](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/README.zh-CN.md#设计流程) 的 script-app。该入口由 Makepad Script/Splash 运行，与 `page.card` 的 L0 路径不同。源码初赛和 App Hub 签名上架分开；此前核对的 [赛事提交说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/docs/app-hub-submission.md)允许按公开源码和可运行作品评审。本次迭代不宣称重新核验了赛程或评审结果。

## 产品定位

**给想做 AI 产品的你，找一座愿意留下的城市。**

v0.4 从看城市开始：一幅日常插画、一句吸引力与一句代价。留下两座以后比较；拿不准时，再补一项有依据的问题。五维与天气条件按需填写，空白不猜测。

最准确的产品类别是城市探索与生活决策。`aiRole` 界定 AI 产品、搭建、设计、运营方向，不预测具体岗位录取；这也不是路线导航、房源匹配或幸福概率预测。

INTP 德文猫侧重职业期待，ENFP 线条狗侧重日常生活。两者共用事实与底线，切换规则权重；人格名称不拿来判断用户。

## 能力与边界

| 展示能力 | 不能据此声称 |
| --- | --- |
| 浏览、留下两座、比较取舍 | 收藏即证明适合长期定居 |
| 明确偏好与可修改画像 | 点击或人格标签能推导全部需求 |
| 八城、来源、未知与比较范围 | 已验证的幸福率、职业成功或唯一最佳 |
| 有依据时可选一次追问 | 每个问题都会改变顺序，或回答能补齐城市事实 |
| 本地规则与原生交互 | 规则结果是大模型生成，或 Web 替代原生运行 |
| Agent 提案、确认和保护机制 | 注入测试等于真实 MiniMax/Kimi 调用成功 |

城市数据仍有136条信号中的89条未知。关系支持、具体公司作息、安静居住与可持续工作等缺口不会被城市刻板印象补齐。房租与通勤要落到具体岗位、住处与路线核验。

## 与报名场景的关系

此前报名为“写作与创作”。当前主要价值是城市生活探索，尚无完整创作编辑工作流；不能仅凭城市文案或分享图声称完全贴合该场景。与出行有关也不代表已经实现导航功能。

此前官方资料提到官方场景可联动和统一参评；是否要调整登记仍由参赛者依据最新赛务说明决定。本次实施只完善已确认产品，不发送消息、不改报名、不为赛道标签加无关功能。

此前引用：[场景说明](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/src/components/ApplicationScenarios.vue)、[官网 FAQ](https://github.com/gosimfoundation/hackathon-agenticapp26/blob/main/src/App.vue)。

## Agent 演示边界

应用 Agent 在用户打开城市详情后才可发送。CM1 将反馈转为白名单内的提案，绑定正在看的城市与资料版本，确认后才执行、保存和读回核验。气候避开项和明确拒绝可修改；五维仍由用户按钮确认，旧 priority/focus 不影响 Joy 排序。

真实 `card-host` 不提供模型服务；已验证的不可用处理和临时注入保护仍不是模型成功证据。独立的完整 Shell 验收已用合成资料跑通一次 MiniMax-M3 返回、确认、执行与恢复，见[真实 Agent 全链路报告](../qa/real-agent-e2e-v0.4/README.md)；Kimi、移动端和更多真实输入仍未验证。

原生 v0.3 影片是历史材料，不能代表 v0.4 极简交互。当前源码、报告和截图以 [原生说明](octosense.md)、[发布状态](publication.md) 为准。
