import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const bytes=await readFile('docs/demo-web.mp4'),record=JSON.parse(await readFile('qa/demo-web/recording-report.json','utf8'));
const sourceHashesStillMatch={};for(const [file,hash]of Object.entries(record.sourceHashes)){sourceHashesStillMatch[file]=createHash('sha256').update(await readFile(file)).digest('hex')===hash;assert(sourceHashesStillMatch[file],file);}
execFileSync(process.env.FFMPEG||'ffmpeg',['-v','error','-i','docs/demo-web.mp4','-f','null','-']);
const browser=await chromium.launch({headless:true});let playback;
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.route('http://joy-demo.test/video.mp4',r=>r.fulfill({contentType:'video/mp4',body:bytes}));await page.setContent('<video src="http://joy-demo.test/video.mp4" muted controls style="width:100%"></video>');await page.waitForFunction(()=>document.querySelector('video').readyState>=2);await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>.5);playback=await page.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight,currentTime:v.currentTime}));assert.equal(playback.duration,151);assert.equal(playback.width,1440);}finally{await browser.close();}
await writeFile('qa/demo-video-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),version:'0.3.0',playback,playbackMethod:'Chromium; actual MP4 bytes served by isolated local route',fullDecode:'ffmpeg complete decode without errors',sourceHashesStillMatch,mp4Sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length},null,2)+'\n');console.log(JSON.stringify({passed:true,playback,sourceHashesStillMatch}));
