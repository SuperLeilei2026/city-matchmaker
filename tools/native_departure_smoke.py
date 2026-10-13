#!/usr/bin/env python3
"""Drive the real v0.6 dual-city AppCard flow with synthetic choices; no model call."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile

from native_agent_smoke import run_host

ROOT = Path(__file__).resolve().parents[1]


def click_prefix(driver, prefix):
    for _ in range(45):
        matches = [item for item in driver.snap()
                   if item.get('t', '').startswith(prefix)
                   and item['ty'] in ['Button', 'TextInput'] and item['r'][3] >= 24]
        if matches:
            x, y, width, height = matches[0]['r']
            driver.request('/m', k='click', x=x + width / 2, y=y + height / 2, wait=1)
            return matches[0]['t']
        driver.scroll(180)
    raise AssertionError('Missing visible control prefix: ' + prefix)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--card-host', default=os.environ.get('OCTO_CARD_HOST'))
    parser.add_argument('--hub', default=os.environ.get('OCTO_HUB'))
    parser.add_argument('--port', type=int, default=18151)
    parser.add_argument('--out', type=Path, default=ROOT / 'qa/native-departure-check.json')
    args = parser.parse_args()
    if not args.card_host or not args.hub:
        parser.error('Pass --card-host and --hub')
    args.card_host = str(Path(args.card_host).resolve())
    args.hub = str(Path(args.hub).resolve())

    temp = Path(tempfile.mkdtemp(prefix='city-native-departure-v06-'))
    bundle = temp / 'bundle'
    state = temp / 'state'
    shutil.copytree(ROOT / 'bundle', bundle)
    production_hash = hashlib.sha256((ROOT / 'bundle/main.splash').read_bytes()).hexdigest()
    checks = []
    observations = {}
    state_file = state / 'leilei-city-matchmaker/match.json'

    def run(driver):
        labels = driver.labels()
        assert any('不是猜命运，是把纠结摆上站台' in text for text in labels), labels
        driver.shot(temp / '01-entry.png')
        driver.click('○ 深圳')
        driver.click('○ 杭州')
        driver.click('进入现实装配 →')
        saved = json.loads(state_file.read_text())
        assert len(saved) == 58 and saved[0] == 'city-matchmaker-v4'
        assert saved[1] == 31 and set(saved[47]) == {'shenzhen', 'hangzhou'}
        checks.extend(['dual_entry_candidates_persist', 'v4_tail_save_written'])

        driver.click('○ 科技 / 互联网')
        click_prefix(driver, '如：具身智能')
        driver.type('具身智能行业')
        driver.click('○ 散步 / 去户外')
        driver.click('○ 看书 / 安静独处')
        driver.click('○ 4000')
        driver.click('○ 潮湿闷热')
        driver.scroll(10000)
        labels = driver.labels()
        assert any('红线待核' in text for text in labels), labels
        assert any('条件冲突' in text for text in labels), labels
        assert not any('相合指数' in text for text in labels), labels
        driver.shot(temp / '02-reality.png')
        saved = json.loads(state_file.read_text())
        assert saved[16] == 0 and saved[17] == 4000 and saved[18] == [4, 8] and saved[19] == [11]
        assert saved[48] == '具身智能行业'
        checks.extend(['reality_conditions_persist', 'constraints_visible_without_public_score'])

        driver.click('进入两城筛选 →')
        labels = driver.labels()
        assert any('最后两城由你留下' in text for text in labels), labels
        driver.click('○ 留在双城轨道')
        driver.click('○ 留在双城轨道')
        driver.scroll(10000)
        driver.click('○ 深圳')
        driver.click('如：深圳成本低、具身智能机会更多')
        driver.type('我更倾向深圳，因为深圳成本低、具身智能机会更多。')
        driver.shot(temp / '03-shortlist.png')
        driver.click('开启三幕对局 ⚡')
        saved = json.loads(state_file.read_text())
        assert saved[1] == 36 and len(saved[40]) == 2 and saved[52]
        checks.extend(['user_selects_two_finalists', 'original_assumption_does_not_block_duel'])

        driver.top()
        assert any('第一份工作' in text for text in driver.labels())
        click_prefix(driver, '← 深圳')
        driver.top()
        after_first_vote = driver.labels()
        assert json.loads(state_file.read_text())[50] == 1, after_first_vote
        assert any('普通下班后' in text for text in after_first_vote), after_first_vote
        driver.click('还看不出')
        driver.top()
        assert any('住下去的代价' in text for text in driver.labels())
        click_prefix(driver, '杭州 →')
        driver.top()
        labels = driver.labels()
        assert any('现在不宣布赢家' in text for text in labels), labels
        assert any('杭州为2638元' in text for text in labels), labels
        assert any('宽泛产业线索不能证明“具身智能行业”' in text for text in labels), labels
        assert any('深圳为“红线待核”' in text for text in labels), labels
        driver.shot(temp / '04-duel.png')
        checks.extend(['three_act_votes_never_auto_choose', 'xiaocheng_assumptions_are_audited'])

        driver.click('让系统 Agent 找关键一问')
        labels = driver.labels()
        assert any('切回本地规则' in text for text in labels), labels
        assert json.loads(state_file.read_text())[53] == ''
        driver.click('○ 加入核验清单')
        saved = json.loads(state_file.read_text())
        assert saved[54] and saved[53] == ''
        driver.click('先验证 深圳')
        labels = driver.labels()
        assert any('DUAL-CITY PASSPORT' in text for text in labels), labels
        assert any('FIRST TO VERIFY' in text for text in labels), labels
        assert any('BACKUP CITY' in text for text in labels), labels
        driver.shot(temp / '05-passport.png')
        saved = json.loads(state_file.read_text())
        assert saved[1] == 35 and saved[53] == 'shenzhen'
        assert saved[49] == ['left', 'tie', 'right'] and saved[50] == 3
        observations['finalists'] = saved[40]
        observations['first_to_verify'] = saved[53]
        observations['decision_task'] = saved[54]
        checks.extend(['agent_failure_falls_back_without_choice', 'confirmed_task_saved', 'passport_contains_first_and_backup'])

    run_host(args, bundle, state, temp / 'native-v06.log', run)

    def restore(driver):
        labels = driver.labels()
        assert any('DUAL-CITY PASSPORT' in text for text in labels), labels
        saved = json.loads(state_file.read_text())
        assert saved[1] == 35 and saved[53] == 'shenzhen' and saved[54]
        checks.append('restart_restores_passport_and_task')

    run_host(args, bundle, state, temp / 'native-v06-restart.log', restore)
    assert hashlib.sha256((ROOT / 'bundle/main.splash').read_bytes()).hexdigest() == production_hash
    args.out.write_text(json.dumps({
        'date': datetime.date.today().isoformat(),
        'version': '0.6.0',
        'production_main_sha256': production_hash,
        'synthetic_inputs_only': True,
        'real_model_called': False,
        'checks': checks,
        'observations': observations,
    }, ensure_ascii=False, indent=2) + '\n')
    evidence = ROOT / 'qa/native-departure-v0.6'
    evidence.mkdir(parents=True, exist_ok=True)
    for name in ['01-entry.png', '02-reality.png', '03-shortlist.png', '04-duel.png',
                 '05-passport.png', 'native-v06.log', 'native-v06-restart.log']:
        shutil.copyfile(temp / name, evidence / name)
    print(f'PASS: {len(checks)} native v0.6 checks; evidence: {evidence}')


if __name__ == '__main__':
    main()
