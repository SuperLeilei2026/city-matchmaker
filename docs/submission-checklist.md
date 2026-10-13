# v0.6 提交核对单

更新：2026-10-14。当前对象是最终候选。Tag、Release、App Hub Issue 与人工审核状态必须逐项记录，不能互相替代。

## 已完成材料

| 条目 | 状态与材料 |
| --- | --- |
| 产品表达 | [产品设计](product-design.md)：双入口、两城、三幕、假设审计和双城通行证 |
| 原生源码 | `bundle/main.splash`、manifest、listing、素材；由 `tools/build_bundle.py` 生成 |
| Web 体验 | `web/`、`core/departure.mjs`、`core/duel.mjs`、`core/experience-state.mjs` |
| 数据边界 | [数据说明](data-sources.md)与2026-01同口径租金基准 |
| 原生主流程 | [12项报告](../qa/native-departure-check.json)和[五张截图](../qa/native-departure-v0.6) |
| Agent 保护 | [报告](../qa/native-agent-check.json)：2项生产回退、38项临时协议检查；注入不当作模型成功 |
| 真实模型 | [完整 Shell 全链路](../qa/real-agent-e2e-v0.6/README.md)：一次 MiniMax-M3、首次同意、确认边界、重启恢复 |
| 隐私与权限 | [隐私说明](privacy.md)、[OctoSense 说明](octosense.md) |
| 开源 | Apache-2.0、NOTICE、公开来源链接 |

## 冻结候选前必须通过

```sh
python3 tools/build_bundle.py
npm test
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub \
  python3 tools/native_departure_smoke.py
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub \
  python3 tools/native_agent_smoke.py
/path/to/hub stamp bundle
/path/to/hub check bundle --allow-unsigned
git diff --check
```

还要核对：

- `package.json`、`bundle/manifest.json`、`bundle/listing.json` 均为0.6.0；
- listing 的五张截图来自最后一次真实宿主运行；
- `bundle/main.splash` 与模板/数据重新生成结果一致；
- 报告中的生产 SHA-256 与最终文件一致；
- manifest BLAKE3 与最终包内容一致；
- 文档没有把合成档案称为真实用户结论；
- Web 与原生都不展示总相合指数；
- 修改现实条件会清空旧对局，修改签名不会；
- Agent 任务未确认前不进入核验清单；
- MiniMax-M3 的一次完整 Shell 成功与 Kimi、移动端、故障切换的未验证边界分别写清。

## 外部提交前仍需

- 小陈、小雷真实试玩记录；
- Kimi 与更多输入的成功/失败回退证据；
- 最终60–90秒演示影片；
- 冻结 commit 和不可移动 Tag；
- GitHub provenance release pack；
- App Hub Issue、CI 与人工审核结果。

## 答辩可说

- “我们不预测最适合的城市，而是找出最可能改变决定的那条信息。”
- “预算和健康红线先显示冲突或未知，不被总分平均掉。”
- “三幕选择只记录思考轨迹，最后一城必须由用户自己选。”
- “Agent 只提出一个关键问题；应用验证响应，用户确认后才保存任务。”
- “小陈、小雷目前是回归档案，下一步才是本人试玩。”

## 不能说

- “系统算出了最适合或最幸福的城市”；
- “4000元一定能住深圳”或“成都天然 WLB”；
- “未知资料等于没有问题”；
- “注入测试证明 MiniMax/Kimi 已接通”；
- “本地 check 等于 App Hub 上架”；
- “响应式页面等于手机真机验收”。
