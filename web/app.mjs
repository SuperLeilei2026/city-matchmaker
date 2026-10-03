import { rankCities } from '/core/matcher.mjs';
import { getNextQuestion, applyAnswer, applyFeedback } from '/core/questions.mjs';

const KEY='city-matchmaker-v1';
const freshProfile=()=>({nickname:'',guide:'cat',ageBand:'',stage:'graduating',school:'',major:'',currentCity:'',homeCity:'',mbti:'',zodiac:'',admiredMbti:'',admiredZodiac:'',admiredTraits:[],industry:'unknown',role:'',rentBudget:null,interests:[],priority:'balance',pace:'both',climateAvoids:[],hardClimate:false,relationship:'open',excludedCityIds:[],confirmations:[],feedback:[]});
const freshState=()=>({version:1,route:'profile',page:0,round:1,profile:freshProfile(),firstCityId:null,selectedCityId:null,answerLog:[],feedbackReason:null});
let state=freshState(),cities=[],storageAvailable=true,toastTimer,shareURL=null,dialogOpener=null;
const main=document.getElementById('main');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};
const industryNames={tech:'科技与互联网',creative:'创意与内容',manufacturing:'制造与工程',service:'服务与商业',unknown:'还在探索'};
const interestNames={nature:'户外与骑行',live:'演出与展览',food:'吃点好吃的',ball:'运动与球搭子',quiet:'安静的自己的时间'};
const traitNames={reliable:'靠谱，答应的事会做到',curious:'有好奇心，愿意一起尝试',warm:'相处放松，能好好说话',independent:'有自己的事，也尊重空间'};
const mbtis=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const zodiacs=['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
const feedNames={like:'这座有点心动',career:'工作方向不太对',cost:'我担心生活开销',climate:'天气可能受不了','too-busy':'这种日子可能太累','not-this-city':'这座我明确不考虑',unsure:'说不上来，还没感觉'};
function readState(){
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1&&saved.profile){
    const p={...freshProfile(),...saved.profile};
    for(const k of ['nickname','school','major','currentCity','homeCity','role'])p[k]=typeof p[k]==='string'?p[k].slice(0,80):'';
    for(const k of ['admiredTraits','interests','climateAvoids','excludedCityIds','confirmations','feedback'])if(!Array.isArray(p[k]))p[k]=[];
    p.guide=p.guide==='dog'?'dog':'cat';p.interests=p.interests.filter(x=>x in interestNames);p.climateAvoids=p.climateAvoids.filter(x=>['heat','cold','humidity'].includes(x));
    state={...freshState(),...saved,profile:p,route:['profile','question','first','result'].includes(saved.route)?saved.route:'profile',page:[0,1,2].includes(saved.page)?saved.page:0,round:saved.round===2?2:1,answerLog:Array.isArray(saved.answerLog)?saved.answerLog:[]};
  }}catch{storageAvailable=false;}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{storageAvailable=false;}}
function toast(text){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3800);}
function dog(catText,dogText){return state.profile.guide==='dog'?dogText:catText;}
function invalidate(){state.firstCityId=null;state.selectedCityId=null;state.round=1;state.answerLog=[];state.feedbackReason=null;state.profile.confirmations=[];state.profile.feedback=[];state.profile.excludedCityIds=[];delete state.profile.focusInterest;}
function updateField(key,value){state.profile[key]=value;invalidate();save();}
const opts=(values,value,blank='还没确定')=>`<option value="">${blank}</option>`+values.map(x=>`<option value="${escape(x)}" ${value===x?'selected':''}>${escape(x)}</option>`).join('');
const input=(key,label,placeholder='',optional=true)=>`<label class="field"><span>${label}${optional?'<span class="optional">选填</span>':''}</span><input name="${key}" data-field="${key}" value="${escape(state.profile[key])}" maxlength="60" placeholder="${escape(placeholder)}" autocomplete="off"></label>`;
const select=(key,label,values,blank)=>`<label class="field"><span>${label}<span class="optional">选填</span></span><select name="${key}" data-field="${key}">${opts(values,state.profile[key],blank)}</select></label>`;
function chips(key,items,multiple=false){return `<div class="${multiple?'chips':'segmented'}" role="group" aria-label="${escape(key)}">`+Object.entries(items).map(([id,label])=>`<button type="button" class="select-chip" data-action="${multiple?'multi':'choose'}" data-field="${key}" data-value="${escape(id)}" aria-pressed="${multiple?state.profile[key].includes(id):String(state.profile[key])===id}">${escape(label)}</button>`).join('')+'</div>';}
function fieldChips(key,label,items,multiple=false){return `<div class="field"><div class="field-title">${label}</div>${chips(key,items,multiple)}</div>`;}
function guidePane(){
  const route=state.route;
  const headlines=route==='profile'?['毕业了，<br>去哪座城<br><em>认真生活？</em>','先填一张资料卡。再聊两轮，看看工作和生活可以在哪里一起安顿下来。']:route==='question'?['想了解的，<br>是你怎么<br><em>做选择。</em>','资料有了。接下来只问有助于做决定的事。']:route==='first'?['先认识<br><em>这一座。</em>','它是一个值得讨论的候选。哪里合适、哪里不对，都可以直接说。']:['下一站，<br><em>慢慢定下来。</em>','把已经想清楚的留下，也把还没把握的写明白。'];
  const note=route==='profile'?dog('资料不必填满。哪些信息有用、哪些还不能判断，我会说清楚。','先认识一下你。没想好的可以空着，之后我们再一起看。'):route==='question'?dog('按你真实的想法选。能判断的写进结果，还不能判断的留待核对。','选你现在真的想要的。和想象中不一样，也没关系。'):route==='first'?dog('看理由，也看代价。你不喜欢的地方，往往比一个“喜欢”更有帮助。','先看看有没有一点心动。哪儿不对劲，也别客气。'):dog('这是目前条件下的候选。具体工作和住处，需要再核对。','车票先收好。真要出发，我们还得把工作和住处看仔细。');
  return `<aside class="guide-pane"><div class="eyebrow">CITY MATCHMAKER / 城市红娘</div><h1>${headlines[0]}</h1><p class="intro">${headlines[1]}</p><div class="guide-chooser" role="group" aria-label="选择城市红娘"><button class="guide-choice" data-action="guide" data-value="cat" aria-pressed="${state.profile.guide==='cat'}">INTJ 小猫<small>直说重点</small></button><button class="guide-choice" data-action="guide" data-value="dog" aria-pressed="${state.profile.guide==='dog'}">ENFP 小狗<small>聊聊生活</small></button></div><div class="guide-portrait asset-ready"><img src="/assets/guide-${state.profile.guide}.png" alt="${state.profile.guide==='cat'?'拿着蓝色车票的黑白德文猫':'拿着橙色车票的活泼线条小狗'}" width="320" height="320"></div><div class="guide-note"><span class="note-sign">“</span><div>${note}</div></div><div class="guide-name">${state.profile.guide==='cat'?'INTJ 小猫':'ENFP 小狗'} / 你的城市介绍人</div><div class="waypoints">${['留份资料','认识一城','再聊一次','收好车票'].map((x,i)=>`<span class="${(route==='profile'?0:route==='question'&&state.round===1?1:route==='first'?1:route==='question'?2:3)===i?'is-current':''}"><i>${i+1}</i>${x}</span>`).join('')}</div></aside>`;
}
function folder(content,tabs=null){return `<section class="file-folder" aria-label="城市匹配"><div class="folder-tabs">${tabs||`<span class="active">${state.route==='profile'?'你的资料卡':state.route==='question'?'聊一件关键的事':state.route==='first'?'第一次介绍':'这次撮合的结果'}</span>`}</div><div class="form-sheet">${content}</div></section>`;}
function profilePage(){
  const p=state.profile,page=state.page;
  let body='';
  if(page===0){body=`<h2>先认识一下你。</h2><p class="sheet-intro">这些是聊天的起点。学校、年龄都可以不填。</p>${input('nickname','怎么称呼你','一个昵称就好')}<div class="field"><div class="field-title">你现在在哪一站？</div>${chips('stage',{'graduating':'准备毕业','job-search':'正在找工作',working:'工作后想换城',exploring:'先来看看'})}</div><div class="fields-two"><label class="field"><span>年龄段<span class="optional">选填</span></span><select data-field="ageBand"><option value="">先不填</option>${Object.entries({'20-':'20 岁及以下','21-24':'21–24 岁','25-29':'25–29 岁','30+':'30 岁及以上'}).map(([v,l])=>`<option value="${v}" ${p.ageBand===v?'selected':''}>${l}</option>`).join('')}</select></label>${input('currentCity','现在住的城市','如：武汉')}</div><div class="fields-two">${input('school','毕业／在读院校','学校名称')}${input('major','所学专业','如：工业设计')}</div>${input('homeCity','重要的人在哪座城','家人、伴侣或老朋友所在城市')}<p class="fine-print">年龄和院校用于了解背景，不会决定你“配得上”哪座城市。</p>`;}
  if(page===1){body=`<h2>你喜欢怎样的相处？</h2><p class="sheet-intro">这些标签可以介绍自己。更有用的，是你喜欢一个人的哪些地方。</p><div class="fields-two">${select('mbti','你的 MBTI',mbtis,'不知道／先不填')}${select('zodiac','你的星座',zodiacs,'先不填')}</div><hr class="section-rule"><div class="field-title">再说一个你欣赏的人</div><p class="sheet-intro">朋友、偶像、伴侣都可以，不需要写 TA 的名字。</p><div class="fields-two">${select('admiredMbti','TA 的 MBTI',mbtis,'不知道／先不填')}${select('admiredZodiac','TA 的星座',zodiacs,'不知道／先不填')}</div>${fieldChips('admiredTraits','你欣赏 TA 什么？',traitNames,true)}<p class="fine-print">这些帮助你介绍自己。本轮按你明确的工作、生活和取舍匹配，MBTI、星座与相处标签不参与排序。</p>`;}
  if(page===2){body=`<h2>工作和生活，都留个位置。</h2><p class="sheet-intro">先记大致方向，接下来再聊你愿意怎样取舍。</p>${fieldChips('industry','毕业后想做哪类工作？',industryNames)}${input('role','具体岗位','如：交互设计师、机械工程师')}<div class="field"><span>每月房租上限<span class="optional">选填</span></span><select data-field="rentBudget"><option value="">还没算好</option>${[1500,2500,4000,6000].map(v=>`<option value="${v}" ${p.rentBudget===v?'selected':''}>${v.toLocaleString()} 元</option>`).join('')}</select></div>${fieldChips('interests','平时希望常常做的事',interestNames,true)}${fieldChips('climateAvoids','哪种天气你想尽量避开？',{heat:'持续炎热',cold:'冬天太冷',humidity:'潮湿闷热'},true)}${fieldChips('relationship','去新城市，和重要的人的距离…',{'near-home':'希望方便回去',friends:'最好有熟人在',open:'都可以，想看看'})}<p class="fine-print">目前不掌握具体房源和真实通勤，预算会留在待核验条件里。</p>`;}
  return folder(`<div class="sheet-meta"><span>PERSONAL FILE / 00${page+1}</span><span class="stamp">本机保存</span></div>${body}<div class="form-actions">${page?'<button class="quiet-button" data-action="previous-profile">上一页</button>':'<span class="step-micro">不需要注册</span>'}<button class="primary" data-action="next-profile">${page===2?'资料好了，开始撮合':'继续填下一页'}</button></div><div class="fine-print">${page+1} / 3 · ${storageAvailable?'可以关掉再回来，资料留在这台设备上。':'浏览器暂时无法保存，关闭后可能需要重填。'}</div>`,['认识你','相处方式','工作与生活'].map((t,i)=>`<button data-action="profile-tab" data-value="${i}" class="${page===i?'active':''}" aria-current="${page===i?'step':'false'}">${t}</button>`).join(''));
}
function profileTags(){const p=state.profile;return `<div class="profile-summary">${[p.nickname,p.role||industryNames[p.industry],p.mbti,...p.interests.map(k=>interestNames[k])].filter(Boolean).slice(0,6).map(x=>`<span class="mini-tag">${escape(x)}</span>`).join('')}</div>`;}
function currentQuestion(){return getNextQuestion(state.profile,rankCities(state.profile,cities),state.round);}
function rankingNotice(ranking){
  const top=ranking.ranked[0];
  if(!top)return '';
  const tied=ranking.ranked.filter(r=>r.score===top.score);
  const notices=[];
  if(!state.profile.interests.length||state.profile.industry==='unknown')notices.push('目前资料还不够完整，先把这些城市当作了解的起点。');
  if(tied.length>1)notices.push(`${tied.map(r=>r.city.name).join('、')}目前分不出先后。先介绍其中一座，不代表它一定更适合。`);
  if(state.profile.hardClimate&&top.unknowns.some(x=>x.includes('气候硬条件')))notices.push('你明确不能接受的天气还缺充分核验。确认之前，这些城市只能暂列候选。');
  return notices.length?`<div class="result-limit">${notices.map(escape).join('<br>')}</div>`:'';
}
function questionPage(){const q=currentQuestion();return folder(`<div class="sheet-meta"><span>LET'S TALK / 第 ${state.round} 轮</span><span class="stamp">${state.round===1?'初步了解':'根据反馈再了解'}</span></div>${profileTags()}${state.round===2?`<div class="question-count">你刚才说：${escape(feedNames[state.feedbackReason]||'还想再看看')}</div>`:''}<h2>${escape(q.title)}</h2><div class="question-why">${escape(q.why)}</div><div class="choice-list">${q.options.map((o,i)=>`<button class="choice-card" data-action="answer" data-value="${escape(o.id)}"><b><span class="choice-letter">${String.fromCharCode(65+i)}</span>${escape(o.label)}</b>${o.description?`<span>${escape(o.description)}</span>`:''}</button>`).join('')}</div><div class="form-actions"><button class="quiet-button" data-action="edit-profile">回到资料卡</button><button class="quiet-button" data-action="skip-question">这题先跳过</button></div>`);}
function ticket(result,final=false){
  const c=result.city;const reasons=(result.reasons||[]).slice(0,3);const unknowns=[...(result.unknowns||[])].sort((a,b)=>Number(/预算|气候硬条件|往返|朋友|球类|安静|分不出/.test(b))-Number(/预算|气候硬条件|往返|朋友|球类|安静|分不出/.test(a)));
  const scene=state.profile.guide==='dog'&&c.scenes?.length?`<div class="scene-note"><small>一种可能的日常 · 场景想象</small>${escape(c.scenes[0])}</div>`:'';
  return `<article class="city-ticket" aria-label="${escape(c.name)}城市车票"><div class="ticket-head"><div class="ticket-kicker"><span>${final?'YOUR NEXT STOP / 候选目的地':'FIRST INTRODUCTION / 第一次介绍'}</span><span>待你亲自确认</span></div><div class="city-display"><div><h3>${escape(c.name)}</h3><div class="english">${escape(c.english)}</div></div><div class="ticket-number">${String(cities.indexOf(c)+1).padStart(2,'0')}</div></div><p class="city-tagline">${escape(c.tagline)}</p></div><div class="ticket-body">${scene}${reasons.length?reasons.map((r,i)=>`<div class="reason-row"><span class="reason-index">0${i+1}</span><div><p>${escape(r.text)}</p><span class="evidence-state">${r.status==='sourced'?'来源已记录':r.status==='editorial'?'资料基础上的人工判断':'需要进一步核对'}</span></div></div>`).join(''):'<p class="sheet-intro">目前的资料还不足以形成明确偏好。先把它当作一个了解城市的起点。</p>'}<div class="tradeoff"><b>${dog('需要一起考虑的','有件事，也得先说')}</b>${escape((result.tradeoffs||[])[0]||c.tradeoffs?.[0]||'具体工作、住处和每天的路程，仍需要逐项核对。')}</div>${unknowns.length?`<div class="tradeoff"><b>还没有把握的地方</b>${unknowns.slice(0,2).map(x=>escape(typeof x==='string'?x:x.text||x.label||'待核验')).join('<br>')}${unknowns.length>2?`<details style="margin-top:9px"><summary>还有 ${unknowns.length-2} 项需要核对</summary><ul>${unknowns.slice(2).map(x=>`<li>${escape(x)}</li>`).join('')}</ul></details>`:''}</div>`:''}<button class="evidence-toggle" data-action="evidence" data-value="${escape(c.id)}">翻到背面，看看依据</button></div></article>`;
}
function emptyPage(ranking){return folder(`<div class="sheet-meta">NO RUSH / 不用硬选</div><div class="empty-state"><h2>这轮没有合适的候选。</h2><p>先保留你已经说清楚的底线。可以回去改条件，也可以看看哪些地方需要更多资料。</p></div>${(ranking.excluded||[]).map(x=>`<p class="sheet-intro">${escape(x.city.name)}：${escape((x.reasons||[]).map(r=>typeof r==='string'?r:r.text).join('；'))}</p>`).join('')}<button class="primary full" data-action="edit-profile">回到资料，重新看看</button>`);}
function firstPage(){const ranking=rankCities(state.profile,cities),r=ranking.ranked.find(x=>x.city.id===state.firstCityId)||ranking.ranked[0];if(!r)return emptyPage(ranking);if(!state.firstCityId){state.firstCityId=r.city.id;save();}return folder(`<div class="sheet-meta"><span>MATCH 01 / 先认识一座</span><span class="stamp">有条件的介绍</span></div><h2>${dog('我先介绍你认识', '先认识一下')}${escape(r.city.name)}。</h2><p class="sheet-intro">先看为什么，再告诉我哪里合适、哪里不合适。</p>${rankingNotice(ranking)}${ticket(r)}<div class="field-title">看完之后，你的第一反应是？</div><div class="feedback-grid">${Object.entries(feedNames).map(([id,label])=>`<button class="${id==='like'?'feedback-like':''}" data-action="feedback" data-value="${id}" data-city="${escape(r.city.id)}">${label}</button>`).join('')}</div><p class="fine-print">你的反馈会决定下一问，不需要重新填资料。</p>`);}
function changeExplanation(top){
  const previous=cities.find(c=>c.id===state.firstCityId),last=state.answerLog.filter(x=>x.round===2).at(-1);
  if(!previous)return '目前先保留这个候选。具体岗位和住处，需要进一步确认。';
  const detail=last?`你补充了“${last.label}”。`:'';
  if(previous.id!==top.city.id){const rejected=state.profile.excludedCityIds.includes(previous.id);return `${rejected?`你明确不考虑${previous.name}，已把它移出。`:detail}这轮先看${top.city.name}。${top.reasons?.[0]?.text||'按已确认的条件，它排在当前候选的前面。'}`;}
  if(['cost','too-busy'].includes(state.feedbackReason)&&top.unknowns?.length)return `${detail}目前仍保留${top.city.name}。你担心的条件还缺具体资料，先留下待核验，确认后才能进一步比较。`;
  return `${detail}这轮仍保留${top.city.name}。目前已知的匹配依据没有被推翻，未核实的条件还需要继续确认。`;
}
function decisionReceipt(){
  const p=state.profile;const items=[];
  if(p.confirmations.includes('first-priority')||state.answerLog.some(x=>x.id==='daily-recovery'&&x.label.includes('工作')))items.push({label:'你的取舍',text:({career:'工作机会放在前面',balance:'工作与生活都要兼顾',life:'先照顾想过的日常'})[p.priority]});
  if(p.interests.length)items.push({label:'想常常做',text:[p.focusInterest?interestNames[p.focusInterest]+'优先':null,...p.interests.filter(k=>k!==p.focusInterest).map(k=>interestNames[k])].filter(Boolean).join(' · ')});
  if(p.excludedCityIds.length)items.push({label:'已经排除',text:p.excludedCityIds.map(id=>cities.find(c=>c.id===id)?.name).filter(Boolean).join('、')});
  return items.length?`<div class="decision-receipt"><span class="receipt-title">这两轮，留下这些确定的事</span>${items.map(x=>`<div><small>${escape(x.label)}</small><p>${escape(x.text)}</p></div>`).join('')}</div>`:'';
}
function resultPage(){const ranking=rankCities(state.profile,cities);if(!ranking.ranked.length)return emptyPage(ranking);const top=ranking.ranked[0];const selected=ranking.ranked.find(x=>x.city.id===state.selectedCityId)||top;state.selectedCityId=selected.city.id;return folder(`<div class="sheet-meta"><span>MATCH 02 / 两轮之后</span><span class="stamp">先去了解</span></div><div class="result-header"><h2>${escape(state.profile.nickname?state.profile.nickname+'，':'')}下一站可以先看这里。</h2></div><div class="revision-note">${escape(changeExplanation(top))}</div>${decisionReceipt()}${rankingNotice(ranking)}${ticket(selected,true)}<div class="field-title">放在一起，再看看</div><div class="shortlist">${ranking.ranked.slice(0,3).map((r,i)=>`<button data-action="select-city" data-value="${escape(r.city.id)}" aria-pressed="${selected.city.id===r.city.id}"><span><b>${escape(r.city.name)}</b><small>${r.score===top.score?(ranking.ranked.filter(x=>x.score===top.score).length>1?'现有资料分不出先后':r.status==='candidate'?'已知条件下，优先了解':'资料尚不完整，先去了解'):'另一种生活，值得比较'}</small></span><span class="mini-tag">${r.score===top.score?(ranking.ranked.filter(x=>x.score===top.score).length>1?'并列候选':'待了解'):'备选'}</span></button>`).join('')}</div><div class="share-actions"><button class="primary" data-action="share-card">做成一张城市车票</button><button class="secondary" data-action="copy-result">复制推荐摘要</button></div><p class="privacy-note">分享卡只带城市和生活关键词，不包含院校、年龄或预算。</p><p class="result-limit">当前是六城探索版，使用公开资料与透明规则。城市分档是人工判断；还不能预测录取机会、真实住房成本或未来幸福程度。</p><div class="form-actions"><button class="quiet-button" data-action="edit-profile">我想改一下条件</button><button class="quiet-button" data-action="method">这份结论怎么来的</button></div>`);}
function render({focus=false}={}){
  document.body.classList.toggle('guide-dog',state.profile.guide==='dog');
  main.innerHTML=`<div class="workbench">${guidePane()}${state.route==='profile'?profilePage():state.route==='question'?questionPage():state.route==='first'?firstPage():resultPage()}</div>`;
  if(focus){main.querySelector('.form-sheet h2')?.setAttribute('tabindex','-1');main.querySelector('.form-sheet h2')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
function dialog(title,html){if(document.activeElement?.matches('button,a,input,select'))dialogOpener=document.activeElement;document.getElementById('dialog-title').textContent=title;document.getElementById('dialog-content').innerHTML=html;const d=document.getElementById('detail-dialog');if(!d.open)d.showModal();}
function sourceHTML(c){return `<div class="source-card"><h3>${escape(c.name)}</h3><p>${escape(c.persona||c.tagline)}</p>${c.sources.map(s=>`<p><a href="${escape(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">${escape(s.title)}</a><br><small>${s.published?'发布：'+escape(s.published)+' · ':''}核对：${escape(s.checked)}</small></p>`).join('')}<p><small>尚缺：${escape((c.unknowns||[]).join('、'))}</small></p></div>`;}
function showEvidence(cityId){const c=cities.find(x=>x.id===cityId);if(!c)return;const r=rankCities(state.profile,cities).ranked.find(x=>x.city.id===c.id);dialog(c.name+' · 车票背面',`<p>我们把城市资料和你确认过的需求放在一起比较。下面列出依据与边界。</p>${(r?.reasons||[]).map(x=>`<div class="source-card"><h3>${escape(x.text)}</h3><small>${x.status==='sourced'?'有来源的资料':x.status==='editorial'?'人工分档，不是统计测量':'待核实'}</small></div>`).join('')}${sourceHTML(c)}<details><summary>查看各维度如何记录</summary><ul>${Object.entries(c.featureEvidence||{}).map(([k,e])=>`<li>${escape(({tech:'科技与互联网',creative:'创意与内容',manufacturing:'制造与工程',service:'服务与商业',nature:'户外',live:'演出文化',food:'饮食',ball:'球类运动',quiet:'安静程度',heat:'炎热',cold:'寒冷',humidity:'湿度',cost:'费用'})[k]||k)}：${escape(e.note)} <small>(${escape(e.status)})</small></li>`).join('')}</ul></details>`);}
function showMethod(){dialog('我们怎么撮合',`<div class="method-flow"><div><strong>01 先看现实条件</strong>目标行业、生活偏好与明确底线进入比较。预算、岗位和通勤没有可靠资料时会标为待核验。</div><div><strong>02 再看你更在意什么</strong>你选择工作优先或生活优先，会改变相对排序。多个相近兴趣共用生活部分的权重，避免选得多就加分多。</div><div><strong>03 听反馈，再问一件关键的事</strong>明确不考虑某城，就移出；担心成本，先补预算；觉得太忙，澄清你担心的是噪声、时间还是距离。</div><div><strong>04 把理由与未知都交给你</strong>相同答案得到相同排序。猫狗只改变说话方式，学校、年龄、MBTI 和星座不决定城市得分。</div></div><h3>当前能做与还不能做的</h3><p>六城资料来自公开页面，特点等级是人工判断。我们能比较探索方向，还不能给出实时招聘、可负担房源、实际通勤或幸福概率。当前网页版按规则运行，尚未调用大模型。</p><p>初始资料中的相处标签、院校和年龄保留在本机；未经过你确认的性格推测不会加入规则。这个版本不提供心理测评。</p>`);}
function showPrivacy(){dialog('你的资料留在哪里',`<p>目前资料只保存在这台设备的浏览器中，用于恢复进度。没有账号，也不会把年龄、院校或喜欢的人的信息发送给远端模型。</p><p>分享卡只包含候选城市、你选择的生活关键词和介绍人。复制摘要也不包含年龄、学校或他人的信息。</p><p>在共用设备上使用后，可以清除本机资料。</p><button class="secondary" data-action="confirm-reset">清除本机资料</button><p><small>清除后将回到第一张资料卡。</small></p>`);}
function wrapCanvas(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const char of text){if(ctx.measureText(line+char).width>maxWidth&&line){ctx.fillText(line,x,y);line=char;y+=lineHeight;}else line+=char;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
async function createShare(){
  const ranking=rankCities(state.profile,cities);const r=ranking.ranked.find(x=>x.city.id===state.selectedCityId)||ranking.ranked[0];if(!r)return;
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');
  const accent=state.profile.guide==='dog'?'#c65225':'#2e50c8';ctx.fillStyle='#f7f5ef';ctx.fillRect(0,0,1080,1440);
  ctx.fillStyle='#fffdf8';rounded(ctx,64,64,952,1312,32);ctx.strokeStyle='#d6d8cd';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=accent;ctx.font='600 25px "PingFang SC",sans-serif';ctx.fillText('毕业第一站 / CITY MATCHMAKER',112,136);
  ctx.fillStyle='#6b706a';ctx.font='24px "PingFang SC",sans-serif';ctx.fillText('我想先去了解的城市',112,238);
  ctx.fillStyle='#202b29';ctx.font='600 164px "Songti SC",serif';ctx.fillText(r.city.name,104,435);ctx.font='26px sans-serif';ctx.fillStyle='#6b706a';ctx.fillText(r.city.english,114,497);
  ctx.strokeStyle='#c7c9be';ctx.setLineDash([9,9]);ctx.beginPath();ctx.moveTo(64,555);ctx.lineTo(1016,555);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=accent;ctx.font='500 34px "PingFang SC",sans-serif';let y=wrapCanvas(ctx,r.city.tagline,112,630,835,53);
  const tags=state.profile.interests.map(k=>interestNames[k]);ctx.font='27px "PingFang SC",sans-serif';ctx.fillStyle='#475344';y=wrapCanvas(ctx,tags.length?'想把这些留在生活里：'+tags.join(' · '):'给工作留一个方向，也给生活留一点空间。',112,y+24,795,44);
  const img=new Image();img.src='/assets/guide-'+state.profile.guide+'.png';await img.decode();ctx.drawImage(img,600,865,360,360);
  ctx.fillStyle='#202b29';ctx.font='500 37px "PingFang SC",sans-serif';wrapCanvas(ctx,'城市还没定，\n想过的日子清楚了一点。'.replace('\n',''),112,1010,440,60);
  ctx.font='22px "PingFang SC",sans-serif';ctx.fillStyle='#6b706a';ctx.fillText('一张候选车票，不是一锤定音。',112,1228);ctx.fillText('六城探索版 · 具体岗位与住处仍待核对',112,1300);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('图片生成失败');if(shareURL)URL.revokeObjectURL(shareURL);shareURL=URL.createObjectURL(blob);
  dialog('收好你的城市车票',`<img class="share-preview-image" src="${shareURL}" alt="${escape(r.city.name)}城市候选分享卡"><a class="primary" style="display:block;text-align:center;text-decoration:none" href="${shareURL}" download="毕业第一站-${escape(r.city.name)}.png">保存城市车票</a><p class="privacy-note">这张卡不含院校、年龄、预算和他人信息。</p>`);
}
async function copyResult(){const ranking=rankCities(state.profile,cities),r=ranking.ranked.find(x=>x.city.id===state.selectedCityId)||ranking.ranked[0];if(!r)return;const text=`毕业第一站｜先了解${r.city.name}\n${r.city.tagline}\n${r.reasons.slice(0,2).map(x=>x.text).join('\n')}\n待核对：具体岗位、住房与日常路程。\n这是一份探索建议，不是幸福概率预测。`;try{await navigator.clipboard.writeText(text);toast('摘要复制好了，可以发给朋友聊聊。');}catch{dialog('复制推荐摘要',`<label class="field"><span>可以选中下方文字复制</span><textarea readonly rows="8">${escape(text)}</textarea></label>`);}}
document.addEventListener('input',e=>{const key=e.target.dataset.field;if(key&&e.target.matches('input,textarea'))updateField(key,e.target.value);});
document.addEventListener('change',e=>{const key=e.target.dataset.field;if(key&&e.target.matches('select')){updateField(key,key==='rentBudget'?(Number(e.target.value)||null):e.target.value);}});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,v=b.dataset.value;
  try{
    if(a==='guide'){state.profile.guide=v==='dog'?'dog':'cat';save();render();return;}
    if(a==='choose'){updateField(b.dataset.field,v);render();return;}
    if(a==='multi'){const k=b.dataset.field,list=state.profile[k];updateField(k,list.includes(v)?list.filter(x=>x!==v):[...list,v]);render();return;}
    if(a==='profile-tab'){state.page=Number(v);save();render({focus:true});return;}
    if(a==='next-profile'){if(state.page<2)state.page++;else{state.route='question';state.round=1;}save();render({focus:true});return;}
    if(a==='previous-profile'){state.page=Math.max(0,state.page-1);save();render({focus:true});return;}
    if(a==='edit-profile'){state.route='profile';state.page=2;save();render({focus:true});return;}
    if(a==='answer'){const q=currentQuestion(),o=q.options.find(x=>x.id===v);state.profile=applyAnswer(state.profile,q,v);state.answerLog.push({round:state.round,question:q.title,id:q.id,label:o.label});state.route=state.round===1?'first':'result';state.selectedCityId=null;save();render({focus:true});return;}
    if(a==='skip-question'){state.route=state.round===1?'first':'result';state.selectedCityId=null;save();render({focus:true});return;}
    if(a==='feedback'){state.profile=applyFeedback(state.profile,b.dataset.city,v);state.feedbackReason=v;state.round=2;state.route='question';save();render({focus:true});return;}
    if(a==='select-city'){state.selectedCityId=v;save();render();return;}
    if(a==='method'){showMethod();return;}
    if(a==='data'){dialog('城市资料与来源',`<p>城市特点的数值分档由人工整理，不是居民人格，也不是实际录取概率。来源支持城市背景，具体住处、岗位和日常距离仍需要调查。</p>${cities.map(sourceHTML).join('')}`);return;}
    if(a==='evidence'){showEvidence(v);return;}
    if(a==='privacy'){showPrivacy();return;}
    if(a==='confirm-reset'){dialog('清除这台设备上的资料？','<p>这会清除填写的资料、问答和当前结果。你可以重新开始。</p><button class="primary" data-action="reset">确认清除</button>');return;}
    if(a==='reset'){state=freshState();try{localStorage.removeItem(KEY);}catch{}document.getElementById('detail-dialog').close();render({focus:true});toast('本机资料已清除。');return;}
    if(a==='close-dialog'){document.getElementById('detail-dialog').close();return;}
    if(a==='share-card'){dialogOpener=b;b.disabled=true;await createShare();b.disabled=false;return;}
    if(a==='copy-result'){await copyResult();return;}
  }catch(error){console.error(error);b.disabled=false;toast('刚才这一步没有完成，你的资料还在。可以再试一次。');}
});
document.getElementById('detail-dialog').addEventListener('close',()=>{const target=dialogOpener?.isConnected&&!dialogOpener.disabled?dialogOpener:main.querySelector('h2');if(target){if(!target.matches('button,a,input,select'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}dialogOpener=null;});
document.getElementById('detail-dialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
async function start(){readState();try{const response=await fetch('/data/cities.json');if(!response.ok)throw new Error('城市资料暂未准备好');cities=await response.json();if(!Array.isArray(cities)||!cities.length)throw new Error('城市资料格式错误');render();}catch(error){main.innerHTML=`<div class="form-sheet"><h1>城市资料暂时没加载出来。</h1><p>你的本机资料没有丢失。请稍后刷新页面。</p><p class="error-note">${escape(error.message)}</p><button class="primary" onclick="location.reload()">重新加载</button></div>`;}}
start();
