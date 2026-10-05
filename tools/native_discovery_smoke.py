#!/usr/bin/env python3
"""Real native v0.4 discovery regression. Synthetic inputs; no model calls."""
import argparse, datetime, hashlib, json, os
from pathlib import Path
import shutil, subprocess, tempfile, time
from native_agent_smoke import run_host
ROOT=Path(__file__).resolve().parents[1]

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--card-host',default=os.environ.get('OCTO_CARD_HOST'))
    p.add_argument('--hub',default=os.environ.get('OCTO_HUB'))
    p.add_argument('--port',type=int,default=18141)
    p.add_argument('--out',type=Path,default=ROOT/'qa/native-discovery-check.json')
    args=p.parse_args()
    if not args.card_host or not args.hub:p.error('Pass --card-host and --hub')
    args.card_host=str(Path(args.card_host).resolve());args.hub=str(Path(args.hub).resolve())
    tmp=Path(tempfile.mkdtemp(prefix='city-native-discovery-'));bundle=tmp/'bundle';shutil.copytree(ROOT/'bundle',bundle)
    initial_sha=hashlib.sha256((bundle/'main.splash').read_bytes()).hexdigest()
    state=tmp/'state';sf=state/'leilei-city-matchmaker/match.json';checks=[];saved_pair=[];asked_dimension=[]
    def labels(d):return d.labels()
    def stage1(d):
        assert any('先看看你喜欢的日常' in x for x in labels(d)),labels(d)
        buttons=[x for x in d.snap() if x['ty']=='Button']
        for name in ['留着看看 ♡','下一座 →']:
            b=next(x for x in buttons if x.get('t')==name);assert b['r'][1]>=0 and b['r'][1]+b['r'][3]<=820 and b['r'][3]>=44,b
        assert not any('学校' in x or '怎么称呼' in x for x in labels(d)),labels(d)
        svg=next(x for x in d.snap() if x['ty']=='Svg');assert svg['r'][2]>300 and svg['r'][3]==160,svg
        checks.append('native_svg_scene_visible_at_160px')
        d.shot(tmp/'01-discovery.png');d.click('下一座 →')
        before=json.loads(sf.read_text());assert before[0]=='city-matchmaker-v3' and len(before)==46
        assert before[24]==[] and before[30:35]==['']*5 and len(before[41])==1
        d.click('留着看看 ♡');first=json.loads(sf.read_text());assert first[1]==20 and len(first[40])==1 and first[39] not in first[40]
        d.click('留着看看 ♡');second=json.loads(sf.read_text());assert second[1]==21 and len(second[40])==2 and second[24]==[] and second[30:35]==['']*5
        saved_pair.extend(second[40]);d.shot(tmp/'02-comparison.png')
        d.click('我还拿不准')
        question=json.loads(sf.read_text());dim=question[45];assert 0<=dim<5
        asked_dimension.append(dim)
        d.click('资料')
        assert json.loads(sf.read_text())[42]==21
        d.click('回到刚才')
        assert json.loads(sf.read_text())[1]==21 and json.loads(sf.read_text())[40]==saved_pair
        d.click('我还拿不准')
        assert json.loads(sf.read_text())[45]==dim
        checks.append('profile_from_optional_question_returns_to_comparison')
        d.shot(tmp/'03-optional-question.png')
        config=json.loads((ROOT/'data/joy-config.json').read_text());option=config['dimensions'][dim]['options'][0]
        d.click(option['label'])
        answered=json.loads(sf.read_text());assert answered[1]==21 and answered[45]==-2-dim and answered[30+dim]==option['id'] and answered[40]==saved_pair
        d.scroll(300)
        assert any('你选了' in x for x in labels(d)),labels(d)
        d.top();d.click('资料');d.shot(tmp/'04-profile.png')
        d.click('修改：'+config['dimensions'][dim]['label']);d.click('这一项暂不确定')
        cleared=json.loads(sf.read_text());assert cleared[1]==21 and cleared[30+dim]=='' and cleared[45]==-2-dim and cleared[40]==saved_pair
        checks.extend(['opens_directly_to_city_card','two_primary_actions_visible_at_460x820','next_is_browse_not_rejection_or_preference','first_favorite_advances_second_opens_compare','favorites_never_guess_joy_profile','optional_question_uses_comparable_evidence','explicit_answer_has_specific_pair_response','clearing_answer_keeps_favorites_without_crash'])
    run_host(args,bundle,state,tmp/'stage1.log',stage1)
    def edit_and_pause(d):
        cleared=json.loads(sf.read_text());assert cleared[1]==21 and cleared[30+asked_dimension[0]]=='' and cleared[40]==saved_pair
        d.scroll(300)
        assert any('这一项已清空' in x for x in labels(d)),labels(d)
        d.top();d.click('资料');d.click('修改：恢复精力')
        editing=json.loads(sf.read_text());assert editing[1]==10 and editing[38] is True and editing[42]==21
        checks.append('cleared_comparison_answer_survives_restart')
    run_host(args,bundle,state,tmp/'edit-and-pause.log',edit_and_pause)
    def stage2(d):
        assert any('累了一周' in x for x in labels(d)),labels(d)
        d.click('○ 到水边、树下走走')
        current=json.loads(sf.read_text());assert current[1]==21 and current[38] is False and current[40]==saved_pair and current[31]=='nature'
        d.click('继续逛 →');before=json.loads(sf.read_text());current_id=before[39]
        d.click('换个视角');after=json.loads(sf.read_text());assert after[40]==before[40] and after[30:35]==before[30:35] and after[24]==before[24]
        d.click('留着看看 ♡');full=json.loads(sf.read_text());assert full[40]==saved_pair and full[1]==21
        cities=json.loads((ROOT/'data/cities.json').read_text());names={c['id']:c['name'] for c in cities}
        d.top();d.click('移除'+names[saved_pair[0]]);assert json.loads(sf.read_text())[40]==saved_pair[1:]
        d.click('继续逛 →')
        for _ in range(10):
            if '这一轮看完了。' in labels(d):break
            d.click('下一座 →')
        assert '这一轮看完了。' in labels(d),labels(d)
        exhausted=json.loads(sf.read_text());assert exhausted[24]==[] and exhausted[31]=='nature'
        d.shot(tmp/'05-exhausted.png');d.click('再逛一轮 →')
        restarted=json.loads(sf.read_text());assert restarted[1]==20 and restarted[41]==[] and restarted[40]==saved_pair[1:] and restarted[31]=='nature'
        d.click('细节与来源');target=json.loads(sf.read_text())[43];assert target==restarted[39]
        d.click('用一句话请 Agent 帮忙');d.click('我想调整的是…');d.type('请帮我避开潮湿天气。');d.click('让 Agent 提出修改');d.scroll(120)
        assert any('应用 Agent 当前不可用' in x for x in labels(d)),labels(d)
        assert json.loads(sf.read_text())[19]==restarted[19]
        d.shot(tmp/'06-detail.png')
        checks.extend(['restart_preserves_portrait_edit_and_comparison_return','guide_switch_preserves_likes_and_explicit_answers','third_favorite_requires_removal','remove_favorite_preserves_profile','eight_city_round_has_explicit_exhausted_state','restart_round_keeps_likes_and_profile','agent_detail_targets_displayed_city','unavailable_agent_keeps_profile'])
    run_host(args,bundle,state,tmp/'stage2.log',stage2)
    assert hashlib.sha256((ROOT/'bundle/main.splash').read_bytes()).hexdigest()==initial_sha,'Production changed during native UI verification'
    report={'date':datetime.date.today().isoformat(),'version':'0.4.0','production_main_sha256':hashlib.sha256((ROOT/'bundle/main.splash').read_bytes()).hexdigest(),'synthetic_inputs_only':True,'real_model_called':False,'production_ui_checks':checks}
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    for name in ['01-discovery.png','02-comparison.png','03-optional-question.png','04-profile.png']:shutil.copyfile(tmp/name,ROOT/'bundle/screenshots'/name)
    print('PASS:',len(checks),'native discovery UI checks; evidence:',tmp)
if __name__=='__main__':main()
