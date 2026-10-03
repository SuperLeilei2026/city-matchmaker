# Joy City 匹配模型 v0.3

更新：2026-10-03。当前模型是可复核的生活偏好比较器，不是人格测验、就业预测或幸福概率模型。五维画像和两轮修订已经实现；五维是否能有效预测用户喜欢哪座城市，尚未验证。

## 数据、画像与规则

- `data/joy-config.json` 是 Web 与原生共用的选项、画像短句和权重配置。
- `data/cities.json` 保存城市的 `joySignals`、气候资料、来源、限制与未知项。
- `core/profile.mjs` 负责迁移和画像；`core/joy.mjs` 负责五维比较；`core/joy-questions.mjs` 负责选下一问。`matcher.mjs` 与 `questions.mjs` 保留公共接口和旧版兼容入口。

Profile v2 使用以下明确选择，空白为 `null`：

| 维度 | 字段与选项 | 用户实际确认的内容 |
| --- | --- | --- |
| 新鲜感 | `joy.novelty`: `new / mix / familiar` | 经常尝新、熟悉中偶尔换换、经营熟悉的日常 |
| 恢复精力 | `joy.recovery`: `nature / quiet / people / move` | 自然、安静、相处、身体活动 |
| 关系 | `joy.relationships`: `new / regular / close / solo` | 新朋友、常见面的搭子、重要的人、独处 |
| 职业期待 | `joy.career`: `build / learn / steady` | 做出产品、同行学习、持续积累 |
| 不确定性 | `joy.uncertainty`: `explore / balanced / settled` | 先试一段、有支撑再试、先看清再安顿 |

`aiRole` 接受 `product / builder / design / operations / exploring`，未选为 `null`。它用于说明服务范围和画像，当前没有按具体岗位能力、招聘状态或录取机会加分。`housingType` 为 `unknown / primary-shared / alone / either`，`maxCommuteMinutes` 和预算未填时保留 `null`。

`normalizeProfile` 保留旧字段和明确拒绝，不从旧版 `priority: balance`、兴趣、关系默认值或 MBTI 推导五维。新用户默认小狗，已有合法猫狗选择保留。`buildPortrait` 只从明确选择生成短句，每句带字段路径、选项和来源；回答来源只有在记录的值仍等于当前值时有效。画像是可修改的当前生活假设，不能从学校、年龄、星座或人格标签补写性格结论。

## 当前证据能比较什么

当前八城为武汉、上海、杭州、成都、广州、南京、北京、深圳，共 32 条来源记录。每城 17 个五维选项信号，共 136 个位置：**47 个为 `editorial`，89 个为 `unknown`，没有 `sourced` 的 Joy 分档**。来源数量不代表独立验证次数，也不代表在招岗位数量。

| 维度 | 可用于探索比较的 editorial | unknown |
| --- | ---: | ---: |
| 新鲜感 | 16 | 8 |
| 恢复精力 | 13 | 19 |
| 关系 | 2 | 30 |
| 职业期待 | 16 | 8 |
| 不确定性 | 0 | 24 |
| 合计 | 47 | 89 |

这意味着“五维界面与画像已做”不等于“五维都有足够城市证据”。关系稳定性、靠近特定的人、安静的住处、职业可持续性和全部不确定性选项仍缺可比资料，不能靠城市标签拉开分数。当前差异主要来自有记录的活动、恢复资源和 AI 交流实践线索。选择未知选项仍会出现在画像中，并保留其未知权重；不能承诺它已使城市比较更准确。

信号格式为 `joySignals["维度:选项"] = {value, status, note, sourceIds, caveat}`。`value` 为 0–3 或 `null`。有限且在范围内的数值配合 `editorial` 或有效 `sourced` 状态，才可使用。`sourced` 必须至少有一个来源，且全部引用都能在本城 `sources` 中解析；断裂引用按未知处理。`editorial` 表示整理判断，不能升级为实测结果。

## 两个介绍人的侧重

| 维度 | INTP 小猫：职业发展 | ENFP 小狗：生活心动 |
| --- | ---: | ---: |
| 新鲜感 | 0.10 | 0.25 |
| 恢复精力 | 0.15 | 0.30 |
| 关系 | 0.10 | 0.20 |
| 职业期待 | 0.50 | 0.10 |
| 不确定性 | 0.15 | 0.15 |

猫狗是用户明确选择的比较视角，可以产生不同排序。两者共用同一城市事实、来源、资料缺口、明确拒绝和气候硬条件。角色名称中的人格标签不是判断用户的依据；用户自己的 MBTI、星座、年龄、院校不入排序。

这些权重是可审查的初版产品规则，尚未根据实际用户体验校准。选了气候避开项时，五维权重全部乘 0.8，气候合计占 0.2；否则气候为零。气候避开项去重后均分这一份权重。

## 分数、覆盖和比较区间

对于用户选中的信号，效用为 `value / 3`；气候效用为 `1 - value / 3`。内部 `score = Σ(权重 × 效用) × 100`。未知信号不产生已知贡献；未回答的整维也保留未知。所有城市使用同一权重，不因某城缺资料而重新归一化。

`coverage` 是可用信号的权重之和，范围 0–1，不是匹配准确率。缺资料会使已知贡献更低，因此不能只看 `score`；界面不展示幸福率或喜欢概率。

每个信号同时生成一个比较范围：

- 有效 `sourced`：效用为点值。
- `editorial`：效用上下各放宽 `1/3`，截断到 0–1。
- 未知或未回答：范围为 0–1。

各范围按相同权重相加、乘 100，得到 `scoreRange: {min, max}`。这是对缺口与整理判断的保守处理规则，**不是统计置信区间，也没有概率校准**。当前资料中的 Joy 值都是 editorial，不能把范围中心理解为精确测量。

显示顺序按内部贡献降序，再按城市 id 升序。为统一 OctoScript 的 f32 与 JavaScript 的 f64，排序和范围重叠判断使用配置中的四位小数量化比较；诊断输出保留六位小数。原生数值对照允许 `0.0001` 的浮点误差。

只要另一个候选的上界达到首位候选的下界，就标记 `ambiguous` 和 `overlapCityIds`，提示还有相近候选、不能确定唯一首选。这个提示不否认探索价值，只限制排序的解释。

`candidate` 要求五维均已明确、覆盖至少 0.75、没有待核验的气候硬条件，且不属于重叠的首位候选组；否则为 `explore`。这两个状态都不保证现实就业、住房或生活满意度。

## 硬条件与生活边界

`not-this-city` 是明确排除；它同时写入 `excludedCityIds` 和反馈记录。其他反应，包括心动、担心和受不了，都不自动新增硬条件。重新考虑一城需同时撤销对应排除与拒绝记录。

只有 `hardClimate === true`、相应气候有有效 `sourced` 资料且值至少为 2 时，才执行气候排除。气候为 editorial 或 unknown 时，候选只能保留为待核验，不能宣称通过底线。当前城市气候整理资料不可因此被当成已经确认的个人耐受结论。所有城市被排除时，返回空候选，不恢复拒绝城市凑首选。

预算、合租主卧或独住、通勤分钟数都只形成待核验条件。没有真实住处和目的地，不推算通勤；没有同口径房源，不声称预算够用。城市里有公园、活动或 AI 社区，也不代表住处下楼可达、能建立稳定关系或取得工作。

## 首城反馈与单问修订

Web 主流程先完成资料和可修改画像，再认识第一座城市。`getNextQuestion(profile, ranking, round)` 仍可用于未完成资料的首问，第二轮则承接反馈。

- `applyFeedback(profile, cityId, 'heart' | 'unbearable', {dimension, text})` 记录反应，暂不修改偏好。
- 反馈指定的维度优先追问。即使该维度已填，也可通过 `joy-refine-维度` 问题重新确认同一组选项；只有用户明确选了另一个场景才替换原值。
- 没有指定维度时，优先在未回答维度中，比较前三名候选各选项的已知差异，再乘当前视角权重。只有一个城市有资料时，不制造比较差异。
- 五维都填过，仍可复核一个未在本轮确认过的维度；问题已用尽则返回安全的 `ready` 选项。
- `confirmations` 避免本轮重复追问。开始新一轮撮合时，界面应清空本轮问题确认记录，保留明确拒绝和已选场景。

选项修订只合并该维度，不能抹掉其余四维。原有 `like / cost / climate / career / too-busy / not-this-city / unsure` 反馈仍接受；纯旧版 Profile 保留旧问答路径，v2 以五维流程为准。不新增隐形的重点权重，也不为了反馈后有变化而强行换城。

`explainChanges` 比较前后字段、首城和候选位置，说明变化或不变。`applyAnswer`、`applyFeedback` 都返回新对象。引擎不缓存最终结论；更新选择后重新计算。

## 把尚不能评分的偏好变成验证行动

`buildTrialPlan(profile)` 返回三条 `{dimension, title, text}`，顺序为不确定性、关系、恢复精力。它按明确选项生成尝试节奏、关系验证和普通一天行动，文案来自共享配置 `trialPlan`，不依赖城市事实，也不改变分数。例如，“先看清再安顿”对应先验证日常再决定，“靠近重要的人”对应核对实际往返，“安静恢复”对应在真实生活空间观察噪声与精力。

这使关系和不确定性的回答即使暂时不能拉开城市差距，也能用于下一步。未回答则返回澄清提示，不代选尝试方式。行动建议不是当地已有资源的承诺，更不证明执行后一定喜欢该城。

## 接口与兼容

`rankCities(profile, cities)` 保留 `ranked / excluded / missing`。v2 增加 `model / guide / weights / portrait / ambiguous / overlapCityIds / rangeExplanation`；每个候选增加 `scoreRange / components / facts`。`facts` 是与视角无关的规范化事实集合，切猫狗不改事实。

从 `matcher.mjs` 可导入 `normalizeProfile`、`createProfile`、`migrateProfile`、`buildPortrait`、`buildTrialPlan`、`JOY_CONFIG`、`explainChanges`。画像同时提供 `title / headline / summary / items / lines / unanswered / unknowns / complete / caveat`；`items` 与 `lines` 带明确来源。

包含 `version: 2`、`profileVersion: 2`、`joy` 或 `aiRole` 的输入进入新模型。未迁移的纯旧版输入继续原行业与兴趣模型，目的是接口兼容，不代表当前界面仍按旧优先级排序。v2 中旧 `priority / interests / focusInterest` 保留在档案，不替代新的五维。

## 验证与尚未验证

运行 `node --test tests/*.test.mjs`。核心与真实数据测试覆盖猫狗排序可不同但事实底线一致、空值迁移、画像溯源、区间重叠、坏引用、反馈修订、变化与不变、纯函数行为、八城来源闭合及完整两轮流程。

原生对照记录见 `qa/native-joy-check.json`：合成资料验证共享公式、排序、覆盖和范围，同时验证旧存档迁移。它不证明真实用户会更喜欢首城。五维全量有效性、权重是否合理、试住后的满意度，以及资料缺失是否系统性偏向某些城市，仍待真实目标用户验证。
