import config from '../data/joy-config.json' with { type: 'json' };

const array = (value) => Array.isArray(value) ? value : [];
const distinct = (value) => [...new Set(array(value))];
const clone = (value) => structuredClone(value);
export const JOY_CONFIG = config;
export const isJoyProfile = (profile = {}) => profile?.version === 2 || profile?.profileVersion === 2
  || Object.hasOwn(profile || {}, 'joy') || Object.hasOwn(profile || {}, 'aiRole');

/** Migrate without guessing new preferences from old defaults, interests or MBTI. */
export function normalizeProfile(profile = {}) {
  const original = profile && typeof profile === 'object' && !Array.isArray(profile) ? clone(profile) : {};
  const joy = Object.fromEntries(config.dimensions.map((dimension) => [dimension.id,
    dimension.options.some((option) => option.id === original.joy?.[dimension.id]) ? original.joy[dimension.id] : null]));
  return {
    ...original, version: 2, profileVersion: 2, guide: original.guide === 'cat' ? 'cat' : 'dog', joy,
    aiRole: config.aiRoles.some((role) => role.id === original.aiRole) ? original.aiRole : null,
    housingType: ['unknown', 'primary-shared', 'alone', 'either'].includes(original.housingType) ? original.housingType : 'unknown',
    maxCommuteMinutes: Number.isFinite(original.maxCommuteMinutes) && original.maxCommuteMinutes > 0 ? original.maxCommuteMinutes : null,
    rentBudget: Number.isFinite(original.rentBudget) && original.rentBudget > 0 ? original.rentBudget : null,
    climateAvoids: distinct(original.climateAvoids).filter((key) => ['heat', 'cold', 'humidity'].includes(key)),
    hardClimate: original.hardClimate === true,
    interests: distinct(original.interests), confirmations: distinct(original.confirmations),
    excludedCityIds: distinct(original.excludedCityIds), feedback: array(original.feedback),
    answerSources: original.answerSources && typeof original.answerSources === 'object' ? original.answerSources : {}
  };
}

function sourceFor(profile, path, value, label) {
  const answer = profile.answerSources?.[path];
  const currentAnswer = answer?.questionId && JSON.stringify(answer.value) === JSON.stringify(value);
  return { kind: currentAnswer ? 'answer' : 'profile', path, value, label,
    questionId: currentAnswer ? answer.questionId : null, optionId: currentAnswer ? answer.optionId : null };
}

/** Only explicit selections become portrait sentences; the source is traceable. */
export function buildPortrait(input = {}) {
  const profile = normalizeProfile(input);
  const items = [];
  for (const dimension of config.dimensions) {
    const selected = dimension.options.find((option) => option.id === profile.joy[dimension.id]);
    if (selected) items.push({ dimension: dimension.id, text: selected.portrait,
      source: sourceFor(profile, `joy.${dimension.id}`, selected.id, selected.label) });
  }
  const climates = { heat: '炎热', cold: '寒冷', humidity: '潮湿' };
  if (profile.climateAvoids.length) items.push({ dimension: 'climate',
    text: `${profile.hardClimate ? '明确不能接受' : '希望尽量避开'}${profile.climateAvoids.map((key) => climates[key]).join('、')}`,
    source: sourceFor(profile, 'climateAvoids', [...profile.climateAvoids], '你选的天气条件') });
  const role = config.aiRoles.find((item) => item.id === profile.aiRole);
  if (role) items.push({ dimension: 'aiRole', text: role.id === 'exploring' ? 'AI 方向还在探索中' : `目前关注${role.label}`,
    source: sourceFor(profile, 'aiRole', role.id, role.label) });
  const unanswered = config.dimensions.filter((dimension) => !profile.joy[dimension.id]).map((dimension) => dimension.id);
  const title = items.length ? '你目前想过的生活' : '先留一点空白';
  return { title, headline: title,
    summary: items.length ? items.map((item) => item.text).join('；') + '。' : '你还没有确认生活偏好，暂时不替你定义。',
    items, lines: items.map((item) => ({ ...item, label: config.dimensions.find((dimension) => dimension.id === item.dimension)?.label || (item.dimension === 'climate' ? '天气偏好' : 'AI 方向'), optionId: item.source.value })),
    unanswered, unknowns: config.dimensions.filter((dimension) => unanswered.includes(dimension.id)).map((dimension) => `${dimension.label}还没确认`), complete: unanswered.length === 0,
    caveat: '这是一份依据当前选择整理的生活假设，可以修改；不是人格测试，也不预测幸福概率。' };
}

export const createProfile = normalizeProfile;
export const migrateProfile = normalizeProfile;

/** Useful actions from explicit preferences, without inferring any city conditions. */
export function buildTrialPlan(input = {}) {
  const profile = normalizeProfile(input);
  return ['uncertainty', 'relationships', 'recovery'].map((dimension) => {
    const selected = profile.joy[dimension] || 'unknown';
    const item = config.trialPlan[dimension][selected];
    return { dimension, title: item.title, text: item.text };
  });
}
