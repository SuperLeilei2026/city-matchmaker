import rentBenchmarks from '../data/rent-benchmarks.json' with { type: 'json' };

export const DEPARTURE_OPTIONS = Object.freeze({
  industries: [
    { id: 'tech', label: 'AI / 互联网', short: '技术' },
    { id: 'creative', label: '内容 / 设计', short: '创意' },
    { id: 'manufacturing', label: '制造 / 工程', short: '工程' },
    { id: 'service', label: '商业 / 服务业', short: '商业' },
    { id: 'exploring', label: '还在探索', short: '探索中' }
  ],
  interests: [
    { id: 'nature', feature: 'nature', label: '散步 / 去户外', emoji: '↟', supported: true },
    { id: 'live', feature: 'live', label: '看演出', emoji: '♪', supported: true },
    { id: 'food', feature: 'food', label: '为吃出门', emoji: '◇', supported: true },
    { id: 'ball', feature: 'ball', label: '游泳 / 健身 / 球类', emoji: '○', supported: false },
    { id: 'quiet', feature: 'quiet', label: '看书 / 安静独处', emoji: '☁', supported: false }
  ],
  climates: [
    { id: 'heat', label: '持续炎热' },
    { id: 'cold', label: '冬天太冷' },
    { id: 'humidity', label: '潮湿闷热' }
  ]
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const unique = (value) => [...new Set(Array.isArray(value) ? value : [])];
const round = (value, digits = 0) => Number(value.toFixed(digits));
const byId = (items) => new Map(items.map((item) => [item.id, item]));
const industries = byId(DEPARTURE_OPTIONS.industries);
const interests = byId(DEPARTURE_OPTIONS.interests);
const climates = byId(DEPARTURE_OPTIONS.climates);

export function normalizeDepartureProfile(input = {}) {
  const industry = industries.has(input.industry) ? input.industry : 'exploring';
  const selectedInterests = unique(input.interests).filter((id) => interests.has(id)).slice(0, 3);
  const climateAvoids = unique(input.climateAvoids).filter((id) => climates.has(id));
  const rawBudget = number(input.rentBudget, null);
  return {
    careerLife: clamp(number(input.careerLife, 50), 0, 100),
    socialEnergy: clamp(number(input.socialEnergy, 58), 0, 100),
    industry,
    industryConfirmed: input.industryConfirmed === true || (industry !== 'exploring' && industries.has(industry)),
    interests: selectedInterests,
    rentBudget: rawBudget && rawBudget >= 500 ? clamp(Math.round(rawBudget), 500, 12000) : null,
    climateAvoids,
    careerFocus: typeof input.careerFocus === 'string' ? input.careerFocus.trim().slice(0, 40) : '',
    persona: typeof input.persona === 'string' ? input.persona.slice(0, 24) : ''
  };
}

function feature(city, key) {
  const value = city?.features?.[key];
  const evidence = city?.featureEvidence?.[key];
  const known = Number.isFinite(value) && value >= 0 && value <= 3 && evidence
    && ['sourced', 'editorial'].includes(evidence.status);
  return { known, value: known ? value / 3 : 0.5, raw: known ? value : null, evidence };
}

function rentUtility(budget, benchmark) {
  if (!Number.isFinite(budget) || !Number.isFinite(benchmark) || benchmark <= 0) return null;
  const ratio = budget / benchmark;
  return { ratio, value: clamp((ratio - 0.45) / 0.7, 0, 1), difference: Math.round(budget - benchmark) };
}

function weightsFor(profile) {
  const livelyStrength = clamp((profile.socialEnergy - 50) / 50, 0, 1);
  const lively = round(0.1 * livelyStrength, 4);
  const remaining = 1 - lively;
  const life = profile.careerLife / 100;
  const careerShare = 0.72 - 0.44 * life;
  return { career: remaining * careerShare, life: remaining * (1 - careerShare), lively };
}

function constraintSummary(profile, city, benchmark) {
  const budgetFit = rentUtility(profile.rentBudget, benchmark?.compactRent);
  const budget = !profile.rentBudget || !benchmark?.compactRent
    ? { status: 'unknown', detail: '缺少可比较的城市级租金基准，预算条件仍待核验。' }
    : budgetFit.difference >= 0
      ? { status: 'clear', detail: `月租上限 ${profile.rentBudget} 元高于30–60㎡平均套租基准 ${benchmark.compactRent} 元；具体房源、街区和通勤仍待核验。`, difference: budgetFit.difference }
      : { status: 'conditional', detail: `月租上限 ${profile.rentBudget} 元低于30–60㎡平均套租基准 ${benchmark.compactRent} 元；合租、街区与通勤组合仍可能改变结果。`, difference: budgetFit.difference };

  const climateChecks = profile.climateAvoids.map((id) => {
    const option = climates.get(id);
    const signal = feature(city, id);
    if (!signal.known) return { id, label: option.label, status: 'unknown', detail: `${option.label}资料不足，不能视为通过红线。` };
    const conflict = signal.raw >= 2;
    return { id, label: option.label, status: conflict ? 'conditional' : 'clear',
      detail: `${option.label}：${noteFor(city, id) || '已有城市级气候线索。'}` };
  });
  const climate = !profile.climateAvoids.length
    ? { status: 'clear', detail: '未设置气候红线。', checks: [] }
    : climateChecks.some((item) => item.status === 'conditional')
      ? { status: 'conditional', detail: '至少一项气候红线存在已知冲突。', checks: climateChecks }
      : climateChecks.some((item) => item.status === 'unknown')
        ? { status: 'unknown', detail: '至少一项气候红线尚未核验，未知不算通过。', checks: climateChecks }
        : { status: 'clear', detail: '现有城市级资料未发现气候红线冲突。', checks: climateChecks };

  const status = climate.status === 'conditional' || budget.status === 'conditional'
    ? 'conditional'
    : climate.status === 'unknown' || budget.status === 'unknown' ? 'unknown' : 'clear';
  return { status, budget, climate };
}

function noteFor(city, key) {
  return String(city?.featureEvidence?.[key]?.note || '').replace(/^人工分档，非统计测量。/, '').trim();
}

function addComponent(acc, { key, label, weight, signal, detail, sourceIds = [], caveat = '', kind }) {
  if (weight <= 0) return;
  acc.score += weight * signal.value;
  acc.totalWeight += weight;
  if (signal.known) acc.knownWeight += weight;
  acc.components.push({ key, label, kind, weight: round(weight, 4), value: round(signal.value, 4),
    known: signal.known, detail, sourceIds, caveat });
}

/**
 * A transparent fit index for comparison, not a prediction of happiness or job success.
 * Missing city evidence stays neutral (0.5) and lowers coverage instead of becoming a negative fact.
 */
export function rankDepartureCities(input = {}, cityList = [], rentData = rentBenchmarks) {
  const profile = normalizeDepartureProfile(input);
  const weights = weightsFor(profile);
  const ranked = [];

  for (const city of Array.isArray(cityList) ? cityList : []) {
    if (!city?.id) continue;
    const acc = { city, score: 0, totalWeight: 0, knownWeight: 0, components: [] };
    if (profile.industry !== 'exploring') {
      const signal = feature(city, profile.industry);
      addComponent(acc, { key: profile.industry, label: industries.get(profile.industry).label, kind: 'industry',
        weight: weights.career, signal, detail: signal.known ? noteFor(city, profile.industry) : '这座城市的该行业线索还不足，暂按中性值处理。',
        sourceIds: signal.evidence?.sourceIds || [], caveat: '产业基础不等于个人岗位、薪酬或录取机会。' });
    }

    if (profile.interests.length) {
      const share = weights.life / profile.interests.length;
      for (const interestId of profile.interests) {
        const option = interests.get(interestId);
        const signal = feature(city, option.feature);
        addComponent(acc, { key: option.feature, label: option.label, kind: 'interest', weight: share, signal,
          detail: signal.known ? noteFor(city, option.feature) : `${option.label}缺少同口径城市证据，已记下但不据此拉开差距。`,
          sourceIds: signal.evidence?.sourceIds || [], caveat: '城市资源不等于住处附近可达，也不保证符合个人口味。' });
      }
    }

    if (weights.lively > 0) {
      const signal = feature(city, 'live');
      addComponent(acc, { key: 'socialEnergy', label: '热闹与社交资源', kind: 'axis', weight: weights.lively, signal,
        detail: signal.known ? noteFor(city, 'live') : '暂无足够的可比社交与活动资料，暂按中性值处理。',
        sourceIds: signal.evidence?.sourceIds || [], caveat: '活动供给不代表一定能建立朋友关系。' });
    }

    const benchmark = rentData?.cities?.[city.id];

    // With no explicit sortable input, every city remains neutral and tied.
    const score = acc.totalWeight ? acc.score / acc.totalWeight : 0.5;
    const coverage = acc.totalWeight ? acc.knownWeight / acc.totalWeight : 0;
    const known = acc.components.filter((item) => item.known);
    const unknown = acc.components.filter((item) => !item.known);
    ranked.push({ city, fitIndex: Math.round(score * 100), coverage: round(coverage, 2),
      components: acc.components.sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, 'zh-CN')),
      reasons: known.sort((a, b) => b.weight * Math.abs(b.value - 0.5) - a.weight * Math.abs(a.value - 0.5)).slice(0, 3),
      unknowns: unknown, constraints: constraintSummary(profile, city, benchmark),
      rent: benchmark ? { ...benchmark, source: rentData.source } : null });
  }

  const constraintOrder = { clear: 0, unknown: 1, conditional: 2 };
  ranked.sort((a, b) => constraintOrder[a.constraints.status] - constraintOrder[b.constraints.status]
    || b.fitIndex - a.fitIndex || b.coverage - a.coverage || a.city.id.localeCompare(b.city.id));
  const selectedSignals = Number(profile.industryConfirmed) + profile.interests.length + Number(!!profile.rentBudget) + profile.climateAvoids.length;
  return {
    profile,
    weights: Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, round(value, 3)])),
    ranked,
    ready: selectedSignals >= 3 && profile.industryConfirmed && !!profile.rentBudget && profile.interests.length > 0,
    selectedSignals,
    caveat: '排序只用于生成候选。预算和气候红线先单独核验；生活线索不代表幸福、录取或人生结论。',
    rentSource: rentData?.source || null
  };
}

export function summarizeDepartureProfile(input = {}) {
  const p = normalizeDepartureProfile(input);
  const life = p.careerLife < 34 ? '发展优先' : p.careerLife > 66 ? '生活优先' : '工作生活都要';
  const energy = p.socialEnergy < 35 ? '需要安静' : p.socialEnergy > 65 ? '喜欢热闹' : '留一点社交';
  const industry = industries.get(p.industry)?.short || '探索中';
  return { life, energy, industry, short: `${life} · ${energy}`, full: `${life} · ${energy} · ${industry}` };
}

export const RENT_BENCHMARKS = rentBenchmarks;
