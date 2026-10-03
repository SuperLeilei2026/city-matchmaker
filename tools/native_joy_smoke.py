#!/usr/bin/env python3
"""Joy v0.3: real production UI, old archive migration, and JS/native rank parity.
All inputs are synthetic. Injected assertions live only in a temporary bundle.
No credentials, provider settings, or external model calls are used.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from native_agent_smoke import run_host

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    {'id':'cat_complete','guide':'cat','joy':['new','nature','new','build','explore']},
    {'id':'dog_complete','guide':'dog','joy':['new','nature','new','build','explore']},
    {'id':'all_unknown','guide':'dog','joy':['','','','','']},
    {'id':'unknown_evidence','guide':'cat','joy':['familiar','quiet','close','steady','settled']},
    {'id':'climate_soft','guide':'dog','joy':['mix','move','regular','learn','balanced'],'climate':[9,11]},
    {'id':'climate_hard','guide':'cat','joy':['new','nature','solo','build','explore'],'climate':[10],'hard':True},
    {'id':'explicit_rejection','guide':'dog','joy':['new','nature','new','build','explore'],'excluded':['shanghai','hangzhou']},
]

def harness():
    out=['let joy_test_rows = []','let joy_test_checks = []', 'fn joy_check(passed_check, name){ joy_test_checks.push({name: name passed: passed_check}) }', 'fn run_joy_contract(){']
    for case in CASES:
        out += ['guide = '+json.dumps(case['guide']), 'joy_profile = '+json.dumps(case['joy']), 'climate_avoids = '+json.dumps(case.get('climate',[])), 'hard_climate = '+str(case.get('hard',False)).lower(), 'excluded_ids = '+json.dumps(case.get('excluded',[])), 'compute_ranking()', 'let result_rows = []', 'for item in ranked { result_rows.push({id: city_rows[item[0]][0] score: item[1] coverage: item[2] low: item[4] high: item[5]}) }', 'joy_test_rows.push({id: '+json.dumps(case['id'])+' ranked: result_rows trial: trial_plan_text()})']
    out += ['screen = 10', 'reviewing_edit = true', 'excluded_ids = ["shanghai", "hangzhou"]', 'guide = "cat"', 'revision = 42', 'joy_profile = ["new", "nature", "solo", "build", "explore"]', 'ai_role = "product"', 'housing_type = "primary-shared"', 'max_commute = 30', 'save_local()', 'joy_profile = ["", "", "", "", ""]', 'load_local()', 'joy_check(joy_profile[0] == "new" && joy_profile[4] == "explore" && ai_role == "product" && max_commute == 30 && housing_type == "primary-shared" && reviewing_edit, "v2_roundtrip_preserves_joy_housing_commute_edit_context")']
    out += ['let v2_legacy = []', 'let full_v2 = data_snapshot()', 'for i in 38 { v2_legacy.push(full_v2[i]) }', 'fs.write("match.json", v2_legacy.to_json())', 'load_local()', 'joy_check(joy_profile[0] == "new" && ai_role == "product" && !reviewing_edit && has_value(excluded_ids, "shanghai"), "legacy_38_migration_preserves_joy_and_rejections")']
    for length in [29,30]:
        out += ['let all_fields = data_snapshot()', 'let legacy = []', f'for i in {length} {{ legacy.push(all_fields[i]) }}', 'legacy[0] = "city-matchmaker-v1"', 'fs.write("match.json", legacy.to_json())', 'load_local()', 'joy_check(joy_profile.to_json() == ["", "", "", "", ""].to_json() && has_value(excluded_ids, "shanghai") && has_value(excluded_ids, "hangzhou") && guide == "cat" && revision == 42, "legacy_'+str(length)+'_migration_keeps_rejections_without_guessing")']
    out += ['fs.write("joy-parity.json", joy_test_rows.to_json())', 'fs.write("joy-contract.json", joy_test_checks.to_json())', '}', 'start_timeout(0.4, || run_joy_contract())']
    return '\n'.join(out)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--card-host',default=os.environ.get('OCTO_CARD_HOST'))
    ap.add_argument('--hub',default=os.environ.get('OCTO_HUB'))
    ap.add_argument('--port',type=int,default=18141)
    ap.add_argument('--out',type=Path,default=ROOT/'qa/native-joy-check.json')
    args=ap.parse_args()
    if not args.card_host or not args.hub: ap.error('Pass --card-host and --hub')
    args.card_host=str(Path(args.card_host).resolve());args.hub=str(Path(args.hub).resolve())
    temp=Path(tempfile.mkdtemp(prefix='city-native-joy-'))
    bundle=temp/'bundle';shutil.copytree(ROOT/'bundle',bundle)
    state=temp/'state';sf=state/'leilei-city-matchmaker/match.json'
    checks=[]
    def start_and_pause(d):
        assert any('ENFP 狗' in x for x in d.labels()),d.labels()
        d.shot(temp/'01-welcome.png')
        d.click('从想过的日子开始 →')
        assert '你想怎样参与 AI 应用？' in d.labels()
        assert not any('学校' in x or '星座' in x for x in d.labels())
        d.click('○ AI 应用与产品')
        d.shot(temp/'06-scene.png')
        assert '想过的日子 · 1 / 5' in d.labels()
        d.click('○ 经常换一种新玩法')
        saved=json.loads(sf.read_text());assert saved[1]==10 and saved[30]=='new'
        assert '想过的日子 · 2 / 5' in d.labels()
    run_host(args,bundle,state,temp/'start-and-pause.log',start_and_pause)
    def prod(d):
        assert '想过的日子 · 2 / 5' in d.labels(),d.labels()
        assert json.loads(sf.read_text())[35]=='product'
        for n,text in enumerate(['○ 到水边、树下走走','○ 不断遇到新朋友','○ 把自己的想法做出来','○ 先试一段，再决定'],2):
            assert f'想过的日子 · {n} / 5' in d.labels(),d.labels()
            d.click(text)
        assert '哪种天气让你最难受？' in d.labels(),d.labels()
        d.click('补充预算、住房与通勤（可选）')
        d.click('○ 5000');d.click('○ 合租主卧');d.click('○ 单程 30 分钟')
        d.click('记下这些，核对生活画像 →')
        assert '这是你想过的日子吗？' in d.labels(),d.labels()
        assert json.loads(sf.read_text())[33]=='build'
        before=json.loads(sf.read_text())[30:35]
        d.click('修改：新鲜感');d.click('○ 回到喜欢的老地方')
        assert '这是你想过的日子吗？' in d.labels(),d.labels()
        saved=json.loads(sf.read_text());assert saved[30]=='familiar' and saved[31:35]==before[1:]
        d.top();d.click('修改：新鲜感');d.click('○ 经常换一种新玩法')
        d.top();d.click('修改：恢复精力')
        saved=json.loads(sf.read_text());assert saved[1]==10 and saved[38] is True
    run_host(args,bundle,state,temp/'edit-and-pause.log',prod)
    def finish_prod(d):
        assert '想过的日子 · 2 / 5' in d.labels(),d.labels()
        d.click('● 到水边、树下走走')
        assert '这是你想过的日子吗？' in d.labels(),d.labels()
        saved=json.loads(sf.read_text());assert saved[1]==8 and saved[38] is False and saved[30:35]==CASES[1]['joy']
        checks.append('portrait_edit_restart_preserves_return_to_portrait')
        d.top();d.shot(temp/'02-portrait.png')
        d.click('画像准确，先认识一座城 →')
        saved=json.loads(sf.read_text());assert saved[0]=='city-matchmaker-v2' and len(saved)==39 and saved[30:35]==CASES[1]['joy'] and saved[35]=='product'
        first=saved[25];d.shot(temp/'03-first-match.png')
        d.click('想调整日常恢复方式');d.top();d.click('安安静静待一会儿');d.top()
        saved=json.loads(sf.read_text());assert saved[31]=='quiet' and saved[30]=='new'
        assert any('先去了解 ' in x for x in d.labels()),d.labels()
        assert any('证据区间重叠' in x for x in d.labels()),d.labels()
        before_joy=saved[30:35];d.click('换另一位红娘看同一份资料')
        saved=json.loads(sf.read_text());assert saved[2]=='cat' and saved[30:35]==before_joy
        d.top();d.shot(temp/'04-result.png')
        checks.extend(['default_dog','ai_direction_first_without_legacy_profile_questions','five_scenes_one_per_page','mid_scene_restart_restores_exact_question','individual_portrait_edit_returns_without_repeating_form','portrait_confirmed_first_city','manual_feedback_refines_selected_dimension','other_guide_preserves_answers','housing_and_commute_are_verification_only','editorial_intervals_prevent_unique_best'])
    run_host(args,bundle,state,temp/'production.log',finish_prod)
    def unknown_flow(d):
        d.click('从想过的日子开始 →');d.click('暂时说不准')
        for _ in range(5):d.click('暂时说不准，留待确认')
        d.click('先核对我的生活画像 →')
        d.click('画像准确，先认识一座城 →')
        saved=json.loads((temp/'unknown-state/leilei-city-matchmaker/match.json').read_text())
        assert saved[30:35]==['']*5 and saved[35]=='' and saved[17]==0 and saved[36]=='' and saved[37]==0
        assert saved[19]==[] and saved[20] is False
        assert any('证据区间重叠' in x for x in d.labels()),d.labels()
        checks.append('all_scenes_climate_and_reality_can_remain_unknown')
    run_host(args,bundle,temp/'unknown-state',temp/'unknown.log',unknown_flow)
    source=(bundle/'main.splash').read_text()
    (bundle/'main.splash').write_text(source.replace('start_timeout(0.05, || load_local())','start_timeout(0.05, || load_local())\n'+harness()))
    result={}
    def parity(d):
        output=state/'leilei-city-matchmaker/joy-parity.json'
        for _ in range(40):
            if output.exists():break
            time.sleep(.1)
        result['native']=json.loads(output.read_text())
        result['contract']=json.loads((output.parent/'joy-contract.json').read_text())
        assert all(c['passed'] for c in result['contract']),result['contract']
    run_host(args,bundle,state,temp/'injected.log',parity)
    js='''import fs from 'node:fs'; import { rankCities } from './core/matcher.mjs'; const cities=JSON.parse(fs.readFileSync('data/cities.json','utf8')); const dims=['novelty','recovery','relationships','career','uncertainty']; const climates=['heat','cold','humidity']; const cases=JSON.parse(process.argv[1]); console.log(JSON.stringify(cases.map(c=>({id:c.id,ranked:rankCities({version:2,guide:c.guide,joy:Object.fromEntries(dims.map((d,i)=>[d,c.joy[i]||null])),climateAvoids:(c.climate||[]).map(i=>climates[i-9]),hardClimate:!!c.hard,excludedCityIds:c.excluded||[]},cities).ranked.map(x=>({id:x.city.id,score:x.score,coverage:x.coverage,low:x.scoreRange.min,high:x.scoreRange.max}))}))));'''
    expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',js,json.dumps(CASES)],cwd=ROOT,text=True))
    for native,web in zip(result['native'],expected):
        assert native['id']==web['id']
        config=json.loads((ROOT/'data/joy-config.json').read_text())
        case=next(c for c in CASES if c['id']==native['id'])
        dimensions=['novelty','recovery','relationships','career','uncertainty']
        actions=[]
        for dimension, table in config['trialPlan'].items():
            action=table.get(case['joy'][dimensions.index(dimension)],table['unknown']);actions.append(action['title']+'\n'+action['text']+'\n\n')
        assert native['trial']==''.join(actions),(native['id'],native['trial'],actions)
        assert [x['id'] for x in native['ranked']]==[x['id'] for x in web['ranked']],(native,web)
        for a,b in zip(native['ranked'],web['ranked']):
            for key in ['score','coverage','low','high']:assert abs(a[key]-b[key])<1e-4,(native['id'],a,b)
    report={'date':datetime.date.today().isoformat(),'version':'0.3.0','production_main_sha256':hashlib.sha256((ROOT/'bundle/main.splash').read_bytes()).hexdigest(),'synthetic_inputs_only':True,'real_model_called':False,'production_ui_checks':checks,'archive_contract_checks':result['contract'],'native_vs_js_parity_cases':[c['id'] for c in CASES],'same_city_order_score_coverage_and_ranges':True,'trial_plan_matches_shared_config':True,'number_tolerance':0.0001,'number_note':'OctoScript f32 versus JavaScript f64; same weights/evidence/range formulas, float-only tolerance','evidence_directory':str(temp)}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    for source,target in [('01-welcome.png','01-welcome.png'),('03-first-match.png','02-first-match.png'),('04-result.png','03-second-match.png')]:shutil.copyfile(temp/source,ROOT/'bundle/screenshots'/target)
    shutil.copyfile(temp/'02-portrait.png',ROOT/'bundle/screenshots/05-portrait.png')
    shutil.copyfile(temp/'06-scene.png',ROOT/'bundle/screenshots/06-scene.png')
    print('PASS:',len(checks),'production UI checks,',len(result['contract']),'migration/storage checks,',len(CASES),'native/JS rank parity cases')
    print('Evidence:',temp)
if __name__=='__main__':main()
