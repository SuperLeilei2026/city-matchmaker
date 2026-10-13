export const EXPERIENCE_STAGES = Object.freeze(['build', 'reality', 'shortlist', 'duel', 'passport']);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unique = (value) => [...new Set(Array.isArray(value) ? value : [])];
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function freshExperienceState() {
  return {
    version: 2,
    stage: 'build',
    candidateMode: 'bring',
    candidateCityIds: [],
    careerLife: 52,
    socialEnergy: 58,
    industry: null,
    industryConfirmed: false,
    careerFocus: '',
    interests: [],
    rentBudget: null,
    climateAvoids: [],
    persona: '',
    finalistIds: [],
    leaningId: 'none',
    assumptionText: '',
    duelRound: 0,
    duelVotes: {},
    firstToVerifyId: '',
    addedDecisionTask: null,
    night: false
  };
}

export function resetDecisionState(input = {}, { keepAssumption = false } = {}) {
  return {
    ...input,
    finalistIds: [],
    leaningId: 'none',
    assumptionText: keepAssumption ? clean(input.assumptionText, 120) : '',
    duelRound: 0,
    duelVotes: {},
    firstToVerifyId: '',
    addedDecisionTask: null
  };
}

export function migrateExperienceState(saved, validCityIds = []) {
  const fresh = freshExperienceState();
  if (!saved || typeof saved !== 'object') return fresh;
  const validCities = new Set(validCityIds);
  const filterCities = (items, limit) => unique(items)
    .filter((id) => typeof id === 'string' && (!validCities.size || validCities.has(id)))
    .slice(0, limit);

  if (saved.version === 1) {
    const migrated = {
      ...fresh,
      stage: ['build', 'reality'].includes(saved.stage) ? saved.stage : 'shortlist',
      candidateMode: 'discover',
      careerLife: clamp(Number(saved.careerLife) || 50, 0, 100),
      socialEnergy: clamp(Number(saved.socialEnergy) || 50, 0, 100),
      industry: typeof saved.industry === 'string' ? saved.industry : null,
      industryConfirmed: !!saved.industryConfirmed,
      interests: unique(saved.interests).filter((id) => typeof id === 'string').slice(0, 3),
      rentBudget: Number.isFinite(Number(saved.rentBudget)) && Number(saved.rentBudget) >= 500
        ? clamp(Math.round(Number(saved.rentBudget)), 500, 12000) : null,
      climateAvoids: unique(saved.climateAvoids).filter((id) => typeof id === 'string'),
      persona: clean(saved.persona, 24),
      night: !!saved.night
    };
    return migrated;
  }

  if (saved.version !== 2) return fresh;
  const candidateMode = saved.candidateMode === 'discover' ? 'discover' : 'bring';
  const candidateCityIds = filterCities(saved.candidateCityIds, 4);
  const finalistIds = filterCities(saved.finalistIds, 2);
  const duelVotes = {};
  for (const id of ['career', 'daily', 'landing']) {
    if (['left', 'right', 'tie'].includes(saved.duelVotes?.[id])) duelVotes[id] = saved.duelVotes[id];
  }
  const allowedFinalists = finalistIds.filter((id) => candidateMode === 'discover' || candidateCityIds.includes(id));
  const firstToVerifyId = allowedFinalists.includes(saved.firstToVerifyId) ? saved.firstToVerifyId : '';
  let stage = EXPERIENCE_STAGES.includes(saved.stage) ? saved.stage : 'build';
  if (['duel', 'passport'].includes(stage) && allowedFinalists.length !== 2) stage = 'shortlist';
  if (stage === 'passport' && !firstToVerifyId) stage = 'duel';

  return {
    ...fresh,
    ...saved,
    version: 2,
    stage,
    candidateMode,
    candidateCityIds,
    careerLife: clamp(Number(saved.careerLife) || 50, 0, 100),
    socialEnergy: clamp(Number(saved.socialEnergy) || 50, 0, 100),
    industry: typeof saved.industry === 'string' ? saved.industry : null,
    industryConfirmed: !!saved.industryConfirmed,
    careerFocus: clean(saved.careerFocus, 40),
    interests: unique(saved.interests).filter((id) => typeof id === 'string').slice(0, 3),
    rentBudget: Number.isFinite(Number(saved.rentBudget)) && Number(saved.rentBudget) >= 500
      ? clamp(Math.round(Number(saved.rentBudget)), 500, 12000) : null,
    climateAvoids: unique(saved.climateAvoids).filter((id) => typeof id === 'string'),
    persona: clean(saved.persona, 24),
    finalistIds: allowedFinalists,
    leaningId: allowedFinalists.includes(saved.leaningId) ? saved.leaningId : 'none',
    assumptionText: clean(saved.assumptionText, 120),
    duelRound: clamp(Math.round(Number(saved.duelRound) || 0), 0, 3),
    duelVotes,
    firstToVerifyId,
    addedDecisionTask: saved.addedDecisionTask && typeof saved.addedDecisionTask === 'object'
      ? { dimension: clean(saved.addedDecisionTask.dimension, 16), task: clean(saved.addedDecisionTask.task, 180) }
      : null,
    night: !!saved.night
  };
}
