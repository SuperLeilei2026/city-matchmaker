import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rankCities } from '../core/matcher.mjs';
import { getNextQuestion, applyAnswer, applyFeedback } from '../core/questions.mjs';

test('the actual city dataset supports a complete deterministic two-round flow', async (context) => {
  let cities;
  try { cities = JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return context.skip('城市数据尚未交付；交付后必须重新运行。');
    throw error;
  }
  assert(Array.isArray(cities) && cities.length >= 2);
  const ids = cities.map((city) => city.id);
  assert.equal(new Set(ids).size, ids.length);
  const p = { industry: 'tech', interests: ['nature', 'live'], priority: 'balance', confirmations: [], excludedCityIds: [] };
  const q1 = getNextQuestion(p, rankCities(p, cities), 1);
  const answered = applyAnswer(p, q1, q1.options[0].id);
  const first = rankCities(answered, cities);
  assert(first.ranked.length >= 2);
  assert(first.ranked.every((item) => Number.isFinite(item.score) && item.coverage >= 0 && item.coverage <= 1));
  const rejected = applyFeedback(answered, first.ranked[0].city.id, 'not-this-city');
  const q2 = getNextQuestion(rejected, first, 2);
  const finalProfile = applyAnswer(rejected, q2, q2.options[0].id);
  const final = rankCities(finalProfile, cities);
  assert(!final.ranked.some((item) => item.city.id === first.ranked[0].city.id));
  assert.equal(final.excluded.length, 1);
  for (const result of final.ranked) {
    for (const reason of result.reasons) {
      assert(['sourced', 'editorial'].includes(reason.status));
      for (const sourceId of reason.sourceIds) assert(result.city.sources.some((source) => source.id === sourceId));
    }
  }
  assert.deepEqual(final, rankCities(finalProfile, [...cities].reverse()));
});

test('actual city reasons are concrete, short, and retain source labels', async (context) => {
  let cities;
  try { cities = JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return context.skip('城市数据尚未交付；交付后必须重新运行。');
    throw error;
  }
  const descriptions = new Map();
  for (const city of cities) {
    const collected = [];
    for (const industry of ['tech', 'creative', 'manufacturing', 'service']) {
      collected.push(...rankCities({ industry, interests: [] }, [city]).ranked[0].reasons);
    }
    const lifestyle = rankCities({ industry: 'unknown', interests: ['nature', 'live', 'food', 'ball', 'quiet'],
      climateAvoids: ['heat', 'cold', 'humidity'], pace: 'weekend' }, [city]).ranked[0];
    collected.push(...lifestyle.reasons);
    for (const reason of collected) {
      assert(reason.text.length < 150, `${city.name} 的理由过长`);
      assert.equal(reason.text.split('。').filter(Boolean).length, 2);
      assert(!/人工分档|记[0-3]|有较多相关机会或资源的线索/.test(reason.text));
      assert(['editorial', 'sourced'].includes(reason.status));
    }
    const nature = lifestyle.reasons.find((reason) => reason.text.startsWith('你想周末去户外。'));
    if (nature) descriptions.set(city.id, nature.text);
  }
  assert.equal(new Set(descriptions.values()).size, descriptions.size, '城市不能共用泛泛的户外理由');
  assert(descriptions.size >= 2);
});
