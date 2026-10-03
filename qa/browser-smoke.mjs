import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce',acceptDownloads:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-matchmaker-v1')));
const click=async(a,v)=>{await page.locator(`[data-action="${a}"]${v?`[data-value="${v}"]`:''}`).first().click();};
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const reports=[];
try{
 await mkdir('qa',{recursive:true});await page.goto('http://127.0.0.1:4318');await page.waitForSelector('input[data-field="nickname"]');await page.screenshot({path:'qa/desktop-welcome.png',fullPage:true});
 await page.locator('[data-field="nickname"]').fill('合成体验者');await page.locator('[data-field="school"]').fill('合成隐私学校');await page.locator('select[data-field="ageBand"]').selectOption('21-24');
 await click('profile-tab','1');await page.locator('select[data-field="mbti"]').selectOption('INTJ');await page.locator('select[data-field="admiredMbti"]').selectOption('ENFJ');await page.locator('[data-field="admiredTraits"][data-value="warm"]').click();
 await click('next-profile');await page.locator('[data-field="industry"][data-value="tech"]').click();await page.locator('[data-field="interests"][data-value="nature"]').click();await page.locator('[data-field="interests"][data-value="live"]').click();await page.locator('select[data-field="rentBudget"]').selectOption('2500');
 await click('next-profile');await click('answer','career');const first=(await state()).firstCityId;assert(first);await page.screenshot({path:'qa/desktop-first-match.png',fullPage:true});
 await click('feedback','not-this-city');await click('answer','nature');const finalState=await state();assert.equal(finalState.route,'result');assert(finalState.profile.excludedCityIds.includes(first));assert(!(await page.locator(`.shortlist [data-value="${first}"]`).count()));await page.screenshot({path:'qa/desktop-result.png',fullPage:true});
 const catCities=await page.locator('.shortlist button b').allTextContents();await click('guide','dog');assert.deepEqual(await page.locator('.shortlist button b').allTextContents(),catCities);
 await page.reload();await page.waitForSelector('.shortlist');assert.equal((await state()).route,'result');
 await click('share-card');await page.waitForSelector('.share-preview-image');const downloadEvent=page.waitForEvent('download');await page.locator('a[download]').click();const download=await downloadEvent;await download.saveAs('qa/share-ticket.png');assert((await page.locator('.share-preview-image').getAttribute('alt')).includes('城市候选'));await click('close-dialog');
 await click('evidence');assert(await page.locator('#dialog-content a').count()>0);await click('close-dialog');
 for(const w of [390,320]){await page.setViewportSize({width:w,height:844});await noOverflow();await page.screenshot({path:`qa/mobile-result-${w}.png`,fullPage:true});}
 await click('edit-profile');await page.locator('[data-field="interests"][data-value="food"]').click();const edited=await state();assert.equal(edited.firstCityId,null);assert.equal(edited.round,1);assert.deepEqual(edited.profile.feedback,[]);assert.deepEqual(edited.answerLog,[]);
 await click('privacy');await click('confirm-reset');await click('reset');assert.equal(await page.evaluate(()=>localStorage.getItem('city-matchmaker-v1')),null);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/mobile-welcome.png',fullPage:true});
 for(let i=0;i<3;i++)await click('next-profile');await click('skip-question');assert((await page.locator('.result-limit').first().innerText()).includes('分不出先后'));
 await click('feedback','unsure');await click('skip-question');assert(!((await page.locator('main').innerText()).includes('首选候选')));assert((await page.locator('.shortlist').innerText()).includes('并列候选'));await noOverflow();
 assert.equal(errors.length,0,errors.join('\n'));assert(requests.every(url=>url.startsWith('http://127.0.0.1:4318/')||url.startsWith('blob:')),'Unexpected outbound request');
 reports.push({passed:true,firstCityId:first,finalCityNames:catCities,checks:['profile tabs and inputs','first recommendation','explicit rejection removed','second-round response','guide invariance','reload persistence','PNG download','source dialog','390px and 320px overflow','edit invalidation','clear local storage','empty-profile ties','no page errors','no remote profile request'],errors});
 await writeFile('qa/browser-smoke-result.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
}finally{await browser.close();}
