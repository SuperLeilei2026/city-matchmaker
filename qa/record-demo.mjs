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
const url = process.env.DEMO_URL || 'http://127.0.0.1:4318';
const speed = Number(process.env.DEMO_TIME_SCALE || 1);
const chapters = [
  [0, 8, '毕业第一站：先认识一座城市，再用反馈把选择聊清楚。'],
  [8, 18, '资料留空时，会明确说分不出先后，不假装算出唯一答案。'],
  [18, 33, '重新开始。小舟、示例大学及下面的资料，均为合成演示数据。'],
  [33, 40, '性格标签用来自我介绍；MBTI、星座和院校不参与排序。'],
  [40, 54, '科技方向，喜欢户外和演出；房租预算只留下待核验条件。'],
  [54, 60, '第一问确认取舍：这次把更对口的工作放在前面。'],
  [60, 78, '先认识上海。看推荐理由，也看资料缺口与需要接受的代价。'],
  [78, 90, '明确不考虑上海；第二问追问生活里最想经常做的事。'],
  [90, 104, '选择户外后重新比较：上海已移出，结果说明为什么变化。'],
  [104, 117, '翻到车票背面：查看公开来源，区分人工整理与未知条件。'],
  [117, 125, '换小狗介绍人，只换表达方式，候选排序保持不变。'],
  [125, 140, '生成并实际下载城市车票；分享不包含昵称、学校、年龄或预算。'],
  [140, 151, '刷新后进度仍在。此片是 Web 本地规则演示，不代表真实 Agent 已接通。'],
];
await writeFile(`${out}/chapters.json`, JSON.stringify(chapters, null, 2));
const sourcePaths = ['web/app.mjs', 'web/styles.css', 'web/index.html', 'core/matcher.mjs', 'core/questions.mjs', 'data/cities.json'];
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
  await page.goto(url); await page.waitForSelector('input[data-field="nickname"]');
  started = Date.now(); mark('welcome');
  await at(5); await click('next-profile'); await at(6); await click('next-profile'); await at(7); await click('next-profile');
  await at(8); await click('skip-question');
  assert.match(await page.locator('.result-limit').first().innerText(), /分不出先后/); mark('empty-profile-tie');
  await at(13); await page.screenshot({ path: `${out}/01-empty.png`, fullPage: false });
  await at(18); await click('privacy'); await at(19); await click('confirm-reset'); await at(20); await click('reset');
  assert.equal(await page.evaluate(() => localStorage.getItem('city-matchmaker-v1')), null);
  await at(22); await field('nickname').fill('小舟'); await at(24); await field('ageBand').selectOption('21-24');
  await at(26); await field('currentCity').fill('武汉'); await at(28); await field('school').fill('示例大学');
  await at(30); await field('major').fill('数字媒体'); mark('synthetic-profile');
  await at(33); await click('profile-tab', '1'); await at(35); await field('mbti').selectOption('INFP');
  await at(37); await field('admiredTraits', 'independent').click();
  await at(40); await click('profile-tab', '2'); await at(42); await field('industry', 'tech').click();
  await at(44); await field('role').fill('产品设计'); await at(46); await field('rentBudget').selectOption('2500');
  await at(48); await field('interests', 'nature').click(); await at(50); await field('interests', 'live').click();
  await at(54); await click('next-profile'); await at(58); await click('answer', 'career');
  report.firstCityId = (await state()).firstCityId; assert.equal(report.firstCityId, 'shanghai'); mark('first-city-shanghai');
  await at(64); await page.screenshot({ path: `${out}/02-first-city.png`, fullPage: false });
  await at(67); await scrollTo(page.locator('.tradeoff').first());
  await at(75); await scrollTo(page.locator('.feedback-grid'));
  await at(78); await click('feedback', 'not-this-city'); mark('explicit-rejection');
  await at(87); await click('answer', 'nature');
  const resultState = await state(); assert.equal(resultState.route, 'result');
  assert(resultState.profile.excludedCityIds.includes('shanghai'));
  report.finalCityNames = await page.locator('.shortlist button b').allTextContents();
  assert(!report.finalCityNames.includes('上海')); mark('reordered-result');
  await at(95); await page.screenshot({ path: `${out}/03-result.png`, fullPage: false });
  await at(100); await scrollTo(page.locator('.tradeoff').first());
  await at(104); await click('evidence'); assert(await page.locator('#dialog-content a').count() > 0); mark('source-modal');
  await at(110); await scrollTo(page.locator('#dialog-content a').first());
  await at(114); await page.screenshot({ path: `${out}/04-sources.png`, fullPage: false });
  await at(117); await click('close-dialog'); await page.evaluate(() => scrollTo(0, 0));
  await at(119); await click('guide', 'dog');
  assert.deepEqual(await page.locator('.shortlist button b').allTextContents(), report.finalCityNames); mark('guide-switch-preserves-ranking');
  await at(124); await scrollTo(page.locator('.share-actions'));
  await at(127); await click('share-card'); await page.waitForSelector('.share-preview-image'); mark('share-preview');
  await at(133); await scrollTo(page.locator('a[download]'));
  const downloadEvent = page.waitForEvent('download'); await page.locator('a[download]').click();
  const download = await downloadEvent; await download.saveAs(`${out}/share-ticket.png`); mark('downloaded-real-png');
  await at(137); await click('close-dialog');
  await at(140); await page.reload(); await page.waitForSelector('.shortlist');
  assert.equal((await state()).route, 'result'); await page.evaluate(() => scrollTo(0, 0)); mark('reload-restored-result');
  await at(145); await page.screenshot({ path: `${out}/05-restored.png`, fullPage: false });
  await at(151); mark('recording-complete');
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
