import test from 'node:test';
import assert from 'node:assert/strict';
import { freshExperienceState, migrateExperienceState, resetDecisionState } from '../core/experience-state.mjs';

const ids = ['shanghai', 'hangzhou', 'chengdu', 'shenzhen'];

test('old four-stage saves migrate to shortlist without inventing finalists', () => {
  const migrated = migrateExperienceState({ version: 1, stage: 'ticket', industry: 'tech', industryConfirmed: true,
    interests: ['live'], rentBudget: 8000, savedCityIds: ['chengdu'], persona: 'ENFP' }, ids);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.stage, 'shortlist');
  assert.equal(migrated.candidateMode, 'discover');
  assert.deepEqual(migrated.finalistIds, []);
  assert.equal(migrated.persona, 'ENFP');
});

test('a complete v2 duel restores votes and finalists', () => {
  const saved = { ...freshExperienceState(), stage: 'duel', candidateMode: 'bring',
    candidateCityIds: ['shanghai', 'hangzhou', 'chengdu'], finalistIds: ['shanghai', 'chengdu'],
    duelRound: 2, duelVotes: { career: 'left', daily: 'tie', injected: 'shenzhen' }, assumptionText: '成都压力小' };
  const restored = migrateExperienceState(saved, ids);
  assert.equal(restored.stage, 'duel');
  assert.deepEqual(restored.finalistIds, ['shanghai', 'chengdu']);
  assert.deepEqual(restored.duelVotes, { career: 'left', daily: 'tie' });
  assert.equal(restored.duelRound, 2);
});

test('editing reality clears stale duel decisions while a signature can be preserved', () => {
  const current = { ...freshExperienceState(), persona: 'INFJ', finalistIds: ['shanghai', 'chengdu'],
    leaningId: 'chengdu', assumptionText: '成都好玩', duelRound: 3,
    duelVotes: { career: 'left', daily: 'right', landing: 'tie' }, firstToVerifyId: 'chengdu' };
  const reset = resetDecisionState(current);
  assert.equal(reset.persona, 'INFJ');
  assert.deepEqual(reset.finalistIds, []);
  assert.equal(reset.assumptionText, '');
  assert.deepEqual(reset.duelVotes, {});
  assert.equal(reset.firstToVerifyId, '');
});
