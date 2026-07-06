# 用 CDP 给游戏截屏：python3 tools/shot.py <url> <out.png> <wait_seconds>
import base64
import json
import subprocess
import sys
import time
import urllib.request

import websocket

url, out, wait_s = sys.argv[1], sys.argv[2], float(sys.argv[3])

chrome = subprocess.Popen([
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '--headless=new', '--remote-debugging-port=9333', '--remote-allow-origins=*',
    '--window-size=460,860', '--hide-scrollbars',
    '--user-data-dir=/tmp/zyshot_cdp', 'about:blank'
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    ws_url = None
    for _ in range(30):
        try:
            tabs = json.load(urllib.request.urlopen('http://localhost:9333/json'))
            pages = [t for t in tabs if t.get('type') == 'page']
            if pages:
                ws_url = pages[0]['webSocketDebuggerUrl']
                break
        except Exception:
            pass
        time.sleep(0.5)
    assert ws_url, 'chrome CDP not ready'

    ws = websocket.create_connection(ws_url, timeout=30)
    mid = [0]

    def send(method, params=None):
        mid[0] += 1
        ws.send(json.dumps({'id': mid[0], 'method': method, 'params': params or {}}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get('id') == mid[0]:
                return msg.get('result', {})

    send('Page.enable')
    send('Runtime.enable')
    send('Page.navigate', {'url': url})

    deadline = time.time() + wait_s
    ws.settimeout(1)
    while time.time() < deadline:
        try:
            msg = json.loads(ws.recv())
        except Exception:
            continue
        m = msg.get('method')
        if m == 'Runtime.exceptionThrown':
            d = msg['params']['exceptionDetails']
            print('EXC:', d.get('text'), d.get('exception', {}).get('description', ''))
        elif m == 'Runtime.consoleAPICalled' and msg['params']['type'] in ('error', 'warning'):
            print('CONSOLE:', [a.get('value') or a.get('description') for a in msg['params']['args']])
    ws.settimeout(30)
    shot = send('Page.captureScreenshot', {'format': 'png'})
    with open(out, 'wb') as f:
        f.write(base64.b64decode(shot['data']))
    print('saved', out)
finally:
    chrome.terminate()
