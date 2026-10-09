# 城市红娘 OctoScript 包

更新：2026-10-05。应用 ID：`leilei-city-matchmaker`，版本 **0.4.0**。公开状态见 [publication.md](publication.md)。

## 新版怎么玩

打开即一张城市卡，点“留着看看”或“下一座”。留下第一座继续逛，留下第二座直接比较；拿不准时主动补一题。没有必填问卷，资料与来源按需打开。下一座不代表拒绝，收藏不改变五维或权重。

八幅 SVG 是生活想象，不是实景或可达性证明。每城一条吸引力、一条代价，完整来源放在详情。ENFP 狗侧重生活，INTP 猫侧重职业期待，共享事实与底线。

原生是本版主入口。Web 暂保留 v0.3 交互，不含本次极简改动；原生仍无 PNG 分享。

## 生成与存档

`tools/build_bundle.py` 从 `data/cities.json`、`data/joy-config.json` 和 `tools/main.template.splash` 生成 `bundle/main.splash` 并复制素材。不要只改生成产物。

原生存档为46字段 `city-matchmaker-v3`，前39项位置保留，末尾记录当前卡、收藏、已浏览、资料/详情返回位置与比较追问状态。兼容29/30/38/39字段旧档，迁移后保留本人选择和明确拒绝，进入新浏览入口，不按旧标签补五维答案。

资料编辑完成后返回进入前的浏览或比较页；退出重启保留进度。重看一轮只清本轮浏览记录，不撤销收藏、画像或明确拒绝。

## 运行

需准备官方 `card-host` 和 `hub`，已测平台为 Apple silicon macOS；工具基底见 [runtime-lock.md](runtime-lock.md)。

```sh
OCTO_CARD_HOST=/path/to/card-host \
OCTO_HUB=/path/to/hub \
./tools/run-native.sh
```

本地浏览和比较无需 API Key、Node.js 或 Web 服务器。修改源码后的构建/检查：

```sh
python3 tools/build_bundle.py
/path/to/hub stamp bundle
/path/to/hub check bundle --allow-unsigned
```

每次修改开发包都需重新 stamp/check。最终发布由仓库中的 GitHub provenance 工作流在固定 Tag 上生成 attested release pack；不要把生成后的封存 manifest 覆盖回开发源码。启动器默认使用独立 `.local-state/native` 保存进度，可通过 `CITY_NATIVE_STATE` 指定其他本机目录。个人状态和模型密钥不进入仓库。

## 应用 Agent

城市详情中按需打开 Agent，发送反馈→宿主会话→结构化提案→本人确认→执行、保存与读回核验。

协议 `CM1|revision|city_id|priority|focus|avoid|exclude|reason` 绑定当前查看的城市与资料版本，而不是自动绑定排名第一。旧 priority/focus 要求 keep；有效动作主要是新增气候避开项或按明确拒绝排除当前城市。五维与介绍人由本人按钮修改。

切页、换城、修改资料、取消、超时或过期响应不能误改数据。模型不能恢复已拒绝城市、放宽底线、改预算或城市事实。自由反馈和待确认提案只在应用内存；宿主可能保留会话，见 [隐私](privacy.md)。

`card-host` 不提供模型服务。完整 Shell 启动器为 `tools/start-shell.sh`，保留正常首次授权。2026-10-07 已在官方 Desktop `0.1.0-beta.1` 中，以隔离合成资料跑通一次 MiniMax-M3 返回、CM1 提案、本人确认、保存回读与重启恢复，见[真实 Agent 全链路报告](../qa/real-agent-e2e-v0.4/README.md)。失败处理和注入测试仍不能替代真实调用；Kimi 与其他平台未验证。

## 验证

```sh
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_discovery_smoke.py
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_agent_smoke.py
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_discovery_contract.py
node --test tests/*.test.mjs
```

当前原生报告：[极简流程](../qa/native-discovery-check.json)、[Agent 保护](../qa/native-agent-check.json)、[存档与共享规则对照](../qa/native-discovery-contract.json)。报告记录生产源码 SHA-256，截图均为合成资料。合同比对在临时包中注入函数调用并抑制 UI 刷新，独立的 UI 检查使用真实生产包；两者不能互相替代。共享规则及浏览状态测试需 Node.js 22+，应用运行本身不需要。

v0.3 的 `native_joy_smoke.py`、`qa/native-joy-check.json` 和 `docs/demo-native.mp4` 是历史五题流程资料；应在对应 Git 标签复现，不作为 v0.4 验收。

这些检查与一次 MiniMax-M3 全链路证明程序、保护流程及该次宿主调用能运行，不证明推荐准确率或用户满意，也不代表手机、其他平台、其他模型或 App Hub 上架已验证。当前公开发布与版本指纹以 [发布状态](publication.md) 为准。
