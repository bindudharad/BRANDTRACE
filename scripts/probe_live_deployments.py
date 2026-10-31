import urllib.request
import json
import re

def probe(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Brandtrace-Auditor/1.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return 'ERR', str(e)

print('--- RENDER PROBES ---')
s, h = probe('https://brandtrace-api.onrender.com/api/health')
print('Render /api/health:', s, h)
s, r = probe('https://brandtrace-api.onrender.com/api/ready')
print('Render /api/ready:', s, r)
s, v = probe('https://brandtrace-api.onrender.com/api/version')
print('Render /api/version:', s, v)

s, openapi = probe('https://brandtrace-api.onrender.com/openapi.json')
if s == 200:
    data = json.loads(openapi)
    paths = data.get('paths', {})
    print('Render Route Count:', len(paths))
    print('Render has /api/brand-assets:', '/api/brand-assets' in paths)
    print('Render has /api/logo/verify:', '/api/logo/verify' in paths)
    print('Render has /api/logo/report:', '/api/logo/report' in paths)
    print('Render has /api/health:', '/api/health' in paths)
    print('Render has /api/version:', '/api/version' in paths)
else:
    print('Render openapi failed:', s, openapi[:200] if isinstance(openapi, str) else openapi)

print('\n--- VERCEL PROBES ---')
s, v_html = probe('https://brandtrace-woad.vercel.app/')
print('Vercel status:', s, 'Length:', len(v_html) if isinstance(v_html, str) else 0)
if isinstance(v_html, str):
    scripts = re.findall(r'src="([^"]+)"', v_html)
    styles = re.findall(r'href="([^"]+\.css)"', v_html)
    print('Vercel script sources:', scripts)
    print('Vercel style sheets:', styles)
