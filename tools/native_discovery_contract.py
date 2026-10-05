#!/usr/bin/env python3
"""Real OctoScript discovery/storage/rank contracts in a disposable bundle only.

Synthetic inputs; no model requests, production state writes, screenshots or UI
automation against the user's window. run_host launches a separate hidden host.
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
from native_joy_smoke import CASES

ROOT = Path(__file__).resolve().parents[1]
MARKER = 'start_timeout(0.05, || load_local())'


def suppress_contract_render(source, function_name):
    """Suppress only UI rendering in the disposable function-contract build."""
    marker = f'fn {function_name}(){{'
    assert source.count(marker) == 1, f'Expected one {function_name} function'
    start = source.index(marker) + len(marker) - 1
    depth = 0
    for end in range(start, len(source)):
        if source[end] == '{':
            depth += 1
        elif source[end] == '}':
            depth -= 1
            if depth == 0:
                return source[:start] + '{}' + source[end + 1:]
    raise AssertionError(f'Unterminated {function_name} body')


def harness():
    lines = [r'''
let discovery_contract_checks = []
let discovery_contract_trace = []
let discovery_contract_ranks = []
fn discovery_contract_check(passed_check, name){ discovery_contract_checks.push({name: name passed: passed_check}) }
fn discovery_contract_capture(name){
    discovery_contract_trace.push({step: name current: current_card_id likes: liked_ids.to_json().parse_json() browsed: browsed_ids.to_json().parse_json() screen: screen joy: joy_profile.to_json().parse_json() questionAsked: comparison_dimension <= -2 questionDimension: comparison_dimension})
}
fn run_discovery_contract(){
    reset_all()
    discovery_contract_capture("init")
    next_card()
    discovery_contract_capture("next")
    keep_card()
    discovery_contract_capture("keep1")
    keep_card()
    discovery_contract_capture("keep2")
    comparison_question()
    discovery_contract_capture("question")
    if comparison_dimension >= 0 { answer_comparison(joy_dimensions[comparison_dimension][4][0][0]) }
    discovery_contract_capture("answer")
    if liked_ids.len() > 0 { remove_like(liked_ids[0]) }
    discovery_contract_capture("remove")
    restart_browsing()
    discovery_contract_capture("restart")

    // Synthetic complete v3 state, including a comparison return path and cursor.
    guide = "cat"
    nickname = "合成合同比对"
    school = "仅本地合成字段"
    revision = 42
    joy_profile = ["new", "nature", "solo", "build", "explore"]
    ai_role = "product"
    housing_type = "alone"
    rent_budget = 4000
    max_commute = 45
    interests = [4, 5]
    focus_interest = 4
    climate_avoids = [11]
    hard_climate = true
    excluded_ids = ["shanghai", "hangzhou"]
    compute_ranking()
    liked_ids = [city_rows[ranked[0][0]][0], city_rows[ranked[1][0]][0]]
    browsed_ids = liked_ids.to_json().parse_json()
    current_card_id = city_rows[ranked[2][0]][0]
    profile_return_screen = 21
    detail_city_id = liked_ids[0]
    detail_return_screen = 21
    comparison_dimension = -3
    screen = 21
    reviewing_edit = false
    let complete_v3 = data_snapshot().to_json().parse_json()
    save_local()
    joy_profile = ["", "", "", "", ""]
    liked_ids = []
    browsed_ids = []
    current_card_id = ""
    excluded_ids = []
    comparison_dimension = -1
    load_local()
    discovery_contract_check(data_snapshot().len() == 46 && data_snapshot().to_json() == complete_v3.to_json(), "v3_46_roundtrip_preserves_complete_profile_and_comparison_context")
''']
    for length in [29, 30, 38, 39]:
        marker = 'city-matchmaker-v1' if length < 38 else 'city-matchmaker-v2'
        joy = '["", "", "", "", ""]' if length < 38 else '["new", "nature", "solo", "build", "explore"]'
        extra = '' if length < 38 else ' && ai_role == "product" && housing_type == "alone" && max_commute == 45'
        lines.append(f'''
    let legacy_{length} = []
    for i in {length} {{ legacy_{length}.push(complete_v3[i]) }}
    legacy_{length}[0] = "{marker}"
    legacy_{length}[1] = 10
    fs.write("match.json", legacy_{length}.to_json())
    guide = "dog"
    joy_profile = ["", "", "", "", ""]
    excluded_ids = []
    climate_avoids = []
    nickname = ""
    load_local()
    discovery_contract_check(screen == 20 && !reviewing_edit && guide == "cat" && nickname == "合成合同比对" && revision == 42 && rent_budget == 4000 && interests.to_json() == [4, 5].to_json() && hard_climate && climate_avoids.to_json() == [11].to_json() && excluded_ids.to_json() == ["shanghai", "hangzhou"].to_json() && joy_profile.to_json() == {joy}.to_json() && liked_ids.len() == 0 && browsed_ids.len() == 0{extra}, "legacy_{length}_migration_retains_explicit_fields_without_inferred_joy")
''')
    for index, case in enumerate(CASES):
        lines.extend([
            'guide = ' + json.dumps(case['guide']),
            'joy_profile = ' + json.dumps(case['joy']),
            'climate_avoids = ' + json.dumps(case.get('climate', [])),
            'hard_climate = ' + str(case.get('hard', False)).lower(),
            'excluded_ids = ' + json.dumps(case.get('excluded', [])),
            'compute_ranking()',
            f'let rank_rows_{index} = []',
            f'for item in ranked {{ rank_rows_{index}.push({{id: city_rows[item[0]][0] score: item[1] coverage: item[2] low: item[4] high: item[5]}}) }}',
            f'discovery_contract_ranks.push({{id: {json.dumps(case["id"])} ranked: rank_rows_{index} trial: trial_plan_text()}})',
        ])
    lines.extend([
        'fs.write("discovery-contract-output.json", {checks: discovery_contract_checks trace: discovery_contract_trace ranks: discovery_contract_ranks}.to_json())',
        '}',
        'start_timeout(0.4, || run_discovery_contract())',
    ])
    return '\n'.join(lines)


JS_REFERENCE = r'''
import fs from 'node:fs';
import {rankCities,buildTrialPlan} from './core/matcher.mjs';
import {createDiscovery,browseNext,toggleFavorite,getComparisonQuestion,answerComparison,restartBrowse} from './core/discovery.mjs';
const cities=JSON.parse(fs.readFileSync('data/cities.json','utf8'));
const dims=['novelty','recovery','relationships','career','uncertainty'];
const climates=['heat','cold','humidity'];
const trace=[];
let state=createDiscovery({},cities);
function capture(step){trace.push({step,current:state.currentCityId||'',likes:[...state.likedCityIds],browsed:[...state.browsedCityIds],view:state.view,joy:dims.map(d=>state.profile.joy[d]||''),questionAsked:state.questionAsked});}
capture('init'); state=browseNext(state,cities); capture('next');
state=toggleFavorite(state,state.currentCityId,cities);capture('keep1');
state=toggleFavorite(state,state.currentCityId,cities);capture('keep2');
const question=getComparisonQuestion(state,cities);capture('question');
if(question) state=answerComparison(state,cities,question.options[0].id,question.id);capture('answer');
state=toggleFavorite(state,state.likedCityIds[0],cities);capture('remove');
state=restartBrowse(state,cities);capture('restart');
const ranks=JSON.parse(process.argv[1]).map(c=>{
 const profile={version:2,guide:c.guide,joy:Object.fromEntries(dims.map((d,i)=>[d,c.joy[i]||null])),climateAvoids:(c.climate||[]).map(i=>climates[i-9]),hardClimate:!!c.hard,excludedCityIds:c.excluded||[]};
 return {id:c.id,ranked:rankCities(profile,cities).ranked.map(x=>({id:x.city.id,score:x.score,coverage:x.coverage,low:x.scoreRange.min,high:x.scoreRange.max})),trial:buildTrialPlan(profile).map(x=>x.title+'\n'+x.text+'\n\n').join('')};
});
console.log(JSON.stringify({trace,questionDimension:question?dims.indexOf(question.dimension):-1,ranks}));
'''


def verify(actual, expected):
    assert len(actual['checks']) == 5, actual['checks']
    assert all(item['passed'] for item in actual['checks']), actual['checks']
    assert len(actual['trace']) == len(expected['trace']) == 8
    screens = {20: 'browse', 21: 'compare', 22: 'exhausted', 23: 'compare'}
    for native, reference in zip(actual['trace'], expected['trace']):
        for key in ['step', 'current', 'likes', 'browsed', 'joy', 'questionAsked']:
            assert native[key] == reference[key], (native['step'], key, native, reference)
        assert screens.get(native['screen']) == reference['view'], (native, reference)
        if native['step'] == 'question':
            assert native['questionDimension'] == expected['questionDimension'], (native, expected['questionDimension'])
    assert len(actual['ranks']) == len(expected['ranks']) == len(CASES)
    for native, reference in zip(actual['ranks'], expected['ranks']):
        assert native['id'] == reference['id']
        assert native['trial'] == reference['trial'], (native['id'], 'trial plan differs')
        assert [row['id'] for row in native['ranked']] == [row['id'] for row in reference['ranked']], (native, reference)
        for row, wanted in zip(native['ranked'], reference['ranked']):
            for key in ['score', 'coverage', 'low', 'high']:
                assert abs(row[key] - wanted[key]) < 1e-4, (native['id'], key, row, wanted)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--card-host', default=os.environ.get('OCTO_CARD_HOST'))
    parser.add_argument('--hub', default=os.environ.get('OCTO_HUB'))
    parser.add_argument('--node', default='node')
    parser.add_argument('--port', type=int, default=18147)
    parser.add_argument('--out', type=Path, default=ROOT / 'qa/native-discovery-contract.json')
    args = parser.parse_args()
    if not args.card_host or not args.hub:
        parser.error('Pass --card-host and --hub, or set OCTO_CARD_HOST and OCTO_HUB')
    args.card_host = str(Path(args.card_host).resolve())
    args.hub = str(Path(args.hub).resolve())
    production_source = ROOT / 'bundle/main.splash'
    frozen_hash = hashlib.sha256(production_source.read_bytes()).hexdigest()
    temp = Path(tempfile.mkdtemp(prefix='city-native-discovery-contract-'))
    bundle, state = temp / 'bundle', temp / 'state'
    shutil.copytree(ROOT / 'bundle', bundle)
    source = (bundle / 'main.splash').read_text()
    assert source.count(MARKER) == 1, 'Expected one startup marker; refuse an ambiguous injection'
    # Calls such as go() retain all state/storage behavior. A rapid, synchronous
    # contract sequence must not render UI panes before the host builds their tree.
    for function_name in ['draw_page', 'refresh']:
        source = suppress_contract_render(source, function_name)
    (bundle / 'main.splash').write_text(source.replace(MARKER, MARKER + '\n' + harness()))
    expected = json.loads(subprocess.check_output(
        [args.node, '--input-type=module', '-e', JS_REFERENCE, json.dumps(CASES)], cwd=ROOT, text=True))
    result = {}

    def inspect(_driver):
        output = state / 'leilei-city-matchmaker/discovery-contract-output.json'
        for _ in range(60):
            if output.exists():
                break
            time.sleep(.1)
        if not output.exists():
            raise AssertionError('Native contract did not finish; inspect ' + str(temp / 'contract.log'))
        result.update(json.loads(output.read_text()))
        verify(result, expected)

    run_host(args, bundle, state, temp / 'contract.log', inspect)
    assert hashlib.sha256(production_source.read_bytes()).hexdigest() == frozen_hash, 'Production source changed during the contract run; rerun against the final build'
    report = {
        'date': datetime.date.today().isoformat(), 'version': '0.4.0', 'passed': True,
        'production_main_sha256': frozen_hash, 'production_main_still_current': True,
        'synthetic_inputs_only': True, 'real_model_called': False,
        'production_bundle_modified_by_test': False, 'storage_contract_checks': result['checks'],
        'temporary_contract_ui_refresh_suppressed': True,
        'discovery_parity_steps': [item['step'] for item in result['trace']],
        'same_cursor_favorites_browsed_view_joy_and_question': True,
        'native_vs_js_parity_cases': [case['id'] for case in CASES],
        'same_city_order_score_coverage_and_ranges': True, 'trial_plan_matches_shared_config': True,
        'number_tolerance': 0.0001,
        'test_method': 'Real hidden card-host with function-level assertions injected into a temporary bundle copy. Only draw_page and refresh UI rendering are suppressed in that copy; state, storage and ranking functions execute unchanged. Production pointer UI regression is separate.'
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('PASS: 5 storage contracts, 8 discovery parity steps, 7 rank/range/trial-plan cases.')
    print('Evidence:', temp)


if __name__ == '__main__':
    main()
