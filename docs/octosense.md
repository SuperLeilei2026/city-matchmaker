# 城市红娘 OctoScript 包

更新：2026-10-03。应用 ID：`leilei-city-matchmaker`，版本：`0.2.0`。实际发布及未完成项见 [publication.md](publication.md)。

## 已实现的流程

三页可跳过资料 → 第一问 → 首座城市及依据 → 明确反馈与第二问 → 候选、变化原因和未知项。猫狗只改变口吻，核心匹配、保存、恢复与清除不依赖模型。

新增的系统 Agent 任务：

1. 在结果页输入自由反馈，点击“让 Agent 提出修改”。
2. 通过宿主的 `octos.session.open`、`octos.turn.start` 请求受控提案。
3. 展示原偏好与拟修改内容；用户可确认或放弃。
4. 确认后修改允许字段，实际重排、保存并读回核验。
5. 旧请求、旧版本、陌生城市、非法字段、错误格式和重复确认不执行；45 秒超时及取消不修改资料。

协议为 `CM1|revision|city_id|priority|focus|avoid|exclude|reason`。只允许改变职业/生活取舍、强调一项兴趣、追加气候避开项或排除当前候选。不能恢复已拒绝城市、放宽原气候底线、修改预算或人格、直接指定得分。没有证据的项目继续保持未知。

自由反馈与未确认提案只在应用内存中；确认后存档保存新偏好、版本与执行变化说明。宿主可能保留 Agent 历史，参见 [隐私说明](privacy.md)。

## 与 Web 的关系

两者共用 `data/cities.json`。生成器将六城特征、依据、生活场景与来源嵌入原生脚本；Web 与原生各自实现交互状态机。原生不含 Web 的 PNG 车票功能，Web 不含系统 Agent 请求。

请修改 `tools/main.template.splash` 和共享数据，再运行 `python3 tools/build_bundle.py`，不要只改生成的 `bundle/main.splash`。

## 运行与复现

精确源码基底、二进制校验、依赖与 Shell 配置见 [运行环境锁定记录](runtime-lock.md)。先准备对应的 `card-host`、`hub`；它们不随应用源码打包。已验证平台为 Apple silicon macOS；原生工具需要图形会话，Python 3.9+ 用于生成和测试。

从仓库根目录运行，路径换成自己准备的工具：

```sh
export OCTO_CARD_HOST="/path/to/card-host"
export OCTO_HUB="/path/to/hub"
python3 tools/build_bundle.py
"$OCTO_HUB" stamp bundle
"$OCTO_HUB" check bundle --allow-unsigned
"$OCTO_CARD_HOST" --bundle bundle --app-data .local-state/card-host --allow-unsigned --size 460x820
```

card-host 不提供系统模型服务。点击 Agent 会显示不可用，本地功能继续运行；真实调用必须在配置了 provider 的完整 Shell 中验证。独立 Shell 启动脚本为 `tools/start-shell.sh`，设置方法见环境记录。

每次修改最终包后都需重新 stamp；正式签名包有变动还需重新签名。不要把测试状态或私钥提交到仓库。

## 实际测试证据

原有真实 card-host 操作验证了首页、三页资料、两轮推荐、明确排除、保存、重启恢复、清除与滚动。四张基础截图在 `bundle/screenshots/`，使用合成资料。

v0.2.0 追加检查：

- **5 项生产路径检查通过**：资料及两轮流程、明确排除、空反馈拒绝、反馈未确认不落盘、真实 card-host 服务不可用时存档不变。
- **20 项临时响应注入检查通过**：确认前不修改、拒绝、非法/额外字段、错误城市、多行、旧请求、旧版本、无变化、改反馈、过期确认、执行、底线保留、重排、未知证据、存档读回、重复确认与恢复。
- 注入检查真实点击确认后，合成案例从杭州变为武汉，版本 10 → 11，原先拒绝的上海保持排除；它验证执行机制，**不验证真实模型**。
- 测试只修改临时复制的包，生产源中没有注入按钮或函数。报告记录生产脚本 SHA-256。

复现：

```sh
OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_agent_smoke.py
```

脚本只使用合成资料、独立临时状态和本机端口，默认端口占用时会退出，可用 `--port` 指定。报告：[qa/native-agent-check.json](../qa/native-agent-check.json)。测试工具关闭自己启动的进程，不连接真实 provider。

## 最终包本地预检

```text
leilei-city-matchmaker 0.2.0 — PASSED
  [warning] publisher-signature: unsigned: accountability rests on the hub alone
  grants: capabilities {"octos.session.open", "octos.turn.interrupt", "octos.turn.start", "storage"}, hosts {}, storage 16777216 bytes, agent none
```

当前 bundle 摘要：`d06e0ebf60adca1b8cf812c32726e1c0445738d8d9f31f453e0d3f163d579a0c`。

`hub scan` 已生成七题，书面回答在 [REVIEW-ANSWERS.md](../tools/REVIEW-ANSWERS.md)。未运行外部 reviewer；本地通过不等于人工审核或比赛合格。gate 的 `agent none` 指清单未写独立 agent 块，不能据此判断 Shell 没有应用 Agent；本包声明精确 `octos.*` 权限。

## 验收边界

真实 MiniMax/Kimi 或其他 provider 的成功请求仍待完成，不借用旧项目或模拟模型的记录。实体手机、其他操作系统、真实毕业生满意度和现实推荐准确性均未验证。本次提交产品仓库，不以 App Hub 已上架为前提，也不宣称已经公开上架。
