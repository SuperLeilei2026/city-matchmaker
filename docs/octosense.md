# OctoSense 原生运行说明

更新：2026-10-14。应用 ID：`leilei-city-matchmaker`；候选版本：**0.6.0**。公开状态见 [publication.md](publication.md)。

## 原生主路径

`bundle/main.splash` 是参赛 AppCard：

1. 已有候选/无方向双入口；
2. 现实条件与候选控制台；
3. 用户亲选决赛两城并写原始倾向；
4. 三幕 PK 与假设审计；
5. Agent 决胜问题、用户确认任务、用户选择首城；
6. 双城通行证和重启恢复。

Web 版提供同一产品流程，但不是原生包的运行容器。

## 生成与运行

`bundle/main.splash` 由模板与共享资料生成，不应手工单独修改：

```sh
python3 tools/build_bundle.py
```

真实参考宿主：

```sh
OCTO_CARD_HOST=/path/to/card-host \
OCTO_HUB=/path/to/hub \
./tools/run-native.sh
```

脚本先执行 `hub check bundle --allow-unsigned`，再打开460×820 Makepad 窗口。核心流程不需要 API Key；完整 Shell 中的模型由宿主管理。

## 存档

v0.6 使用 `city-matchmaker-v4`，共58字段。46字段 v3 存档之后的新字段全部尾部追加：

- 候选模式与用户候选；
- 具体职业方向；
- 三幕选择与当前幕；
- 原始倾向；
- 先验证城市；
- 已确认核验任务；
- Agent 问题、任务和维度。

加载器兼容旧29/30、38/39、46字段存档。旧版完成页迁移到“留下两城”，不会凭空生成决赛城市或投票。修改现实条件时清空双城状态；仅修改票角签名不会清空。

## 权限

`bundle/manifest.json` 请求：

- `storage`：保存本机候选、现实条件、对局和任务；
- `octos.session.open`：打开系统 Agent 会话；
- `octos.turn.start`：用户主动请求决胜提问时发送上下文；
- `octos.turn.interrupt`：取消或超时；
- `network.hosts=[]`：应用不直接访问网络。

模型密钥由宿主管理，应用不读取、保存或索取。

## DQ1 决胜协议

```text
DQ1|revision|left_id|right_id|dimension|question|task
```

`dimension` 只能是 `career`、`daily` 或 `landing`。应用验证：

- 当前请求序号；
- 资料版本；
- 左右城市 ID 与顺序；
- 对局已完成三幕；
- 恰好7段、单行、允许维度；
- 问题与任务的长度。

合法回复只填充待确认问题与任务，不触发重排、投票或首城选择。用户点击“加入核验清单”后才保存任务。参考 `card-host` 没有模型服务时使用本地规则。

源码仍保留历史 `CM1` 城市详情提案兼容层，并继续做回归保护；v0.6 主路径不依赖它。

## 验收

```sh
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub \
  python3 tools/native_departure_smoke.py
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub \
  python3 tools/native_agent_smoke.py
```

- [主流程报告](../qa/native-departure-check.json)：12项，包括小陈假设、失败回退、确认保存与重启；
- [Agent 报告](../qa/native-agent-check.json)：2项真实生产界面回退与38项临时响应保护；
- [完整 Shell 全链路](../qa/real-agent-e2e-v0.6/README.md)：最终签名包、首次同意、一次 MiniMax-M3 调用、确认边界和重启恢复；
- [截图](../qa/native-departure-v0.6)：真实参考宿主像素。

注入测试本身没有调用模型；完整 Shell 报告是独立的一次真实 MiniMax-M3 调用。Kimi、移动端和故障切换仍需单独验收。
