# 城市红娘 OctoScript 包

更新：2026-10-03。应用 ID：`leilei-city-matchmaker`，版本：**0.3.0**。当前公开状态见 [publication.md](publication.md)。

## 已实现

生活场景选择 → 核对画像 → 首城 → 心动／代价反馈 → 关键问题 → 重新比较与三条试城计划。ENFP 狗优先生活，INTP 猫优先职业期待；共享城市事实、权重配置与底线。原生与 Web 的页面布局不同，原生不含 PNG 分享。

生成器从 `data/joy-config.json` 和 `data/cities.json` 生成八城数据、问题、权重、来源及行动文案。修改 `tools/main.template.splash` 后重新生成，不要只改产物。

存档升级为 38 字段，兼容原 29／30 字段格式。新五维缺省为未知，保留原拒绝记录，不按 MBTI 或旧兴趣补答案。

## 系统 Agent 与边界

结果页自由反馈 → 宿主 `octos.session.open`／`octos.turn.start` → 受控提案 → 用户确认 → 执行重排、保存与读回核验。

协议仍为 `CM1|revision|city_id|priority|focus|avoid|exclude|reason`。新版提示词要求旧 priority／focus 为 keep，主动操作限于追加气候避开项或按明确拒绝排除当前候选；**五维答案与介绍人通过应用按钮修改**。兼容旧字段不代表旧字段能改变新的 Joy 权重。

不能恢复已拒绝城市、放宽气候底线、修改预算、伪造城市数据或直接指定分数。过期、非法、多行、陌生城市、不同协议、重复确认不执行；45 秒超时或取消保留资料。自由反馈与待确认提案只在应用内存中；宿主可能保存会话历史，见 [隐私说明](privacy.md)。

用户已报告宿主连接完成；本应用的真实模型返回、确认、执行与恢复全链路仍没有验收证据。card-host 的不可用路径和注入响应不能替代真实模型。

## 运行

需独立准备 OctoSense / Makepad 工具，精确基底见 [runtime-lock.md](runtime-lock.md)。已验证 Apple silicon macOS；生成与测试用 Python 3.9+。

```sh
export OCTO_CARD_HOST="/path/to/card-host"
export OCTO_HUB="/path/to/hub"
python3 tools/build_bundle.py
"$OCTO_HUB" stamp bundle
"$OCTO_HUB" check bundle --allow-unsigned
"$OCTO_CARD_HOST" --bundle bundle --app-data .local-state/card-host --allow-unsigned --size 460x820
```

card-host 不提供模型服务，完整调用需 OctoSense Shell。Shell 启动脚本为 `tools/start-shell.sh`。每次改包都要重新 stamp，正式签名包改动后也需重新签名。私钥与个人状态不进入仓库。

## 最终验证

- **Joy 生产界面 7 项通过**：默认狗、五场景与画像、首次推荐、定向反馈修订、另一视角保留答案、现实条件待核验、区间重叠不声称唯一最优。
- **存档 3 项通过**：38 字段往返与 29／30 旧档迁移。
- **原生与 JS 对照 7 组通过**：猫、狗、空资料、未知、软／硬气候、明确拒绝；排序、分数、覆盖、区间与试城计划一致。f32／f64 数值容差为 0.0001。
- **Agent 5 项生产路径、21 项临时响应注入检查通过**：确认、放弃、格式／版本保护、底线、保存读回与恢复。没有调用外部 provider。

```sh
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_joy_smoke.py
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_agent_smoke.py
```

报告：[Joy](../qa/native-joy-check.json)、[Agent](../qa/native-agent-check.json)。生产 main SHA-256 与两报告一致；测试注入只发生在临时包。截图使用合成资料。

最终 **v0.3.0 `hub check --allow-unsigned` PASSED**，仅 publisher-signature unsigned warning。Bundle BLAKE3：`383e79eaa30a4604d58df924464c12e4071706a053631ba1e31256bbcff3f81e`。

本地预检不代表 App Hub 人工批准或比赛合格。本轮提交产品仓库，未公开上架；实体手机、其他平台与现实推荐效果仍待验证。
