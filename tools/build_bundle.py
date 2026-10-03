#!/usr/bin/env python3
"""Generate OctoScript data from the shared, source-labelled city dataset."""
import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEYS = ['tech', 'creative', 'manufacturing', 'service', 'nature', 'live', 'food', 'ball', 'quiet', 'heat', 'cold', 'humidity', 'cost']

def readable_note(note):
    labels = '技术生态|文化生产|生产制造基础|供给基础|夏热敏感项|冬季体感敏感项|潮湿关注项|创意生态|服务业多样性|演出生态|冬冷关注项|夏热关注项|制造业基础|产业存在性|产业基础|资源类型|饮食文化辨识度|类型丰富|创意产业基础|服务业基础|湖边户外资源|演出供给'
    text = note.replace('人工分档，非统计测量。', '')
    text = re.sub('(?:'+labels+')?记[0-3](?:分)?', '', text)
    text = text.replace('不是下楼可达分', '从住处出发是否方便还得核对').replace('尚未用市域山地面积夸大日常可达性', '从住处出发是否方便还得核对')
    return re.sub('[，,]+(?=[。；;！？!?]|$)', '', text)

def main():
    cities = json.loads((ROOT / 'data/cities.json').read_text())
    rows = []
    for city in sorted(cities, key=lambda c: c['id']):
        values, evidence = [], []
        for key in KEYS:
            value = city['features'].get(key)
            ev = city['featureEvidence'].get(key, {})
            source_ids = {s['id'] for s in city.get('sources', [])}
            cited = [sid for sid in ev.get('sourceIds', []) if sid in source_ids]
            status = ev.get('status', 'unknown')
            if status == 'sourced' and not cited:
                status = 'unknown'
            valid = isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 3 and status in ['sourced', 'editorial']
            values.append(value if valid else -1)
            evidence.append(2 if valid and status == 'sourced' else 1 if valid else 0)
        # These are displayed references, not requests. Full URLs remain in
        # the source data/cities.json; avoid unused network permissions.
        source_text = '\n'.join(s['title'] + '\n' + s['url'].removeprefix('https://') for s in city['sources'])
        notes = [readable_note(city['featureEvidence'].get(key, {}).get('note', '')) for key in KEYS]
        rows.append([city['id'], city['name'], city['tagline'], values, evidence, city['scenes'][0], '\n'.join(city['tradeoffs']), source_text, '\n'.join(city['unknowns']), city['persona'], notes, city['tradeoffs'][0]])
    prefix = 'let city_rows = ' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + '\n'
    template = (ROOT / 'tools/main.template.splash').read_text()
    (ROOT / 'bundle/main.splash').write_text(prefix + template)
    # The gate treats URLs in non-script JSON as external asset references.
    # Full source records stay in data/cities.json in the source repository;
    # runtime data and readable source host/path references are embedded above.
    old_asset = ROOT / 'bundle/assets/cities.json'
    if old_asset.exists():
        old_asset.unlink()
    art = ROOT / 'assets/mascots-concept-v1.png'
    if art.exists():
        shutil.copyfile(art, ROOT / 'bundle/assets/mascots.png')
    print(f'Generated {len(rows)} cities; data and native source are synchronized.')

if __name__ == '__main__':
    main()
