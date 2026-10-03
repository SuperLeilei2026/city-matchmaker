// Playback check in an isolated headless Chromium; no user browser or network.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
  const bytes = await fs.readFile(path.join(root, 'docs/demo-native.mp4'));
  const record = JSON.parse(await fs.readFile(path.join(__dirname, 'recording-report.json'), 'utf8'));
  if (hash(await fs.readFile(path.join(root, 'bundle/main.splash'))) !== record.productionMainSHA256) throw Error('Production source changed');
  if (hash(bytes) !== record.video.sha256) throw Error('Video differs from the recorded artifact');
  const browser = await chromium.launch({ headless: true });
  let playback;
  try {
    const page = await browser.newPage({ viewport: { width: 700, height: 1000 } });
    await page.route('http://native-demo.test/video.mp4', (route) => route.fulfill({ contentType: 'video/mp4', body: bytes }));
    await page.setContent('<video src="http://native-demo.test/video.mp4" muted controls style="height:95vh"></video>');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
    await page.locator('video').evaluate((video) => video.play());
    await page.waitForFunction(() => document.querySelector('video').currentTime > 0.5);
    playback = await page.locator('video').evaluate((video) => ({ duration: video.duration, width: video.videoWidth, height: video.videoHeight, currentTime: video.currentTime }));
    if (playback.width !== 920 || playback.height !== 1840 || Math.abs(playback.duration - record.video.duration) > .1) throw Error('Unexpected encoded dimensions or duration');
  } finally { await browser.close(); }
  const result = {
    checkedAt: new Date().toISOString(), passed: true, playback,
    playbackMethod: 'Headless Chromium; actual local MP4 bytes fulfilled in isolated route',
    fullDecode: 'ffmpeg complete decode without errors, recorded in recording-report.json',
    productionMainSHA256: record.productionMainSHA256, productionMainStillCurrent: true,
    videoSHA256: hash(bytes), bytes: bytes.length,
  };
  await fs.writeFile(path.join(__dirname, 'playback-validation.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
})().catch((error) => { console.error(error); process.exit(1); });
