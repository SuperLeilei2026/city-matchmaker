# 城市红娘 OctoScript 包

日期：2026-10-03。应用 ID：`leilei-city-matchmaker`，版本：`0.1.0`。

这份包是独立的 OctoScript 原生实现，使用 Makepad card-host 与 App Hub gate。下文记录首次本地验收，不代表公开 App Hub 已审核通过。公开源码和比赛提交的最新链接以仓库 README 为准；仓库公开、比赛提交与 App Hub 上架是三个不同状态。

## 当前能玩到什么

- 猫/狗选择，只改变口吻，不改变事实或排序。
- 先完成三页资料：目前状态与背景、性格与相处、职业与生活。文本输入与选择即时保存；资料可以留空。
- 第一个问题确认职业与生活的优先级，显示一座探索候选及其具体依据、生活想象和代价。
- 用户反馈后进入一次澄清；明确拒绝会排除城市，成本/气候/职业担忧分别继续问，其他反馈让用户确认最重要的生活兴趣。
- 二轮给出首选、备选、变化原因、未知条件和可展开来源。相同排序不会强行换城；同分明确提示不是唯一最优。
- 修改资料使旧结论与旧 Agent 说明失效。关闭重开恢复资料及二轮结果；每一页的底栏都可清除本机资料。
- 完整体验不需要模型。系统 Agent 说明按钮有清楚的可用/不可用状态，并准备版本、城市 ID、格式、长度校验与 45 秒超时/取消。

## 与 Web 版本的关系

两者共用 `data/cities.json`。`tools/build_bundle.py` 将六城特征、证据状态、说明、生活场景和来源生成到 `bundle/main.splash`；模板在 `tools/main.template.splash`。不要只编辑生成后的 `main.splash`。

原生排序移植 `core/matcher.mjs` 的规则：职业/生活权重、气候项、未知不加分且不重新分配权重、最重要兴趣的两份权重、明确排除、仅有来源的气候硬排除、同分稳定排序。原生页面使用自己的两轮问题状态机，不等于完整复用了 Web 问题引擎或其分享功能。

当前数据的非空等级均为 `editorial`，因此气候硬条件不能被宣称已满足。人格、年龄、院校不计分；租金预算没有可比较房源证据，不据此筛城。主界面不显示内部总分或幸福概率。

## 实际验收

已在 Apple silicon macOS、460×820 点的真实 card-host 隐藏窗口执行：

1. 首页绘制并加载包内猫狗图片；三页资料输入与选择；翻页后从新页面顶部开始。
2. 合成资料：昵称“小舟”、MBTI“INFP”、科技方向、户外+演出、月租预算 2500；职业优先。第一轮上海。
3. 明确拒绝上海，第二问强调户外；第二轮杭州、备选武汉，变化文本说明上海已排除。
4. `match.json` 中资料、排除 ID、第一轮 ID、反馈、版本与第二轮变化说明真实写入。
5. 关闭 card-host 后重开，恢复“先去了解 杭州。”与“已恢复本机进度”。
6. 点击清除，确认 `match.json` 不存在；再完成一次上述流程。
7. 点击系统 Agent 按钮，card-host 返回 `no service answers "octos" on this device`，页面明确显示不可用并保留本地结果。
8. 四张 listing 截图来自真实 card-host，均已打开检查。

UI 回归工具：`tools/remote.py`（仅请求本机 18131 端口）与 `tools/native_smoke.py`。后者可从首页或任意已恢复页面开始，先清除本测试包的存档，再使用合成资料完整操作。临时状态与输出由 `tools/.gitignore` 排除。

截图：

- `bundle/screenshots/01-welcome.png`
- `bundle/screenshots/02-first-match.png`
- `bundle/screenshots/03-second-match.png`
- `bundle/screenshots/04-changes.png`

## 复现命令

先按 [OctoScript 官方快速上手](https://github.com/OctoSense-org/OctoScript-App-Design-Flow/blob/main/docs/QUICKSTART.md) 安装或构建 `card-host`、`hub`。这两个平台工具不放在本仓库；Web 版无需它们。原生验收使用 Python 3.9+、Apple silicon macOS 与图形会话，其他平台尚未验证。

以下命令从本仓库根目录运行。将两个示例路径替换为你机器上的工具位置，不需要建立原作者的父目录结构：

```sh
export OCTO_CARD_HOST="/path/to/OctoSense-App-Hub/target/release/card-host"
export OCTO_HUB="/path/to/OctoSense-App-Hub/target/release/hub"
python3 tools/build_bundle.py
env MAKEPAD_REMOTE=18131 MAKEPAD_HIDE_WINDOWS=1 "$OCTO_CARD_HOST" --bundle bundle --app-data tools/local-state --allow-unsigned --stamp --size 460x820
```

单独读取/截图/退出：

```sh
python3 tools/remote.py snap
python3 tools/remote.py shot /tmp/city-native.png
python3 tools/remote.py quit
"$OCTO_HUB" stamp bundle
"$OCTO_HUB" check bundle --allow-unsigned
"$OCTO_HUB" scan bundle --packet tools/review.json
```

准入检查已实际通过，输出：

```text
leilei-city-matchmaker 0.1.0 — PASSED
  [warning] publisher-signature: unsigned: accountability rests on the hub alone
  grants: capabilities {"octos.session.open", "octos.turn.interrupt", "octos.turn.start", "storage"}, hosts {}, storage 16777216 bytes, agent none
```

`hub scan` 的七个问题已输出到本地 review packet；人工可读回答在 `tools/REVIEW-ANSWERS.md`。没有调用外部 reviewer，也没有伪造审核通过。

## 验收边界与发布状态

- **实际模型未验证。** 本包没有使用 MiniMax/Kimi 成功返回，不能把本地规则或不可用状态写成模型已接通。
- **完整 Shell 安装未验证。** 旧故事应用曾验证系统 Agent 链路，但不是本包的安装或模型证据。本次验证为独立 card-host。
- **本地准入检查不等于 App Hub 上架。** 上述通过记录使用无签名测试模式。正式提交需要当前有效的支持/隐私 URL、发布者签名、源码版本以及 App Hub 审核。公开状态以 README 的实际提交链接为准，不能从本页的本地通过记录推断。
- 其他平台、真实毕业生使用效果、城市推荐准确性和全部异常响应分支未验证；只报告上述实际执行路径。
- 原生版不含 Web 分享卡，不自动抓取岗位、演出、租金或地理位置。

## 公开源码与测试资料

`tools/native_smoke.py` 使用固定的合成资料“小舟 / INFP / 2500”，Web QA 使用“合成体验者 / 合成隐私学校”。这些是测试夹具，不是用户真实档案。随包截图与已保存的 QA 图片来自这些合成流程或空白资料流程；分享卡默认不带年龄、学校、预算或欣赏对象的信息。

`tools/local-state/`、本地 review packet、原生测试结果 JSON、日志、环境文件与私钥由 `.gitignore` 排除。发布源码时保留生成器、模板、自动化测试和人工 review 回答；不要上传本机的 `match.json`。自动化测试会清除其专用测试包存档，因此不要把日常使用的原生数据目录交给它。

生成器相对自身文件定位 `data/`、`assets/` 与 `bundle/`，不依赖个人绝对路径。原生测试桥固定使用回环地址 `127.0.0.1:18131`；启动测试宿主时需使用同一端口。图形渲染的实际截图不能由纯无界面的通用 CI 替代。

## 工具/平台注意点

本地官方文档对 `octos.*` 的可用性说明落后于旧应用的 Shell 实测，不能简单以文档判定所有 Shell 都不支持。本包会处理实际宿主的返回。

App Hub gate 将普通 `.json` 内的完整外部 URL 也当作外部资产引用，不能把共享城市 JSON 原样放进包中。生成器只嵌入运行所需数据及用于显示的域名/路径，完整来源 URL 保留在源码仓库的 `data/cities.json`，应用本身不发城市数据网络请求。

Makepad 的隐藏窗口环境变量是 `MAKEPAD_HIDE_WINDOWS=1`。每次修改程序或截图后必须重新 stamp；正式签名之后仍有修改时还需重新签名。
