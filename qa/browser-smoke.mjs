import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.APP_URL||'http://127.0.0.1:4319';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce',acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-matchmaker-v1')));
const click=async(a,v)=>{await page.locator(`[data-action="${a}"]${v?`[data-value="${v}"]`:''}`).first().click();};
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
const checks=[];
try{
 await mkdir('qa',{recursive:true});await page.goto(base);await page.waitForSelector('[data-action="role"]');
 await page.screenshot({path:'qa/desktop-welcome.png',fullPage:true});await noOverflow();
 await click('role','design');await page.locator('.optional-details summary').click();await page.locator('[data-field="nickname"]').fill('合成体验者');await page.locator('[data-field="school"]').fill('合成隐私学校');await page.locator('[data-field="mbti"]').fill('INTP');
 await click('next-profile');
 for(const value of ['new','nature','regular','build','balanced']){await click('scene',value);await click('next-profile');}
 await page.locator('.optional-details summary').click();await page.locator('[data-field="rentBudget"]').fill('4000');await page.locator('[data-field="maxCommuteMinutes"]').fill('35');await click('choose','primary-shared');await click('next-profile');
 assert.equal((await state()).route,'portrait');assert.equal(await page.locator('.portrait-lines button').count(),5);await page.screenshot({path:'qa/desktop-portrait.png',fullPage:true});
 await click('confirm-portrait');const first=(await state()).firstCityId;assert(first);await page.screenshot({path:'qa/desktop-first-match.png',fullPage:true});
 await click('feedback','heart');await click('feedback-dimension','recovery');assert((await page.locator('h2').first().innerText()).includes('恢复'));await click('answer','quiet');
 const result=await state();assert.equal(result.route,'result');assert.equal(result.profile.joy.recovery,'quiet');assert.equal(result.profile.joy.novelty,'new');assert(result.profile.feedback.length);await page.screenshot({path:'qa/desktop-result.png',fullPage:true});
 const before=(await state()).profile;await click('guide','cat');const after=(await state()).profile;assert.deepEqual(after.joy,before.joy);assert.deepEqual(after.excludedCityIds,before.excludedCityIds);assert.equal(after.rentBudget,4000);assert.equal(after.guide,'cat');
 await page.reload();await page.waitForSelector('.shortlist');assert.equal((await state()).route,'result');
 await click('share-card');await page.waitForSelector('.share-preview-image');assert(!((await page.locator('#dialog-content').innerText()).includes('合成隐私学校')));const downloadEvent=page.waitForEvent('download');await page.locator('a[download]').click();const download=await downloadEvent;await download.saveAs('qa/share-ticket.png');await click('close-dialog');
 await click('evidence');assert(await page.locator('#dialog-content a').count()>0);await click('close-dialog');
 for(const w of [390,320]){await page.setViewportSize({width:w,height:844});await noOverflow();await page.screenshot({path:`qa/mobile-result-${w}.png`,fullPage:true});}
 await click('edit-profile');await click('confirm-portrait');await click('feedback','heart');await click('feedback-dimension','recovery');assert((await page.locator('h2').first().innerText()).includes('恢复'));await click('skip-question');await click('edit-profile');await click('confirm-portrait');const rejected=(await state()).firstCityId;await click('feedback','not-this-city');await click('skip-question');assert((await state()).profile.excludedCityIds.includes(rejected));assert.equal(await page.locator(`.shortlist [data-value="${rejected}"]`).count(),0);
 // Editing metadata cannot restore a rejected city or erase feedback.
 await click('edit-profile');await click('edit-dimension','0');await page.locator('.optional-details summary').click();await page.locator('[data-field="nickname"]').fill('换个称呼');assert((await state()).profile.excludedCityIds.includes(rejected));assert((await state()).profile.feedback.some(f=>f.reasonId==='not-this-city'));
 await page.locator('[data-field="mbti"]').fill('<img src=x onerror=alert(1)>');await page.screenshot({path:'qa/mobile-welcome.png',fullPage:true});await noOverflow();
 checks.push('5 scenes → editable portrait → first city → dimension feedback → refinement → result','cat/dog change lens and preserve answers/constraints','reload persistence','PNG download and source links','390px/320px overflow','explicit rejection survives metadata edits');
 // Upgrade old local state without inventing five new answers or losing exclusions.
 await page.evaluate(()=>localStorage.setItem('city-matchmaker-v1',JSON.stringify({version:1,route:'result',profile:{guide:'cat',nickname:'旧版合成用户',interests:['nature'],rentBudget:2500,excludedCityIds:['shanghai'],feedback:[{cityId:'shanghai',reasonId:'not-this-city'}]}})));
 await context.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='city-matchmaker-v1-backup')throw new DOMException('quota','QuotaExceededError');return set.call(this,k,v);};});await page.reload();await page.waitForSelector('[data-action="role"]');await click('preview-portrait');const migrated=await state();assert.equal(migrated.version,2);assert.equal(migrated.profile.guide,'cat');assert(migrated.profile.excludedCityIds.includes('shanghai'));assert(Object.values(migrated.profile.joy).every(x=>x===null));assert.equal(migrated.profile.nickname,'旧版合成用户');
 await click('privacy');await click('confirm-reset');await click('reset');assert.equal(await page.evaluate(()=>localStorage.getItem('city-matchmaker-v1')),null);assert.equal(await page.evaluate(()=>localStorage.getItem('city-matchmaker-v1-backup')),null);
 await click('preview-portrait');await click('confirm-portrait');assert((await page.locator('.result-limit').first().innerText()).includes('不足'));await noOverflow();await click('feedback','unsure');await click('skip-question');assert.equal((await state()).route,'result');
 checks.push('v1 migration survives backup quota failure and retains exclusions with null new dimensions','new session reasks chosen feedback dimension','clear deletes both state and migration backup','empty portrait remains explicitly uncertain');
 assert.equal(errors.length,0,errors.join('\n'));assert(requests.every(url=>url.startsWith(base+'/')||url===base+'/'||url.startsWith('blob:')),'Unexpected outbound request');
 const report={version:'0.3.0',passed:true,firstCityId:first,afterFeedbackCityId:result.selectedCityId,checks,errors,remoteProfileRequests:0};
 await writeFile('qa/browser-smoke-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
