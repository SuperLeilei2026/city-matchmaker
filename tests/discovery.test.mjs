import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JOY_CONFIG, normalizeProfile } from '../core/profile.mjs';
import { rankCities } from '../core/matcher.mjs';
import { createDiscovery, reconcileDiscovery, serializeDiscovery, browseNext, restartBrowse, toggleFavorite,
  compareFavorites, getComparisonQuestion, answerComparison, skipComparisonQuestion } from '../core/discovery.mjs';

// Deliberately synthetic source and city data: these assertions are algorithmic, not city claims.
function city(id, signals = {}, status = 'sourced', climate = {}) {
  return { id, name: id, sources: [{ id: 'fixture', url: 'https://example.invalid/discovery-test' }],
    joySignals: Object.fromEntries(Object.entries(signals).map(([key, value]) => [key,
      { value, status, sourceIds: ['fixture'], note: '虚构测试线索', caveat: '仅用于逻辑测试' }])),
    features: climate, featureEvidence: Object.fromEntries(Object.keys(climate).map((key) => [key,
      { status, sourceIds: ['fixture'], note: '虚构天气线索' }])) };
}
const basic = [city('c'), city('a'), city('b')];
const preferences = { novelty: 'new', recovery: 'nature', relationships: 'new', career: 'build', uncertainty: 'explore' };
const allSignals = (value) => Object.fromEntries(Object.entries(preferences).map(([dimension, option]) => [`${dimension}:${option}`, value]));
const paired = (profile, cities) => cities.slice(0, 2).reduce((state, item) => toggleFavorite(state, item.id, cities), createDiscovery(profile, cities));

test('open immediately; a full browse cycle has no repeats and does not imply rejection or preference', () => {
  let state = createDiscovery({ mbti: 'INTP', interests: ['nature'], personalNote: '保留旧资料' }, basic);
  const originalProfile = structuredClone(state.profile);
  const visited = [];
  while (state.currentCityId) {
    visited.push(state.currentCityId);
    state = browseNext(state, basic);
  }
  assert.deepEqual(visited, ['a', 'b', 'c']);
  assert.equal(state.view, 'exhausted');
  assert.deepEqual(state.browsedCityIds, visited);
  assert.deepEqual(state.profile, originalProfile);
  assert.deepEqual(state.profile.excludedCityIds, []);
  assert.deepEqual(state.profile.feedback, []);
  assert(Object.values(state.profile.joy).every((value) => value === null));
  assert.equal(browseNext(state, basic).lastAction.reason, 'cycle-complete');
  const restarted = restartBrowse(state, basic);
  assert.equal(restarted.currentCityId, 'a');
  assert.deepEqual(restarted.browsedCityIds, []);
  assert.deepEqual(restarted.profile, originalProfile);
});

test('favorites are unique, limited to two, advance the card and never change matching weights', () => {
  let state = createDiscovery({}, basic);
  const profile = structuredClone(state.profile);
  const before = rankCities(profile, basic);
  state = toggleFavorite(state, 'a', basic);
  assert.equal(state.currentCityId, 'b');
  assert.equal(state.view, 'browse');
  state = toggleFavorite(state, 'b', basic);
  assert.equal(state.view, 'compare');
  assert.equal(state.currentCityId, 'c');
  assert.deepEqual(state.likedCityIds, ['a', 'b']);
  const full = toggleFavorite(state, 'c', basic);
  assert.equal(full.lastAction.reason, 'favorites-full');
  assert.deepEqual(full.likedCityIds, state.likedCityIds);
  assert.deepEqual(full.profile, profile);
  assert.deepEqual(rankCities(full.profile, basic), before);
  state = toggleFavorite(full, 'a', basic);
  assert.deepEqual(state.likedCityIds, ['b']);
  state = toggleFavorite(state, 'c', basic);
  assert.deepEqual(state.likedCityIds, ['b', 'c']);
  assert.equal(state.currentCityId, null);
  const restarted = restartBrowse(state, basic);
  assert.equal(restarted.currentCityId, 'a');
  assert.deepEqual(restarted.likedCityIds, ['b', 'c']);
});

test('explicit old rejection and sourced hard climate filter both browsing and favorites', () => {
  const cities = [city('rejected'), city('feedback'), city('hot', {}, 'sourced', { heat: 3 }),
    city('pending', {}, 'editorial', { heat: 3 }), city('safe', {}, 'sourced', { heat: 0 })];
  const profile = { excludedCityIds: ['rejected'], feedback: [{ cityId: 'feedback', reasonId: 'not-this-city' }],
    climateAvoids: ['heat'], hardClimate: true };
  let state = createDiscovery(profile, cities);
  for (const id of ['rejected', 'feedback', 'hot', 'nonexistent']) {
    const result = toggleFavorite(state, id, cities);
    assert.equal(result.lastAction.reason, 'not-eligible');
    assert.deepEqual(result.likedCityIds, []);
  }
  const visited = [];
  while (state.currentCityId) { visited.push(state.currentCityId); state = browseNext(state, cities); }
  assert.deepEqual([...visited].sort(), ['pending', 'safe']);
  assert.deepEqual(state.profile.excludedCityIds, ['rejected']);
  const pending = rankCities(state.profile, cities).ranked.find((item) => item.city.id === 'pending');
  assert(pending.unknowns.some((item) => item.includes('气候硬条件还没核实')));
});

test('constraint edits remove newly ineligible favorites and release capacity without erasing profile data', () => {
  const state = paired({}, basic);
  const changed = reconcileDiscovery({ ...state, questionAsked: true,
    profile: { ...state.profile, excludedCityIds: ['c'], marker: { nested: 'keep' } } }, basic);
  assert.deepEqual(changed.likedCityIds, ['a']);
  assert.equal(changed.questionAsked, false);
  assert.deepEqual(changed.profile.marker, { nested: 'keep' });
  assert.deepEqual(toggleFavorite(changed, 'b', basic).likedCityIds, ['a', 'b']);
});

test('valid JSON restarts preserve cursor, cycle, favorites, completed question and entire profile', () => {
  const cities = [city('a', { 'recovery:nature': 3 }), city('b', { 'recovery:nature': 0 }), city('c')];
  let state = paired({ custom: { privateLocalValue: 'synthetic-only' }, excludedCityIds: ['old-id'], guide: 'cat' }, cities);
  state = answerComparison(state, cities, 'nature');
  assert.equal(state.currentCityId, 'c');
  assert.deepEqual(createDiscovery({}, cities, serializeDiscovery(state)), state, 'the unvisited next card must survive a restart on the comparison page');
  state = browseNext(state, cities);
  const restored = createDiscovery({}, cities, serializeDiscovery(state));
  assert.deepEqual(restored, state);
  assert.equal(restored.questionAsked, true);
  assert.equal(restored.currentCityId, null);
  assert.deepEqual(restored.profile.excludedCityIds, ['old-id']);
  assert.equal(getComparisonQuestion(restartBrowse(restored, cities), cities), null);
});

test('clearing an answered field stays unknown after restart; excluding both favorites preserves the browse cursor', () => {
  const cities = [city('a', { 'recovery:nature': 3 }), city('b', { 'recovery:nature': 0 }), city('c')];
  const answered = answerComparison(paired({}, cities), cities, 'nature');
  const cleared = reconcileDiscovery({ ...answered, profile: { ...answered.profile, joy: { ...answered.profile.joy, recovery: null } } }, cities);
  const restored = createDiscovery({}, cities, serializeDiscovery(cleared));
  assert.equal(restored.profile.joy.recovery, null);
  assert.equal(restored.questionAsked, true, 'editing the profile must not silently grant this pair a second optional question');
  assert.equal(compareFavorites(restored, cities).status, 'no-explicit-preference');
  assert.equal(compareFavorites(restored, cities).winnerCityId, null);
  assert(compareFavorites(restored, cities).ranked.every((item) => item.reasons.length === 0));
  const excluded = reconcileDiscovery({ ...restored, profile: { ...restored.profile, excludedCityIds: ['a', 'b'] } }, cities);
  const restarted = createDiscovery({}, cities, serializeDiscovery(excluded));
  assert.deepEqual(restarted.likedCityIds, []);
  assert.equal(restarted.questionAsked, false);
  assert.equal(restarted.currentCityId, 'c');
  assert.equal(compareFavorites(restarted, cities).status, 'need-two');
  assert.deepEqual(restarted.profile.excludedCityIds, ['a', 'b']);
});

test('legacy plain profile or envelope migrations retain old choices without inventing Joy defaults', () => {
  const legacy = { guide: 'cat', mbti: 'INTP', priority: 'career', interests: ['nature'],
    excludedCityIds: ['a'], climateAvoids: ['humidity'], rentBudget: 4000, note: { preserve: true } };
  for (const saved of [legacy, { profile: legacy }, JSON.stringify({ profile: legacy })]) {
    const state = createDiscovery({}, basic, saved);
    assert.deepEqual(state.profile, normalizeProfile(legacy));
    assert(Object.values(state.profile.joy).every((value) => value === null));
    assert.equal(state.profile.aiRole, null);
    assert.notEqual(state.currentCityId, 'a');
    assert.deepEqual(state.likedCityIds, []);
  }
  assert.throws(() => createDiscovery({}, basic, '{broken'), SyntaxError, 'bad JSON must not silently replace a saved profile');
});

test('restore repairs duplicate, absent and excluded card IDs while preserving valid progress', () => {
  const snapshot = { profile: { excludedCityIds: ['c'] }, likedCityIds: ['a', 'a', 'missing', 'c', 'b'],
    browsedCityIds: ['a', 'a', 'missing', 'c'], currentCityId: 'a', questionAsked: true, view: 'browse' };
  const state = createDiscovery({}, basic, snapshot);
  assert.deepEqual(state.likedCityIds, ['a', 'b']);
  assert.deepEqual(state.browsedCityIds, ['a', 'c']);
  assert.equal(state.currentCityId, null);
  assert.equal(state.view, 'exhausted');
  assert.equal(state.questionAsked, false);
  assert.deepEqual(snapshot.likedCityIds, ['a', 'a', 'missing', 'c', 'b']);
});

test('with no explicit preference, favorite order and personality never become a personalised winner', () => {
  const cities = [city('b', allSignals(3)), city('a', allSignals(0))];
  const state = paired({ aiRole: 'product', guide: 'cat', mbti: 'INTP', interests: ['nature'] }, cities);
  const result = compareFavorites(state, cities);
  assert.equal(result.status, 'no-explicit-preference');
  assert.equal(result.winnerCityId, null);
  assert.equal(result.ambiguous, true);
  assert.deepEqual(result.ranked.map((item) => item.city.id), ['a', 'b']);
  assert(result.ranked.every((item) => item.score === 0));
});

test('unknown and editorial uncertainty prevent declaring a winner despite unequal point scores', () => {
  const profile = { joy: preferences };
  for (const cities of [
    [city('known', allSignals(3)), city('unknown')],
    [city('editorial-high', allSignals(3), 'editorial'), city('editorial-low', allSignals(2), 'editorial')]
  ]) {
    const result = compareFavorites(paired(profile, cities), cities);
    assert(result.ranked[0].score > result.ranked[1].score);
    assert.equal(result.status, 'overlap');
    assert.equal(result.winnerCityId, null);
    assert.equal(result.ambiguous, true);
  }
  const known = [city('high', allSignals(3)), city('low', allSignals(0))];
  const distinct = compareFavorites(paired(profile, known), known);
  assert.equal(distinct.status, 'distinct');
  assert.equal(distinct.winnerCityId, 'high');
});

test('optional question uses only this pair, unanswered fields, and the largest weighted known difference', () => {
  const cities = [city('a', { 'novelty:new': 3, 'recovery:nature': 2, 'career:build': 3 }),
    city('b', { 'novelty:new': 0, 'recovery:nature': 1, 'career:build': 0 }),
    city('outside', { 'relationships:new': 3, 'uncertainty:explore': 3 })];
  const state = paired({ guide: 'dog', joy: { career: 'learn' } }, cities);
  const question = getComparisonQuestion(state, cities);
  assert.equal(question.dimension, 'novelty');
  assert(question.why.includes('答案未必改变先后'));
  assert(question.selectionBasis.evidence.some((item) => item.contrast > 0));
  assert(question.selectionBasis.evidence.every((item) => item.facts.map((fact) => fact.cityId).join(',') === 'a,b'));
  const answered = answerComparison(state, cities, 'new', question.id);
  assert.equal(answered.profile.joy.novelty, 'new');
  assert.equal(answered.profile.joy.career, 'learn');
  assert.equal(answered.profile.joy.recovery, null);
  assert.equal(answered.profile.answerSources['joy.novelty'].questionId, question.id);
  assert.deepEqual(answered.likedCityIds, state.likedCityIds);
  assert.equal(getComparisonQuestion(answered, cities), null);
  assert.equal(compareFavorites(answered, cities).winnerCityId, null);
  assert.equal(answerComparison(answered, cities, 'familiar').lastAction.reason, 'no-question');
  assert.equal(state.profile.joy.novelty, null);
});

test('unknown, equal, invalid or broken sourced signals cannot manufacture a comparison question', () => {
  for (const signals of [{}, { 'recovery:nature': 3 }, { 'recovery:nature': null }, { 'recovery:nature': 9 }]) {
    const cities = [city('a', signals), city('b', signals)];
    const result = compareFavorites(paired({}, cities), cities);
    assert.equal(result.question, null);
    assert.equal(result.questionUnavailableReason, 'insufficient-known-difference');
  }
  const cities = [city('a', { 'recovery:nature': 3 }), city('b', { 'recovery:nature': 0 })];
  cities[0].joySignals['recovery:nature'].sourceIds.push('dangling');
  assert.equal(getComparisonQuestion(paired({}, cities), cities), null);
  cities[0].joySignals['recovery:nature'].sourceIds = ['fixture'];
  cities[1].joySignals['recovery:nature'].status = 'unknown';
  assert.equal(getComparisonQuestion(paired({}, cities), cities), null);
});

test('skip persists for this favorite pair; changed favorites permit one fresh question; stale answers do nothing', () => {
  const cities = [city('a', { 'recovery:nature': 3 }), city('b', { 'recovery:nature': 0 }), city('c', { 'recovery:nature': 1 })];
  const state = paired({}, cities);
  const oldQuestion = getComparisonQuestion(state, cities);
  const skipped = skipComparisonQuestion(state, cities);
  assert.deepEqual(skipped.profile, state.profile);
  assert.equal(skipped.questionAsked, true);
  assert.equal(getComparisonQuestion(createDiscovery({}, cities, serializeDiscovery(skipped)), cities), null);
  let changed = toggleFavorite(skipped, 'b', cities);
  changed = toggleFavorite(changed, 'c', cities);
  assert.equal(changed.questionAsked, false);
  assert.notEqual(getComparisonQuestion(changed, cities).id, oldQuestion.id);
  const stale = answerComparison(changed, cities, 'nature', oldQuestion.id);
  assert.equal(stale.lastAction.reason, 'stale-question');
  assert.deepEqual(stale.profile, changed.profile);
  const invalid = answerComparison(changed, cities, 'not-an-option');
  assert.equal(invalid.lastAction.reason, 'invalid-option');
  assert.equal(invalid.questionAsked, false);
});

test('real city pairs supply traceable differences without promising a winner or requiring a question', () => {
  const cities = JSON.parse(readFileSync(new URL('../data/cities.json', import.meta.url), 'utf8'));
  let withQuestion = 0;
  for (let a = 0; a < cities.length; a++) for (let b = a + 1; b < cities.length; b++) {
    const samples = [cities[a], cities[b]];
    const state = paired({}, samples);
    const comparison = compareFavorites(state, samples);
    assert.equal(comparison.winnerCityId, null);
    if (!comparison.question) continue;
    withQuestion++;
    for (const evidence of comparison.question.selectionBasis.evidence.filter((item) => item.contrast > 0)) {
      assert(evidence.facts.every((fact) => fact.known));
      for (const fact of evidence.facts) {
        const sample = samples.find((item) => item.id === fact.cityId);
        assert(fact.sourceIds.length > 0);
        assert(fact.sourceIds.every((id) => sample.sources.some((source) => source.id === id)));
      }
    }
    const answer = answerComparison(state, samples, comparison.question.options[0].id);
    assert.equal(compareFavorites(answer, samples).winnerCityId, null, 'one incomplete preference cannot turn editorial gaps into certainty');
  }
  assert(withQuestion > 0, 'the current dataset should permit at least one honest optional question');
  assert.equal(compareFavorites(createDiscovery({}, cities), cities).status, 'need-two');
  assert.equal(JOY_CONFIG.dimensions.length, 5);
});
