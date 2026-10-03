# 城市红娘 v0.1 协作契约

日期：2026-10-03。用户要求接下来的早晨看到可玩的完整成果。

## 产品承诺

先填写资料，再由猫或狗问关键问题。第一次介绍一个城市，用户反馈后再问一个真正影响匹配的问题，第二轮给首选、备选、变化原因与待核验条件。讲清楚为什么，允许不喜欢。角色人格只改变表达，不改变事实和排名。

## 分工与目录

- 根代理：`web/` 界面、分享、静态启动、整体集成和浏览器验收；`README.md`、`DELIVERY.md`。
- engine 代理：`core/matcher.mjs`、`core/questions.mjs`、`tests/`、`docs/matching-model.md`。
- data 代理：`data/cities.json`、`docs/data-sources.md`；只写这两个文件。
- native 代理：`bundle/`、`tools/`、`docs/octosense.md`。不得修改已有 story-rehearsal 或宿主全局配置。

## City 数据（data/cities.json 顶层数组）

每个城市对象：

```
{
 id: "hangzhou", name: "杭州", english: "HANGZHOU", region: "east",
 tagline: "一句具体且克制的城市印象", persona: "文学化介绍，不能冒充居民共同人格",
 color: "#...", coords: [经度,纬度],
 features: {
   tech: 0到3, creative: 0到3, manufacturing: 0到3, service: 0到3,
   nature: 0到3, live: 0到3, food: 0到3, ball: 0到3, quiet: 0到3,
   heat: 0到3, cold: 0到3, humidity: 0到3,
   cost: 0到3
 },
 featureEvidence: {featureKey: {sourceIds:["s1"], status:"sourced"|"editorial"|"unknown", note:"适用范围及转成等级的依据"}},
 scenes: ["一段明确为可能生活场景的创作"],
 tradeoffs: ["需调查或接受的具体条件，不编造价格和通勤数字"],
 sources: [{id:"s1", title:"...", url:"https://...", published:"日期或null", checked:"2026-10-03"}],
 unknowns: ["具体岗位录取机会", "预算内住房与实际通勤"]
}
```

城市拟先做武汉、上海、杭州、成都、广州、南京。特征数值是公开信息基础上的人工分档，非统计测量、真实招聘预测或幸福概率。无法支持的值用 null，不能编造来源；未知不参与正向加分，不重归一化导致信息少反而高分。cost 没有租金数据就 null；用户预算只列为核验条件，不凭其筛城。ball/quiet 一般属于街区层级，缺证据就 null。

## Profile（前端和 engine 共用）

```
{
 nickname:"", guide:"cat"|"dog", ageBand:""|"20-"|"21-24"|"25-29"|"30+",
 stage:"graduating"|"job-search"|"working"|"exploring",
 school:"", major:"", currentCity:"", homeCity:"",
 mbti:"", zodiac:"", admiredMbti:"", admiredZodiac:"", admiredTraits:["reliable","curious","warm","independent"],
 industry:"tech"|"creative"|"manufacturing"|"service"|"unknown", role:"",
 rentBudget:null|1500|2500|4000|6000,
 interests:["nature","live","food","ball","quiet"],
 priority:"career"|"balance"|"life",
 pace:"weekday"|"weekend"|"both",
 climateAvoids:["heat","cold","humidity"],
 hardClimate:false,
 relationship:"near-home"|"friends"|"open",
 excludedCityIds:[], confirmations:[], feedback:[]
}
```

初始字段允许空白。学校、年龄、星座、MBTI、欣赏的人的人格不产生职业判断或城市分数。以明确回答、生活经历、约束为依据。重要关系交通尚无来源时仅列核验，不用经纬度直线距离冒充回家时间。

## Engine 公共 API

`rankCities(profile, cities)` 返回 `{ ranked: [{city, score, coverage, reasons: [{dimension,text,sourceIds,status}], tradeoffs:[], unknowns:[], status:"explore"|"candidate"}], excluded:[{city, reasons:[]}], missing:[] }`。

内部 score 仅用于相对排序，不向用户展示幸福概率；同分用稳定 id 排序。所有拒绝城市都应从 ranked 去掉。

`getNextQuestion(profile, ranking, round)` 返回 `{id,title,why,options:[{id,label,description,patch:{...}}]}`。第一问从行业目标、职业生活优先级、实际休闲时段中选择；后续围绕反馈与关键未知，避免重复问同一字段；确认过的用 confirmations 记录。

`applyAnswer(profile, question, optionId)` 返回新 profile；不突变原对象。

`applyFeedback(profile, cityId, reasonId)` 返回新 profile。reasonId: `like`、`cost`、`climate`、`career`、`too-busy`、`not-this-city`、`unsure`。只有 `not-this-city` 明确排除该城市；其他反馈是待澄清线索，不自行把猜测写成硬约束。like 是保留候选，不让它覆盖硬条件。

## 体验要求

- 首页说明用途，猫狗选择不冒充人格测试。
- 三页资料：目前状态与背景、性格与相处、职业与生活；年龄段和学校等可跳过，不收他人姓名。
- 完成资料后才进入问答。问题说明为什么问；回复简洁，不做无依据夸奖。
- 两轮推荐都有真实计算变化记录；无法支持单一结论则输出探索候选与待验证点。
- 分享卡包含城市、本人选择的生活关键词和一句短句；默认不包含年龄、院校、预算、喜欢的人的信息。
- 手机和桌面均可用，允许返回修改，进度本地保存可清除。修改资料使旧结论失效。
- Web 是体验与验收版本，必须清楚区分 OctoScript 参赛包和 App Hub 公开发布状态。
