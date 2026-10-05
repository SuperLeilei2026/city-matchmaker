import { JOY_CONFIG, normalizeProfile } from './profile.mjs';
import { rankCities } from './matcher.mjs';
import { joyWeights, readJoySignal } from './joy.mjs';
import { applyAnswer } from './questions.mjs';

/** Pure reference for the native browse → keep two → compare flow. No storage or I/O. */
export const DISCOVERY_VERSION = 1;
const array = (value) => Array.isArray(value) ? value : [];
const ids = (value) => [...new Set(array(value).filter((id) => typeof id === 'string' && id.length))];
const clone = (value) => structuredClone(value);
const comparable = (value) => Math.round(value * 10 ** JOY_CONFIG.rankingPrecision);
const hasPreferences = (profile) => Object.values(profile.joy).some(Boolean) || profile.climateAvoids.length > 0;
const pairKey = (state) => [...state.likedCityIds].sort().map(encodeURIComponent).join('|');
const action = (state, type, accepted, reason) => ({ ...state, lastAction: { type, accepted, reason } });

function readSaved(saved) {
  const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
  if (parsed == null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('发现页存档必须是对象或 JSON 对象字符串。');
  return clone(parsed);
}

/** Accept a discovery snapshot, a {profile} envelope, or an older plain profile. */
export function createDiscovery(profile = {}, cities = [], saved = null) {
  const snapshot = readSaved(saved);
  const savedProfile = snapshot?.profile ?? (snapshot && !Object.hasOwn(snapshot, 'likedCityIds') ? snapshot : null);
  return reconcileDiscovery({
    ...(snapshot?.profile ? snapshot : {}),
    version: DISCOVERY_VERSION,
    profile: normalizeProfile(savedProfile ?? profile),
    likedCityIds: snapshot?.likedCityIds ?? [], browsedCityIds: snapshot?.browsedCityIds ?? [],
    currentCityId: snapshot?.currentCityId ?? null, questionAsked: snapshot?.questionAsked === true,
    view: snapshot?.view ?? 'browse'
  }, cities);
}

/** Revalidate saved/UI state against current explicit constraints; never invent a preference. */
export function reconcileDiscovery(input = {}, cities = []) {
  const state = { ...clone(input), version: DISCOVERY_VERSION, profile: normalizeProfile(input.profile) };
  const ranking = rankCities(state.profile, cities);
  const eligible = ranking.ranked.map((item) => item.city.id);
  const existing = new Set(array(cities).map((city) => city?.id));
  const previousLikes = ids(input.likedCityIds);
  state.likedCityIds = previousLikes.filter((id) => eligible.includes(id)).slice(0, 2);
  state.browsedCityIds = ids(input.browsedCityIds).filter((id) => existing.has(id));
  state.questionAsked = input.questionAsked === true && JSON.stringify(state.likedCityIds) === JSON.stringify(previousLikes);
  const available = (id) => eligible.includes(id) && !state.likedCityIds.includes(id) && !state.browsedCityIds.includes(id);
  state.currentCityId = available(input.currentCityId) ? input.currentCityId : eligible.find(available) ?? null;
  state.view = input.view === 'compare' ? 'compare' : state.currentCityId ? 'browse' : 'exhausted';
  return state;
}

/** JSON round trips preserve the complete profile, explicit exclusions, and the current cycle. */
export function serializeDiscovery(state) {
  return JSON.stringify(state);
}

/** “Next” is only a browse event. It never appends an exclusion, feedback, or a Joy answer. */
export function browseNext(input, cities = []) {
  const state = reconcileDiscovery(input, cities);
  const current = state.currentCityId;
  if (current) state.browsedCityIds = ids([...state.browsedCityIds, current]);
  state.currentCityId = null;
  state.view = 'browse';
  return action(reconcileDiscovery(state, cities), 'browse-next', !!current, current ? 'browsed' : 'cycle-complete');
}

export function restartBrowse(input, cities = []) {
  const state = reconcileDiscovery(input, cities);
  return action(reconcileDiscovery({ ...state, browsedCityIds: [], currentCityId: null, view: 'browse' }, cities),
    'restart-browse', true, 'new-cycle');
}

/** Keeping a card is user curation, not a signal for inferred traits or matching weights. */
export function toggleFavorite(input, cityId, cities = []) {
  const state = reconcileDiscovery(input, cities);
  if (state.likedCityIds.includes(cityId)) {
    state.likedCityIds = state.likedCityIds.filter((id) => id !== cityId);
    state.questionAsked = false;
    return action(reconcileDiscovery(state, cities), 'remove-favorite', true, 'removed');
  }
  if (!rankCities(state.profile, cities).ranked.some((item) => item.city.id === cityId)) {
    return action(state, 'add-favorite', false, 'not-eligible');
  }
  if (state.likedCityIds.length >= 2) return action(state, 'add-favorite', false, 'favorites-full');
  state.likedCityIds.push(cityId);
  state.questionAsked = false;
  // The native “keep this card” action also advances the browse cursor.
  if (cityId === state.currentCityId) {
    state.browsedCityIds = ids([...state.browsedCityIds, cityId]);
    state.currentCityId = null;
  }
  if (state.likedCityIds.length === 2) state.view = 'compare';
  return action(reconcileDiscovery(state, cities), 'add-favorite', true, 'kept');
}

/** Select only an unanswered dimension with a known difference between these exact two cities. */
export function getComparisonQuestion(input, cities = []) {
  const state = reconcileDiscovery(input, cities);
  if (state.likedCityIds.length !== 2 || state.questionAsked) return null;
  const selected = state.likedCityIds.map((id) => cities.find((city) => city?.id === id));
  const weights = joyWeights(state.profile);
  const candidates = JOY_CONFIG.dimensions.map((dimension, index) => {
    const evidence = dimension.options.map((option) => {
      const key = `${dimension.id}:${option.id}`;
      const facts = selected.map((city) => ({ cityId: city.id, cityName: city.name, ...readJoySignal(city, key) }));
      return { optionId: option.id, key, facts,
        contrast: facts.every((fact) => fact.known) ? Math.abs(facts[0].value - facts[1].value) / 3 : 0 };
    });
    const contrast = Math.max(...evidence.map((item) => item.contrast));
    return { dimension, index, evidence, contrast, weight: weights[dimension.id], priority: contrast * weights[dimension.id] };
  }).filter((entry) => !state.profile.joy[entry.dimension.id] && entry.contrast > 0)
    .sort((a, b) => comparable(b.priority) - comparable(a.priority) || comparable(b.weight) - comparable(a.weight) || a.index - b.index);
  const entry = candidates[0];
  if (!entry) return null;
  const dimension = entry.dimension;
  return {
    id: `discovery:${pairKey(state)}:${dimension.id}`, dimension: dimension.id, title: dimension.question,
    why: '两座城市在这一点有不同的已知线索。可帮助确认你在意的事，答案未必改变先后。',
    options: dimension.options.map((option) => ({ id: option.id, label: option.label, description: option.description,
      patch: { joy: { [dimension.id]: option.id } } })),
    selectionBasis: { reason: 'known-pair-difference', dimension: dimension.id, contrast: entry.contrast,
      weightedContrast: entry.priority, evidence: entry.evidence }
  };
}

/** No explicit answer means no personalised winner; overlapping intervals also mean no winner. */
export function compareFavorites(input, cities = []) {
  const state = reconcileDiscovery(input, cities);
  const ranking = rankCities(state.profile, array(cities).filter((city) => state.likedCityIds.includes(city?.id)));
  const enough = state.likedCityIds.length === 2;
  const explicit = hasPreferences(state.profile);
  const status = !enough ? 'need-two' : !explicit ? 'no-explicit-preference' : ranking.ambiguous ? 'overlap' : 'distinct';
  const question = getComparisonQuestion(state, cities);
  const questionUnavailableReason = question ? null : !enough ? 'need-two' : state.questionAsked ? 'already-used'
    : JOY_CONFIG.dimensions.every((dimension) => state.profile.joy[dimension.id]) ? 'preferences-complete' : 'insufficient-known-difference';
  const explanation = {
    'need-two': '先留下两座想继续了解的城市，再放在一起看。',
    'no-explicit-preference': '这是你亲自留下的两座城市。还没有明确生活或天气偏好，展示顺序不表示哪座更适合你。',
    overlap: '两座城市的比较区间重叠，目前还没分清先后；未知资料不代表不适合。',
    distinct: '按你明确填写的偏好和当前资料，两座城市的先后更清楚；这不是喜欢概率或生活保证。'
  }[status];
  return { status, ranked: ranking.ranked, winnerCityId: status === 'distinct' ? ranking.ranked[0].city.id : null,
    ambiguous: enough && (ranking.ambiguous || !explicit), question, questionUnavailableReason, explanation,
    questionExplanation: questionUnavailableReason === 'insufficient-known-difference'
      ? '还缺能区分这两座城市、并对应你未填偏好的资料；这次不硬问。' : null,
    rangeExplanation: ranking.rangeExplanation };
}

/** Only an explicit option answer changes one Joy field; repeated or stale submissions are no-ops. */
export function answerComparison(input, cities, optionId, expectedQuestionId = null) {
  const state = reconcileDiscovery(input, cities);
  const question = getComparisonQuestion(state, cities);
  if (!question) return action(state, 'answer-comparison', false, 'no-question');
  if (expectedQuestionId && question.id !== expectedQuestionId) return action(state, 'answer-comparison', false, 'stale-question');
  if (!question.options.some((option) => option.id === optionId)) return action(state, 'answer-comparison', false, 'invalid-option');
  state.profile = applyAnswer(state.profile, question, optionId);
  state.questionAsked = true;
  state.view = 'compare';
  return action(reconcileDiscovery(state, cities), 'answer-comparison', true, 'answered');
}

/** Skipping spends this pair's optional question, but never manufactures an answer. */
export function skipComparisonQuestion(input, cities = []) {
  const state = reconcileDiscovery(input, cities);
  if (!getComparisonQuestion(state, cities)) return action(state, 'skip-question', false, 'no-question');
  return action({ ...state, questionAsked: true, view: 'compare' }, 'skip-question', true, 'skipped');
}
