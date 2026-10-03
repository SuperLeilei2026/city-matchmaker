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
    click('从想过的日子开始 →')
    click('○ AI 应用与产品')
    for n,text in enumerate(['○ 经常换一种新玩法','○ 到水边、树下走走','○ 不断遇到新朋友','○ 把自己的想法做出来','○ 先试一段，再决定'],1):
        assert f'想过的日子 · {n} / 5' in labels(), labels()
        click(text)
    click('先核对我的生活画像 →')
    assert '这是你想过的日子吗？' in labels(), labels()
    click('画像准确，先认识一座城 →')
    first=labels()
    assert any('先见一面' in x for x in first),first
    shot('02-first-match.png')
    click('这座城我明确不考虑')
    top()
    click('保留原回答')
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
    assert state[1]==7 and state[35]=='product' and state[30:35]==['new','nature','new','build','explore'],state
    assert state[24] and state[25] in state[24],state
    (ROOT/'tools/native-smoke-result.json').write_text(json.dumps({'first':first,'second':second,'agent':end,'state_revision':state[27]},ensure_ascii=False,indent=2))
    print('PASS: profile entry, two matching rounds, explicit exclusion, local save, Agent unavailable fallback.')

if __name__=='__main__':main()
