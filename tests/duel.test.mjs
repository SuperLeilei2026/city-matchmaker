import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rankDepartureCities } from '../core/departure.mjs';
import { analyzeAssumption, buildDuelRounds, buildVerificationTasks, localDecisionQuestion, normalizeVote } from '../core/duel.mjs';

const cities = async () => JSON.parse(await readFile(new URL('../data/cities.json', import.meta.url), 'utf8'));
function pick(result, id) { return result.ranked.find((item) => item.city.id === id); }

test('小陈 fixture exposes rent counterevidence, embodied-AI gap and humidity uncertainty', async () => {
  const profile = { careerLife: 20, socialEnergy: 50, industry: 'tech', careerFocus: '具身智能',
    interests: ['quiet', 'nature'], rentBudget: 4000, climateAvoids: ['humidity'] };
  const ranked = rankDepartureCities(profile, await cities());
  const shenzhen = pick(ranked, 'shenzhen');
  const hangzhou = pick(ranked, 'hangzhou');
  const analysis = analyzeAssumption('深圳成本低、机会多', shenzhen, hangzhou, profile);
  assert(analysis.findings.some((item) => /杭州为2638元/.test(item.text)));
  assert(analysis.findings.some((item) => /具身智能/.test(item.text)));
  assert.equal(shenzhen.constraints.climate.status, 'unknown');
  assert.equal(hangzhou.constraints.climate.status, 'conditional');
});

test('小雷 fixture keeps WLB and fun as assumptions instead of city facts', async () => {
  const profile = { careerLife: 70, socialEnergy: 80, industry: 'tech', careerFocus: 'AI产品',
    interests: ['ball', 'live'], rentBudget: 8000, climateAvoids: ['heat'] };
  const ranked = rankDepartureCities(profile, await cities());
  const chengdu = pick(ranked, 'chengdu');
  const shanghai = pick(ranked, 'shanghai');
  const analysis = analyzeAssumption('成都会很好玩，压力也不大', chengdu, shanghai, profile);
  assert(analysis.findings.some((item) => item.label === '好玩假设'));
  assert(analysis.findings.some((item) => item.label === '压力假设'));
  const rounds = buildDuelRounds(chengdu, shanghai, ranked.profile);
  assert.equal(rounds.length, 3);
  assert.equal(rounds[1].left.status, 'unknown');
});

test('duel produces three evidence rounds but never a winner', async () => {
  const ranked = rankDepartureCities({ industry: 'creative', interests: ['live'], rentBudget: 3000 }, await cities());
  const left = ranked.ranked[0], right = ranked.ranked[1];
  const rounds = buildDuelRounds(left, right, ranked.profile);
  assert.deepEqual(rounds.map((item) => item.id), ['career', 'daily', 'landing']);
  assert.equal(rounds.some((item) => 'winnerId' in item), false);
  assert.equal(buildVerificationTasks(rounds, ranked.profile).length, 3);
  assert(['career', 'daily', 'landing'].includes(localDecisionQuestion(rounds, { career: 'tie' }, left, right, ranked.profile).dimension));
});

test('duel votes are bounded and cannot smuggle a city id', () => {
  assert.equal(normalizeVote('left'), 'left');
  assert.equal(normalizeVote('right'), 'right');
  assert.equal(normalizeVote('tie'), 'tie');
  assert.equal(normalizeVote('shanghai'), null);
});
