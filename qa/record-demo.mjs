import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

// Records real browser interactions in an isolated profile. No product files change.
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = 'qa/demo-web';
await mkdir(out, { recursive: true });
const scratch = await mkdtemp(path.join(tmpdir(), 'city-matchmaker-demo-'));
const url = process.env.DEMO_URL || 'http://127.0.0.1:4319';
const speed = Number(process.env.DEMO_TIME_SCALE || 1);
const chapters = [
 [0,8,'Joy City：给想做 AI 产品的你，找一座愿意留下的城市。'],
 [8,18,'先看空资料状态：没有依据时，不把展示顺序当成适合程度。'],
 [18,30,'重新开始，选择 AI 产品设计。全程使用独立的合成演示资料。'],
 [30,62,'五个生活场景：新鲜感、恢复方式、关系、职业期待与不确定性。'],
 [62,75,'天气和现实条件可以选填；先核对画像，每句话都能改。'],
 [75,90,'第一座城市：看有依据的吸引力，也看代价和暂时未知的部分。'],
 [90,106,'明确不考虑首城，再确认一个生活选择，拒绝记录不会被抹掉。'],
 [106,119,'第二轮重新比较，解释变化；按个人偏好给出试城验证计划。'],
 [119,129,'车票背面能查看来源。人工分档不是幸福概率。'],
 [129,138,'猫狗使用同一份事实、不同侧重；切换视角保留答案和底线。'],
 [138,146,'实际生成并下载城市车票，只分享城市与生活关键词。'],
 [146,151,'刷新后进度仍在。这是 Web 规则演示，不代表真实模型已验收。']
];
await writeFile(`${out}/chapters.json`, JSON.stringify(chapters, null, 2));
const sourcePaths = ['web/app.mjs', 'web/styles.css', 'web/index.html', 'core/matcher.mjs', 'core/questions.mjs', 'core/profile.mjs', 'core/joy.mjs', 'core/joy-questions.mjs', 'data/joy-config.json', 'data/cities.json'];
const sourceHashes = {};
for (const file of sourcePaths) {
  try { sourceHashes[file] = createHash('sha256').update(await readFile(file)).digest('hex'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const report = { recordedAt: new Date().toISOString(), url, kind: 'real-web-browser-recording',
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope: 'Synthetic profile; deterministic local ranking; no native or real-model claim', sourceHashes, chapters, events: [] };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
  acceptDownloads: true, recordVideo: { dir: scratch, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const errors = [], requests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(r.url()));
let started;
const at = async seconds => {
  if (!started) started = Date.now();
  const delay = started + seconds * 1000 * speed - Date.now();
  if (delay > 0) await page.waitForTimeout(delay);
};
const mark = label => { const event = { seconds: +((Date.now() - started) / 1000).toFixed(2), label }; report.events.push(event); console.log(JSON.stringify(event)); };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('city-matchmaker-v1')));
const click = async (action, value) => {
  const loc = page.locator(`[data-action="${action}"]${value ? `[data-value="${value}"]` : ''}`).first();
  await loc.scrollIntoViewIfNeeded(); await loc.hover(); await loc.click();
};
const field = (key, value) => page.locator(`[data-field="${key}"]${value ? `[data-value="${value}"]` : ''}`).first();
const scrollTo = async loc => { await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(250 * speed); };
let videoPath;
try {
  await page.goto(url); await page.waitForSelector('[data-action="role"]');
  started=Date.now();mark('joy-city-welcome');
  await at(8);await click('preview-portrait');await click('confirm-portrait');assert.match(await page.locator('.result-limit').first().innerText(),/不足/);mark('empty-portrait-uncertainty');
  await at(13);await page.screenshot({path:`${out}/01-empty.png`});
  await at(18);await click('privacy');await click('confirm-reset');await click('reset');
  await at(22);await click('role','design');await page.locator('.optional-details summary').click();await field('nickname').fill('小舟');await field('school').fill('示例大学');mark('synthetic-ai-design-profile');
  await at(30);await click('next-profile');
  for(const [i,v] of ['new','nature','regular','build','balanced'].entries()){await at(32+i*6);await click('scene',v);await at(36+i*6);await click('next-profile');}
  await at(62);await page.screenshot({path:`${out}/weather.png`});await at(66);await click('next-profile');assert.equal((await state()).route,'portrait');mark('reviewable-portrait');
  await at(70);await page.screenshot({path:`${out}/portrait.png`});
  await at(75);await click('confirm-portrait');report.firstCityId=(await state()).firstCityId;mark('first-city');
  await at(80);await page.screenshot({path:`${out}/02-first-city.png`});await at(84);await scrollTo(page.locator('.tradeoff').first());
  await at(90);await click('feedback','not-this-city');mark('explicit-rejection');
  await at(101);await click('answer',(await page.locator('[data-action="answer"]').first().getAttribute('data-value')));
  const resultState=await state();assert.equal(resultState.route,'result');assert(resultState.profile.excludedCityIds.includes(report.firstCityId));
  report.finalCityNames=await page.locator('.shortlist button b').allTextContents();assert.equal(await page.locator(`.shortlist [data-value="${report.firstCityId}"]`).count(),0);mark('second-round-with-rejection-preserved');
  await at(106);await page.screenshot({path:`${out}/03-result.png`});await at(113);await scrollTo(page.locator('.trial-plan'));
  await at(119);await click('evidence');assert(await page.locator('#dialog-content a').count()>0);mark('traceable-sources');await at(124);await page.screenshot({path:`${out}/04-sources.png`});
  await at(129);await click('close-dialog');await page.evaluate(()=>scrollTo(0,0));const answers=(await state()).profile.joy;await click('guide','cat');assert.deepEqual((await state()).profile.joy,answers);assert((await state()).profile.excludedCityIds.includes(report.firstCityId));mark('other-lens-same-profile');
  await at(136);await scrollTo(page.locator('.share-actions'));await at(138);await click('share-card');await page.waitForSelector('.share-preview-image');mark('share-preview');
  await at(143);await scrollTo(page.locator('a[download]'));const downloadEvent=page.waitForEvent('download');await page.locator('a[download]').click();await (await downloadEvent).saveAs(`${out}/share-ticket.png`);mark('downloaded-real-png');
  await at(146);await click('close-dialog');await page.reload();await page.waitForSelector('.shortlist');assert.equal((await state()).route,'result');await page.evaluate(()=>scrollTo(0,0));mark('reload-restored');
  await at(149);await page.screenshot({path:`${out}/05-restored.png`});await at(151);mark('recording-complete');
  assert.equal(errors.length, 0, errors.join('\n'));
  assert(requests.every(r => r.startsWith(url + '/') || r.startsWith('blob:')), 'Unexpected outbound request');
  report.passed = true; report.errors = errors; report.outboundRequests = requests.filter(r => !r.startsWith(url + '/') && !r.startsWith('blob:'));
} catch (error) {
  report.passed = false; report.error = error.stack;
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  await context.close(); videoPath = await page.video().path();
  await browser.close();
  await rename(videoPath, `${scratch}/recording.webm`);
  await writeFile(`${out}/recording-report.json`, JSON.stringify(report, null, 2));
}

// Add clearly separated editorial captions below the unmodified browser image.
const font = process.env.DEMO_FONT || '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
await writeFile(`${scratch}/caption-label.txt`, '毕业第一站 · 城市红娘    /    WEB 真实操作录屏 · 合成测试资料 · 本地规则');
const filters = [
  'pad=1440:1000:0:0:color=0xf7f5ef',
  `drawtext=fontfile='${font}':textfile='${scratch}/caption-label.txt':fontsize=20:fontcolor=0x65655f:x=36:y=916`,
];
for (let i = 0; i < chapters.length; i++) {
  const [start, end, text] = chapters[i]; const textPath = `${scratch}/caption-${String(i).padStart(2, '0')}.txt`;
  await writeFile(textPath, text);
  filters.push(`drawtext=fontfile='${font}':textfile='${textPath}':fontsize=26:fontcolor=0x1d201e:x=36:y=950:enable='between(t,${start * speed},${end * speed})'`);
}
await writeFile(`${scratch}/captions.ffscript`, filters.join(','));
await new Promise((resolve, reject) => {
  const ffmpeg = spawn(process.env.FFMPEG || 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'warning', '-i', `${scratch}/recording.webm`,
    '-filter_script:v', `${scratch}/captions.ffscript`, '-r', '25', '-c:v', 'libx264', '-preset', 'medium', '-crf', '25',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', '-t', String(151 * speed), 'docs/demo-web.mp4'], { stdio: 'inherit' });
  ffmpeg.once('error', reject); ffmpeg.once('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)));
});
console.log(JSON.stringify({ output: 'docs/demo-web.mp4', report: `${out}/recording-report.json`, ...report }));
