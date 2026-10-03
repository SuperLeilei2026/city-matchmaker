#!/usr/bin/env python3
"""UI-only local smoke pass. Uses synthetic inputs; no host configuration changes."""
import json
import pathlib
import time
from remote import request, snapshot

ROOT = pathlib.Path(__file__).resolve().parents[1]

def click(text, search=True):
    for attempt in range(24 if search else 1):
        matches = [x for x in snapshot() if x.get('t') == text and x['ty'] in ['Button','TextInput'] and x['r'][3] >= 24]
        if matches:
            x,y,w,h=matches[0]['r']
            request('/m',k='click',x=x+w/2,y=y+h/2,wait=1)
            time.sleep(.08)
            return
        request('/m',k='scroll',x=220,y=500,dy=180,wait=1)
        time.sleep(.15)
    raise AssertionError('Control not found: '+text)

def top():
    request('/m',k='scroll',x=220,y=350,dy=-4000,wait=1)
    time.sleep(.15)

def shot(name):
    path=ROOT/'bundle/screenshots'/name
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes(request('/g',raw=1))

def labels():
    return [x.get('t','') for x in snapshot() if x['ty']=='Label']

def main():
    current = labels()
    if any('先去了解' in label for label in current):
        assert any('已恢复本机进度' in label for label in current), current
        print('PASS: restart restored the second-round result.')
    if '先和一座城市约会。' not in current:
        click('清除资料')
        assert not (ROOT/'tools/local-state/leilei-city-matchmaker/match.json').exists()
        print('PASS: clear removed the local profile file.')
        top()
        shot('01-welcome.png')
    click('填写我的资料 →')
    top()
    click('昵称（可跳过）')
    request('/t',t='小舟',wait=1)
    click('下一页：性格与相处 →')
    assert '你喜欢怎样的相处？' in labels(), labels()
    click('你的 MBTI（可跳过）')
    request('/t',t='INFP',wait=1)
    click('下一页：职业与生活 →')
    assert '工作之外，日子也要过。' in labels(), labels()
    click('○ 科技 / 互联网')
    click('○ 户外与自然')
    click('○ 演出与展览')
    click('○ 2500')
    click('资料填好了，红娘来问 →')
    assert '毕业第一站，你更想先照顾哪一边？' in labels(), labels()
    click('职业机会优先')
    first=labels()
    assert any('先见一面' in x for x in first),first
    shot('02-first-match.png')
    click('这座城我明确不考虑')
    top()
    click('户外与自然')
    top()
    second=labels()
    assert any('先去了解' in x for x in second),second
    shot('03-second-match.png')
    click('我想调整的是…')
    request('/t',t='比起工作机会，我现在更想常去户外。',wait=1)
    click('让 Agent 提出修改')
    request('/m',k='scroll',x=220,y=500,dy=120,wait=1)
    time.sleep(.3)
    end=labels()
    assert any('不可用' in x for x in end),end
    state=json.loads((ROOT/'tools/local-state/leilei-city-matchmaker/match.json').read_text())
    assert state[1]==7 and state[3]=='小舟' and state[10]=='INFP',state
    assert state[24] and state[25] in state[24],state
    (ROOT/'tools/native-smoke-result.json').write_text(json.dumps({'first':first,'second':second,'agent':end,'state_revision':state[27]},ensure_ascii=False,indent=2))
    print('PASS: profile entry, two matching rounds, explicit exclusion, local save, Agent unavailable fallback.')

if __name__=='__main__':main()
