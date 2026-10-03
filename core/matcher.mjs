/** Deterministic matching. Scores are comparison aids, never probabilities. */
const INDUSTRIES = { tech: '科技与互联网', creative: '创意与内容', manufacturing: '制造与工程', service: '服务与商业' };
const INTERESTS = { nature: '自然与户外', live: '现场演出', food: '饮食选择', ball: '球类运动', quiet: '安静的日常' };
const CLIMATES = { heat: '炎热', cold: '寒冷', humidity: '潮湿' };
const PRIORITY = { career: [0.65, 0.35], balance: [0.5, 0.5], life: [0.3, 0.7] };
const unique = (items) => [...new Set(Array.isArray(items) ? items : [])];
const knownKeys = (items, labels) => unique(items).filter((item) => Object.hasOwn(labels, item));
const rounded = (value) => Math.round(value * 1e6) / 1e6;
const idCompare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function feature(city, key) {
  const value = city?.features?.[key];
  const evidence = city?.featureEvidence?.[key];
  const sourceIds = unique(evidence?.sourceIds).filter((id) =>
    (city.sources || []).some((source) => source.id === id));
  const validValue = Number.isFinite(value) && value >= 0 && value <= 3;
  // A dangling citation is not sourced evidence. Editorial judgments remain labeled.
  const status = evidence?.status === 'sourced' && sourceIds.length > 0 ? 'sourced'
    : evidence?.status === 'editorial' ? 'editorial' : 'unknown';
  return { value, known: validValue && status !== 'unknown', status, sourceIds };
}

function addUnique(items, text) {
  if (text && !items.includes(text)) items.push(text);
}

// Keep concrete source notes; remove the grading scaffolding from product copy.
function readableNote(note) {
  if (typeof note !== 'string') return '';
  const gradeLabels = '技术生态|文化生产|生产制造基础|供给基础|夏热敏感项|冬季体感敏感项|潮湿关注项|创意生态|服务业多样性|演出生态|冬冷关注项|夏热关注项|制造业基础|产业存在性|产业基础|资源类型|饮食文化辨识度|类型丰富|创意产业基础|服务业基础|湖边户外资源|演出供给';
  let text = note.replace(/人工分档，非统计测量[。；;]?/g, '')
    .replace(new RegExp(`(?:${gradeLabels})?记[0-3](?:分)?`, 'g'), '')
    .replace(/不是下楼可达分/g, '从住处出发是否方便还得核对')
    .replace(/尚未用市域山地面积夸大日常可达性/g, '从住处出发是否方便还得核对')
    .replace(/不推导求职成功率|不预测个人就业|不声称岗位数量或录取机会/g, '具体岗位仍需核对')
    .replace(/不代表毕业生薪酬/g, '毕业生岗位和薪酬仍需核对')
    .replace(/不替代细分岗位样本|不是岗位供需分/g, '目标岗位的实际需求还要另查')
    .replace(/不比较招聘规模|有基础不代表当年招聘扩张/g, '实际招聘情况仍需核对')
    .replace(/不是个人口味命中率/g, '是否合你的口味还要看')
    .replace(/不承诺餐饮价格/g, '日常价格还要另查')
    .replace(/不是相对湿度实测排名|不是湿度百分数|不采用某一年极端值代表常年|未用“公园城市”推断全年凉爽|不是每年极端温度预测|不写成全年不冷/g, '')
    .replace(/常年温暖背景下，同时/g, '常年温暖，但也')
    .replace(/\s+/g, ' ').trim()
    .replace(/[，,]+(?=[。；;！？!?]|$)/g, '')
    .replace(/[。！？!?]+/g, '；')
    .replace(/[；;]+/g, '；')
    .replace(/^[，,；;]+|[，,；;]+$/g, '');
  if (text.length > 96) {
    const start = text.slice(0, 96);
    const boundary = Math.max(start.lastIndexOf('；'), start.lastIndexOf('，'));
    text = (boundary > 36 ? start.slice(0, boundary) : start).replace(/[，,；;]+$/g, '') + '…';
  }
  return text;
}

function needText(key, profile) {
  if (Object.hasOwn(INDUSTRIES, key)) return `你想找${INDUSTRIES[key]}相关的工作`;
  if (key === 'nature') return profile.pace === 'weekend' ? '你想周末去户外'
    : profile.pace === 'weekday' ? '你想下班后去户外' : '你想多去户外';
  if (key === 'live') return '你想看现场演出';
  if (key === 'food') return '你在意日常吃什么';
  if (key === 'ball') return '你想有地方打球';
  if (key === 'quiet') return '你需要安静的日常';
  return `你想少遇到${CLIMATES[key]}的天气`;
}

function decisionGap(key, label) {
  if (Object.hasOwn(INDUSTRIES, key)) return `${label}的具体机会还不清楚，决定前需要核对实际岗位。`;
  if (key === 'nature') return '还要了解有哪些适合你的户外去处，以及从住处出发是否方便。';
  if (key === 'live') return '还要按你喜欢的演出类型查近期日程，才能判断这里是否方便常去。';
  if (key === 'food') return '尚无可比的日常饮食资料，还要结合你的口味了解是否吃得习惯。';
  if (key === 'ball') return '住处附近球场、开放时间、费用和球友还没核实，暂时不能判断是否能常打球。';
  if (key === 'quiet') return '具体街区与住宅的噪声还没核实，暂时不能判断住得是否安静。';
  return `现有资料还不足以判断${label}是否在你的接受范围内，需要补查当地季节气候。`;
}

/**
 * Pure public API. coverage is 0..1; score is 0..100 and must not be labeled
 * happiness, employment chance, or real-world success probability.
 */
export function rankCities(profile = {}, cities = []) {
  const interests = knownKeys(profile.interests, INTERESTS);
  const avoids = knownKeys(profile.climateAvoids, CLIMATES);
  const industry = Object.hasOwn(INDUSTRIES, profile.industry) ? profile.industry : null;
  const baseWeights = PRIORITY[profile.priority] || PRIORITY.balance;
  const climateWeight = avoids.length ? 0.2 : 0;
  const careerWeight = baseWeights[0] * (1 - climateWeight);
  const lifeWeight = baseWeights[1] * (1 - climateWeight);
  const rejected = new Set(unique(profile.excludedCityIds));
  for (const feedback of Array.isArray(profile.feedback) ? profile.feedback : []) {
    if (feedback?.reasonId === 'not-this-city') rejected.add(feedback.cityId);
  }
  const missing = [];
  if (!industry) missing.push('职业方向还没确定，暂时无法判断哪座城更适合你找工作。');
  if (!interests.length) missing.push('还没明确想过怎样的日常，暂时无法比较城市的生活部分。');
  if (!Object.hasOwn(PRIORITY, profile.priority)) missing.push('工作与生活的优先级待确认，目前暂按同等重要比较。');
  if (Number.isFinite(profile.rentBudget)) missing.push('还要看工作地点附近的具体房源，才能确认房租预算是否够用。');
  if (profile.relationship === 'near-home') missing.push('回家交通时间与费用待核验，不能用城市间直线距离替代。');
  const ranked = [];
  const excluded = [];
  const seen = new Set();

  for (const city of Array.isArray(cities) ? cities : []) {
    if (!city || typeof city.id !== 'string' || seen.has(city.id)) continue;
    seen.add(city.id);
    const exclusionReasons = [];
    if (rejected.has(city.id)) exclusionReasons.push('你已明确表示不考虑这座城市。');
    let pendingHardClimate = false;
    if (profile.hardClimate === true) {
      for (const key of avoids) {
        const item = feature(city, key);
        if (item.known && item.status === 'sourced' && item.value >= 2) {
          exclusionReasons.push(`你明确不能接受${CLIMATES[key]}；现有气候资料提示这座城市触及了这条条件。`);
        } else if (!item.known || item.status !== 'sourced') {
          pendingHardClimate = true;
        }
      }
    }
    if (exclusionReasons.length) {
      excluded.push({ city, reasons: exclusionReasons });
      continue;
    }

    let total = 0;
    let coverage = 0;
    const reasons = [];
    const tradeoffs = unique(city.tradeoffs).filter((item) => typeof item === 'string');
    const unknowns = unique(city.unknowns).filter((item) => typeof item === 'string');
    const add = (key, weight, dimension, label, inverse = false) => {
      const item = feature(city, key);
      if (!item.known) {
        addUnique(unknowns, decisionGap(key, label));
        return;
      }
      const utility = inverse ? 1 - item.value / 3 : item.value / 3;
      total += weight * utility;
      coverage += weight;
      const note = readableNote(city.featureEvidence?.[key]?.note);
      const factText = note ? `${item.status === 'editorial' ? '据现有资料整理' : '公开资料记载'}，${note}`
        : '现有资料还缺具体说明，决定前需要进一步核对';
      reasons.push({ dimension, text: `${needText(key, profile)}。${factText}。`, sourceIds: item.sourceIds, status: item.status });
      if (inverse && item.value >= 2) addUnique(tradeoffs, `${label}是需要认真考虑的代价。`);
      if (!inverse && item.value <= 1) addUnique(tradeoffs, `${label}的现有线索较少，需要进一步验证是否满足日常需求。`);
    };

    if (industry) {
      add(industry, careerWeight, 'career', INDUSTRIES[industry]);
      addUnique(unknowns, profile.role ? `“${profile.role}”的实际岗位、薪酬及个人录取机会待核验。` : '具体岗位、薪酬及个人录取机会待核验。');
    } else addUnique(unknowns, '尚未确定职业方向，不能据此判断个人发展机会。');
    const focus = interests.includes(profile.focusInterest) ? profile.focusInterest : null;
    const lifeShares = interests.length + (focus ? 1 : 0);
    for (const key of interests) add(key, lifeWeight * (key === focus ? 2 : 1) / lifeShares, 'life', INTERESTS[key]);
    if (!interests.length) addUnique(unknowns, '尚未明确生活偏好，不能判断休闲设施是否对你有用。');
    for (const key of avoids) add(key, climateWeight / avoids.length, 'climate', CLIMATES[key], true);
    if (pendingHardClimate) addUnique(unknowns, '气候硬条件还没核实，决定之前需要确认当地天气是否在你的接受范围内。');
    if (Number.isFinite(profile.rentBudget)) addUnique(unknowns, `需要看具体房源，才能确认月租预算 ${profile.rentBudget} 元是否够用。`);
    if (profile.pace === 'weekday' || profile.pace === 'both') addUnique(unknowns, '工作日可达性需要结合居住街区、工作地点和开放时间核验。');
    if (profile.relationship === 'near-home') addUnique(unknowns, profile.homeCity
      ? `往返${profile.homeCity}的实际交通时间与费用待核验。` : '重要的人所在城市尚未填写，往返交通也待核验。');
    if (profile.relationship === 'friends') addUnique(unknowns, '已有朋友与可加入社群的具体位置待核验，未将城市居民概括为同一种性格。');
    ranked.push({ city, score: rounded(total * 100), coverage: rounded(coverage), reasons, tradeoffs, unknowns,
      status: rounded(coverage) >= 0.75 && !pendingHardClimate && !!industry && interests.length > 0 ? 'candidate' : 'explore' });
  }
  ranked.sort((a, b) => b.score - a.score || idCompare(a.city.id, b.city.id));
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    missing.push('首位有同样值得看的城市，当前资料不足以选出唯一首选；展示先后不代表更适合。');
    for (const item of ranked) {
      if (item.score !== ranked[0].score) break;
      item.status = 'explore';
      addUnique(item.unknowns, '与其他首位候选暂时分不出先后，还需要比较具体岗位和日常生活条件。');
    }
  }
  excluded.sort((a, b) => idCompare(a.city.id, b.city.id));
  if (!ranked.length && excluded.length) missing.push('当前城市都被明确拒绝或触及硬条件；需要检查条件或扩充城市库，不能强行给出首选。');
  return { ranked, excluded, missing };
}
