import { JOY_CONFIG, normalizeProfile, buildPortrait } from './profile.mjs';

const climates = { heat: '炎热', cold: '寒冷', humidity: '潮湿' };
const array = (value) => Array.isArray(value) ? value : [];
const unique = (items) => [...new Set(array(items))];
const round = (value) => Math.round(value * 1e6) / 1e6;
// Native uses f32. Quantize comparisons, while preserving six digits in diagnostics.
const comparable = (value) => Math.round(value * 10 ** JOY_CONFIG.rankingPrecision);
const idCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const append = (list, value) => { if (value && !list.includes(value)) list.push(value); };

/** One evidence gate, used by both lenses and question selection. */
export function readJoySignal(city, key) {
  const climate = key.startsWith('climate:');
  const climateKey = key.slice(8);
  const entry = climate ? city?.featureEvidence?.[climateKey] : city?.joySignals?.[key];
  const value = climate ? city?.features?.[climateKey] : entry?.value;
  const valid = Number.isFinite(value) && value >= 0 && value <= 3;
  const cited = unique(entry?.sourceIds).filter((id) => typeof id === 'string');
  const sourceIds = cited.filter((id) => array(city?.sources).some((source) => source?.id === id));
  // A broken source reference invalidates a sourced claim, even if one other ID resolves.
  const status = entry?.status === 'sourced' && sourceIds.length > 0 && sourceIds.length === cited.length ? 'sourced'
    : entry?.status === 'editorial' ? 'editorial' : 'unknown';
  const known = valid && status !== 'unknown';
  return { key, value: valid ? value : null, known, status: known ? status : 'unknown', sourceIds,
    note: typeof entry?.note === 'string' ? entry.note : '', caveat: typeof entry?.caveat === 'string' ? entry.caveat : '' };
}

export function joyWeights(input = {}) {
  const profile = normalizeProfile(input);
  const climateWeight = profile.climateAvoids.length ? JOY_CONFIG.climateWeight : 0;
  return { ...Object.fromEntries(Object.entries(JOY_CONFIG.weights[profile.guide]).map(([key, value]) => [key, round(value * (1 - climateWeight))])),
    climate: climateWeight };
}

export function rankJoyCities(input = {}, cities = []) {
  const profile = normalizeProfile(input);
  const portrait = buildPortrait(profile);
  const weights = joyWeights(profile);
  const rejected = new Set(profile.excludedCityIds);
  for (const feedback of profile.feedback) if (feedback?.reasonId === 'not-this-city') rejected.add(feedback.cityId);
  const ranked = [], excluded = [], missing = [];
  const seen = new Set();
  if (portrait.unanswered.length) missing.push(`还没确认${JOY_CONFIG.dimensions.filter((item) => portrait.unanswered.includes(item.id)).map((item) => item.label).join('、')}；空白保留为未知，不替你选择。`);
  if (!profile.aiRole) missing.push('AI 方向还没确定；城市线索不代表具体岗位、收入或创业成功。');

  for (const city of array(cities)) {
    if (!city || typeof city.id !== 'string' || seen.has(city.id)) continue;
    seen.add(city.id);
    const exclusionReasons = [];
    if (rejected.has(city.id)) exclusionReasons.push('你已明确表示不考虑这座城市。');
    let pendingHardClimate = false;
    for (const key of profile.climateAvoids) {
      if (!profile.hardClimate) break;
      const fact = readJoySignal(city, `climate:${key}`);
      if (fact.known && fact.status === 'sourced' && fact.value >= 2) {
        exclusionReasons.push(`你明确不能接受${climates[key]}；现有气候资料提示这座城市触及了这条条件。`);
      } else if (!fact.known || fact.status !== 'sourced') pendingHardClimate = true;
    }
    if (exclusionReasons.length) { excluded.push({ city, reasons: exclusionReasons }); continue; }

    const reasons = [], components = [];
    const tradeoffs = unique(city.tradeoffs).filter((item) => typeof item === 'string');
    const unknowns = unique(city.unknowns).filter((item) => typeof item === 'string');
    let score = 0, coverage = 0, min = 0, max = 0;
    const addComponent = (dimension, key, weight, label, inverse = false) => {
      const fact = key ? readJoySignal(city, key) : { key: null, value: null, known: false, status: 'unknown', sourceIds: [], note: '', caveat: '' };
      const utility = fact.known ? (inverse ? 1 - fact.value / 3 : fact.value / 3) : 0;
      const radius = fact.status === 'editorial' ? JOY_CONFIG.editorialRadius : 0;
      const low = fact.known ? Math.max(0, utility - radius) : 0;
      const high = fact.known ? Math.min(1, utility + radius) : 1;
      const contribution = weight * utility * 100;
      score += contribution;
      min += weight * low * 100;
      max += weight * high * 100;
      if (fact.known) coverage += weight;
      components.push({ dimension, key, weight: round(weight), value: fact.value, status: fact.status,
        sourceIds: fact.sourceIds, contribution: round(contribution), range: { min: round(weight * low * 100), max: round(weight * high * 100) } });
      if (!key) return;
      if (!fact.known) {
        append(unknowns, `${label}还缺足够资料；暂时无法比较，不代表这座城市不适合你。`);
        if (fact.note) append(unknowns, fact.note);
        return;
      }
      const description = fact.note || '目前仅有分档线索，尚缺具体生活场景说明';
      reasons.push({ dimension, key, text: `${inverse ? `你希望少遇到${label}` : `你选择了“${label}”`}。${fact.status === 'editorial' ? '现有资料的整理判断' : '公开来源提供的线索'}：${description}`,
        sourceIds: fact.sourceIds, status: fact.status, caveat: fact.caveat });
      if (fact.caveat) append(unknowns, fact.caveat);
      if (inverse && fact.value >= 2) append(tradeoffs, `${label}是你需要认真权衡的代价。`);
      if (!inverse && utility <= 1 / 3) append(tradeoffs, `“${label}”的现有支持线索较弱，是否影响你还要实际体验。`);
    };
    for (const dimension of JOY_CONFIG.dimensions) {
      const chosen = dimension.options.find((option) => option.id === profile.joy[dimension.id]);
      addComponent(dimension.id, chosen ? `${dimension.id}:${chosen.id}` : null, weights[dimension.id], chosen?.label || dimension.label);
    }
    for (const key of profile.climateAvoids) addComponent('climate', `climate:${key}`, weights.climate / profile.climateAvoids.length, climates[key], true);
    if (pendingHardClimate) append(unknowns, '气候硬条件还没核实，不能把留在候选中理解为已经通过。');
    append(unknowns, '城市的 AI 交流与实践线索不等于你的岗位机会、公司工作节奏或创业成功。');
    if (profile.rentBudget) append(unknowns, `月租 ${profile.rentBudget} 元能否满足你选择的居住方式，尚未核验。`);
    if (profile.housingType !== 'unknown') append(unknowns, '你的居住方式已记录，城市整体资料不能证明具体住处满足条件。');
    if (profile.maxCommuteMinutes) append(unknowns, `单程 ${profile.maxCommuteMinutes} 分钟的上限已记录；需实际起终点才能判断。`);
    if (profile.joy.relationships === 'close' || profile.relationship === 'near-home') append(unknowns, '重要的人所在位置和实际往返条件尚未核实，不把城市地理距离当成关系便利。');
    // Fixed, complete fact set is deliberately independent of guide, weights and user preferences.
    const factKeys = [...JOY_CONFIG.dimensions.flatMap((dimension) => dimension.options.map((option) => `${dimension.id}:${option.id}`)), ...Object.keys(climates).map((key) => `climate:${key}`)];
    const facts = factKeys.map((key) => readJoySignal(city, key));
    ranked.push({ city, score: round(score), scoreRange: { min: round(min), max: round(max) }, coverage: round(coverage),
      reasons, tradeoffs, unknowns, components, facts,
      status: coverage >= .75 && !pendingHardClimate && portrait.unanswered.length === 0 ? 'candidate' : 'explore' });
  }
  ranked.sort((a, b) => comparable(b.score) - comparable(a.score) || idCompare(a.city.id, b.city.id));
  excluded.sort((a, b) => idCompare(a.city.id, b.city.id));
  const top = ranked[0];
  const overlapCityIds = top ? ranked.filter((item) => comparable(item.scoreRange.max) >= comparable(top.scoreRange.min)).map((item) => item.city.id) : [];
  const ambiguous = overlapCityIds.length > 1;
  if (ambiguous) {
    missing.push('候选的比较区间重叠，目前不能确定唯一首选；展示顺序只是先了解的顺序，不是喜欢概率。');
    for (const item of ranked) if (overlapCityIds.includes(item.city.id)) {
      item.status = 'explore';
      append(item.unknowns, '资料缺口和整理判断可能改变先后，还不能确认唯一首选。');
    }
  }
  if (!ranked.length && excluded.length) missing.push('当前城市都被明确拒绝或触及硬条件；不能强行给出首选。');
  return { ranked, excluded, missing, model: 'joy-v2', guide: profile.guide, weights, portrait, ambiguous, overlapCityIds,
    rangeExplanation: '区间表示未知资料和人工整理判断可能带来的排序变化，不是统计置信区间或幸福概率。' };
}
