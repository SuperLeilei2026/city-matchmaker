import { rankDepartureCities, summarizeDepartureProfile, DEPARTURE_OPTIONS, RENT_BENCHMARKS } from '/core/departure.mjs';
import { buildDuelRounds, analyzeAssumption, buildVerificationTasks, localDecisionQuestion, normalizeVote } from '/core/duel.mjs';
import { EXPERIENCE_STAGES, freshExperienceState, migrateExperienceState, resetDecisionState } from '/core/experience-state.mjs';

const STORAGE_KEY = 'graduation-first-stop-v1';
const STAGE_NAMES = { build: '搭城市', reality: '装现实', shortlist: '留两城', duel: '三幕 PK', passport: '通行证' };
const STATUS_COPY = {
  clear: { label: '无已知冲突', symbol: '✓' },
  conditional: { label: '条件冲突', symbol: '!' },
  unknown: { label: '红线待核', symbol: '?' }
};
const main = document.getElementById('main');
const dialog = document.getElementById('info-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogContent = document.getElementById('dialog-content');
const toastEl = document.getElementById('toast');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const money = (value) => new Intl.NumberFormat('zh-CN').format(value);

let state = freshExperienceState();
let cities = [];
let resizeObserver;
let toastTimer;
let pointer = null;
let paintFrame = 0;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Experience remains usable. */ }
}

function profile() {
  return {
    careerLife: state.careerLife,
    socialEnergy: state.socialEnergy,
    industry: state.industry || 'exploring',
    industryConfirmed: state.industryConfirmed,
    careerFocus: state.careerFocus,
    interests: state.interests,
    rentBudget: state.rentBudget,
    climateAvoids: state.climateAvoids,
    persona: state.persona
  };
}

function rankedResult() {
  const pool = state.candidateMode === 'bring'
    ? cities.filter((city) => state.candidateCityIds.includes(city.id))
    : cities;
  return rankDepartureCities(profile(), pool);
}

function candidatePool() {
  const result = rankedResult();
  return state.candidateMode === 'bring' ? result.ranked : result.ranked.slice(0, 3);
}

function finalists() {
  const byId = new Map(candidatePool().map((item) => [item.city.id, item]));
  return state.finalistIds.map((id) => byId.get(id)).filter(Boolean);
}

function duelData() {
  const [left, right] = finalists();
  return { left, right, rounds: left && right ? buildDuelRounds(left, right, profile()) : [] };
}

function invalidateDecision(nextStage = state.stage) {
  state = resetDecisionState(state);
  state.stage = nextStage;
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

function progress() {
  const active = EXPERIENCE_STAGES.indexOf(state.stage);
  return `<ol class="progress" aria-label="体验进度">${EXPERIENCE_STAGES.map((stage, index) => `<li class="${index <= active ? 'is-done' : ''} ${index === active ? 'is-current' : ''}">
    <span>0${index + 1}</span><b>${STAGE_NAMES[stage]}</b></li>`).join('')}</ol>`;
}

function axisCopy() {
  const summary = summarizeDepartureProfile(profile());
  const headline = state.careerLife < 34
    ? (state.socialEnergy > 65 ? '想往前冲，也想在人群里。' : '先让事业站稳，再慢慢安顿。')
    : state.careerLife > 66
      ? (state.socialEnergy < 35 ? '把日子过慢一点，也过稳一点。' : '认真下班，好好生活。')
      : (state.socialEnergy < 35 ? '努力生活，也给自己留白。' : '工作和下班，都想认真对待。');
  return { ...summary, headline };
}

function modeReady() {
  return state.candidateMode === 'discover' || state.candidateCityIds.length >= 2;
}

function buildPage() {
  const copy = axisCopy();
  const cityButtons = cities.map((city) => {
    const selected = state.candidateCityIds.includes(city.id);
    return `<button class="city-token ${selected ? 'is-selected' : ''}" data-action="candidate-city" data-value="${escape(city.id)}" aria-pressed="${selected}">
      <span class="token-signal"></span><b>${escape(city.name)}</b><small>${escape(city.english)}</small>
    </button>`;
  }).join('');
  const selection = state.candidateCityIds.map((id, index) => {
    const city = cities.find((item) => item.id === id);
    return city ? `<span><i>0${index + 1}</i>${escape(city.name)}</span>` : '';
  }).join('');
  return `<section class="experience build-page" data-page="build">
    ${progress()}
    <header class="page-heading hero-heading">
      <div><span class="eyebrow">GRADUATION CITY LAB / 01</span><h1 tabindex="-1">不是猜命运。<br><em>是把纠结摆上站台。</em></h1></div>
      <p>先选一种进入方式。你可以带着现实候选来，也可以先搭出想过的日子，让系统给你三个起点。</p>
    </header>
    <div class="entry-switch" role="tablist" aria-label="选择进入方式">
      <button role="tab" aria-selected="${state.candidateMode === 'bring'}" class="entry-card cyan ${state.candidateMode === 'bring' ? 'is-selected' : ''}" data-action="entry-mode" data-value="bring">
        <small>ROUTE A · 推荐</small><b>我已经在纠结几座城</b><span>带 2–4 座候选来，直接进入筛选。</span>
      </button>
      <button role="tab" aria-selected="${state.candidateMode === 'discover'}" class="entry-card magenta ${state.candidateMode === 'discover' ? 'is-selected' : ''}" data-action="entry-mode" data-value="discover">
        <small>ROUTE B</small><b>我还没有方向</b><span>先调发展与日常，再生成前三站。</span>
      </button>
    </div>
    ${state.candidateMode === 'bring' ? `
      <div class="candidate-console">
        <div class="console-head"><div><span class="eyebrow">INPUT YOUR CITIES</span><h2>把你真的会去的城市接上线</h2></div>
          <p>全国海选很容易制造伪精确。这里先尊重你已有的选择集。</p></div>
        <div class="city-token-grid">${cityButtons}</div>
        <div class="selection-track"><b>候选线路</b><div>${selection || '<em>还没有城市接入线路</em>'}</div><small>${state.candidateCityIds.length}/4 · 至少选择 2 座</small></div>
      </div>
    ` : `
      <div class="builder-grid">
        <div class="world-frame tuner" data-tuner aria-label="生活偏好调节区">
          <canvas data-city-canvas="builder" role="img" aria-label="根据生活偏好变化的未来城市"></canvas>
          <span class="axis axis-left">发展优先</span><span class="axis axis-right">生活优先</span>
          <span class="axis axis-top">安静一点</span><span class="axis axis-bottom">热闹一点</span>
          <button class="preference-puck" data-puck aria-label="${escape(copy.short)}；可拖动或用方向键调整"><i></i><span>拖我</span></button>
          <div class="world-stamp"><small>你搭出的日子</small><b data-live-headline>${escape(copy.headline)}</b></div>
        </div>
        <aside class="builder-note"><span class="micro-label">先调生活，不贴人格标签</span>
          <h2 data-live-summary>${escape(copy.short)}</h2>
          <p>横向调发展与生活的相对权重；纵向只在有资料时比较活动供给，不把“资料少”说成“城市安静”。</p>
          <div class="mini-scales"><div><span>发展</span><i><b style="width:${100 - state.careerLife}%"></b></i><span>生活</span></div>
            <div><span>安静</span><i><b style="width:${state.socialEnergy}%"></b></i><span>热闹</span></div></div>
        </aside>
      </div>
    `}
    <div class="stage-actions"><span>下一步会加入行业、兴趣、预算与气候红线。</span>
      <button class="primary-action" data-action="to-reality" ${modeReady() ? '' : 'disabled'}>进入现实装配 <b>→</b></button></div>
  </section>`;
}

function optionButton(item, kind, selected, extra = '') {
  return `<button class="choice-chip ${selected ? 'is-selected' : ''}" data-action="${kind}" data-value="${item.id}" aria-pressed="${selected}">
    ${extra}<span>${escape(item.label)}</span></button>`;
}

function constraintChip(item) {
  const status = STATUS_COPY[item.constraints.status] || STATUS_COPY.unknown;
  return `<span class="constraint-chip is-${item.constraints.status}"><i>${status.symbol}</i>${status.label}</span>`;
}

function reasonLine(item) {
  const reason = item.reasons[0];
  if (!reason) return '现有资料还不足以解释它的位置，先把它当成待验证候选。';
  return `${reason.label}：${reason.detail}`;
}

function boardRows(result) {
  const rows = state.candidateMode === 'bring' ? result.ranked : result.ranked.slice(0, 3);
  return rows.map((item, index) => `<article class="board-row">
    <span class="board-rank">0${index + 1}</span>
    <div class="board-city"><b>${escape(item.city.name)}</b><small>${escape(reasonLine(item))}</small></div>
    <div class="board-meta">${constraintChip(item)}<small>资料覆盖 ${Math.round(item.coverage * 100)}%</small></div>
  </article>`).join('');
}

function missingPrompt() {
  const missing = [];
  if (!state.industryConfirmed) missing.push('行业');
  if (!state.interests.length) missing.push('至少一个兴趣');
  if (!state.rentBudget) missing.push('月租上限');
  if (!modeReady()) missing.push('至少两座候选城市');
  return missing.length ? `还差：${missing.join('、')}` : '条件已装好，可以留下两城';
}

function realityPage() {
  const result = rankedResult();
  const ready = result.ready && modeReady() && candidatePool().length >= 2;
  const copy = axisCopy();
  return `<section class="experience reality-page" data-page="reality">
    ${progress()}
    <header class="page-heading compact"><div><span class="eyebrow">PACK THE REALITY / 02</span><h1 tabindex="-1">给想象装上，<br><em>现实的重量。</em></h1></div>
      <p>预算与气候是门槛，不再拿来制造“高分”。资料未知会明确标出，不算通过。</p></header>
    <div class="reality-layout">
      <div class="reality-form">
        <section class="choice-section"><div class="choice-title"><span>01</span><div><h2>第一份工作，从哪类行业出发？</h2><p>宽泛行业只生成候选；具体方向会进入核验任务。</p></div></div>
          <div class="choice-grid industries">${DEPARTURE_OPTIONS.industries.map((item) => optionButton(item, 'industry', state.industry === item.id, `<i>${escape(item.short.slice(0, 1))}</i>`)).join('')}</div>
          <label class="text-field"><span>具体到你真的会投的方向 <em>建议填写</em></span>
            <input data-field="careerFocus" maxlength="40" value="${escape(state.careerFocus)}" placeholder="如：具身智能机器人产品 / AI 应用算法"></label>
        </section>
        <section class="choice-section"><div class="choice-title"><span>02</span><div><h2>什么日常值得每周重复？</h2><p>最多选 3 个；“资料少”会转成任务，不会暗中扣分。</p></div></div>
          <div class="choice-grid interests">${DEPARTURE_OPTIONS.interests.map((item) => optionButton(item, 'interest', state.interests.includes(item.id), `<i>${item.emoji}</i>${item.supported ? '' : '<u>待核</u>'}`)).join('')}</div>
        </section>
        <section class="choice-section"><div class="choice-title"><span>03</span><div><h2>每月房租上限是多少？</h2><p>只与 2026 年 1 月同口径城市级套租基准比较，具体房源与通勤另查。</p></div></div>
          <div class="budget-picks">${[2000, 4000, 6000, 8000].map((value) => `<button class="budget-ticket ${state.rentBudget === value ? 'is-selected' : ''}" data-action="budget" data-value="${value}" aria-pressed="${state.rentBudget === value}"><small>月租上限</small><b>¥${money(value)}</b></button>`).join('')}
            <label class="custom-budget"><span>自定义</span><span>¥ <input type="number" min="500" max="12000" step="100" inputmode="numeric" data-field="rentBudget" value="${state.rentBudget && ![2000, 4000, 6000, 8000].includes(state.rentBudget) ? state.rentBudget : ''}" placeholder="如 3500"></span></label></div>
        </section>
        <section class="choice-section redline-section"><div class="choice-title"><span>04</span><div><h2>身体或生活不能接受的气候</h2><p>这是红线。未知不会被当作安全，已知冲突也不会被平均分掩盖。</p></div></div>
          <div class="climate-picks">${DEPARTURE_OPTIONS.climates.map((item) => optionButton(item, 'climate', state.climateAvoids.includes(item.id))).join('')}</div>
        </section>
        <label class="persona-field"><span>票角签名 · 选填</span><b>MBTI / 星座只改变分享文案，不参与候选顺序</b><input data-field="persona" maxlength="24" value="${escape(state.persona)}" placeholder="如 ENFP / 天秤座"></label>
      </div>
      <aside class="departure-board" aria-live="polite">
        <div class="board-head"><span>LIVE CANDIDATES</span><b>候选控制台</b><small>${state.candidateMode === 'bring' ? '你的现实候选' : '系统生成前三站'}</small></div>
        <div class="profile-strip"><span>${escape(copy.full)}</span><span>¥${state.rentBudget ? money(state.rentBudget) : '—'}</span></div>
        <div class="board-list">${boardRows(result) || '<p class="empty-board">先回上一步接入至少两座城市。</p>'}</div>
        <p class="board-status ${ready ? 'is-ready' : ''}"><i></i>${escape(missingPrompt())}</p>
        <button class="primary-action signal" data-action="to-shortlist" ${ready ? '' : 'disabled'}>进入两城筛选 <b>→</b></button>
        <small class="board-caveat">候选顺序是内部线索排序。它不预测幸福、offer、薪资或 WLB。</small>
      </aside>
    </div>
    <button class="under-button" data-action="to-build">← 修改候选入口</button>
  </section>`;
}

function shortlistPage() {
  const pool = candidatePool();
  const canStart = state.finalistIds.length === 2 && state.assumptionText.trim().length >= 2;
  const cards = pool.map((item, index) => {
    const picked = state.finalistIds.includes(item.city.id);
    return `<article class="shortlist-card ${picked ? 'is-picked' : ''}">
      <div class="card-line"><span>候选 0${index + 1}</span>${constraintChip(item)}</div>
      <canvas data-city-canvas="${item.city.id}" data-tone="${picked && state.finalistIds.indexOf(item.city.id) === 1 ? 'magenta' : 'cyan'}" role="img" aria-label="${escape(item.city.name)}赛博车站"></canvas>
      <div class="shortlist-copy"><h2>${escape(item.city.name)}</h2><small>${escape(item.city.english)}</small>
        <p>${escape(reasonLine(item))}</p>
        <div class="coverage"><i style="width:${Math.round(item.coverage * 100)}%"></i></div><span>资料覆盖 ${Math.round(item.coverage * 100)}%</span></div>
      <button data-action="toggle-finalist" data-value="${item.city.id}" aria-pressed="${picked}">${picked ? '已接入决赛轨道 ✓' : '留在双城轨道'}</button>
    </article>`;
  }).join('');
  const picked = state.finalistIds.map((id, index) => {
    const city = cities.find((item) => item.id === id);
    return city ? `<span class="finalist-slot side-${index}"><i>${index === 0 ? 'L' : 'R'}</i><b>${escape(city.name)}</b></span>` : '';
  }).join('');
  const [left, right] = finalists();
  return `<section class="experience shortlist-page" data-page="shortlist">
    ${progress()}
    <header class="page-heading compact"><div><span class="eyebrow">SELECT THE FINAL TWO / 03</span><h1 tabindex="-1">系统只负责入围。<br><em>最后两城，由你留下。</em></h1></div>
      <p>这里不展示总分。先看入围理由、红线和资料覆盖，再亲手把两种生活接上左右轨道。</p></header>
    <div class="finalist-dock"><div><small>DUEL LINE</small><b>决赛轨道</b></div><div class="dock-slots">${picked || '<span class="empty-slot">等待两座城市接入</span>'}</div><span>${state.finalistIds.length}/2</span></div>
    <div class="shortlist-grid">${cards}</div>
    ${state.finalistIds.length === 2 ? `<section class="assumption-gate">
      <div class="gate-copy"><span class="eyebrow">BEFORE THE DUEL</span><h2>对局前，封存你现在的判断</h2>
        <p>它不会影响初始排序。三幕结束后，我们再看这句话有多少证据、反例和未知。</p></div>
      <div class="leaning-picks"><span>此刻更倾向</span>
        <button data-action="lean" data-value="${left.city.id}" aria-pressed="${state.leaningId === left.city.id}">${escape(left.city.name)}</button>
        <button data-action="lean" data-value="none" aria-pressed="${state.leaningId === 'none'}">还没有</button>
        <button data-action="lean" data-value="${right.city.id}" aria-pressed="${state.leaningId === right.city.id}">${escape(right.city.name)}</button>
      </div>
      <label class="assumption-field"><span>为什么？写下你现在相信的一句话</span>
        <textarea data-field="assumptionText" maxlength="120" placeholder="如：我更倾向深圳，因为我觉得那里成本低、机会多。">${escape(state.assumptionText)}</textarea>
        <small>${state.assumptionText.length}/120 · 这是一条待验证假设，不进入分数。</small></label>
      <button class="primary-action" data-action="start-duel" ${canStart ? '' : 'disabled'}>开启三幕对局 <b>⚡</b></button>
    </section>` : ''}
    <div class="stage-actions"><button class="under-button" data-action="to-reality">← 修改现实条件</button><span>选择变化后，旧对局会被清空。</span></div>
  </section>`;
}

function evidencePane(side, evidence) {
  const known = evidence.status === 'known';
  const constraint = evidence.constraintStatus ? STATUS_COPY[evidence.constraintStatus] : null;
  return `<article class="duel-city side-${side}">
    <div class="duel-city-head"><span>${side === 0 ? 'CYAN PLATFORM / LEFT' : 'MAGENTA PLATFORM / RIGHT'}</span><h2>${escape(evidence.cityName)}</h2>
      <b class="evidence-state is-${known ? 'known' : 'unknown'}">${constraint ? constraint.label : known ? '有线索' : '资料未知'}</b></div>
    <div class="scene-window"><canvas data-city-canvas="${evidence.cityId}" data-tone="${side === 0 ? 'cyan' : 'magenta'}"></canvas>
      <p>${escape(evidence.scene)}</p></div>
    <div class="evidence-stack"><span>可核验信息</span><p>${escape(evidence.detail)}</p>
      ${evidence.caveat ? `<aside><b>编辑判断 / 边界</b>${escape(evidence.caveat)}</aside>` : ''}</div>
  </article>`;
}

function voteLabel(round, value, left, right) {
  if (value === 'left') return left.city.name;
  if (value === 'right') return right.city.name;
  if (value === 'tie') return '还看不出来';
  return '未选择';
}

function duelPage() {
  const { left, right, rounds } = duelData();
  if (!left || !right || rounds.length !== 3) {
    state.stage = 'shortlist';
    return shortlistPage();
  }
  if (state.duelRound < 3) {
    const round = rounds[state.duelRound];
    const vote = state.duelVotes[round.id];
    return `<section class="experience duel-page" data-page="duel">
      ${progress()}
      <div class="duel-status"><span>ACT ${String(state.duelRound + 1).padStart(2, '0')} / 03</span>
        <div>${rounds.map((item, index) => `<i class="${index < state.duelRound ? 'is-done' : index === state.duelRound ? 'is-current' : ''}">${index + 1}</i>`).join('')}</div>
        <b>${escape(round.title)}</b></div>
      <header class="duel-heading"><span class="eyebrow">${escape(round.eyebrow)}</span><h1 tabindex="-1">${escape(round.prompt)}</h1><p>比较维度：${escape(round.label)} · ${round.comparisonStatus === 'comparable' ? '两侧均有线索' : round.comparisonStatus === 'partial' ? '只有一侧有线索' : '两侧都待核'}</p></header>
      <div class="duel-arena">${evidencePane(0, round.left)}<div class="versus"><span>VS</span><i></i></div>${evidencePane(1, round.right)}</div>
      <div class="unknown-banner"><b>仍然未知</b><p>${escape(round.unknown)}</p></div>
      <div class="vote-console"><span>这一幕，更想先试哪边？</span><div>
        <button class="vote-left" data-action="vote" data-value="left" aria-pressed="${vote === 'left'}">← ${escape(left.city.name)}</button>
        <button class="vote-tie" data-action="vote" data-value="tie" aria-pressed="${vote === 'tie'}">还看不出来</button>
        <button class="vote-right" data-action="vote" data-value="right" aria-pressed="${vote === 'right'}">${escape(right.city.name)} →</button>
      </div></div>
      <div class="stage-actions"><button class="under-button" data-action="duel-back">← ${state.duelRound ? '上一幕' : '重选两城'}</button>
        <small>三幕选择只记录你的轨迹，不会自动产生赢家。</small></div>
    </section>`;
  }

  const analysis = analyzeAssumption(state.assumptionText, left, right, profile());
  const question = localDecisionQuestion(rounds, state.duelVotes, left, right, profile());
  return `<section class="experience duel-page verdict-page" data-page="duel">
    ${progress()}
    <header class="page-heading compact"><div><span class="eyebrow">DECISION CHECKPOINT / 04</span><h1 tabindex="-1">三幕结束。<br><em>现在不宣布赢家。</em></h1></div>
      <p>先看你原本相信的判断，经得起多少证据。然后由你明确选择“先验证哪座”。</p></header>
    <div class="audit-grid">
      <article class="assumption-audit"><span class="eyebrow">YOUR ORIGINAL BELIEF</span><blockquote>“${escape(analysis.claim)}”</blockquote>
        <div class="finding-list">${analysis.findings.map((item) => `<div class="finding is-${item.kind}"><b>${escape(item.label)}</b><p>${escape(item.text)}</p></div>`).join('')}</div></article>
      <article class="trajectory"><span class="eyebrow">THREE ACT TRACE</span><h2>你刚才怎么选</h2>
        ${rounds.map((round, index) => `<div><span>0${index + 1} · ${escape(round.title)}</span><b>${escape(voteLabel(round, state.duelVotes[round.id], left, right))}</b></div>`).join('')}
        <small>这里没有多数票获胜规则。平局也可能是最有价值的结果。</small></article>
    </div>
    <section class="agent-question"><div class="agent-mark">?</div><div><span>决胜提问官 · 本地规则回退</span><h2>${escape(question.question)}</h2><p>建议核验：${escape(question.task)}</p></div>
      <button data-action="add-task" aria-pressed="${!!state.addedDecisionTask}">${state.addedDecisionTask ? '已加入清单 ✓' : '加入核验清单'}</button></section>
    <section class="choose-first"><span class="eyebrow">YOU MAKE THE CALL</span><h2>哪座城，值得你先花现实成本验证？</h2>
      <div><button class="choose-city side-0" data-action="choose-first" data-value="${left.city.id}"><small>先验证</small><b>${escape(left.city.name)}</b><span>${constraintChip(left)}</span></button>
        <button class="choose-city side-1" data-action="choose-first" data-value="${right.city.id}"><small>先验证</small><b>${escape(right.city.name)}</b><span>${constraintChip(right)}</span></button></div></section>
    <div class="stage-actions"><button class="under-button" data-action="duel-back">← 回到第三幕</button><small>这个动作只确定验证顺序，不是永久定居结论。</small></div>
  </section>`;
}

function passportPage() {
  const { left, right, rounds } = duelData();
  if (!left || !right || !state.firstToVerifyId) {
    state.stage = 'duel';
    return duelPage();
  }
  const first = state.firstToVerifyId === left.city.id ? left : right;
  const backup = first === left ? right : left;
  const analysis = analyzeAssumption(state.assumptionText, left, right, profile());
  const question = localDecisionQuestion(rounds, state.duelVotes, left, right, profile());
  const tasks = buildVerificationTasks(rounds, profile());
  if (state.addedDecisionTask?.task && !tasks.includes(state.addedDecisionTask.task)) tasks.push(state.addedDecisionTask.task);
  const switchRule = `如果${backup.city.name}在“${question.dimension === 'career' ? '真实岗位' : question.dimension === 'daily' ? '可重复日常' : '住房与通勤'}”上给出更强真实证据，或${first.city.name}触发我的硬红线，我会改选。`;
  return `<section class="experience passport-page" data-page="passport">
    ${progress()}
    <header class="page-heading compact"><div><span class="eyebrow">DUAL-CITY PASSPORT / 05</span><h1 tabindex="-1">带走的不是答案。<br><em>是一条会改变决定的线索。</em></h1></div>
      <p>先验证城市和备选城市都保留。接下来用真实岗位、房源和日常，把未知逐项换成证据。</p></header>
    <article class="dual-passport" data-passport-card>
      <div class="passport-top"><span>毕业第一站 · 双城通行证</span><b>VALID FOR ONE REALITY CHECK</b><small>v0.6 / ${new Date().toLocaleDateString('zh-CN')}</small></div>
      <div class="passport-cities">
        <section class="passport-city side-${first === left ? 0 : 1}"><small>FIRST TO VERIFY</small><h2>${escape(first.city.name)}</h2><span>${escape(first.city.english)}</span>
          <canvas data-city-canvas="${first.city.id}" data-tone="${first === left ? 'cyan' : 'magenta'}"></canvas><div>${constraintChip(first)}<b>先验证</b></div></section>
        <div class="passport-switch"><span>⇄</span><small>可改签</small></div>
        <section class="passport-city side-${backup === left ? 0 : 1}"><small>BACKUP CITY</small><h2>${escape(backup.city.name)}</h2><span>${escape(backup.city.english)}</span>
          <canvas data-city-canvas="${backup.city.id}" data-tone="${backup === left ? 'cyan' : 'magenta'}"></canvas><div>${constraintChip(backup)}<b>备选</b></div></section>
      </div>
      <div class="passport-body">
        <section><span class="passport-label">原本相信</span><blockquote>“${escape(state.assumptionText)}”</blockquote>
          ${analysis.findings.map((item) => `<p class="passport-finding"><b>${escape(item.label)}</b> ${escape(item.text)}</p>`).join('')}</section>
        <section><span class="passport-label">三幕轨迹</span>${rounds.map((round, index) => `<div class="passport-vote"><i>0${index + 1}</i><span>${escape(round.title)}</span><b>${escape(voteLabel(round, state.duelVotes[round.id], left, right))}</b></div>`).join('')}</section>
      </div>
      <div class="mission-list"><span class="passport-label">REALITY MISSIONS / 三项现实核验</span>
        <ol>${tasks.map((task) => `<li>${escape(task)}</li>`).join('')}</ol></div>
      <div class="switch-rule"><span>什么新信息会让我改选</span><p>${escape(switchRule)}</p></div>
      <footer><span>${state.persona ? `票角签名：${escape(state.persona)} · ` : ''}这是一张验证顺序，不是幸福预测。</span><b>FIRST STOP AFTER GRADUATION</b></footer>
    </article>
    <div class="passport-actions"><button class="primary-action" data-action="download-passport">下载双城通行证 <b>↓</b></button>
      <button class="under-button" data-action="revisit-duel">重做对局</button><button class="under-button" data-action="to-reality">修改现实条件</button></div>
  </section>`;
}

function render(focusHeading = false) {
  const result = rankedResult();
  if (['shortlist', 'duel', 'passport'].includes(state.stage) && (!result.ready || candidatePool().length < 2)) state.stage = 'reality';
  const pages = { build: buildPage, reality: realityPage, shortlist: shortlistPage, duel: duelPage, passport: passportPage };
  main.innerHTML = (pages[state.stage] || buildPage)();
  document.body.dataset.stage = state.stage;
  updatePuck();
  observeCanvases();
  paintAll();
  save();
  if (focusHeading) requestAnimationFrame(() => main.querySelector('h1')?.focus({ preventScroll: false }));
}

function cityById(id) {
  return cities.find((city) => city.id === id) || { id: 'unknown', name: '待定', english: 'UNKNOWN' };
}

function hash(value) {
  return [...String(value)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17);
}

function paintCity(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / 640, 0, 0, canvas.height / 360, 0, 0);
  const id = canvas.dataset.cityCanvas;
  const tone = canvas.dataset.tone || 'cyan';
  const neon = tone === 'magenta' ? '#ff4fd8' : '#37e7ff';
  const secondary = tone === 'magenta' ? '#37e7ff' : '#ff4fd8';
  const seed = hash(id);
  const gradient = ctx.createLinearGradient(0, 0, 0, 360);
  gradient.addColorStop(0, '#070b1b');
  gradient.addColorStop(1, '#111b35');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = 'rgba(55,231,255,.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 640; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke(); }
  for (let y = 0; y <= 360; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(2,5,14,.82)';
  ctx.fillRect(0, 268, 640, 92);
  const count = id === 'builder' ? 10 : 8;
  for (let i = 0; i < count; i++) {
    const width = 38 + ((seed + i * 19) % 48);
    const x = 10 + i * 68 + ((seed >> (i % 8)) % 17);
    const baseHeight = 65 + ((seed + i * 47) % 125);
    const axisBoost = id === 'builder' ? Math.round((100 - state.careerLife) * .65) : 0;
    const height = Math.min(220, baseHeight + axisBoost);
    ctx.fillStyle = i % 3 === 0 ? '#162342' : '#0e1830';
    ctx.fillRect(x, 268 - height, width, height);
    ctx.strokeStyle = i % 2 ? neon : secondary;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 268 - height, width, height);
    ctx.fillStyle = i % 2 ? neon : '#ffd84a';
    const lit = 2 + ((seed + i) % 4);
    for (let row = 0; row < lit; row++) {
      ctx.globalAlpha = .42 + row * .08;
      ctx.fillRect(x + 9, 252 - height + row * 24, 7, 9);
      if (width > 55) ctx.fillRect(x + 27, 252 - height + row * 24, 7, 9);
    }
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 16;
  ctx.shadowColor = neon;
  ctx.strokeStyle = neon;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 298); ctx.lineTo(640, 298); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 322); ctx.lineTo(640, 322); ctx.stroke();
  for (let x = 0; x < 640; x += 34) {
    ctx.fillStyle = '#263a61';
    ctx.fillRect(x, 294, 21, 33);
  }
  if (id !== 'builder') {
    const city = cityById(id);
    ctx.fillStyle = 'rgba(5,8,22,.76)';
    ctx.fillRect(24, 22, 230, 66);
    ctx.strokeStyle = neon; ctx.strokeRect(24, 22, 230, 66);
    ctx.fillStyle = neon; ctx.font = '700 25px system-ui'; ctx.fillText(city.name, 43, 55);
    ctx.fillStyle = '#9fb3d6'; ctx.font = '500 11px system-ui'; ctx.fillText(city.english, 43, 74);
  }
}

function paintAll() {
  document.querySelectorAll('[data-city-canvas]').forEach(paintCity);
}

function observeCanvases() {
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(paintFrame);
    paintFrame = requestAnimationFrame(paintAll);
  });
  document.querySelectorAll('[data-city-canvas]').forEach((canvas) => resizeObserver.observe(canvas));
}

function updatePuck() {
  const tuner = main.querySelector('[data-tuner]');
  const puck = main.querySelector('[data-puck]');
  if (!tuner || !puck) return;
  const pad = Math.min(54, tuner.clientWidth * .1);
  puck.style.left = `${pad + state.careerLife / 100 * Math.max(1, tuner.clientWidth - pad * 2)}px`;
  puck.style.top = `${pad + state.socialEnergy / 100 * Math.max(1, tuner.clientHeight - pad * 2)}px`;
  const copy = axisCopy();
  puck.setAttribute('aria-label', `${copy.short}；可拖动或用方向键调整`);
  main.querySelector('[data-live-headline]')?.replaceChildren(document.createTextNode(copy.headline));
  main.querySelector('[data-live-summary]')?.replaceChildren(document.createTextNode(copy.short));
  const bars = main.querySelectorAll('.mini-scales b');
  if (bars[0]) bars[0].style.width = `${100 - state.careerLife}%`;
  if (bars[1]) bars[1].style.width = `${state.socialEnergy}%`;
}

function tuneFromPointer(event) {
  const tuner = main.querySelector('[data-tuner]');
  if (!tuner) return;
  const rect = tuner.getBoundingClientRect();
  const pad = Math.min(54, tuner.clientWidth * .1);
  state.careerLife = Math.round(clamp((event.clientX - rect.left - pad) / Math.max(1, tuner.clientWidth - pad * 2), 0, 1) * 100);
  state.socialEnergy = Math.round(clamp((event.clientY - rect.top - pad) / Math.max(1, tuner.clientHeight - pad * 2), 0, 1) * 100);
  invalidateDecision('build');
  updatePuck();
  cancelAnimationFrame(paintFrame);
  paintFrame = requestAnimationFrame(paintAll);
  save();
}

function changeStage(stage, focus = true) {
  state.stage = stage;
  render(focus);
}

function toggleChoice(list, value, limit = Infinity) {
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else if (list.length < limit) list.push(value);
  else { toast(`最多选 ${limit} 个，先去掉一个再换。`); return false; }
  return true;
}

function updateReality(mutator) {
  mutator();
  invalidateDecision('reality');
  render();
}

main.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const value = button.dataset.value;
  if (action === 'entry-mode') {
    state.candidateMode = value === 'discover' ? 'discover' : 'bring';
    invalidateDecision('build');
    render();
  } else if (action === 'candidate-city') {
    if (toggleChoice(state.candidateCityIds, value, 4)) { invalidateDecision('build'); render(); }
  } else if (action === 'to-reality') {
    if (!modeReady()) { toast('先选择 2–4 座现实候选。'); return; }
    invalidateDecision('reality'); render(true);
  } else if (action === 'to-build') {
    changeStage('build');
  } else if (action === 'industry') {
    updateReality(() => { state.industry = value; state.industryConfirmed = true; });
  } else if (action === 'interest') {
    const copy = [...state.interests];
    if (toggleChoice(copy, value, 3)) updateReality(() => { state.interests = copy; });
  } else if (action === 'budget') {
    updateReality(() => { state.rentBudget = Number(value); });
  } else if (action === 'climate') {
    const copy = [...state.climateAvoids];
    if (toggleChoice(copy, value)) updateReality(() => { state.climateAvoids = copy; });
  } else if (action === 'to-shortlist') {
    if (rankedResult().ready && candidatePool().length >= 2) changeStage('shortlist');
  } else if (action === 'toggle-finalist') {
    const previous = [...state.finalistIds];
    if (toggleChoice(previous, value, 2)) {
      state.finalistIds = previous;
      state.leaningId = 'none'; state.assumptionText = ''; state.duelRound = 0;
      state.duelVotes = {}; state.firstToVerifyId = ''; state.addedDecisionTask = null;
      render();
    }
  } else if (action === 'lean') {
    state.leaningId = state.finalistIds.includes(value) ? value : 'none';
    render();
  } else if (action === 'start-duel') {
    if (state.finalistIds.length !== 2 || state.assumptionText.trim().length < 2) {
      toast('先留下两座城市，并写下你现在相信的一句话。'); return;
    }
    state.duelRound = 0; state.duelVotes = {}; state.firstToVerifyId = ''; state.addedDecisionTask = null;
    changeStage('duel');
  } else if (action === 'vote') {
    const { rounds } = duelData();
    const round = rounds[state.duelRound];
    const vote = normalizeVote(value);
    if (!round || !vote) return;
    state.duelVotes[round.id] = vote;
    state.duelRound = Math.min(3, state.duelRound + 1);
    render(true);
  } else if (action === 'duel-back') {
    if (state.duelRound > 0) { state.duelRound -= 1; render(true); }
    else changeStage('shortlist');
  } else if (action === 'add-task') {
    const { left, right, rounds } = duelData();
    const question = localDecisionQuestion(rounds, state.duelVotes, left, right, profile());
    state.addedDecisionTask = state.addedDecisionTask ? null : { dimension: question.dimension, task: question.task };
    render();
  } else if (action === 'choose-first') {
    if (!state.finalistIds.includes(value)) return;
    state.firstToVerifyId = value;
    changeStage('passport');
  } else if (action === 'revisit-duel') {
    state.duelRound = 0; state.duelVotes = {}; state.firstToVerifyId = ''; state.addedDecisionTask = null;
    changeStage('duel');
  } else if (action === 'download-passport') {
    downloadPassport();
  }
});

main.addEventListener('change', (event) => {
  if (event.target.matches('[data-field="rentBudget"]')) {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value >= 500) updateReality(() => {
      state.rentBudget = clamp(Math.round(value), 500, 12000);
    });
    else { toast('请输入 500–12000 元之间的月租上限。'); event.target.focus(); }
  }
});

main.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  if (field === 'persona') {
    state.persona = event.target.value.trim().slice(0, 24);
    save();
  } else if (field === 'careerFocus') {
    state.careerFocus = event.target.value.trim().slice(0, 40);
    state = resetDecisionState(state);
    state.stage = 'reality';
    save();
  } else if (field === 'assumptionText') {
    state.assumptionText = event.target.value.slice(0, 120);
    event.target.parentElement.querySelector('small').textContent = `${state.assumptionText.length}/120 · 这是一条待验证假设，不进入分数。`;
    const startButton = main.querySelector('[data-action="start-duel"]');
    if (startButton) startButton.disabled = state.assumptionText.trim().length < 2;
    save();
  }
});

main.addEventListener('keydown', (event) => {
  const puck = event.target.closest('[data-puck]');
  if (!puck) return;
  const delta = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[event.key];
  if (!delta) return;
  event.preventDefault();
  state.careerLife = clamp(state.careerLife + delta[0], 0, 100);
  state.socialEnergy = clamp(state.socialEnergy + delta[1], 0, 100);
  invalidateDecision('build');
  updatePuck(); paintAll(); save();
});

main.addEventListener('pointerdown', (event) => {
  const tuner = event.target.closest('[data-tuner]');
  if (!tuner || (event.pointerType === 'mouse' && event.button !== 0)) return;
  pointer = { id: event.pointerId };
  tuner.setPointerCapture(event.pointerId);
  tuneFromPointer(event);
});
main.addEventListener('pointermove', (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  event.preventDefault();
  tuneFromPointer(event);
});
main.addEventListener('pointerup', (event) => { if (pointer?.id === event.pointerId) pointer = null; });
main.addEventListener('pointercancel', () => { pointer = null; });

function openDialog(type) {
  if (type === 'method') {
    dialogTitle.textContent = '决策怎么来的';
    dialogContent.innerHTML = `<div class="method-steps">
      <div><b>1 · 你定义选择集</b><p>已有候选就直接带来；没有方向才使用内部排序生成前三站。</p></div>
      <div><b>2 · 红线先于偏好</b><p>预算与气候显示为无已知冲突、条件冲突或未知，不参与相合分制造优势。</p></div>
      <div><b>3 · 你亲手留下两城</b><p>系统不自动拿总分替你决定。三幕只并排呈现生活草稿、事实、判断和未知。</p></div>
      <div><b>4 · 最后生成核验顺序</b><p>决胜提问官只找最可能改变决定的问题，不替你选城。</p></div>
    </div>`;
  } else if (type === 'data') {
    dialogTitle.textContent = '资料与口径';
    dialogContent.innerHTML = `<p>行业、自然、演出与气候使用城市公开资料和明确标注的编辑分档。阅读、游泳、健身、WLB、具体薪资和录取机会仍保持未知。</p>
      <div class="source-box"><b>${escape(RENT_BENCHMARKS.source.title)}</b><small>观测期 ${escape(RENT_BENCHMARKS.source.observed)} · 核对 ${escape(RENT_BENCHMARKS.source.checked)}</small>
        <a href="${escape(RENT_BENCHMARKS.source.url)}" target="_blank" rel="noreferrer">查看报告 ↗</a><a href="${escape(RENT_BENCHMARKS.source.methodologyUrl)}" target="_blank" rel="noreferrer">查看方法 ↗</a></div>
      <p class="dialog-caveat">${escape(RENT_BENCHMARKS.note)}</p>`;
  } else {
    dialogTitle.textContent = '本机记录';
    dialogContent.innerHTML = `<p>候选城市、现实条件、原始倾向、三幕选择和核验清单只保存在当前浏览器的 localStorage 中。Web 版没有调用模型，也不会发送这些内容。</p>
      <button class="danger-button" data-action="clear-local">清除本机记录并重新开始</button>`;
  }
  dialog.showModal();
}

document.addEventListener('click', (event) => {
  const opener = event.target.closest('[data-dialog]');
  if (opener) openDialog(opener.dataset.dialog);
  if (event.target.closest('[data-action="close-dialog"]')) dialog.close();
  if (event.target.closest('[data-action="clear-local"]')) {
    localStorage.removeItem(STORAGE_KEY);
    state = freshExperienceState();
    dialog.close();
    render(true);
    toast('本机记录已清除。');
  }
});
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = [...String(text)];
  let line = '';
  let lineNo = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineNo * lineHeight);
      line = chars[i];
      lineNo++;
      if (lineNo >= maxLines) return y + lineNo * lineHeight;
    } else line = test;
  }
  if (lineNo < maxLines) ctx.fillText(line, x, y + lineNo * lineHeight);
  return y + (lineNo + 1) * lineHeight;
}

function downloadPassport() {
  const { left, right, rounds } = duelData();
  if (!left || !right || !state.firstToVerifyId) return;
  const first = state.firstToVerifyId === left.city.id ? left : right;
  const backup = first === left ? right : left;
  const analysis = analyzeAssumption(state.assumptionText, left, right, profile());
  const tasks = buildVerificationTasks(rounds, profile());
  if (state.addedDecisionTask?.task && !tasks.includes(state.addedDecisionTask.task)) tasks.push(state.addedDecisionTask.task);
  const canvas = document.createElement('canvas');
  canvas.width = 1400; canvas.height = 1800;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#050816'; ctx.fillRect(0, 0, 1400, 1800);
  ctx.strokeStyle = '#263a61'; ctx.lineWidth = 2;
  for (let x = 40; x < 1400; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1800); ctx.stroke(); }
  for (let y = 40; y < 1800; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1400, y); ctx.stroke(); }
  ctx.strokeStyle = '#37e7ff'; ctx.lineWidth = 3; ctx.strokeRect(55, 55, 1290, 1690);
  ctx.fillStyle = '#9fb3d6'; ctx.font = '600 26px system-ui'; ctx.fillText('GRADUATION CITY LAB · 双城通行证', 90, 115);
  ctx.fillStyle = '#ffd84a'; ctx.font = '800 56px system-ui'; ctx.fillText('先验证', 90, 220);
  ctx.fillStyle = '#37e7ff'; ctx.font = '800 128px serif'; ctx.fillText(first.city.name, 90, 360);
  ctx.fillStyle = '#ff4fd8'; ctx.font = '800 48px system-ui'; ctx.fillText(`备选 / ${backup.city.name}`, 780, 336);
  ctx.fillStyle = '#c6d4ee'; ctx.font = '400 28px system-ui';
  wrapText(ctx, `原本相信：“${state.assumptionText}”`, 90, 460, 1220, 46, 3);
  let y = 610;
  ctx.fillStyle = '#ffd84a'; ctx.font = '700 25px system-ui'; ctx.fillText('证据审计', 90, y);
  y += 55;
  ctx.fillStyle = '#c6d4ee'; ctx.font = '400 24px system-ui';
  for (const finding of analysis.findings.slice(0, 3)) {
    y = wrapText(ctx, `${finding.label}：${finding.text}`, 90, y, 1220, 38, 3) + 22;
  }
  y += 20;
  ctx.fillStyle = '#ffd84a'; ctx.font = '700 25px system-ui'; ctx.fillText('三幕轨迹', 90, y);
  y += 50;
  ctx.font = '500 24px system-ui';
  rounds.forEach((round, index) => {
    ctx.fillStyle = index % 2 ? '#ff4fd8' : '#37e7ff';
    ctx.fillText(`0${index + 1}  ${round.title}`, 90, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(voteLabel(round, state.duelVotes[round.id], left, right), 500, y);
    y += 48;
  });
  y += 30;
  ctx.fillStyle = '#ffd84a'; ctx.font = '700 25px system-ui'; ctx.fillText('REALITY MISSIONS / 现实核验', 90, y);
  y += 56;
  ctx.fillStyle = '#c6d4ee'; ctx.font = '400 24px system-ui';
  tasks.slice(0, 4).forEach((task, index) => {
    ctx.fillStyle = index % 2 ? '#ff4fd8' : '#37e7ff';
    ctx.fillText(`0${index + 1}`, 90, y);
    ctx.fillStyle = '#c6d4ee';
    y = wrapText(ctx, task, 155, y, 1150, 38, 3) + 22;
  });
  ctx.fillStyle = '#8ea2c8'; ctx.font = '400 21px system-ui';
  ctx.fillText('这是验证顺序，不是幸福、录取或人生预测。', 90, 1685);
  ctx.fillStyle = '#37e7ff'; ctx.font = '700 20px system-ui'; ctx.fillText('FIRST STOP AFTER GRADUATION · v0.6', 865, 1685);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `毕业第一站-${first.city.name}vs${backup.city.name}-双城通行证.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('双城通行证已生成。');
  }, 'image/png');
}

async function start() {
  try {
    const response = await fetch('/data/cities.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cities = await response.json();
    if (!Array.isArray(cities) || cities.length < 3) throw new Error('城市资料不完整');
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
    state = migrateExperienceState(saved, cities.map((city) => city.id));
    render();
  } catch (error) {
    main.innerHTML = `<section class="load-error"><h1>站台暂时没开。</h1><p>${escape(error.message)}</p><button class="primary-action" onclick="location.reload()">重新加载</button></section>`;
  }
}

start();
