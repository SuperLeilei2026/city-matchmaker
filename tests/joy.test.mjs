import test from 'node:test';
import assert from 'node:assert/strict';
import { rankCities, explainChanges, normalizeProfile, buildPortrait, buildTrialPlan, JOY_CONFIG } from '../core/matcher.mjs';
import { applyAnswer, applyFeedback, getNextQuestion } from '../core/questions.mjs';

const explicit = { novelty: 'new', recovery: 'nature', relationships: 'new', career: 'build', uncertainty: 'explore' };
const profile = (patch = {}) => normalizeProfile({ guide: 'cat', aiRole: 'product', joy: explicit, ...patch });
function city(id, values, status = 'sourced', climate = {}) {
  return { id, name: id, joySignals: Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
    { value, status: value === null ? 'unknown' : status, sourceIds: ['fixture'], note: `${id} 的虚构对照线索`, caveat: '虚构数据只用于测试。' }])),
    sources: [{ id: 'fixture', url: 'https://example.invalid/test' }], features: climate,
    featureEvidence: Object.fromEntries(Object.keys(climate).map((key) => [key, { status, sourceIds: ['fixture'], note: '虚构气候条件' }])) };
}
const cities = [
  city('work', { 'novelty:new': 0, 'recovery:nature': 0, 'relationships:new': 0, 'career:build': 3, 'career:learn': 0, 'uncertainty:explore': 1 }, 'sourced', { heat: 3 }),
  city('life', { 'novelty:new': 3, 'recovery:nature': 3, 'relationships:new': 3, 'career:build': 0, 'career:learn': 3, 'uncertainty:explore': 1 }, 'sourced', { heat: 0 })
];

test('shared configuration is complete, unambiguous and has a unit weight budget', () => {
  assert.deepEqual(JOY_CONFIG.dimensions.map((item) => item.id), ['novelty', 'recovery', 'relationships', 'career', 'uncertainty']);
  for (const guide of ['cat', 'dog']) assert(Math.abs(Object.values(JOY_CONFIG.weights[guide]).reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  for (const dimension of JOY_CONFIG.dimensions) {
    assert.equal(new Set(dimension.options.map((item) => item.id)).size, dimension.options.length);
    assert(dimension.options.every((item) => item.label && item.description && item.portrait));
  }
});

test('cat and dog can recommend different cities while keeping facts and costs identical', () => {
  const cat = rankCities(profile(), cities), dog = rankCities(profile({ guide: 'dog' }), cities);
  assert.equal(cat.ranked[0].city.id, 'work');
  assert.equal(dog.ranked[0].city.id, 'life');
  for (const sample of cities) {
    const a = cat.ranked.find((item) => item.city.id === sample.id), b = dog.ranked.find((item) => item.city.id === sample.id);
    assert.deepEqual(a.facts, b.facts);
    assert.deepEqual(a.reasons, b.reasons);
    assert.deepEqual(a.tradeoffs, b.tradeoffs);
  }
  const constraints = { climateAvoids: ['heat'], hardClimate: true };
  const catHard = rankCities(profile(constraints), cities), dogHard = rankCities(profile({ ...constraints, guide: 'dog' }), cities);
  assert.deepEqual(catHard.excluded, dogHard.excluded);
  assert.deepEqual(catHard.ranked.map((item) => item.city.id), ['life']);
  const rejected = applyFeedback(profile(), 'life', 'not-this-city');
  assert.deepEqual(rankCities({ ...rejected, guide: 'cat' }, cities).excluded, rankCities({ ...rejected, guide: 'dog' }, cities).excluded);
});

test('migration preserves nulls and never turns old defaults or hobbies into five-dimensional answers', () => {
  const old = { priority: 'balance', pace: 'both', interests: ['nature'], relationship: 'open', mbti: 'ENFP', guide: 'cat' };
  const migrated = normalizeProfile(old);
  assert.deepEqual(migrated.joy, { novelty: null, recovery: null, relationships: null, career: null, uncertainty: null });
  assert.equal(migrated.aiRole, null);
  assert.equal(migrated.housingType, 'unknown');
  assert.equal(migrated.maxCommuteMinutes, null);
  assert.equal(migrated.guide, 'cat');
  assert.equal(normalizeProfile().guide, 'dog');
  assert.equal(buildPortrait(migrated).items.length, 0);
  const result = rankCities(migrated, cities);
  assert(result.ranked.every((item) => item.score === 0 && item.coverage === 0));
  assert(result.ranked.every((item) => item.scoreRange.min === 0 && item.scoreRange.max === 100));
  assert(result.ambiguous);
  assert.deepEqual(old.interests, ['nature']);
});

test('portrait sentences trace to explicit profile values and question answers, never personality labels', () => {
  const initial = profile({ joy: { ...explicit, recovery: null }, mbti: 'INTP', zodiac: '白羊座' });
  const question = getNextQuestion(initial, rankCities(initial, cities), 1);
  assert.equal(question.dimension, 'recovery');
  const answered = applyAnswer(initial, question, 'quiet');
  const portrait = buildPortrait(answered);
  const recovery = portrait.items.find((item) => item.dimension === 'recovery');
  assert.equal(recovery.source.kind, 'answer');
  assert.equal(recovery.source.path, 'joy.recovery');
  assert.equal(recovery.source.value, 'quiet');
  assert.equal(recovery.source.questionId, question.id);
  assert(!portrait.summary.includes('INTP'));
  assert(!portrait.summary.includes('白羊'));
  assert(portrait.lines.every((item) => item.label && item.source));
  assert.equal(buildPortrait({ ...answered, joy: { ...answered.joy, recovery: 'nature' } }).items.find((item) => item.dimension === 'recovery').source.kind, 'profile', 'editing an answer must not retain false question provenance');
  assert.equal(initial.joy.recovery, null);
});

test('unknown and broken evidence create uncertainty instead of suitability rejection', () => {
  const missing = city('missing', {});
  const broken = city('broken', { 'career:build': 3 });
  broken.joySignals['career:build'].sourceIds.push('missing-source');
  for (const sample of [missing, broken]) {
    const result = rankCities(profile(), [sample]).ranked[0];
    assert.equal(result.score, 0);
    assert.equal(result.coverage, 0);
    assert.deepEqual(result.scoreRange, { min: 0, max: 100 });
    assert.equal(result.status, 'explore');
    assert(result.unknowns.some((item) => item.includes('不代表这座城市不适合')));
  }
});

test('editorial evidence carries an interval and overlapping leaders cannot become a unique favourite', () => {
  const a = city('a', Object.fromEntries(Object.entries(explicit).map(([key, value]) => [`${key}:${value}`, 3])), 'editorial');
  const b = city('b', Object.fromEntries(Object.entries(explicit).map(([key, value]) => [`${key}:${value}`, 2])), 'editorial');
  const result = rankCities(profile(), [a, b]);
  assert.equal(result.ranked[0].score, 100);
  assert.equal(result.ranked[0].coverage, 1);
  assert(result.ranked[0].scoreRange.min < result.ranked[0].score);
  assert.equal(result.ambiguous, true);
  assert.deepEqual(result.overlapCityIds, ['a', 'b']);
  assert(result.ranked.every((item) => item.status === 'explore'));
  assert(result.missing.some((item) => item.includes('唯一首选')));
  assert(result.rangeExplanation.includes('不是统计置信区间'));
});

test('a sourced climate barrier survives affection; editorial climate remains a pending hard check', () => {
  const p = profile({ climateAvoids: ['heat'], hardClimate: true });
  const liked = applyFeedback(p, 'work', 'heart', { dimension: 'career' });
  assert.equal(rankCities(liked, cities).excluded[0].city.id, 'work');
  const editorial = structuredClone(cities[0]);
  editorial.featureEvidence.heat.status = 'editorial';
  const result = rankCities(p, [editorial]);
  assert.equal(result.excluded.length, 0);
  assert.equal(result.ranked[0].status, 'explore');
  assert(result.ranked[0].unknowns.some((item) => item.includes('气候硬条件')));
});

test('next question uses unanswered preferences with meaningful candidate contrast', () => {
  const p = profile({ joy: { ...explicit, novelty: null, recovery: null } });
  const samples = [city('a', { 'novelty:new': 3, 'recovery:nature': 2 }), city('b', { 'novelty:new': 0, 'recovery:nature': 1 })];
  const question = getNextQuestion(p, rankCities(p, samples), 1);
  assert.equal(question.dimension, 'novelty', 'stronger weighted contrast should win over the higher base weight');
  assert.equal(question.selectionBasis.reason, 'candidate-difference');
  const answered = applyAnswer(p, question, 'mix');
  assert.equal(getNextQuestion(answered, rankCities(answered, samples), 1).dimension, 'recovery');
});

test('one refinement can revise a full profile and change the first city with a traceable explanation', () => {
  const p = profile();
  const feedback = applyFeedback(p, 'work', 'unbearable', { dimension: 'career', text: '想重新理解工作期待' });
  assert.deepEqual(feedback.joy, p.joy, 'reaction alone must not change a preference');
  assert.equal(feedback.hardClimate, p.hardClimate);
  const question = getNextQuestion(feedback, rankCities(feedback, cities), 2);
  assert.equal(question.id, 'joy-refine-career');
  const next = applyAnswer(feedback, question, 'learn');
  assert.equal(next.joy.recovery, 'nature', 'a partial joy patch must not erase other dimensions');
  assert.equal(rankCities(next, cities).ranked[0].city.id, 'life');
  const explanation = explainChanges(p, next, cities);
  assert.equal(explanation.moved, true);
  assert(explanation.changes.some((item) => item.path === 'joy.career' && item.before === 'build' && item.after === 'learn'));
  assert.notEqual(getNextQuestion(next, rankCities(next, cities), 2).id, question.id);
  const same = applyAnswer(feedback, question, 'build');
  assert.equal(explainChanges(p, same, cities).moved, false);
  assert.equal(explainChanges(p, same, cities).changed, false);
});

test('a complete flow reaches ready safely and legacy feedback keeps working', () => {
  const p = profile({ confirmations: JOY_CONFIG.dimensions.map((item) => `joy-refine-${item.id}`) });
  const question = getNextQuestion(p, rankCities(p, cities), 2);
  assert.equal(question.id, 'ready');
  assert.deepEqual(applyAnswer(p, question, 'continue').joy, p.joy);
  for (const reason of ['like', 'cost', 'climate', 'career', 'too-busy', 'unsure', 'heart', 'unbearable']) {
    const feedback = applyFeedback(p, 'work', reason);
    assert.deepEqual(feedback.joy, p.joy);
    assert.equal(rankCities(feedback, cities).excluded.length, 0);
    assert(getNextQuestion(feedback, rankCities(feedback, cities), 2).options.length);
  }
  assert.throws(() => applyFeedback(p, 'work', 'made-up'), RangeError);
});

test('personality, AI role and old priority do not add evidence or hidden scoring', () => {
  const before = rankCities(profile(), cities);
  const after = rankCities(profile({ mbti: 'ENFP', zodiac: '狮子座', aiRole: 'builder', priority: 'life', interests: ['nature', 'live'], school: '某学校' }), cities);
  assert.deepEqual(before.ranked.map((item) => [item.city.id, item.score, item.scoreRange]), after.ranked.map((item) => [item.city.id, item.score, item.scoreRange]));
});

test('housing and commute are explicit unknowns and never imagined city filters', () => {
  const p = profile({ rentBudget: 5000, housingType: 'primary-shared', maxCommuteMinutes: 30 });
  const result = rankCities(p, cities);
  assert.deepEqual(result.ranked.map((item) => [item.city.id, item.score]), rankCities(profile(), cities).ranked.map((item) => [item.city.id, item.score]));
  assert(result.ranked.every((item) => item.unknowns.some((text) => text.includes('5000')) && item.unknowns.some((text) => text.includes('30 分钟'))));
  const empty = rankCities({ ...p, excludedCityIds: cities.map((item) => item.id) }, cities);
  assert.equal(empty.ranked.length, 0);
  assert(empty.missing.some((item) => item.includes('不能强行')));
});

test('input ordering, duplicate climates and invalid numbers cannot change or corrupt the result', () => {
  const p = profile({ climateAvoids: ['heat'] });
  assert.deepEqual(rankCities(p, cities), rankCities({ ...p, climateAvoids: ['heat', 'heat'] }, [...cities].reverse()));
  const invalid = city('invalid', { 'career:build': Infinity, 'novelty:new': -1, 'recovery:nature': 4 });
  const result = rankCities(profile(), [invalid]).ranked[0];
  assert.equal(result.score, 0);
  assert.equal(result.coverage, 0);
  assert.deepEqual(result.scoreRange, { min: 0, max: 100 });
});

test('trial plan turns explicit preferences into actions without altering ranking or guessing nulls', () => {
  const p = profile({ joy: { ...explicit, uncertainty: 'settled', relationships: 'close', recovery: 'quiet' } });
  const before = structuredClone(p), ranking = rankCities(p, cities);
  const plan = buildTrialPlan(p);
  assert.deepEqual(plan.map((item) => item.dimension), ['uncertainty', 'relationships', 'recovery']);
  assert(plan[0].title.includes('先验证'));
  assert(plan[1].text.includes('真实往返'));
  assert(plan[2].text.includes('噪声'));
  assert.deepEqual(p, before);
  assert.deepEqual(rankCities(p, cities), ranking);
  assert.deepEqual(buildTrialPlan({ mbti: 'ENFP', interests: ['nature'] }), buildTrialPlan({ joy: { uncertainty: null, relationships: null, recovery: null } }));
  assert(buildTrialPlan({}).every((item) => item.title.startsWith('先')));
  for (const dimension of ['uncertainty', 'relationships', 'recovery']) {
    for (const selected of JOY_CONFIG.dimensions.find((item) => item.id === dimension).options) {
      const item = buildTrialPlan({ joy: { [dimension]: selected.id } }).find((entry) => entry.dimension === dimension);
      assert(item.title && item.text);
      assert(!/上海|北京|深圳|杭州|录取率|幸福率/.test(item.text));
    }
  }
});
