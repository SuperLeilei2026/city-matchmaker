import { JOY_CONFIG, normalizeProfile } from './profile.mjs';
import { readJoySignal, joyWeights } from './joy.mjs';

const array = (value) => Array.isArray(value) ? value : [];
const option = (id, label, description, patch) => ({ id, label, description, patch });

export function readyJoyQuestion() {
  return { id: 'ready', title: '这轮先比较到这里。', why: '已经确认的选择会保留，还有相近候选也可以一起看。', options: [option('continue', '看看现在的结论', '保留现有答案。', {})] };
}

/** Question value is candidate contrast, not predicted psychological information gain. */
export function joyQuestionPriorities(input, ranking = {}) {
  const profile = normalizeProfile(input), weights = joyWeights(profile);
  const candidates = array(ranking.ranked).slice(0, 3).map((item) => item.city).filter(Boolean);
  return JOY_CONFIG.dimensions.map((dimension, index) => {
    let contrast = 0;
    for (const selected of dimension.options) {
      const values = candidates.map((city) => readJoySignal(city, `${dimension.id}:${selected.id}`)).filter((item) => item.known).map((item) => item.value / 3);
      if (values.length >= 2) contrast = Math.max(contrast, Math.max(...values) - Math.min(...values));
    }
    return { dimension, contrast, priority: contrast * weights[dimension.id], weight: weights[dimension.id], index };
  }).sort((a, b) => b.priority - a.priority || b.weight - a.weight || a.index - b.index);
}

function dimensionQuestion(profile, entry, refine = false, feedback = null) {
  const dimension = entry.dimension, current = profile.joy[dimension.id];
  const motivation = feedback?.reasonId === 'heart' || feedback?.reasonId === 'like' ? '这份心动里，'
    : feedback?.reasonId === 'unbearable' || feedback?.reasonId === 'too-busy' ? '避开让你难受的部分，' : '再想想实际的一周，';
  const refineTitles = {
    novelty: '你更想怎样安排新鲜感？', recovery: '你最想怎样恢复精力？', relationships: '你更想拥有哪种相处方式？',
    career: '你现在最想从 AI 工作中得到什么？', uncertainty: '你能接受怎样的试住和变化？'
  };
  return { id: `joy-${refine ? 'refine-' : ''}${dimension.id}`, dimension: dimension.id,
    title: refine ? motivation + refineTitles[dimension.id] : dimension.question,
    why: refine ? `可以确认原选择，也可以改选。${entry.contrast > 0 ? '这几座候选在这一点有不同线索，答案可能改变先后。' : '先确认你真正需要什么；目前城市资料不足，答案不一定改变先后。'}` : dimension.why,
    options: dimension.options.map((item) => option(item.id, item.label,
      item.description + (refine && item.id === current ? '（你上一轮选的是这个）' : ''), { joy: { [dimension.id]: item.id } })),
    selectionBasis: { dimension: dimension.id, contrast: entry.contrast, weightedContrast: entry.priority,
      reason: feedback?.dimension === dimension.id ? 'feedback' : entry.contrast > 0 ? 'candidate-difference' : 'unanswered-preference' } };
}

function climateQuestion(profile) {
  if (profile.climateAvoids.length) return { id: 'joy-climate-limit', dimension: 'climate', title: '这份天气代价，你是想尽量避开，还是明确不能接受？', why: '只有明确说不能接受，才会使用气候排除条件；资料不够时仍标为待核验。', options: [
    option('soft', '可以权衡，但要看代价', '保留天气偏好，不自动排除。', { hardClimate: false }),
    option('hard', '明显而常见就不考虑', '仅有充分气候来源时执行排除。', { hardClimate: true }),
    option('clear', '天气目前不是关键', '撤掉避开项，再比较。', { climateAvoids: [], hardClimate: false })
  ] };
  return { id: 'joy-climate-kind', dimension: 'climate', title: '哪种天气最影响你日常的心情？', why: '先确认具体天气，不从人格猜气候偏好。', options: [
    option('heat', '持续炎热', '先记为偏好，可以继续权衡。', { climateAvoids: ['heat'], hardClimate: false }),
    option('cold', '寒冷的冬天', '先记为偏好，可以继续权衡。', { climateAvoids: ['cold'], hardClimate: false }),
    option('humidity', '潮湿的日子', '先记为偏好，可以继续权衡。', { climateAvoids: ['humidity'], hardClimate: false }),
    option('none', '目前没有特别怕的', '不额外加天气偏好。', { climateAvoids: [], hardClimate: false })
  ] };
}

export function getJoyQuestion(input = {}, ranking = {}, round = 1) {
  const profile = normalizeProfile(input);
  const confirmed = new Set(profile.confirmations.map((item) => typeof item === 'string' ? item : item?.id));
  const priorities = joyQuestionPriorities(profile, ranking);
  const feedback = Number(round) > 1 ? array(profile.feedback).at(-1) : null;
  const suggestedDimension = feedback?.dimension || ({ climate: 'climate', career: 'career', 'too-busy': 'recovery' })[feedback?.reasonId];
  if (suggestedDimension === 'climate') {
    const question = climateQuestion(profile);
    if (!confirmed.has(question.id)) return question;
  }
  if (suggestedDimension) {
    const entry = priorities.find((item) => item.dimension.id === suggestedDimension);
    if (entry) {
      const question = dimensionQuestion(profile, entry, !!profile.joy[suggestedDimension], feedback);
      if (!confirmed.has(question.id)) return question;
    }
  }
  for (const entry of priorities) {
    if (!profile.joy[entry.dimension.id]) {
      const question = dimensionQuestion(profile, entry);
      if (!confirmed.has(question.id)) return question;
    }
  }
  // A filled profile may still be revised once after reacting to a real candidate.
  if (Number(round) > 1) for (const entry of priorities) {
    const question = dimensionQuestion(profile, entry, true, feedback);
    if (!confirmed.has(question.id)) return question;
  }
  return readyJoyQuestion();
}
