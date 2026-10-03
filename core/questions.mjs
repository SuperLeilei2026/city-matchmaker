const INDUSTRIES = new Set(['tech', 'creative', 'manufacturing', 'service']);
const FEEDBACK = new Set(['like', 'cost', 'climate', 'career', 'too-busy', 'not-this-city', 'unsure']);
const array = (value) => Array.isArray(value) ? value : [];
const distinct = (value) => [...new Set(array(value))];
const clone = (value) => structuredClone(value);
const option = (id, label, description, patch) => ({ id, label, description, patch });

function industryQuestion() {
  return { id: 'industry-goal', title: '你现在最想找哪一类工作？', why: '工作方向不同，值得先看的城市也会不同。', options: [
    option('tech', '科技与互联网', '软件、产品、数据等方向。', { industry: 'tech' }),
    option('creative', '创意与内容', '设计、传媒、内容等方向。', { industry: 'creative' }),
    option('manufacturing', '制造与工程', '工程、生产、研发等方向。', { industry: 'manufacturing' }),
    option('service', '服务与商业', '商业、运营及服务等方向。', { industry: 'service' }),
    option('unknown', '还没定，先看看生活', '保留职业未知，不替你猜。', { industry: 'unknown' })
  ] };
}

function priorityQuestion() {
  return { id: 'first-priority', title: '第一站，你更想先稳住什么？', why: '这会改变工作机会和日常生活的相对分量。', options: [
    option('career', '先找到更对口的工作', '生活可以做些让步，但硬条件保留。', { priority: 'career' }),
    option('balance', '工作和生活都别太勉强', '两边同等重要。', { priority: 'balance' }),
    option('life', '先把每天的日子过舒服', '仍看工作方向，更重视本人选的生活需求。', { priority: 'life' })
  ] };
}

function rhythmQuestion() {
  return { id: 'leisure-rhythm', title: '喜欢的这些事，你通常什么时候会去做？', why: '工作日需要离得近；周末有更多余地。具体可达性会列入核验。', options: [
    option('weekday', '下班之后，经常会去', '需要进一步核验住处和工作地附近是否可达。', { pace: 'weekday' }),
    option('weekend', '主要留到周末', '先比较城市资源，再检查出行是否可行。', { pace: 'weekend' }),
    option('both', '平时和周末都想安排', '两种场景都需要实际核验。', { pace: 'both' })
  ] };
}

function costQuestion() {
  return { id: 'feedback-cost', title: '每月房租，你想先守住哪条线？', why: '记住你的上限。现有资料不足以保证租得到，结果会明确标出。', options: [
    option('1500', '不超过 1,500 元', '先记为待核验的住房预算。', { rentBudget: 1500 }),
    option('2500', '不超过 2,500 元', '先记为待核验的住房预算。', { rentBudget: 2500 }),
    option('4000', '不超过 4,000 元', '先记为待核验的住房预算。', { rentBudget: 4000 }),
    option('6000', '不超过 6,000 元', '先记为待核验的住房预算。', { rentBudget: 6000 }),
    option('unknown', '还没算好', '保留未知，避免假装算出了可负担城市。', { rentBudget: null })
  ] };
}

function climateQuestion(profile) {
  if (array(profile.climateAvoids).length) return {
    id: 'climate-limit', title: '你不喜欢的天气，是尽量避开，还是不能接受？', why: '只有你明确说不能接受，才会使用气候排除条件。', options: [
      option('soft', '尽量避开，可以权衡', '有其他合适的地方，我也愿意考虑。', { hardClimate: false }),
      option('hard', '明显而常见就不考虑', '明确不合适的会移出；还不确定的，会提醒你先核实。', { hardClimate: true }),
      option('clear', '想了想，天气不是关键', '撤掉之前的避开项，重新比较。', { climateAvoids: [], hardClimate: false })
    ] };
  return { id: 'climate-kind', title: '哪种天气最影响你每天的心情？', why: '先确认具体不适，不从人格标签猜你的气候偏好。', options: [
    option('heat', '持续炎热', '天气很热时，日常会受影响。', { climateAvoids: ['heat'], hardClimate: false }),
    option('cold', '寒冷的冬天', '冬天太冷时，日常会受影响。', { climateAvoids: ['cold'], hardClimate: false }),
    option('humidity', '潮湿的日子', '潮湿时，日常会受影响。', { climateAvoids: ['humidity'], hardClimate: false }),
    option('none', '目前没有特别怕的', '不加气候偏好。', { climateAvoids: [], hardClimate: false })
  ] };
}

function dailyQuestion(profile) {
  const withInterest = (key) => distinct([...array(profile.interests), key]);
  return { id: 'daily-recovery', title: '你说的“太忙”，最想避开哪一种？', why: '人多、没有休息时间、活动离得远，需要不同的处理。', options: [
    option('quiet', '周围一直很吵、很挤', '把安静加入偏好；街区资料不足会如实标出。', { interests: withInterest('quiet') }),
    option('time', '工作挤掉了自己的时间', '提高生活需求的分量，不替具体公司推测加班。', { priority: 'life' }),
    option('distance', '喜欢的事离日常太远', '保留排名依据，增加工作日可达性核验。', { pace: 'weekday' })
  ] };
}

function repeatedLifeQuestion(profile) {
  const focus = (key) => ({ interests: distinct([...array(profile.interests), key]), focusInterest: key });
  return { id: 'repeatable-life', title: '这些事里，你最想经常做哪一件？', why: '这一件会多考虑一些，之前选的其他兴趣也保留。', options: [
    option('nature', '去户外走走', '更在意平时能接近自然。', focus('nature')),
    option('live', '听现场、看演出', '更在意经常有喜欢的现场可看。', focus('live')),
    option('food', '认真吃一顿', '更在意日常的饮食选择。', focus('food')),
    option('ball', '约人打球', '场地与固定搭子还需要了解具体街区。', focus('ball')),
    option('quiet', '留一段安静的时间', '还需要了解具体街区是否合适。', focus('quiet')),
    option('keep', '暂时分不出先后', '保留兴趣，不额外偏重哪一项。', { interests: [...array(profile.interests)], focusInterest: null })
  ] };
}

/** First question (round 1), then a feedback-led second question (round 2). */
export function getNextQuestion(profile = {}, ranking = {}, round = 1) {
  const confirmed = new Set(array(profile.confirmations).map((item) => typeof item === 'string' ? item : item?.id));
  const unasked = (question) => confirmed.has(question.id) ? null : question;
  const initial = () => {
    if (!INDUSTRIES.has(profile.industry) && !confirmed.has('industry-goal')) return industryQuestion();
    return unasked(priorityQuestion()) || unasked(rhythmQuestion()) || unasked(repeatedLifeQuestion(profile));
  };
  if (Number(round) <= 1) return initial() || readyQuestion();

  const feedback = array(profile.feedback).at(-1);
  const reason = typeof feedback === 'string' ? feedback : feedback?.reasonId;
  const guided = reason === 'cost' ? costQuestion()
    : reason === 'climate' ? climateQuestion(profile)
    : reason === 'career' ? industryQuestion()
    : reason === 'too-busy' ? dailyQuestion(profile)
    : reason === 'like' ? rhythmQuestion()
    : reason === 'not-this-city' || reason === 'unsure' ? repeatedLifeQuestion(profile) : null;
  if (guided && unasked(guided)) return guided;
  if (!INDUSTRIES.has(profile.industry) && !confirmed.has('industry-goal')) return industryQuestion();
  if (array(profile.climateAvoids).length && !confirmed.has('climate-limit')) return climateQuestion(profile);
  if (!array(profile.interests).length && !confirmed.has('repeatable-life')) return repeatedLifeQuestion(profile);
  if (array(ranking.ranked).some((result) => result.coverage < 0.75) && !confirmed.has('repeatable-life')) return repeatedLifeQuestion(profile);
  return unasked(priorityQuestion()) || unasked(rhythmQuestion()) || unasked(repeatedLifeQuestion(profile)) || readyQuestion();
}

function readyQuestion() {
  return { id: 'ready', title: '这轮先比较到这里。', why: '已回答的问题不重复问，未核验的信息会留在结果里。', options: [
    option('continue', '看看现在的结论', '保留现有答案。', {})
  ] };
}

export function applyAnswer(profile = {}, question, optionId) {
  const selected = array(question?.options).find((item) => item.id === optionId);
  if (!selected) throw new RangeError(`未知选项：${optionId}`);
  if (!question?.id) throw new TypeError('问题缺少 id');
  const next = { ...clone(profile), ...clone(selected.patch || {}) };
  next.confirmations = distinct([...array(profile.confirmations), question.id]);
  return next;
}

export function applyFeedback(profile = {}, cityId, reasonId) {
  if (!FEEDBACK.has(reasonId)) throw new RangeError(`未知反馈：${reasonId}`);
  if (typeof cityId !== 'string' || !cityId) throw new TypeError('反馈缺少城市 id');
  const next = clone(profile);
  next.feedback = [...array(next.feedback), { cityId, reasonId }];
  next.excludedCityIds = distinct(next.excludedCityIds);
  if (reasonId === 'not-this-city') next.excludedCityIds = distinct([...next.excludedCityIds, cityId]);
  return next;
}
