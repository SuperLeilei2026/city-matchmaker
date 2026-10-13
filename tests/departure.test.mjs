import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rankDepartureCities, normalizeDepartureProfile, RENT_BENCHMARKS } from '../core/departure.mjs';

const cities = async () => JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8'));

test('industry and supported interests change the lifestyle order while budget gates feasibility', async () => {
  const data = await cities();
  const base = { careerLife: 35, socialEnergy: 65, industry: 'tech', interests: ['nature'], rentBudget: 5200 };
  const industryA = rankDepartureCities(base, data).ranked.map((item) => item.city.id);
  const industryB = rankDepartureCities({ ...base, industry: 'manufacturing' }, data).ranked.map((item) => item.city.id);
  const interestB = rankDepartureCities({ ...base, interests: ['live'] }, data).ranked.map((item) => item.city.id);
  const budgetB = rankDepartureCities({ ...base, rentBudget: 1800 }, data).ranked.map((item) => item.city.id);
  assert.notDeepEqual(industryA, industryB, '换行业应改变城市顺序');
  assert.notDeepEqual(industryA, interestB, '换兴趣应改变城市顺序');
  assert.notDeepEqual(industryA, budgetB, '预算压力应改变候选顺序');
});

test('rent pressure uses the dated city benchmark without inventing listings', async () => {
  const data = await cities();
  const result = rankDepartureCities({ industry: 'exploring', interests: ['quiet'], rentBudget: 2000 }, data);
  const wuhan = result.ranked.find((item) => item.city.id === 'wuhan');
  assert.equal(wuhan.rent.compactRent, RENT_BENCHMARKS.cities.wuhan.compactRent);
  assert.match(wuhan.constraints.budget.detail, /30–60㎡平均套租/);
  assert(!wuhan.constraints.budget.detail.includes('可租到'));
  assert.equal(wuhan.constraints.budget.status, 'clear');
});

test('a saturated budget stops manufacturing score advantage', async () => {
  const data = await cities();
  const input = { careerLife: 70, socialEnergy: 80, industry: 'tech', interests: ['live'], rentBudget: 8000 };
  const atEight = rankDepartureCities(input, data).ranked.map((item) => [item.city.id, item.fitIndex]);
  const atTwelve = rankDepartureCities({ ...input, rentBudget: 12000 }, data).ranked.map((item) => [item.city.id, item.fitIndex]);
  assert.deepEqual(atEight, atTwelve);
});

test('climate redline is separated from preference score and unknown never counts as clear', async () => {
  const data = await cities();
  const result = rankDepartureCities({ industry: 'tech', interests: ['nature'], rentBudget: 4000, climateAvoids: ['humidity'] }, data);
  const shenzhen = result.ranked.find((item) => item.city.id === 'shenzhen');
  const hangzhou = result.ranked.find((item) => item.city.id === 'hangzhou');
  assert.equal(shenzhen.constraints.climate.status, 'unknown');
  assert.equal(hangzhou.constraints.climate.status, 'conditional');
  assert.equal(shenzhen.components.some((item) => item.kind === 'climate'), false);
});

test('unknown evidence stays neutral and visibly lowers coverage', async () => {
  const data = await cities();
  const result = rankDepartureCities({ industry: 'creative', interests: ['ball', 'quiet'], rentBudget: 3000 }, data);
  assert(result.ranked.every((item) => item.components.some((component) => component.key === 'ball' && !component.known)));
  assert(result.ranked.every((item) => item.coverage < 1));
  assert(result.ranked.every((item) => Number.isInteger(item.fitIndex) && item.fitIndex >= 0 && item.fitIndex <= 100));
});

test('profile input is bounded and a recommendation requires explicit reality choices', async () => {
  const p = normalizeDepartureProfile({ careerLife: -20, socialEnergy: 180, industry: 'made-up', interests: ['nature', 'nature', 'bad'], rentBudget: 20 });
  assert.deepEqual(p, { careerLife: 0, socialEnergy: 100, industry: 'exploring', industryConfirmed: false,
    interests: ['nature'], rentBudget: null, climateAvoids: [], careerFocus: '', persona: '' });
  const result = rankDepartureCities(p, await cities());
  assert.equal(result.ready, false);
  assert.match(result.caveat, /不代表幸福/);
});

test('MBTI or zodiac signature can change copy but never the city order', async () => {
  const data = await cities();
  const input = { careerLife: 70, socialEnergy: 75, industry: 'creative', interests: ['live'], rentBudget: 3000 };
  const plain = rankDepartureCities(input, data).ranked.map((item) => [item.city.id, item.fitIndex]);
  const signed = rankDepartureCities({ ...input, persona: 'ENFP / 天秤座' }, data).ranked.map((item) => [item.city.id, item.fitIndex]);
  assert.deepEqual(signed, plain);
});
