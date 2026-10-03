import test from 'node:test';
import assert from 'node:assert/strict';
import { rankCities } from '../core/matcher.mjs';
import { getNextQuestion, applyAnswer, applyFeedback } from '../core/questions.mjs';

function city(id, features, statuses = {}) {
  return { id, name: id, features, featureEvidence: Object.fromEntries(Object.keys(features).map((key) => [key, {
    status: statuses[key] || (features[key] === null ? 'unknown' : 'sourced'), sourceIds: ['fixture'], note: '虚构测试资料'
  }])), sources: [{ id: 'fixture', title: '虚构测试资料', url: 'https://example.invalid/fixture' }], unknowns: [], tradeoffs: [] };
}
const cities = [
  city('a-work', { tech: 3, creative: 1, nature: 1, live: 1, food: 1, heat: 3, cold: 0, humidity: 2, cost: null }),
  city('b-life', { tech: 1, creative: 3, nature: 3, live: 3, food: 2, heat: 0, cold: 3, humidity: 0, cost: null })
];
const profile = { industry: 'tech', priority: 'balance', interests: ['nature'], climateAvoids: [], confirmations: [], feedback: [], excludedCityIds: [] };

test('career and life answers produce different first recommendations', () => {
  const question = getNextQuestion(profile, rankCities(profile, cities), 1);
  assert.equal(question.id, 'first-priority');
  const work = applyAnswer(profile, question, 'career');
  const life = applyAnswer(profile, question, 'life');
  assert.equal(rankCities(work, cities).ranked[0].city.id, 'a-work');
  assert.equal(rankCities(life, cities).ranked[0].city.id, 'b-life');
  assert.deepEqual(profile.confirmations, []);
});

test('hard sourced climate excludes; like never overrides a hard condition', () => {
  const input = applyFeedback({ ...profile, climateAvoids: ['heat'], hardClimate: true }, 'a-work', 'like');
  const result = rankCities(input, cities);
  assert.deepEqual(result.ranked.map((item) => item.city.id), ['b-life']);
  assert.equal(result.excluded[0].city.id, 'a-work');
});

test('soft climate reduces fit without pretending it is a hard condition', () => {
  const result = rankCities({ ...profile, climateAvoids: ['heat'], hardClimate: false }, cities);
  assert.equal(result.excluded.length, 0);
  assert.equal(result.ranked[0].city.id, 'b-life');
  assert(result.ranked.find((item) => item.city.id === 'a-work').tradeoffs.some((text) => text.includes('炎热')));
});

test('unknown or editorial climate cannot silently pass or trigger a sourced hard exclusion', () => {
  const samples = [city('unknown', { tech: 3, nature: 3, heat: null }), city('editorial', { tech: 3, nature: 3, heat: 3 }, { heat: 'editorial' })];
  const result = rankCities({ ...profile, climateAvoids: ['heat'], hardClimate: true }, samples);
  assert.equal(result.ranked.length, 2);
  assert(result.ranked.every((item) => item.status === 'explore'));
  assert(result.ranked.every((item) => item.unknowns.some((text) => text.includes('气候硬条件'))));
});

test('missing evidence never earns points or causes city-specific renormalization', () => {
  const samples = [city('complete', { tech: 2, nature: 3 }), city('missing', { tech: 2, nature: null })];
  const result = rankCities(profile, samples);
  const known = result.ranked.find((item) => item.city.id === 'complete');
  const unknown = result.ranked.find((item) => item.city.id === 'missing');
  assert(known.score > unknown.score);
  assert.equal(unknown.score, 33.333333);
  assert.equal(unknown.coverage, 0.5);
  assert.equal(known.coverage, 1);
  assert.equal(unknown.status, 'explore');
});

test('dangling citation and absent evidence remain unknown even with a number', () => {
  const invalid = city('invalid', { tech: 3, nature: 3 });
  invalid.sources = [];
  const noEvidence = { id: 'no-evidence', features: { tech: 3, nature: 3 } };
  const result = rankCities(profile, [invalid, noEvidence]);
  assert(result.ranked.every((item) => item.score === 0 && item.coverage === 0));
});

test('duplicate interests and climate avoids do not double their weight', () => {
  const simple = rankCities({ ...profile, interests: ['nature', 'live'], climateAvoids: ['heat'] }, cities);
  const duplicate = rankCities({ ...profile, interests: ['nature', 'nature', 'live'], climateAvoids: ['heat', 'heat'] }, cities);
  assert.deepEqual(simple, duplicate);
});

test('adding another hobby divides the same lifestyle budget rather than adding points', () => {
  const sample = city('same', { tech: 3, nature: 2, live: 2, food: 2 });
  assert.equal(rankCities(profile, [sample]).ranked[0].score,
    rankCities({ ...profile, interests: ['nature', 'live', 'food'] }, [sample]).ranked[0].score);
});

test('only explicit rejection excludes; other feedback does not invent constraints', () => {
  for (const reason of ['like', 'cost', 'climate', 'career', 'too-busy', 'unsure']) {
    const next = applyFeedback(profile, 'a-work', reason);
    assert.deepEqual(next.excludedCityIds, []);
    assert.equal(next.hardClimate, undefined);
    assert.equal(rankCities(next, cities).ranked.length, 2);
  }
  const rejected = applyFeedback(profile, 'a-work', 'not-this-city');
  assert.deepEqual(rankCities(rejected, cities).ranked.map((item) => item.city.id), ['b-life']);
  assert.deepEqual(profile.feedback, []);
});

test('ties use stable id independent of input order', () => {
  const first = city('alpha', { tech: 2, nature: 2 });
  const last = city('zulu', { tech: 2, nature: 2 });
  const result = rankCities(profile, [last, first]);
  assert.deepEqual(result.ranked.map((item) => item.city.id), ['alpha', 'zulu']);
  assert(result.ranked.every((item) => item.status === 'explore'));
  assert(result.missing.some((text) => text.includes('唯一首选')));
});

test('personality, age, school and guide do not change ranking', () => {
  const changed = { ...profile, mbti: 'ENFP', zodiac: '狮子座', guide: 'dog', school: '某学校', ageBand: '30+', admiredMbti: 'INTJ', admiredTraits: ['reliable'] };
  assert.deepEqual(rankCities(profile, cities), rankCities(changed, cities));
});

test('budget and home location are verification needs, not invented affordability or transport', () => {
  const before = rankCities(profile, cities);
  const after = rankCities({ ...profile, rentBudget: 1500, homeCity: '虚构家乡', relationship: 'near-home' }, cities);
  assert.deepEqual(before.ranked.map((item) => [item.city.id, item.score]), after.ranked.map((item) => [item.city.id, item.score]));
  assert(after.ranked.every((item) => item.unknowns.some((text) => text.includes('1500'))));
  assert(after.missing.some((text) => text.includes('交通')));
});

test('revising profile recomputes ranking without stale stored conclusion', () => {
  const work = rankCities({ ...profile, priority: 'career' }, cities);
  const revised = rankCities({ ...profile, priority: 'career', industry: 'creative' }, cities);
  assert.equal(work.ranked[0].city.id, 'a-work');
  assert.equal(revised.ranked[0].city.id, 'b-life');
});

test('round 2 follows career feedback and different answers can change final ranking', () => {
  const firstQuestion = getNextQuestion(profile, {}, 1);
  const first = applyAnswer(profile, firstQuestion, 'career');
  const feedback = applyFeedback(first, 'a-work', 'career');
  const secondQuestion = getNextQuestion(feedback, rankCities(feedback, cities), 2);
  assert.equal(secondQuestion.id, 'industry-goal');
  const tech = applyAnswer(feedback, secondQuestion, 'tech');
  const creative = applyAnswer(feedback, secondQuestion, 'creative');
  assert.equal(rankCities(tech, cities).ranked[0].city.id, 'a-work');
  assert.equal(rankCities(creative, cities).ranked[0].city.id, 'b-life');
  assert.equal(creative.confirmations.length, 2);
});

test('missing industry takes precedence in first round, and confirmed questions are not repeated', () => {
  const uncertain = { ...profile, industry: 'unknown' };
  const first = getNextQuestion(uncertain, {}, 1);
  assert.equal(first.id, 'industry-goal');
  const answered = applyAnswer(uncertain, first, 'unknown');
  assert.notEqual(getNextQuestion(answered, {}, 2).id, first.id);
});

test('feedback and answers are deeply immutable', () => {
  const input = { ...profile, interests: ['nature'], feedback: [{ cityId: 'z', reasonId: 'like' }] };
  const q = getNextQuestion(input, {}, 1);
  const next = applyAnswer(input, q, 'life');
  next.interests.push('live');
  next.feedback[0].reasonId = 'cost';
  assert.deepEqual(input.interests, ['nature']);
  assert.equal(input.feedback[0].reasonId, 'like');
  assert.throws(() => applyAnswer(input, q, 'not-an-option'), RangeError);
  assert.throws(() => applyFeedback(input, 'x', 'unknown-feedback'), RangeError);
});

test('an empty feasible set is explicit instead of restoring rejected cities', () => {
  const result = rankCities({ ...profile, excludedCityIds: cities.map((item) => item.id) }, cities);
  assert.equal(result.ranked.length, 0);
  assert.equal(result.excluded.length, 2);
  assert(result.missing.some((text) => text.includes('不能强行')));
});

test('invalid numbers and unknown interests cannot create NaN or extra score', () => {
  const invalid = city('invalid', { tech: Infinity, nature: -1 });
  const result = rankCities({ ...profile, interests: ['nature', 'invented'] }, [invalid]);
  assert.equal(result.ranked[0].score, 0);
  assert.equal(result.ranked[0].coverage, 0);
});

test('feedback never silently removes previously selected interests', () => {
  const original = { ...profile, interests: ['nature', 'live', 'food'], confirmations: ['first-priority'] };
  const busy = applyFeedback(original, 'a-work', 'too-busy');
  const quietQuestion = getNextQuestion(busy, {}, 2);
  const quietAnswer = applyAnswer(busy, quietQuestion, 'quiet');
  assert.deepEqual(quietAnswer.interests, ['nature', 'live', 'food', 'quiet']);
  const unsure = applyFeedback(original, 'a-work', 'unsure');
  const focusQuestion = getNextQuestion(unsure, {}, 2);
  const focused = applyAnswer(unsure, focusQuestion, 'nature');
  assert.deepEqual(focused.interests, original.interests);
  assert.equal(focused.focusInterest, 'nature');
  const added = applyAnswer(unsure, focusQuestion, 'ball');
  assert.deepEqual(added.interests, ['nature', 'live', 'food', 'ball']);
  assert.deepEqual(original.interests, ['nature', 'live', 'food']);
});

test('confirmed life focus can reorder candidates without increasing total lifestyle weight', () => {
  const samples = [city('outdoor', { tech: 2, nature: 3, live: 1 }), city('stage', { tech: 2, nature: 1, live: 3 })];
  const p = { ...profile, interests: ['nature', 'live'] };
  const nature = rankCities({ ...p, focusInterest: 'nature' }, samples);
  const live = rankCities({ ...p, focusInterest: 'live' }, samples);
  assert.equal(nature.ranked[0].city.id, 'outdoor');
  assert.equal(live.ranked[0].city.id, 'stage');
  const all = city('all', { tech: 3, nature: 3, live: 3 });
  assert.equal(rankCities({ ...p, focusInterest: 'nature' }, [all]).ranked[0].score, 100);
  assert.equal(rankCities({ ...p, focusInterest: 'invalid' }, samples).ranked[0].score,
    rankCities(p, samples).ranked[0].score);
});

test('reasons use the concrete note, preserve editorial status, and do not alter ranking', () => {
  const sample = city('note', { tech: 2, nature: 3 }, { tech: 'editorial', nature: 'editorial' });
  const before = rankCities(profile, [sample]).ranked[0];
  sample.featureEvidence.tech.note = '人工分档，非统计测量。官方目录列有某类研发方向，技术生态记2；目录不等于实时招聘。';
  sample.featureEvidence.nature.note = '人工分档，非统计测量。已记录虚构测试湖与沿岸空间，资源类型记3；不是下楼可达分。';
  const after = rankCities({ ...profile, pace: 'weekend' }, [sample]).ranked[0];
  assert.equal(after.score, before.score);
  assert.equal(after.coverage, before.coverage);
  assert(after.reasons[0].text.includes('官方目录列有某类研发方向'));
  assert(after.reasons[0].text.includes('目录不等于实时招聘'));
  assert(after.reasons[1].text.startsWith('你想周末去户外。'));
  assert(after.reasons[1].text.includes('虚构测试湖'));
  assert(after.reasons[1].text.includes('从住处出发是否方便还得核对'));
  for (const reason of after.reasons) {
    assert.equal(reason.status, 'editorial');
    assert.deepEqual(reason.sourceIds, ['fixture']);
    assert(!/记[0-3]|人工分档|非统计测量/.test(reason.text));
    assert.equal(reason.text.split('。').filter(Boolean).length, 2);
  }
});

test('long notes stay bounded and missing details never become invented local facts', () => {
  const sample = city('long', { tech: 3, nature: 3 });
  sample.featureEvidence.tech.note = '已知行业事实，'.repeat(40);
  sample.featureEvidence.nature.note = '';
  const result = rankCities(profile, [sample]).ranked[0];
  assert(result.reasons[0].text.length < 150);
  assert(result.reasons[0].text.includes('…'));
  assert(result.reasons[1].text.includes('缺具体说明'));
  const unknown = rankCities({ industry: 'unknown', interests: ['ball', 'quiet', 'food'] }, [sample]);
  const copy = JSON.stringify({ missing: unknown.missing, unknowns: unknown.ranked[0].unknowns });
  assert(!/未加分|权重|分母|分给其他/.test(copy));
  assert(copy.includes('球场'));
  assert(copy.includes('噪声'));
});
