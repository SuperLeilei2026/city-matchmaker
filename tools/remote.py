#!/usr/bin/env python3
"""Small localhost-only driver for the native test app on port 18131."""
import argparse
import json
import pathlib
import urllib.parse
import urllib.request

BASE = 'http://127.0.0.1:18131'

def request(path, **query):
    suffix = '?' + urllib.parse.urlencode(query) if query else ''
    with urllib.request.urlopen(BASE + path + suffix, timeout=15) as response:
        return response.read()

def snapshot():
    return [item for item in json.loads(request('/snap'))['s'] if item['ty'] not in ['Splash','Window','KeyboardView']]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['snap','click','scroll','type','shot','quit','help'])
    parser.add_argument('value', nargs='?', default='')
    args = parser.parse_args()
    if args.action == 'snap':
        print(json.dumps(snapshot(), ensure_ascii=False))
    elif args.action == 'click':
        matches = [item for item in snapshot() if item.get('t') == args.value and item['ty'] in ['Button','TextInput']]
        if len(matches) != 1:
            raise SystemExit('Expected one exact visible control, got ' + str(len(matches)))
        x,y,w,h = matches[0]['r']
        print(request('/m', k='click', x=x+w/2, y=y+h/2, wait=1).decode())
    elif args.action == 'scroll':
        print(request('/m', k='scroll', x=220, y=500, dy=float(args.value), wait=1).decode())
    elif args.action == 'type':
        print(request('/t', t=args.value, wait=1).decode())
    elif args.action == 'shot':
        path = pathlib.Path(args.value)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(request('/g', raw=1))
        print(str(path.resolve()))
    elif args.action == 'quit':
        print(request('/quit').decode())
    else:
        print(request('/').decode())

if __name__ == '__main__':
    main()
