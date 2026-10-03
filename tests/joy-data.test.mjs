import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rankCities, normalizeProfile, JOY_CONFIG, explainChanges } from '../core/matcher.mjs';
import { getNextQuestion, applyAnswer, applyFeedback } from '../core/questions.mjs';

const readCities = async () => JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8'));
const example = () => normalizeProfile({ guide: 'dog', aiRole: 'design', joy: {
  novelty: 'mix', recovery: 'nature', relationships: 'regular', career: 'learn', uncertainty: 'balanced'
}, climateAvoids: ['heat'], rentBudget: 5000, housingType: 'primary-shared', maxCommuteMinutes: 30 });

test('real city joy evidence covers every option and every citation resolves locally', async () => {
  const cities = await readCities();
  assert(cities.length >= 2);
  const keys = JOY_CONFIG.dimensions.flatMap((dimension) => dimension.options.map((option) => `${dimension.id}:${option.id}`));
  let known = 0, unknown = 0;
  for (const city of cities) {
    assert(city.joySignals, `${city.name} 缺少五维证据`);
    const sourceIds = new Set(city.sources.map((source) => source.id));
    for (const key of keys) {
      const signal = city.joySignals[key];
      assert(signal, `${city.name} 缺少 ${key}`);
      assert(['unknown', 'editorial', 'sourced'].includes(signal.status));
      assert(signal.value === null || (Number.isFinite(signal.value) && signal.value >= 0 && signal.value <= 3));
      assert.equal(typeof signal.note, 'string');
      assert.equal(typeof signal.caveat, 'string');
      assert(Array.isArray(signal.sourceIds));
      for (const id of signal.sourceIds) assert(sourceIds.has(id), `${city.name} ${key} 引用了不存在的来源 ${id}`);
      if (signal.status === 'unknown') { assert.equal(signal.value, null); unknown++; }
      else { assert(signal.value !== null); known++; }
      if (signal.status === 'sourced') assert(signal.sourceIds.length);
    }
  }
  assert(known > 0, '真实资料必须提供至少一条可比较线索');
  assert(unknown > 0, '仍未确认的城市生活特征必须显式保留');
});

test('actual data supports portrait, first city, feedback and a single refinement without invented certainty', async () => {
  const cities = await readCities(), profile = example();
  const first = rankCities(profile, cities);
  assert.equal(first.portrait.unanswered.length, 0);
  assert(first.ranked.length >= 2);
  assert(first.ranked.some((item) => item.reasons.length > 0));
  for (const candidate of first.ranked) {
    assert(Number.isFinite(candidate.score));
    assert(candidate.scoreRange.min <= candidate.score && candidate.score <= candidate.scoreRange.max);
    assert(candidate.scoreRange.max <= 100);
    for (const reason of candidate.reasons) for (const id of reason.sourceIds) assert(candidate.city.sources.some((source) => source.id === id));
  }
  const reacted = applyFeedback(profile, first.ranked[0].city.id, 'heart', { dimension: 'novelty' });
  const question = getNextQuestion(reacted, first, 2);
  assert.equal(question.id, 'joy-refine-novelty');
  const refined = applyAnswer(reacted, question, 'familiar');
  const final = rankCities(refined, cities);
  assert.deepEqual(final, rankCities(refined, [...cities].reverse()));
  assert.equal(final.portrait.items.find((item) => item.dimension === 'novelty').source.kind, 'answer');
  assert(explainChanges(profile, refined, cities).changes.some((item) => item.path === 'joy.novelty'));
  if (final.ambiguous) assert(final.missing.some((item) => item.includes('唯一首选')));
  const rejected = applyFeedback(refined, first.ranked[0].city.id, 'not-this-city');
  const cat = rankCities({ ...rejected, guide: 'cat' }, cities), dog = rankCities({ ...rejected, guide: 'dog' }, cities);
  assert.deepEqual(cat.excluded, dog.excluded);
  assert(!cat.ranked.some((item) => item.city.id === first.ranked[0].city.id));
  for (const item of cat.ranked) assert.deepEqual(item.facts, dog.ranked.find((other) => other.city.id === item.city.id).facts);
});
