import { DEPARTURE_OPTIONS } from './departure.mjs';

const interestById = new Map(DEPARTURE_OPTIONS.interests.map((item) => [item.id, item]));
const clean = (value, max = 120) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

function component(item, predicate) {
  return item?.components?.find(predicate) || null;
}

function evidence(item, source, fallback, scene = '') {
  return {
    cityId: item.city.id,
    cityName: item.city.name,
    status: source?.known ? 'known' : 'unknown',
    label: source?.label || fallback,
    detail: source?.detail || fallback,
    caveat: source?.caveat || '',
    sourceIds: source?.sourceIds || [],
    value: source?.known ? source.value : null,
    scene: clean(scene || item.city.scenes?.[0] || item.city.tagline, 180)
  };
}

function compareStatus(left, right) {
  if (left.status === 'known' && right.status === 'known') return 'comparable';
  if (left.status === 'unknown' && right.status === 'unknown') return 'unknown';
  return 'partial';
}

function careerRound(leftItem, rightItem, profile) {
  const label = profile.industry === 'exploring' ? '具体职业方向' : '目标行业线索';
  const left = evidence(leftItem, component(leftItem, (item) => item.kind === 'industry'),
    profile.industry === 'exploring' ? '尚未确认行业，不能比较发展机会。' : '泛行业资料不足，不能推导具体岗位机会。');
  const right = evidence(rightItem, component(rightItem, (item) => item.kind === 'industry'),
    profile.industry === 'exploring' ? '尚未确认行业，不能比较发展机会。' : '泛行业资料不足，不能推导具体岗位机会。');
  return { id: 'career', eyebrow: 'ACT 01 · FIRST JOB', title: '第一份工作', label,
    prompt: '如果只看你真正愿意投的岗位，而不是城市的产业口号，哪边更值得先验证？',
    left, right, comparisonStatus: compareStatus(left, right),
    unknown: '具体岗位、薪资、录取机会与团队工作方式仍需逐项核验。' };
}

function strongestInterest(profile, leftItem, rightItem) {
  const candidates = profile.interests.map((id, order) => {
    const option = interestById.get(id);
    const left = component(leftItem, (item) => item.kind === 'interest' && item.key === option?.feature);
    const right = component(rightItem, (item) => item.kind === 'interest' && item.key === option?.feature);
    const knownCount = Number(!!left?.known) + Number(!!right?.known);
    const difference = left?.known && right?.known ? Math.abs(left.value - right.value) : 0;
    return { id, option, left, right, knownCount, difference, order };
  });
  return candidates.sort((a, b) => b.knownCount - a.knownCount || b.difference - a.difference || a.order - b.order)[0] || null;
}

function dailyRound(leftItem, rightItem, profile) {
  const selected = strongestInterest(profile, leftItem, rightItem);
  const label = selected?.option?.label || '可重复的日常';
  const fallback = selected?.option?.supported === false
    ? `${label}目前缺少街区、设施、费用和开放时段的同口径资料。`
    : `${label}缺少可比较的城市证据。`;
  const left = evidence(leftItem, selected?.left, fallback, leftItem.city.scenes?.[profile.socialEnergy > 60 ? 1 : 0]);
  const right = evidence(rightItem, selected?.right, fallback, rightItem.city.scenes?.[profile.socialEnergy > 60 ? 1 : 0]);
  return { id: 'daily', eyebrow: 'ACT 02 · AFTER WORK', title: '普通下班后', label,
    prompt: `如果“${label}”必须在普通工作日反复发生，而不是旅行时体验一次，你更想先试哪边？`,
    left, right, comparisonStatus: compareStatus(left, right),
    unknown: '城市有资源，不等于目标住处附近可达、价格合适或你愿意长期重复。' };
}

function landingEvidence(item) {
  const constraints = item.constraints || {};
  const budget = constraints.budget || { status: 'unknown', detail: '租金仍待核验。' };
  const climate = constraints.climate || { status: 'unknown', detail: '气候红线仍待核验。' };
  const status = constraints.status === 'clear' ? 'known' : 'unknown';
  const rent = item.rent?.compactRent ? `30–60㎡平均套租基准 ${item.rent.compactRent} 元/月。` : '';
  return {
    cityId: item.city.id, cityName: item.city.name, status, label: '预算、住房与气候红线',
    detail: `${rent}${budget.detail} ${climate.detail}`.trim(),
    caveat: item.city.tradeoffs?.[0] || '工作地点、具体住处和通勤仍需核验。',
    sourceIds: item.rent ? ['rent-index-2026-01'] : [], value: null,
    scene: clean(item.city.tradeoffs?.[0] || item.city.tagline, 180),
    constraintStatus: constraints.status || 'unknown'
  };
}

function landingRound(leftItem, rightItem) {
  const left = landingEvidence(leftItem);
  const right = landingEvidence(rightItem);
  return { id: 'landing', eyebrow: 'ACT 03 · LAND HERE', title: '住下去的代价', label: '现实落点',
    prompt: '把住处、通勤和身体感受放回同一张图，你更愿意先承担哪边的代价？',
    left, right, comparisonStatus: compareStatus(left, right),
    unknown: '城市级租金与气候资料不能证明具体房源适合，也不能替代个人健康判断。' };
}

export function buildDuelRounds(leftItem, rightItem, profile = {}) {
  if (!leftItem?.city?.id || !rightItem?.city?.id || leftItem.city.id === rightItem.city.id) return [];
  return [careerRound(leftItem, rightItem, profile), dailyRound(leftItem, rightItem, profile), landingRound(leftItem, rightItem)];
}

export function analyzeAssumption(text, leftItem, rightItem, profile = {}) {
  const claim = clean(text);
  const findings = [];
  const rentWords = /成本|房租|租金|便宜|贵|压力小/;
  const careerWords = /机会|发展|岗位|工作|行业|具身|AI|ai|人工智能/;
  const funWords = /好玩|无聊|演出|活动|热闹/;
  const wlbWords = /WLB|wlb|平衡|加班|压力/;
  if (rentWords.test(claim) && leftItem?.rent && rightItem?.rent) {
    const cheaper = leftItem.rent.compactRent <= rightItem.rent.compactRent ? leftItem : rightItem;
    const dearer = cheaper === leftItem ? rightItem : leftItem;
    findings.push({ kind: 'counterpoint', label: '成本假设',
      text: `当前同口径平均套租中，${cheaper.city.name}为${cheaper.rent.compactRent}元，${dearer.city.name}为${dearer.rent.compactRent}元；这仍不代表目标岗位附近的房源。` });
  }
  if (careerWords.test(claim)) findings.push({ kind: 'unknown', label: '发展假设',
    text: `现有资料只能描述宽泛产业线索，不能证明${clean(profile.careerFocus, 40) || '具体方向'}的岗位数量、薪资或录取机会。` });
  if (funWords.test(claim)) findings.push({ kind: 'unknown', label: '好玩假设',
    text: '活动存在不等于你能在普通工作日反复参加；地点、票价、开放时间和同伴仍待核验。' });
  if (wlbWords.test(claim)) findings.push({ kind: 'unknown', label: '压力假设',
    text: 'WLB与工作压力主要属于公司、团队和岗位条件，不能从城市气质推导。' });
  if (!findings.length) findings.push({ kind: 'unknown', label: '个人判断',
    text: '这条倾向已经记录，但当前资料还不能验证它；三幕对决会把它变成具体核验动作。' });
  return { claim, findings };
}

export function buildVerificationTasks(rounds, profile = {}) {
  const career = clean(profile.careerFocus, 40) || DEPARTURE_OPTIONS.industries.find((item) => item.id === profile.industry)?.label || '目标方向';
  const activity = profile.interests.map((id) => interestById.get(id)?.label).filter(Boolean).join('、') || '想重复的日常';
  return [
    `两城各找5个仍在招聘、真正符合“${career}”的岗位，记录要求、薪资范围与团队工作方式。`,
    `两城各找3个预算内住处，把工作地点、单程通勤、押金与住房方式放在同一张表里。`,
    `围绕“${activity}”和气候红线，各设计一次普通工作日可完成的实地或远程核验。`
  ];
}

export function localDecisionQuestion(rounds, votes = {}, leftItem, rightItem, profile = {}) {
  const unresolved = rounds.find((round) => votes[round.id] === 'tie' || round.comparisonStatus !== 'comparable') || rounds[0];
  const names = `${leftItem.city.name}和${rightItem.city.name}`;
  if (unresolved?.id === 'career') return {
    dimension: 'career', question: `如果只看你愿意投递的真实岗位，${names}哪边能找到更多合格样本？`,
    task: buildVerificationTasks(rounds, profile)[0], source: 'local-rule'
  };
  if (unresolved?.id === 'daily') return {
    dimension: 'daily', question: `如果活动必须在工作日重复四周，${names}哪边更容易落实？`,
    task: buildVerificationTasks(rounds, profile)[2], source: 'local-rule'
  };
  return { dimension: 'landing', question: `把具体工作地和预算内住处连起来后，${names}哪边的代价更能接受？`,
    task: buildVerificationTasks(rounds, profile)[1], source: 'local-rule' };
}

export function normalizeVote(value) {
  return ['left', 'right', 'tie'].includes(value) ? value : null;
}
