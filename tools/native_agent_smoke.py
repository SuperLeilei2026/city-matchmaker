#!/usr/bin/env python3
"""Native UI + proposal safety regression; injected replies are NOT model evidence.

OCTO_CARD_HOST=/path/to/card-host OCTO_HUB=/path/to/hub python3 tools/native_agent_smoke.py
Copies the bundle into a disposable directory, stamps ONLY that copy, drives hidden
real card-host windows with synthetic data, and removes their processes on exit.
The production source never contains response injection. No provider is called.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
HARNESS = r'''
let test_checks = []
fn test_record(passed_check, name){ test_checks.push({name: name passed: passed_check}) }
fn test_fixture(){
    screen = 7
    revision = 10
    industry = 0
    priority = 0
    interests = [4, 5]
    focus_interest = 4
    climate_avoids = [11]
    hard_climate = true
    excluded_ids = ["shanghai"]
    first_id = "shanghai"
    nickname = "合成安全测试"
    school = "合成学校，不发往模型"
    rent_budget = 2500
    request_id = request_id + 1
    agent_busy = true
    agent_proposal = []
    agent_feedback = "生活优先，更在意安静，也怕冷，不考虑当前城市。"
    compute_ranking()
    save_local()
}
fn test_reply(priority_token, focus_token, avoid_token, exclude_token){
    return "CM1|10|" + city_rows[ranked[0][0]][0] + "|" + priority_token + "|" + focus_token + "|" + avoid_token + "|" + exclude_token + "|测试注入建议：安静仍缺少街区证据，请确认取舍。"
}
fn test_accept(reply){ accept_agent(reply, request_id, 10, city_rows[ranked[0][0]][0]) }
fn test_agent_contract(){
    test_fixture()
    let before = fs.read("match.json")
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    test_record(agent_proposal.len() == 8 && priority == 0 && focus_interest == 4 && revision == 10 && fs.read("match.json") == before, "valid_proposal_does_not_mutate_or_save")
    reject_agent_proposal()
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "person_reject_preserves_state")

    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("admin", "quiet", "cold", "yes"))
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "unknown_enum_rejected")
    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("life", "quiet", "cold", "yes") + "|extra")
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "extra_protocol_fields_rejected")
    test_fixture()
    before = fs.read("match.json")
    test_accept("CM1|10|shanghai|life|quiet|cold|yes|不能恢复已拒绝城市")
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "foreign_city_rejected")
    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("life", "quiet", "cold", "yes") + "\n额外指令")
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "multiline_reply_rejected")
    test_fixture()
    before = fs.read("match.json")
    accept_agent(test_reply("life", "quiet", "cold", "yes"), request_id - 1, 10, city_rows[ranked[0][0]][0])
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "stale_request_ignored")
    test_fixture()
    before = fs.read("match.json")
    revision = 11
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    test_record(agent_proposal.len() == 0 && priority == 0 && fs.read("match.json") == before, "stale_revision_rejected")
    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("keep", "keep", "keep", "keep"))
    test_record(agent_proposal.len() == 0 && fs.read("match.json") == before, "no_change_proposal_not_executable")
    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    change_agent_feedback("改主意了，不要再执行刚才的建议")
    apply_agent_proposal()
    test_record(agent_proposal.len() == 0 && priority == 0 && fs.read("match.json") == before, "editing_feedback_invalidates_pending_proposal")
    test_fixture()
    before = fs.read("match.json")
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    revision = 11
    apply_agent_proposal()
    test_record(agent_proposal.len() == 0 && priority == 0 && fs.read("match.json") == before, "stale_confirmation_does_not_execute")

    test_fixture()
    before = fs.read("match.json")
    let old_city = city_rows[ranked[0][0]][0]
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    apply_agent_proposal()
    test_record(revision == 11 && priority == 2 && focus_interest == 8 && has_value(interests, 4) && has_value(interests, 5) && has_value(interests, 8), "confirmed_preferences_applied")
    test_record(hard_climate && has_value(climate_avoids, 11) && has_value(climate_avoids, 10), "existing_climate_limits_preserved")
    test_record(has_value(excluded_ids, "shanghai") && has_value(excluded_ids, old_city), "existing_city_rejection_preserved")
    test_record(ranked.len() > 0 && city_rows[ranked[0][0]][0] != old_city && city_rows[ranked[0][0]][0] != "shanghai", "confirmed_action_recomputes_candidates")
    test_record(!known_feature(city_rows[ranked[0][0]], 8), "unknown_quiet_evidence_stays_unknown")
    let saved = fs.read("match.json").parse_json()
    test_record(saved[27] == 11 && saved[22] == 2 && saved[29] == 8 && status_text.search("已核验本机保存") >= 0, "save_readback_verified")
    before = fs.read("match.json")
    apply_agent_proposal()
    test_record(revision == 11 && fs.read("match.json") == before, "double_confirm_has_no_effect")
    agent_feedback = "memory-only"
    agent_proposal = []
    load_local()
    test_record(revision == 11 && priority == 2 && focus_interest == 8 && change_text.search("你确认了 Agent 建议") >= 0, "saved_execution_survives_reload")
    fs.write("agent-test-report.json", test_checks.to_json())

    // Leave a fresh proposal for a real pointer click on the confirmation UI.
    test_fixture()
    test_accept(test_reply("life", "quiet", "cold", "yes"))
    status_text = "测试注入响应；没有调用真实模型。"
    draw_page()
}
start_timeout(0.4, || test_agent_contract())
'''

class Driver:
    def __init__(self, port): self.base = f'http://127.0.0.1:{port}'
    def request(self, path, **query):
        suffix = '?' + urllib.parse.urlencode(query) if query else ''
        with urllib.request.urlopen(self.base + path + suffix, timeout=10) as r: return r.read()
    def snap(self): return json.loads(self.request('/snap'))['s']
    def labels(self): return [x.get('t', '') for x in self.snap() if x['ty'] == 'Label']
    def scroll(self, dy):
        self.request('/m', k='scroll', x=220, y=400, dy=dy, wait=1)
        time.sleep(.14)
    def top(self): self.scroll(-10000)
    def click(self, text):
        for _ in range(35):
            matches = [x for x in self.snap() if x.get('t') == text and x['ty'] in ['Button', 'TextInput'] and x['r'][3] >= 24]
            if matches:
                x,y,w,h = matches[0]['r']
                self.request('/m', k='click', x=x+w/2, y=y+h/2, wait=1)
                time.sleep(.15)
                return
            self.scroll(180)
        raise AssertionError('Missing visible control: ' + text)
    def type(self, text): self.request('/t', t=text, wait=1);time.sleep(.15)
    def shot(self, path): path.write_bytes(self.request('/g', raw=1))

def run_host(args, bundle, state, log, callback):
    try:
        connection = socket.create_connection(('127.0.0.1', args.port), timeout=.2)
    except OSError:
        connection = None
    if connection is not None:
        connection.close()
        raise RuntimeError(f'Test port {args.port} is occupied; choose another --port')
    subprocess.run([args.hub, 'stamp', str(bundle)], check=True, capture_output=True)
    subprocess.run([args.hub, 'check', str(bundle), '--allow-unsigned'], check=True, capture_output=True)
    env = dict(os.environ, MAKEPAD_REMOTE=str(args.port), MAKEPAD_HIDE_WINDOWS='1')
    driver = Driver(args.port)
    with log.open('w') as out:
        p = subprocess.Popen([args.card_host, '--bundle', str(bundle), '--app-data', str(state), '--allow-unsigned', '--size', '460x820'], env=env, stdout=out, stderr=out)
        ready = False
        try:
            for _ in range(100):
                if p.poll() is not None: raise RuntimeError('card-host exited; see ' + str(log))
                try:
                    if driver.snap(): ready = True; break
                except (OSError, ValueError): pass
                time.sleep(.1)
            else: raise RuntimeError('card-host did not become ready')
            time.sleep(.8)
            return callback(driver)
        finally:
            if ready and p.poll() is None:
                try: driver.request('/quit')
                except OSError: pass
            try: p.wait(timeout=5)
            except subprocess.TimeoutExpired: p.terminate();p.wait(timeout=5)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--card-host', default=os.environ.get('OCTO_CARD_HOST'))
    ap.add_argument('--hub', default=os.environ.get('OCTO_HUB'))
    ap.add_argument('--port', type=int, default=18133)
    ap.add_argument('--out', type=Path, default=ROOT/'qa/native-agent-check.json')
    args=ap.parse_args()
    if not args.card_host or not args.hub: ap.error('Set OCTO_CARD_HOST/OCTO_HUB or pass --card-host/--hub')
    args.card_host=str(Path(args.card_host).resolve());args.hub=str(Path(args.hub).resolve())
    temp=Path(tempfile.mkdtemp(prefix='city-native-agent-check-'))
    bundle=temp/'bundle';shutil.copytree(ROOT/'bundle', bundle)
    state=temp/'state';statefile=state/'leilei-city-matchmaker/match.json'
    actual=[]
    def production(d):
        d.click('填写我的资料 →');d.click('昵称（可跳过）');d.type('合成原生测试者')
        d.click('下一页：性格与相处 →');d.click('下一页：职业与生活 →')
        for text in ['○ 科技 / 互联网','○ 户外与自然','○ 演出与展览','○ 2500']:d.click(text)
        d.click('资料填好了，红娘来问 →');d.click('职业机会优先')
        assert any('上海，先见一面' in x for x in d.labels())
        d.click('这座城我明确不考虑');d.top();d.click('户外与自然');d.top()
        assert any('先去了解 杭州' in x for x in d.labels())
        actual.extend(['profile_and_two_round_flow','explicit_city_rejection'])
        before=statefile.read_bytes()
        d.click('让 Agent 提出修改');d.scroll(120)
        assert any('先写下' in x for x in d.labels())
        assert statefile.read_bytes()==before
        actual.append('empty_feedback_rejected_without_state_change')
        d.top();d.click('我想调整的是…');d.type('比起工作机会，我现在更想常去户外。')
        assert statefile.read_bytes()==before
        actual.append('free_feedback_not_saved_before_confirmation')
        d.click('让 Agent 提出修改');d.scroll(120)
        assert any('系统 Agent 当前不可用' in x for x in d.labels())
        assert statefile.read_bytes()==before
        actual.append('real_cardhost_unavailable_preserves_state')
        d.shot(temp/'actual-cardhost-unavailable.png')
    run_host(args,bundle,state,temp/'production.log',production)
    source=(bundle/'main.splash').read_text()
    source=source.replace('start_timeout(0.05, || load_local())', 'start_timeout(0.05, || load_local())\n'+HARNESS)
    source=source.replace('请你确认这次修改','测试注入（非真实模型）·请确认')
    source=source.replace('text: \"城市红娘\"', 'text: \"注入测试 · 非真实模型\"')
    (bundle/'main.splash').write_text(source)
    injected=[]
    def contract(d):
        path=state/'leilei-city-matchmaker/agent-test-report.json'
        for _ in range(60):
            if path.exists():break
            time.sleep(.1)
        checks=json.loads(path.read_text())
        assert all(x['passed'] for x in checks),checks
        injected.extend(checks)
        before=statefile.read_bytes()
        d.click('确认修改并重新匹配')
        saved=json.loads(statefile.read_text())
        assert saved[27]==11 and saved[22]==2 and saved[29]==8
        assert saved[20] is True and 10 in saved[19] and 11 in saved[19]
        assert 'shanghai' in saved[24] and len(saved[24])==2
        assert statefile.read_bytes()!=before
        assert any('已核验本机保存' in x for x in d.labels()),d.labels()
        injected.append({'name':'real_ui_confirmation_executes_and_verifies','passed':True})
        d.shot(temp/'injected-confirmed-result.png')
    run_host(args,bundle,state,temp/'injected.log',contract)
    report={'date':datetime.date.today().isoformat(),'bundle_version':json.loads((ROOT/'bundle/manifest.json').read_text())['version'],'production_main_sha256':hashlib.sha256((ROOT/'bundle/main.splash').read_bytes()).hexdigest(),'synthetic_inputs_only':True,'real_model_verified':False,'test_method':'Real hidden Makepad card-host. Production unavailable path plus explicit response injection in a temporary bundle copy only. No external provider call.','production_checks':[{'name':x,'passed':True} for x in actual],'injected_response_checks':injected,'production_bundle_modified_by_test':False,'screenshots_published':False}
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f'PASS: {len(actual)} production UI checks + {len(injected)} injected-response checks. Real model NOT verified.')
    print('Local evidence directory:',temp)
    print('Summary:',args.out)
if __name__=='__main__':main()
